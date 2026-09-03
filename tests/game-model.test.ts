import { describe, expect, test } from "vitest";

import {
  MAX_STAGE,
  actOnPlot,
  blankState,
  grow,
  loadState,
  plant,
  setTool,
  type StorageLike,
} from "../src/game/model";

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
  removeItem(key: string): void { this.values.delete(key); }
}

describe("garden game model", () => {
  test("keeps the original first-level planting contract", () => {
    const state = blankState();
    plant(state);
    expect(state.plots).toHaveLength(12);
    expect(state.plots.filter((plot) => plot.crop)).toHaveLength(10);
    expect(state.round).toBe(1);
    expect(state.plots.map((plot) => plot.crop).filter(Boolean)).toEqual([
      "carrot", "carrot", "carrot",
      "tomato", "tomato", "tomato", "tomato",
      "corn",
      "pumpkin", "pumpkin",
    ]);
  });

  test("wetness gates growth without changing crop identity", () => {
    const state = blankState();
    plant(state);
    const before = state.plots.map((plot) => plot.crop);
    expect(grow(state).toast).toContain("没浇水");
    setTool(state, "water");
    for (let index = 0; index < 10; index += 1) actOnPlot(state, index);
    grow(state);
    expect(state.round).toBe(2);
    expect(state.plots.slice(0, 10).every((plot) => plot.stage === 2 && !plot.watered)).toBe(true);
    expect(state.plots.map((plot) => plot.crop)).toEqual(before);
  });

  test("harvesting still completes the level and awards three stars", () => {
    const state = blankState();
    plant(state);
    state.tool = "harvest";
    for (const plot of state.plots) if (plot.crop) plot.stage = MAX_STAGE;
    let finished = false;
    for (let index = 0; index < 10; index += 1) finished = Boolean(actOnPlot(state, index).finished);
    expect(finished).toBe(true);
    expect(state.stars).toBe(3);
  });

  test("migrates the compact R2 log shape without changing the save key", () => {
    const storage = new MemoryStorage();
    storage.setItem("eric-secret-garden-r2", JSON.stringify({
      level: 1,
      log: [{ i: "💧", t: "旧记录", x: "仍然能读。" }],
      camera: { angle: 0.2, zoom: 1.1 },
    }));
    const state = loadState(storage);
    expect(state.level).toBe(1);
    expect(state.log[0]).toEqual({ icon: "💧", title: "旧记录", text: "仍然能读。" });
    expect(state.camera).toEqual({ angle: 0.2, zoom: 1.1 });
  });
});
