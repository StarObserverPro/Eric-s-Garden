import { describe, expect, test } from "vitest";

import {
  FrameCadenceSampler,
  createRenderGovernor,
  qualityProfileFor,
  stepRenderGovernor,
} from "../src/render/governor";

describe("render governor", () => {
  test("starts at the user's configured vegetation ceiling", () => {
    expect(createRenderGovernor(4000).profile).toEqual({
      level: "full",
      vegetationInstances: 4000,
      pressure: 0,
    });
    expect(createRenderGovernor(1500).profile.vegetationInstances).toBe(1500);
    expect(createRenderGovernor(500).profile.vegetationInstances).toBe(500);
  });

  test("degrades severe sustained pressure without exceeding the ceiling", () => {
    let state = createRenderGovernor(4000);
    state = stepRenderGovernor(state, { p95FrameMs: 34 }, 4000);
    expect(state.profile.level).toBe("reduced");
    expect(state.profile.vegetationInstances).toBe(1500);

    state = stepRenderGovernor(state, { p95FrameMs: 36 }, 4000);
    expect(state.profile.level).toBe("minimum");
    expect(state.profile.vegetationInstances).toBe(500);

    let capped = createRenderGovernor(1500);
    capped = stepRenderGovernor(capped, { p95FrameMs: 36 }, 1500);
    expect(capped.profile.vegetationInstances).toBe(500);
    expect(capped.profile.vegetationInstances).not.toBe(4000);
  });

  test("requires sustained mild pressure before reducing quality", () => {
    let state = createRenderGovernor(4000);
    state = stepRenderGovernor(state, { p95FrameMs: 24 }, 4000);
    expect(state.profile.vegetationInstances).toBe(4000);
    state = stepRenderGovernor(state, { p95FrameMs: 24 }, 4000);
    expect(state.profile.vegetationInstances).toBe(4000);
    state = stepRenderGovernor(state, { p95FrameMs: 24 }, 4000);
    expect(state.profile.vegetationInstances).toBe(1500);
  });

  test("recovers more slowly than it degrades", () => {
    let state = createRenderGovernor(4000);
    state = stepRenderGovernor(state, { p95FrameMs: 35 }, 4000);
    state = stepRenderGovernor(state, { p95FrameMs: 35 }, 4000);
    expect(state.profile.vegetationInstances).toBe(500);

    state = stepRenderGovernor(state, { p95FrameMs: 16.7 }, 4000);
    state = stepRenderGovernor(state, { p95FrameMs: 16.7 }, 4000);
    expect(state.profile.vegetationInstances).toBe(500);

    state = stepRenderGovernor(state, { p95FrameMs: 16.7 }, 4000);
    expect(state.profile.vegetationInstances).toBe(1500);

    for (let index = 0; index < 6; index += 1) {
      state = stepRenderGovernor(state, { p95FrameMs: 16.7 }, 4000);
    }
    expect(state.profile.vegetationInstances).toBe(4000);
    expect(state.profile.level).toBe("full");
  });

  test("maps pressure to relative quality under any ceiling", () => {
    expect(qualityProfileFor(0.3, 4000).vegetationInstances).toBe(1500);
    expect(qualityProfileFor(0.7, 4000).vegetationInstances).toBe(500);
    expect(qualityProfileFor(0.3, 1500).vegetationInstances).toBe(500);
    expect(qualityProfileFor(0.9, 500).vegetationInstances).toBe(500);
  });
});

describe("frame cadence sampler", () => {
  test("reset prevents a hidden-tab gap from becoming a pressure sample", () => {
    const sampler = new FrameCadenceSampler();
    sampler.record(0);
    sampler.record(16);
    sampler.record(32);
    expect(sampler.summary().sampleCount).toBe(2);

    sampler.reset();
    sampler.record(5_000);
    sampler.record(5_016);
    const summary = sampler.summary();
    expect(summary.sampleCount).toBe(1);
    expect(summary.p95FrameMs).toBe(16);
  });

  test("ignores implausibly long cadence gaps", () => {
    const sampler = new FrameCadenceSampler();
    sampler.record(0);
    sampler.record(16);
    sampler.record(1_000);
    sampler.record(1_016);
    const summary = sampler.summary();
    expect(summary.sampleCount).toBe(2);
    expect(summary.p50FrameMs).toBe(16);
    expect(summary.p95FrameMs).toBe(16);
  });
});
