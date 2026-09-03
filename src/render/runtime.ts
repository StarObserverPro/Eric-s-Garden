import type { GardenSceneSnapshot } from "../scene/snapshot";
import { Canvas2DRenderer } from "./canvas2d/canvas2d-renderer";
import type {
  GardenRenderer,
  RenderSettings,
  RuntimeMetrics,
} from "./contract";
import { VgpuRenderer } from "./vgpu/vgpu-renderer";

interface RuntimeOptions {
  readonly canvas2d: HTMLCanvasElement;
  readonly gpuCanvas: HTMLCanvasElement;
  readonly cropOverlay: HTMLElement;
  readonly settings: RenderSettings;
  readonly snapshot: GardenSceneSnapshot;
  readonly onMetrics: (metrics: RuntimeMetrics) => void;
  readonly onFallback: (message: string) => void;
}

export class RenderRuntime {
  readonly #canvas2d: HTMLCanvasElement;
  readonly #gpuCanvas: HTMLCanvasElement;
  readonly #cropOverlay: HTMLElement;
  readonly #onMetrics: (metrics: RuntimeMetrics) => void;
  readonly #onFallback: (message: string) => void;
  #settings: RenderSettings;
  #snapshot: GardenSceneSnapshot;
  #canvasRenderer: Canvas2DRenderer;
  #vgpuRenderer: VgpuRenderer | undefined;
  #active: GardenRenderer;
  #raf = 0;
  #disposed = false;
  #initRevision = 0;
  #status: RuntimeMetrics["status"] = "starting";
  #message = "正在检查这台设备的 WebGPU。";
  #windowStart = performance.now();
  #windowFrames = 0;
  #fps = 0;
  #frameMs = 0;

  constructor(options: RuntimeOptions) {
    this.#canvas2d = options.canvas2d;
    this.#gpuCanvas = options.gpuCanvas;
    this.#cropOverlay = options.cropOverlay;
    this.#settings = options.settings;
    this.#snapshot = options.snapshot;
    this.#onMetrics = options.onMetrics;
    this.#onFallback = options.onFallback;
    this.#canvasRenderer = new Canvas2DRenderer(this.#canvas2d, this.#settings.maxDpr);
    this.#canvasRenderer.setSnapshot(this.#snapshot);
    this.#active = this.#canvasRenderer;
    this.#show("canvas2d");
  }

  get settings(): RenderSettings {
    return this.#settings;
  }

  start(): void {
    if (this.#disposed || this.#raf) return;
    this.#raf = requestAnimationFrame(this.#tick);
    void this.#activatePreferredRenderer();
  }

  setSnapshot(snapshot: GardenSceneSnapshot): void {
    this.#snapshot = snapshot;
    this.#canvasRenderer.setSnapshot(snapshot);
    this.#vgpuRenderer?.setSnapshot(snapshot);
  }

  pickPlot(x: number, y: number): number | null {
    return this.#active.pickPlot(x, y);
  }

  resize(): void {
    this.#canvasRenderer.resize();
    this.#vgpuRenderer?.resize();
  }

  async applySettings(settings: RenderSettings): Promise<void> {
    if (this.#disposed) return;
    this.#settings = settings;
    this.#initRevision += 1;
    this.#vgpuRenderer?.dispose();
    this.#vgpuRenderer = undefined;
    this.#canvasRenderer.dispose();
    this.#canvasRenderer = new Canvas2DRenderer(this.#canvas2d, settings.maxDpr);
    this.#canvasRenderer.setSnapshot(this.#snapshot);
    this.#active = this.#canvasRenderer;
    this.#status = settings.preference === "canvas" ? "ready" : "starting";
    this.#message = settings.preference === "canvas"
      ? "已按设置使用兼容画面。"
      : "正在按新的画面档位重建 WebGPU 场景。";
    this.#show("canvas2d");
    await this.#activatePreferredRenderer();
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#initRevision += 1;
    cancelAnimationFrame(this.#raf);
    this.#raf = 0;
    this.#vgpuRenderer?.dispose();
    this.#canvasRenderer.dispose();
  }

  readonly #tick = (timeMs: number): void => {
    if (this.#disposed) return;
    const started = performance.now();
    try {
      this.#active.render(timeMs);
    } catch (error) {
      this.#fallback(error, "WebGPU 画面中断，已经自动回到兼容画面。");
      this.#active.render(timeMs);
    }
    const duration = performance.now() - started;
    this.#frameMs = this.#frameMs === 0 ? duration : this.#frameMs * 0.88 + duration * 0.12;
    this.#windowFrames += 1;
    const elapsed = timeMs - this.#windowStart;
    if (elapsed >= 500) {
      this.#fps = this.#windowFrames * 1000 / Math.max(1, elapsed);
      this.#windowFrames = 0;
      this.#windowStart = timeMs;
      this.#emitMetrics();
    }
    this.#raf = requestAnimationFrame(this.#tick);
  };

  async #activatePreferredRenderer(): Promise<void> {
    const revision = ++this.#initRevision;
    if (this.#settings.preference === "canvas") {
      this.#status = "ready";
      this.#message = "兼容画面保持完整可玩。";
      this.#emitMetrics();
      return;
    }
    if (!supportsWebGPU()) {
      this.#status = "fallback";
      this.#message = "这台设备没有可用的 WebGPU，已使用兼容画面。";
      this.#emitMetrics();
      return;
    }

    this.#status = "starting";
    this.#message = "正在准备 vgpu 菜园。";
    this.#emitMetrics();
    try {
      const renderer = await VgpuRenderer.create(
        this.#gpuCanvas,
        this.#cropOverlay,
        this.#settings,
        this.#snapshot,
      );
      if (this.#disposed || revision !== this.#initRevision) {
        renderer.dispose();
        return;
      }
      this.#vgpuRenderer?.dispose();
      this.#vgpuRenderer = renderer;
      renderer.setSnapshot(this.#snapshot);
      this.#active = renderer;
      this.#status = "ready";
      this.#message = `${this.#settings.instances.toLocaleString("en-US")} 株草花正在由 GPU 风场驱动。`;
      this.#show("vgpu");
      this.#emitMetrics();
    } catch (error) {
      if (!this.#disposed && revision === this.#initRevision) {
        this.#fallback(error, "WebGPU 初始化没有成功，已使用兼容画面。", false);
      }
    }
  }

  #fallback(error: unknown, userMessage: string, announce = true): void {
    const detail = error instanceof Error ? error.message : String(error);
    console.warn("[garden-renderer]", detail);
    this.#initRevision += 1;
    this.#vgpuRenderer?.dispose();
    this.#vgpuRenderer = undefined;
    this.#active = this.#canvasRenderer;
    this.#active.setSnapshot(this.#snapshot);
    this.#active.resize();
    this.#status = "fallback";
    this.#message = `${userMessage} ${detail}`;
    this.#show("canvas2d");
    this.#emitMetrics();
    if (announce) this.#onFallback(userMessage);
  }

  #show(kind: "canvas2d" | "vgpu"): void {
    const gpuActive = kind === "vgpu";
    this.#gpuCanvas.classList.toggle("is-active", gpuActive);
    this.#gpuCanvas.setAttribute("aria-hidden", String(!gpuActive));
    this.#canvas2d.classList.toggle("is-active", !gpuActive);
    this.#canvas2d.setAttribute("aria-hidden", String(gpuActive));
    this.#cropOverlay.classList.toggle("is-active", gpuActive);
  }

  #emitMetrics(): void {
    const metrics = this.#active.metrics();
    this.#onMetrics({
      ...metrics,
      fps: this.#fps,
      frameMs: this.#frameMs,
      status: this.#status,
      message: this.#message,
    });
  }
}

function supportsWebGPU(): boolean {
  return typeof navigator !== "undefined" && "gpu" in navigator && Boolean(navigator.gpu);
}
