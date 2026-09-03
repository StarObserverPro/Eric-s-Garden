import { describe, expect, test } from "vitest";

import { blankState, plant } from "../src/game/model";
import {
  PLOT_POSITIONS,
  createSceneSnapshot,
  withNeutralDiffuseFill,
} from "../src/scene/snapshot";

describe("renderer-neutral scene snapshot", () => {
  test("maps all twelve plots onto one stable world grid", () => {
    const state = blankState();
    plant(state);
    const snapshot = createSceneSnapshot(state);
    expect(snapshot.plots).toHaveLength(12);
    expect(snapshot.plots.map((plot) => plot.position)).toEqual(PLOT_POSITIONS);
  });

  test("carries gameplay wetness and level weather without renderer state", () => {
    const state = blankState();
    plant(state);
    state.plots[3]!.watered = true;
    state.level = 4;
    const snapshot = createSceneSnapshot(state);
    expect(snapshot.plots[3]!.wetness).toBe(1);
    expect(snapshot.plots[2]!.wetness).toBe(0);
    expect(snapshot.weather.id).toBe("sunshower");
    expect(snapshot.weather.rain).toBeGreaterThan(0);
  });

  test("adds restrained neutral diffuse radiance instead of a second directional light", () => {
    const source = [0.46, 0.58, 0.63] as const;
    const filled = withNeutralDiffuseFill(source);
    expect(filled[0]).toBeGreaterThan(source[0]);
    expect(filled[1]).toBeGreaterThan(source[1]);
    expect(filled[2]).toBeGreaterThan(source[2]);
    expect(Math.max(...filled) - Math.min(...filled)).toBeLessThan(
      Math.max(...source) - Math.min(...source),
    );
    expect(filled[0]).toBeLessThan(0.55);
    expect(filled[2]).toBeLessThan(0.70);
  });
});
