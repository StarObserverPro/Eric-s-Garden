import { describe, expect, test } from "vitest";

import {
  createVegetationVertices,
  VEGETATION_NEAR_TRIANGLES_PER_INSTANCE,
  VEGETATION_TRIANGLES_PER_INSTANCE,
} from "../src/render/vgpu/geometry";

describe("near garden vegetation geometry", () => {
  test("retains the detailed near tuft and removes the retired country clusters", () => {
    const vertices = createVegetationVertices();
    expect(vertices.length % 7).toBe(0);
    expect(vertices.length / 7).toBe(VEGETATION_TRIANGLES_PER_INSTANCE * 3);

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

  test("default tier spends no triangles on the retired mid/far countryside grass", () => {
    expect(VEGETATION_NEAR_TRIANGLES_PER_INSTANCE).toBe(50);
    expect(VEGETATION_TRIANGLES_PER_INSTANCE).toBe(50);

    const defaultInstances = 1500;
    const currentTriangles = defaultInstances * VEGETATION_TRIANGLES_PER_INSTANCE;
    const previousTriangles = defaultInstances * 62;
    expect(currentTriangles).toBe(75_000);
    expect(previousTriangles - currentTriangles).toBe(18_000);
  });
});
