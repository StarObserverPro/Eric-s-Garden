import { expect, test } from "vitest";

import {
  createHardscapeGeometryData,
  HARDSCAPE_FENCE_POST_COUNT,
  HARDSCAPE_FENCE_RAIL_SEGMENT_COUNT,
  HARDSCAPE_STONE_COUNT,
  HARDSCAPE_VERTEX_STRIDE_FLOATS,
} from "../src/render/vgpu/hardscape-geometry";

test("hardscape bakes bed gaps, irregular stones and rustic fence into one static mesh", () => {
  const hardscape = createHardscapeGeometryData();
  expect(hardscape.stats.stoneCount).toBe(HARDSCAPE_STONE_COUNT);
  expect(hardscape.stats.fencePostCount).toBe(HARDSCAPE_FENCE_POST_COUNT);
  expect(hardscape.stats.fenceRailSegmentCount).toBe(HARDSCAPE_FENCE_RAIL_SEGMENT_COUNT);
  expect(hardscape.stats.gapTriangles).toBe(836);
  expect(hardscape.stats.stoneTriangles).toBe(HARDSCAPE_STONE_COUNT * 40);
  expect(hardscape.stats.fenceTriangles).toBe(912);
  expect(hardscape.stats.triangleCount).toBe(2_868);
  expect(hardscape.data.length).toBe(hardscape.stats.vertexCount * HARDSCAPE_VERTEX_STRIDE_FLOATS);
});

test("hardscape vertices remain finite, bounded and carry all three material families", () => {
  const { data } = createHardscapeGeometryData();
  const kinds = new Set<number>();
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (let offset = 0; offset < data.length; offset += HARDSCAPE_VERTEX_STRIDE_FLOATS) {
    const x = data[offset]!;
    const y = data[offset + 1]!;
    const z = data[offset + 2]!;
    const nx = data[offset + 3]!;
    const ny = data[offset + 4]!;
    const nz = data[offset + 5]!;
    const kind = data[offset + 6]!;
    for (const value of [x, y, z, nx, ny, nz, kind, data[offset + 7]!, data[offset + 8]!]) {
      expect(Number.isFinite(value)).toBe(true);
    }
    expect(Math.abs(x)).toBeLessThanOrEqual(4.95);
    expect(Math.abs(z)).toBeLessThanOrEqual(3.70);
    const normalLength = Math.hypot(nx, ny, nz);
    expect(normalLength).toBeGreaterThan(0.98);
    expect(normalLength).toBeLessThan(1.02);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    kinds.add(Math.round(kind));
  }

  expect(minY).toBeGreaterThan(-0.46);
  expect(maxY).toBeGreaterThan(0.75);
  expect(maxY).toBeLessThan(0.90);
  expect([...kinds].sort()).toEqual([0, 1, 2]);
});
