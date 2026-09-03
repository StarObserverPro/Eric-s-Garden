import type { RenderSettings, RuntimeMetrics } from "../render/contract";

export interface DiagnosticsElements {
  readonly rendererName: HTMLElement;
  readonly rendererMessage: HTMLElement;
  readonly fps: HTMLElement;
  readonly frame: HTMLElement;
  readonly drawCalls: HTMLElement;
  readonly instances: HTMLElement;
  readonly passes: HTMLElement;
  readonly resources: HTMLElement;
  readonly dpr: HTMLElement;
  readonly indicator: HTMLElement;
  readonly preference: HTMLSelectElement;
  readonly instanceTier: HTMLSelectElement;
  readonly dprTier: HTMLSelectElement;
}

export function updateDiagnostics(elements: DiagnosticsElements, metrics: RuntimeMetrics): void {
  elements.rendererName.textContent = metrics.kind === "vgpu" ? "vgpu · WebGPU" : "Canvas 2D";
  elements.rendererMessage.textContent = metrics.message;
  elements.fps.textContent = metrics.fps > 0 ? metrics.fps.toFixed(0) : "—";
  elements.frame.textContent = metrics.frameP95Ms > 0
    ? `p95 ${metrics.frameP95Ms.toFixed(1)} ms · CPU ${metrics.frameMs.toFixed(1)} ms · Q ${metrics.qualityPressure.toFixed(2)}`
    : metrics.frameMs > 0
      ? `CPU ${metrics.frameMs.toFixed(1)} ms · Q ${metrics.qualityPressure.toFixed(2)}`
      : `Q ${metrics.qualityPressure.toFixed(2)}`;
  elements.drawCalls.textContent = String(metrics.drawCalls);
  elements.instances.textContent = metrics.kind === "vgpu"
    ? `${metrics.instances.toLocaleString("en-US")} · veg ${metrics.vegetationInstances.toLocaleString("en-US")}`
    : metrics.instances.toLocaleString("en-US");
  elements.passes.textContent = String(metrics.passes);
  elements.resources.textContent = String(metrics.resources);
  elements.dpr.textContent = metrics.dpr.toFixed(1);
  elements.indicator.dataset.status = metrics.status;
  elements.indicator.dataset.quality = metrics.qualityLevel;
}

export function syncSettingsControls(elements: DiagnosticsElements, settings: RenderSettings): void {
  elements.preference.value = settings.preference;
  elements.instanceTier.value = String(settings.instances);
  elements.dprTier.value = String(settings.maxDpr);
}
