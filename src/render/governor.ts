import {
  INSTANCE_TIERS,
  type InstanceTier,
  type RuntimeQualityLevel,
  type RuntimeQualityProfile,
} from "./contract";

export interface RenderGovernorState {
  readonly pressure: number;
  readonly recoveryWindows: number;
  readonly profile: RuntimeQualityProfile;
}

export interface RenderGovernorSample {
  readonly p95FrameMs: number;
}

export interface FrameCadenceSummary {
  readonly sampleCount: number;
  readonly p50FrameMs: number;
  readonly p95FrameMs: number;
}

const QUALITY_REDUCED_PRESSURE = 0.25;
const QUALITY_MINIMUM_PRESSURE = 0.60;
const MAX_CADENCE_SAMPLE_MS = 250;

/**
 * requestAnimationFrame cadence sampler used by the runtime governor.
 *
 * It deliberately measures display cadence rather than wrapping renderer.render()
 * with performance.now(): WebGPU command encoding/submission is asynchronous and
 * CPU render duration is not a GPU execution-time measurement.
 */
export class FrameCadenceSampler {
  #previousFrameAt: number | undefined;
  #intervals: number[] = [];

  record(timeMs: number): void {
    if (this.#previousFrameAt !== undefined) {
      const interval = timeMs - this.#previousFrameAt;
      if (Number.isFinite(interval) && interval >= 1) {
        this.#intervals.push(Math.min(interval, MAX_CADENCE_SAMPLE_MS));
      }
    }
    this.#previousFrameAt = timeMs;
  }

  reset(): void {
    this.#previousFrameAt = undefined;
    this.#intervals = [];
  }

  summary(): FrameCadenceSummary {
    if (this.#intervals.length === 0) {
      return { sampleCount: 0, p50FrameMs: 0, p95FrameMs: 0 };
    }
    const values = [...this.#intervals].sort((a, b) => a - b);
    return {
      sampleCount: values.length,
      p50FrameMs: percentile(values, 0.50),
      p95FrameMs: percentile(values, 0.95),
    };
  }
}

export function createRenderGovernor(ceiling: InstanceTier): RenderGovernorState {
  const profile = qualityProfileFor(0, ceiling);
  return {
    pressure: 0,
    recoveryWindows: 0,
    profile,
  };
}

/**
 * Slow, hysteretic pressure controller derived from Crystal Garden's proven
 * p95-window policy, adapted for Eric's explicit WebGPU workload model.
 *
 * Mild pressure needs to persist before a visible workload change. Severe
 * pressure degrades faster. Recovery requires three consecutive fast windows
 * per step and is intentionally slower than degradation.
 */
export function stepRenderGovernor(
  state: RenderGovernorState,
  sample: RenderGovernorSample,
  ceiling: InstanceTier,
): RenderGovernorState {
  let pressure = state.pressure;
  let recoveryWindows = state.recoveryWindows;
  const p95 = sample.p95FrameMs;

  if (p95 >= 34) {
    pressure = clamp01(pressure + 0.34);
    recoveryWindows = 0;
  } else if (p95 >= 27) {
    pressure = clamp01(pressure + 0.20);
    recoveryWindows = 0;
  } else if (p95 >= 24) {
    pressure = clamp01(pressure + 0.12);
    recoveryWindows = 0;
  } else if (p95 > 0 && p95 <= 17.2) {
    recoveryWindows += 1;
    if (recoveryWindows >= 3) {
      pressure = clamp01(pressure - 0.18);
      recoveryWindows = 0;
    }
  } else {
    recoveryWindows = 0;
  }

  return {
    pressure,
    recoveryWindows,
    profile: qualityProfileFor(pressure, ceiling),
  };
}

export function qualityProfileFor(
  pressure: number,
  ceiling: InstanceTier,
): RuntimeQualityProfile {
  const normalized = clamp01(pressure);
  const level: RuntimeQualityLevel = normalized >= QUALITY_MINIMUM_PRESSURE
    ? "minimum"
    : normalized >= QUALITY_REDUCED_PRESSURE
      ? "reduced"
      : "full";

  const ceilingIndex = INSTANCE_TIERS.indexOf(ceiling);
  const tierIndex = level === "full"
    ? ceilingIndex
    : level === "reduced"
      ? Math.max(0, ceilingIndex - 1)
      : 0;

  return {
    level,
    vegetationInstances: INSTANCE_TIERS[tierIndex]!,
    pressure: normalized,
  };
}

function percentile(sorted: readonly number[], fraction: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * fraction));
  return sorted[index]!;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
