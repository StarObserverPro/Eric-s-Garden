import { describe, expect, test } from "vitest";

import { blankState, plant } from "../src/game/model";
import { PLOT_POSITIONS, createSceneSnapshot } from "../src/scene/snapshot";

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
});
