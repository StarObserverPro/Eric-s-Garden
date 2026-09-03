import { describe, expect, test } from "vitest";

import { createVegetationVertices } from "../src/render/vgpu/geometry";

describe("segmented vegetation tuft geometry", () => {
  test("carries four blade leaves plus a small flower head in one instance", () => {
    const vertices = createVegetationVertices();
    expect(vertices.length % 7).toBe(0);
    expect(vertices.length / 7).toBe(132);

    const parts = new Set<number>();
    let maxHeight = 0;
    for (let offset = 0; offset + 6 < vertices.length; offset += 7) {
      maxHeight = Math.max(maxHeight, vertices[offset + 1]!);
      parts.add(vertices[offset + 6]!);
    }
    expect([...parts].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4]);
    expect(maxHeight).toBeGreaterThan(1.05);
  });
});
