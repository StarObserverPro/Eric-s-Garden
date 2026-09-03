import { describe, expect, test } from "vitest";

import { createVegetationVertices } from "../src/render/vgpu/geometry";

describe("segmented vegetation tuft geometry", () => {
  test("carries four primary blades, one low-cost filler blade and a small flower head", () => {
    const vertices = createVegetationVertices();
    expect(vertices.length % 7).toBe(0);
    expect(vertices.length / 7).toBe(150);

    const partCounts = new Map<number, number>();
    let maxHeight = 0;
    for (let offset = 0; offset + 6 < vertices.length; offset += 7) {
      maxHeight = Math.max(maxHeight, vertices[offset + 1]!);
      const part = vertices[offset + 6]!;
      partCounts.set(part, (partCounts.get(part) ?? 0) + 1);
    }

    expect([...partCounts.keys()].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(partCounts.get(4)).toBe(18);
    expect(partCounts.get(5)).toBe(12);
    expect(maxHeight).toBeGreaterThan(1.05);
  });
});
