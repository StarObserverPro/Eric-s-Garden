import type { GardenSceneSnapshot } from "../scene/snapshot";
import { Canvas2DRenderer } from "./canvas2d/canvas2d-renderer";
import type {
  GardenRenderer,
  RenderSettings,
  RuntimeMetrics,
  RuntimeQualityProfile,
} from "./contract";
import {
  FrameCadenceSampler,
  createRenderGovernor,
  stepRenderGovernor,
  type RenderGovernorState,
} from "./governor";
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

const QUALITY_WINDOW_MS = 2_000;
const MIN_QUALITY_SAMPLES = 20;

export class RenderRuntime {
  readonly #canvas2d: HTMLCanvasElement;
  readonly #gpuCanvas: HTMLCanvasElement;
  readonly #cropOverlay: HTMLElement;
  readonly #onMetrics: (metrics: RuntimeMetrics) => void;
  readonly #onFallback: (message: string) => void;
  readonly #cadence = new FrameCadenceSampler();
  #settings: RenderSettings;
  #snapshot: GardenSceneSnapshot;
  #canvasRenderer: Canvas2DRenderer;
  #vgpuRenderer: VgpuRenderer | undefined;
  #active: GardenRenderer;
  #governor: RenderGovernorState;
  #raf = 0;
  #started = false;
  #disposed = false;
  #initRevision = 0;
  #status: RuntimeMetrics["status"] = "starting";
  #message = "正在检查这台设备的 WebGPU。";
  #fpsWindowStart = performance.now();
  #qualityWindowStart = this.#fpsWindowStart;
  #windowFrames = 0;
  #fps = 0;
  #frameMs = 0;
  #frameP95Ms = 0;

  constructor(options: RuntimeOptions) {
    this.#canvas2d = options.canvas2d;
    this.#gpuCanvas = options.gpuCanvas;
    this.#cropOverlay = options.cropOverlay;
    this.#settings = options.settings;
    this.#snapshot = options.snapshot;
    this.#onMetrics = options.onMetrics;
    this.#onFallback = options.onFallback;
    this.#governor = createRenderGovernor(options.settings.instances);
    this.#canvasRenderer = new Canvas2DRenderer(this.#canvas2d, this.#settings.maxDpr);
    this.#canvasRenderer.setSnapshot(this.#snapshot);
    this.#active = this.#canvasRenderer;
    this.#show("canvas2d");
  }

  get settings(): RenderSettings {
    return this.#settings;
  }

  start(): void {
    if (this.#disposed || this.#started) return;
    this.#started = true;
    document.addEventListener("visibilitychange", this.#onVisibilityChange);
    this.#resetSampling(performance.now());
    this.#scheduleFrame();
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
    this.#governor = createRenderGovernor(settings.instances);
    this.#resetSampling(performance.now());
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
    this.#started = false;
    this.#initRevision += 1;
    document.removeEventListener("visibilitychange", this.#onVisibilityChange);
    if (this.#raf) cancelAnimationFrame(this.#raf);
    this.#raf = 0;
    this.#vgpuRenderer?.dispose();
    this.#canvasRenderer.dispose();
  }

  readonly #tick = (timeMs: number): void => {
    this.#raf = 0;
    if (this.#disposed || isDocumentHidden()) return;

    this.#cadence.record(timeMs);
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
    const fpsElapsed = timeMs - this.#fpsWindowStart;
    if (fpsElapsed >= 500) {
      this.#fps = this.#windowFrames * 1000 / Math.max(1, fpsElapsed);
      this.#windowFrames = 0;
      this.#fpsWindowStart = timeMs;
      this.#emitMetrics();
    }

    const qualityElapsed = timeMs - this.#qualityWindowStart;
    if (qualityElapsed >= QUALITY_WINDOW_MS) {
      this.#applyQualityWindow(timeMs);
    }

    this.#scheduleFrame();
  };

  readonly #onVisibilityChange = (): void => {
    if (this.#disposed || !this.#started) return;
    if (isDocumentHidden()) {
      if (this.#raf) cancelAnimationFrame(this.#raf);
      this.#raf = 0;
      this.#resetSampling(performance.now());
      return;
    }

    this.#active.resize();
    this.#resetSampling(performance.now());
    this.#scheduleFrame();
  };

  #scheduleFrame(): void {
    if (this.#disposed || !this.#started || this.#raf || isDocumentHidden()) return;
    this.#raf = requestAnimationFrame(this.#tick);
  }

  #applyQualityWindow(timeMs: number): void {
    const cadence = this.#cadence.summary();
    this.#frameP95Ms = cadence.p95FrameMs;

    if (this.#active.kind === "vgpu" && cadence.sampleCount >= MIN_QUALITY_SAMPLES) {
      const previousProfile = this.#governor.profile;
      this.#governor = stepRenderGovernor(
        this.#governor,
        { p95FrameMs: cadence.p95FrameMs },
        this.#settings.instances,
      );
      const nextProfile = this.#governor.profile;
      if (
        previousProfile.vegetationInstances !== nextProfile.vegetationInstances
        || previousProfile.level !== nextProfile.level
      ) {
        this.#applyQualityProfile(nextProfile);
      }
    }

    this.#cadence.reset();
    this.#qualityWindowStart = timeMs;
    this.#emitMetrics();
  }

  #applyQualityProfile(profile: RuntimeQualityProfile): void {
    this.#vgpuRenderer?.setQualityProfile(profile);
  }

  #resetSampling(now: number): void {
    this.#cadence.reset();
    this.#fpsWindowStart = now;
    this.#qualityWindowStart = now;
    this.#windowFrames = 0;
    this.#fps = 0;
    this.#frameMs = 0;
    this.#frameP95Ms = 0;
  }

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
      renderer.setQualityProfile(this.#governor.profile);
      this.#active = renderer;
      this.#status = "ready";
      this.#message = `${this.#settings.instances.toLocaleString("en-US")} 株草花已准备由 GPU 风场驱动。`;
      this.#show("vgpu");
      this.#resetSampling(performance.now());
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
    this.#resetSampling(performance.now());
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
    const profile = this.#governor.profile;
    const governed = this.#active.kind === "vgpu"
      && profile.vegetationInstances < this.#settings.instances;
    const message = governed
      ? `${this.#message} 动态预算当前使用 ${profile.vegetationInstances.toLocaleString("en-US")} / ${this.#settings.instances.toLocaleString("en-US")} 株草花。`
      : this.#message;

    this.#onMetrics({
      ...metrics,
      fps: this.#fps,
      frameMs: this.#frameMs,
      frameP95Ms: this.#frameP95Ms,
      qualityLevel: profile.level,
      qualityPressure: profile.pressure,
      vegetationInstances: profile.vegetationInstances,
      status: this.#status,
      message,
    });
  }
}

function supportsWebGPU(): boolean {
  return typeof navigator !== "undefined" && "gpu" in navigator && Boolean(navigator.gpu);
}

function isDocumentHidden(): boolean {
  return typeof document !== "undefined" && document.visibilityState === "hidden";
}
