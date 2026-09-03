import { describe, expect, test } from "vitest";

import {
  WETTING_MAX_DURATION_SECONDS,
  WETTING_MIN_DURATION_SECONDS,
  advanceWettingVisual,
  shouldStartWettingVisual,
  wettingDurationSeconds,
} from "../src/render/vgpu/wetting-visual";

describe("watering wet-front timing", () => {
  test("keeps all twelve beds inside the one-to-three-second visual contract", () => {
    const durations = Array.from({ length: 12 }, (_, index) => wettingDurationSeconds(index));
    for (const duration of durations) {
      expect(duration).toBeGreaterThanOrEqual(1);
      expect(duration).toBeLessThanOrEqual(3);
      expect(duration).toBeGreaterThanOrEqual(WETTING_MIN_DURATION_SECONDS);
      expect(duration).toBeLessThanOrEqual(WETTING_MAX_DURATION_SECONDS);
    }
    expect(new Set(durations.map((duration) => duration.toFixed(3))).size).toBeGreaterThan(6);
  });

  test("starts only on a dry-to-wet gameplay transition", () => {
    expect(shouldStartWettingVisual(0, 1)).toBe(true);
    expect(shouldStartWettingVisual(0.2, 0.9)).toBe(true);
    expect(shouldStartWettingVisual(1, 1)).toBe(false);
    expect(shouldStartWettingVisual(1, 0)).toBe(false);
  });

  test("cannot finish before one second and is guaranteed complete by three", () => {
    for (let index = 0; index < 12; index += 1) {
      const beforeOneSecond = advanceWettingVisual(0, 1, index, 0.95);
      expect(beforeOneSecond).toBeGreaterThan(0);
      expect(beforeOneSecond).toBeLessThan(1);
      expect(advanceWettingVisual(beforeOneSecond, 1, index, 3)).toBe(1);
      expect(advanceWettingVisual(beforeOneSecond, 0, index, 0.1)).toBe(0);
    }
  });
});
