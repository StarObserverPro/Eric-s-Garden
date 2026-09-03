import type { GardenSceneSnapshot } from "../scene/snapshot";

export const INSTANCE_TIERS = [500, 1500, 4000] as const;
export const DPR_TIERS = [1, 1.5, 2] as const;
export const RENDER_BUDGET_CLASSES = ["core", "structure", "dressing", "ephemeral"] as const;

export type InstanceTier = (typeof INSTANCE_TIERS)[number];
export type DprTier = (typeof DPR_TIERS)[number];
export type RenderBudgetClass = (typeof RENDER_BUDGET_CLASSES)[number];
export type RenderPreference = "auto" | "canvas";
export type RendererKind = "canvas2d" | "vgpu";
export type RuntimeQualityLevel = "full" | "reduced" | "minimum";

export interface RenderSettings {
  readonly preference: RenderPreference;
  readonly instances: InstanceTier;
  readonly maxDpr: DprTier;
}

export interface RuntimeQualityProfile {
  readonly level: RuntimeQualityLevel;
  readonly vegetationInstances: InstanceTier;
  readonly pressure: number;
}

export interface RendererMetrics {
  readonly kind: RendererKind;
  readonly passes: number;
  readonly drawCalls: number;
  readonly instances: number;
  readonly resources: number;
  readonly dpr: number;
}

export interface RuntimeMetrics extends RendererMetrics {
  readonly fps: number;
  /** CPU-side render/command-encoding duration; this is not GPU execution time. */
  readonly frameMs: number;
  /** p95 requestAnimationFrame cadence for the current quality window. */
  readonly frameP95Ms: number;
  readonly qualityLevel: RuntimeQualityLevel;
  readonly qualityPressure: number;
  readonly vegetationInstances: InstanceTier;
  readonly status: "starting" | "ready" | "fallback" | "failed";
  readonly message: string;
}

export interface GardenRenderer {
  readonly kind: RendererKind;
  setSnapshot(snapshot: GardenSceneSnapshot): void;
  /** Optional because the Canvas fallback is a compatibility renderer, not a managed WebGPU workload. */
  setQualityProfile?(profile: RuntimeQualityProfile): void;
  render(timeMs: number): void;
  resize(): void;
  pickPlot(x: number, y: number): number | null;
  metrics(): RendererMetrics;
  dispose(): void;
}

export const DEFAULT_RENDER_SETTINGS: RenderSettings = {
  preference: "auto",
  instances: 1500,
  maxDpr: 1.5,
};

export function isInstanceTier(value: number): value is InstanceTier {
  return INSTANCE_TIERS.includes(value as InstanceTier);
}

export function isDprTier(value: number): value is DprTier {
  return DPR_TIERS.includes(value as DprTier);
}
