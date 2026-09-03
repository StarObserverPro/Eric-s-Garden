import type { GardenSceneSnapshot } from "../scene/snapshot";

export const INSTANCE_TIERS = [500, 1500, 4000] as const;
export const DPR_TIERS = [1, 1.5, 2] as const;

export type InstanceTier = (typeof INSTANCE_TIERS)[number];
export type DprTier = (typeof DPR_TIERS)[number];
export type RenderPreference = "auto" | "canvas";
export type RendererKind = "canvas2d" | "vgpu";

export interface RenderSettings {
  readonly preference: RenderPreference;
  readonly instances: InstanceTier;
  readonly maxDpr: DprTier;
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
  readonly frameMs: number;
  readonly status: "starting" | "ready" | "fallback" | "failed";
  readonly message: string;
}

export interface GardenRenderer {
  readonly kind: RendererKind;
  setSnapshot(snapshot: GardenSceneSnapshot): void;
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
