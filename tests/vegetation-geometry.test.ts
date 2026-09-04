import { describe, expect, test } from "vitest";

import {
  createVegetationVertices,
  VEGETATION_MID_CLUSTERS_PER_INSTANCE,
  VEGETATION_MID_TRIANGLES_PER_CLUSTER,
  VEGETATION_MID_TRIANGLES_PER_INSTANCE,
  VEGETATION_NEAR_TRIANGLES_PER_INSTANCE,
  VEGETATION_TRIANGLES_PER_INSTANCE,
} from "../src/render/vgpu/geometry";

describe("layered vegetation geometry", () => {
  test("retains the detailed near tuft and carries two low-cost country clusters", () => {
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

    expect([...partCounts.keys()].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(partCounts.get(4)).toBe(18);
    expect(partCounts.get(5)).toBe(12);
    for (let part = 6; part <= 11; part += 1) {
      expect(partCounts.get(part)).toBe(6);
    }
    expect(maxHeight).toBeGreaterThan(1.05);
  });

  test("default P0 country grass stays inside the user-authorized geometry envelope", () => {
    expect(VEGETATION_NEAR_TRIANGLES_PER_INSTANCE).toBe(50);
    expect(VEGETATION_MID_CLUSTERS_PER_INSTANCE).toBe(2);
    expect(VEGETATION_MID_TRIANGLES_PER_CLUSTER).toBe(6);
    expect(VEGETATION_MID_TRIANGLES_PER_INSTANCE).toBe(12);
    expect(VEGETATION_TRIANGLES_PER_INSTANCE).toBe(62);

    const defaultInstances = 1500;
    const countryClusters = defaultInstances * VEGETATION_MID_CLUSTERS_PER_INSTANCE;
    const addedTriangles = defaultInstances * VEGETATION_MID_TRIANGLES_PER_INSTANCE;
    expect(countryClusters).toBe(3000);
    expect(addedTriangles).toBe(18_000);
    expect(addedTriangles).toBeLessThanOrEqual(35_000 * 1.30);
    expect(addedTriangles).toBeGreaterThanOrEqual(20_000 * 0.70);
  });
});
