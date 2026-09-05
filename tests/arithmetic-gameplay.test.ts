import { describe, expect, test } from "vitest";
import {
  CROPS, LEVELS, MAX_STAGE, SAVE_KEY, actOnPlot, advanceLevel, basketOrder,
  blankState, grow, loadState, plant, putInBasket, resetState, restartSharing,
  saveState, sharingProgress, startSharing, takeFromBasket, weatherIdForState,
  type GameState, type StorageLike,
} from "../src/game/model";
import { countCare, countOrder, countSharing, normalizeSharing, sharingBasketCount } from "../src/game/arithmetic";
import { createSceneSnapshot } from "../src/scene/snapshot";

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

function matureGarden(level = 0): GameState {
  const state = blankState();
  state.level = level;
  plant(state);
  state.round = MAX_STAGE;
  for (const plot of state.plots) if (plot.crop) { plot.stage = MAX_STAGE; plot.pest = false; }
  return state;
}

function completedGarden(level = 0): GameState {
  const state = matureGarden(level);
  state.plots.forEach((_, index) => actOnPlot(state, index));
  return state;
}

function tendAndGrow(state: GameState): void {
  state.tool = "water";
  state.plots.forEach((_, index) => actOnPlot(state, index));
  state.tool = "spray";
  state.plots.forEach((_, index) => actOnPlot(state, index));
  grow(state);
}

describe("P0 basket orders are real harvest projections", () => {
  test("tracks crop slots, combined counts and the missing quantity without saved counters", () => {
    const state = matureGarden();
    const before = basketOrder(state);
    expect(before).toMatchObject({ collected: 0, target: 10, remaining: 10, complete: false });
    for (const index of [0, 1, 3, 4]) actOnPlot(state, index);
    expect(basketOrder(state)).toMatchObject({ collected: 4, remaining: 6, complete: false });
    expect(basketOrder(state).lines[0]).toEqual({ crop: "carrot", target: 3, collected: 2, remaining: 1 });
    const storage = new MemoryStorage();
    saveState(storage, state);
    expect(basketOrder(loadState(storage))).toEqual(basketOrder(state));
    expect(storage.getItem(SAVE_KEY)).not.toContain('"remaining"');
    expect(storage.getItem(SAVE_KEY)).not.toContain('"collected"');
  });

  test("surplus and unrelated crops cannot fill another crop's missing slots", () => {
    const state = matureGarden();
    state.harvested = { carrot: 99, tomato: 3, corn: 1, pumpkin: 2, strawberry: 100 };
    expect(basketOrder(state)).toMatchObject({ collected: 9, remaining: 1, complete: false });
    const result = advanceLevel(state);
    expect(state.level).toBe(0);
    expect(result.toast).toContain("还差 1");
    actOnPlot(state, 3);
    expect(basketOrder(state).complete).toBe(true);
    expect(state.stars).toBe(3);
    actOnPlot(state, 4); // an additional crop cannot award completion again
    expect(state.stars).toBe(3);
  });

  test("double harvest, reopening completion and accidental re-sowing cannot farm stars", () => {
    const state = completedGarden();
    const harvest = structuredClone(state.harvested);
    const plots = structuredClone(state.plots);
    for (let count = 0; count < 4; count += 1) {
      actOnPlot(state, 0);
      expect(grow(state).finished).toBe(true);
      plant(state);
    }
    expect(state.stars).toBe(3);
    expect(state.harvested).toEqual(harvest);
    expect(state.plots).toEqual(plots);
  });

  test("immature/empty clicks and care errors never remove plants, counts or stars", () => {
    const state = blankState(); plant(state);
    const identity = state.plots.map((plot) => plot.crop);
    const before = basketOrder(state);
    actOnPlot(state, 0); actOnPlot(state, 11); grow(state);
    expect(state.plots.map((plot) => plot.crop)).toEqual(identity);
    expect(basketOrder(state)).toEqual(before);
    expect(state.stars).toBe(0);
  });

  test("all five levels can finish through the same non-punitive care loop", () => {
    const state = blankState();
    for (let level = 0; level < LEVELS.length; level += 1) {
      plant(state);
      for (let round = 1; round < MAX_STAGE; round += 1) tendAndGrow(state);
      expect(state.round).toBe(MAX_STAGE);
      state.tool = "harvest";
      state.plots.forEach((_, index) => actOnPlot(state, index));
      expect(basketOrder(state).complete).toBe(true);
      expect(state.stars).toBe((level + 1) * 3);
      advanceLevel(state); // no arithmetic or sharing gate
    }
    expect(state.completed).toBe(true);
  });
});

describe("P0 real weather and pest subtraction", () => {
  test("sunshower sowing waters four eligible beds and the renderer reads the same result", () => {
    const state = blankState(); state.level = 2;
    expect(plant(state).toast).toContain("浇了 4 块，还剩 8 块");
    expect(weatherIdForState(state)).toBe("sunshower");
    expect(countCare(state.plots, MAX_STAGE)).toMatchObject({ total: 12, watered: 4, remaining: 8 });
    const snapshot = createSceneSnapshot(state);
    for (const plot of state.plots) if (plot.watered) expect(snapshot.plots[plot.index]!.wetness).toBeGreaterThan(0);
    const watered = state.plots.filter((plot) => plot.watered).map((plot) => plot.index);
    const other = blankState(); other.level = 2; plant(other);
    expect(other.plots.filter((plot) => plot.watered).map((plot) => plot.index)).toEqual(watered);
  });

  test("rain is not replayed by blocked growth, re-sowing or save reload", () => {
    let state = blankState(); state.level = 2; plant(state);
    const storage = new MemoryStorage();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      grow(state); plant(state); saveState(storage, state); state = loadState(storage);
      expect(countCare(state.plots, MAX_STAGE).watered).toBe(4);
      expect(state.round).toBe(1);
    }
    expect(state.log.filter((entry) => entry.title === "雨水帮忙啦")).toHaveLength(1);
  });

  test("rain is applied after a real growth/weather transition, not before its care gate", () => {
    const state = blankState(); plant(state); tendAndGrow(state);
    expect(state.round).toBe(2);
    expect(countCare(state.plots, MAX_STAGE)).toMatchObject({ watered: 0 });
    const blocked = grow(state);
    expect(blocked.toast).toContain("没浇水");
    expect(state.round).toBe(2);
    tendAndGrow(state);
    expect(state.round).toBe(3);
    expect(weatherIdForState(state)).toBe("sunshower");
    expect(countCare(state.plots, MAX_STAGE)).toMatchObject({ total: 10, watered: 4, remaining: 6 });
  });

  test("pest counts subtract one real affected bed; repeats cannot subtract twice", () => {
    const state = blankState(); plant(state);
    for (const index of [0, 1, 2]) state.plots[index]!.pest = true;
    state.tool = "spray";
    expect(actOnPlot(state, 0).toast).toContain("还剩 2");
    expect(actOnPlot(state, 1).toast).toContain("还剩 1");
    actOnPlot(state, 1);
    expect(countCare(state.plots, MAX_STAGE).pests).toBe(1);
    expect(actOnPlot(state, 2).toast).toContain("小虫都走啦");
    expect(state.plots.filter((plot) => plot.crop)).toHaveLength(10);
  });
});

describe("P1 equal baskets without a second inventory", () => {
  test("sharing cannot start with unharvested produce", () => {
    const state = matureGarden();
    startSharing(state);
    expect(state.sharing).toBeNull();
    expect(sharingProgress(state).active).toBe(false);
  });

  test.each([0, 1, 2, 3, 4])("level %i shares the harvested crop identities and never consumes them", (level) => {
    const state = completedGarden(level);
    const harvested = structuredClone(state.harvested);
    const lifetime = structuredClone(state.totalHarvest);
    startSharing(state);
    const count = sharingProgress(state).baskets.length;
    const tokens = sharingProgress(state).tokens;
    expect(tokens).toHaveLength(basketOrder(state).target);
    for (const crop of Object.keys(CROPS)) expect(tokens.filter((token) => token === crop).length).toBe(harvested[crop as keyof typeof CROPS] ?? 0);
    expect(sharingProgress(state).equal).toBe(false); // empty baskets aren't completion
    tokens.forEach((_, index) => putInBasket(state, index % count));
    expect(sharingProgress(state).equal).toBe(true);
    expect(sharingProgress(state).baskets.map((basket) => basket.length)).toEqual(Array(count).fill(tokens.length / count));
    expect(state.harvested).toEqual(harvested);
    expect(state.totalHarvest).toEqual(lifetime);
    expect(state.stars).toBe(3);
  });

  test("uneven baskets are correctable, not silently auto-balanced or penalized", () => {
    const state = completedGarden(); startSharing(state);
    for (let index = 0; index < 10; index += 1) putInBasket(state, 0);
    expect(sharingProgress(state)).toMatchObject({ equal: false, unassigned: [] });
    expect(sharingProgress(state).baskets.map((basket) => basket.length)).toEqual([10, 0]);
    for (let index = 0; index < 5; index += 1) { takeFromBasket(state, 0); putInBasket(state, 1); }
    expect(sharingProgress(state).equal).toBe(true);
    expect(state.stars).toBe(3);
    expect(basketOrder(state)).toMatchObject({ collected: 10, complete: true });
  });

  test("all transfers preserve every token exactly once, including full/empty and invalid actions", () => {
    const state = completedGarden(3); startSharing(state);
    const before = JSON.stringify(state.sharing);
    for (const index of [-1, 100, 0.2, NaN, Infinity]) { putInBasket(state, index); takeFromBasket(state, index); }
    expect(JSON.stringify(state.sharing)).toBe(before);
    for (let step = 0; step < 120; step += 1) {
      const basket = (step * 7) % 4;
      if (step % 3 === 0) takeFromBasket(state, basket); else putInBasket(state, basket);
      const view = sharingProgress(state);
      const ids = [...view.unassigned, ...view.baskets.flat()].sort((a, b) => a - b);
      expect(ids).toEqual(Array.from({ length: view.tokens.length }, (_, index) => index));
    }
    restartSharing(state);
    expect(sharingProgress(state).unassigned).toHaveLength(12);
    expect(sharingProgress(state).equal).toBe(false);
    expect(state.stars).toBe(3);
  });

  test("partial and completed arrangements survive reload without restarting or awarding stars", () => {
    const storage = new MemoryStorage();
    let state = completedGarden(2); startSharing(state);
    for (let index = 0; index < 5; index += 1) putInBasket(state, index % 3);
    saveState(storage, state);
    const before = sharingProgress(state);
    state = loadState(storage);
    startSharing(state);
    expect(sharingProgress(state)).toEqual(before);
    for (let index = 5; index < 12; index += 1) putInBasket(state, index % 3);
    expect(sharingProgress(state).equal).toBe(true);
    saveState(storage, state); state = loadState(storage);
    expect(sharingProgress(state).equal).toBe(true);
    expect(grow(state).finished).toBe(true);
    expect(state.stars).toBe(3);
  });

  test("legacy saves and invalid new fields normalize; next level/reset clear only the task state", () => {
    const storage = new MemoryStorage();
    const legacy = completedGarden(2);
    const { sharing: _, ...withoutSharing } = legacy;
    storage.setItem(SAVE_KEY, JSON.stringify(withoutSharing));
    let loaded = loadState(storage);
    expect(loaded.sharing).toBeNull();
    expect(loaded.harvested).toEqual(legacy.harvested);
    storage.setItem(SAVE_KEY, JSON.stringify({ ...legacy, sharing: { placements: [0, 2, -2, 90, "1", 0.5] } }));
    loaded = loadState(storage);
    expect(loaded.sharing?.placements).toEqual([0, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]);
    const lifetime = structuredClone(loaded.totalHarvest);
    advanceLevel(loaded);
    expect(loaded.sharing).toBeNull();
    expect(loaded.harvested).toEqual({});
    expect(loaded.totalHarvest).toEqual(lifetime);
    expect(resetState(storage).sharing).toBeNull();
    expect(loadState(storage)).toEqual(blankState());
  });

  test("small exact-division plans remain bounded; malformed state never creates produce", () => {
    for (const total of [6, 8, 9, 10, 12]) {
      const count = sharingBasketCount(total, 0);
      expect([2, 3, 4, 6]).toContain(count);
      expect(total % count).toBe(0);
    }
    const order = countOrder({ carrot: 6 }, { carrot: 1 });
    expect(normalizeSharing({ placements: [0, 0, 0, 0, 0, 0] }, order, 0)).toBeNull();
    expect(countSharing(order, null, 0).tokens).toEqual(["carrot"]);
  });
});
