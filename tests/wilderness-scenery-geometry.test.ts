import { expect, test } from "vitest";

import { createWildernessHardscapeGeometryData } from "../src/render/vgpu/wilderness-hardscape-geometry";
import {
  createWildernessSceneryGeometryData,
  WILDERNESS_MATERIAL,
  WILDERNESS_VERTEX_STRIDE_FLOATS,
} from "../src/render/vgpu/wilderness-scenery-geometry";
import {
  TERRAIN_MAX_X,
  TERRAIN_MAX_Z,
} from "../src/render/vgpu/terrain-surface";

test("P0 scenery stays procedural, static and inside its geometry envelope", () => {
  const scenery = createWildernessSceneryGeometryData();
  expect(scenery.stats.gateTriangles).toBeGreaterThan(60);
  expect(scenery.stats.tractorTriangles).toBeGreaterThanOrEqual(2_000);
  expect(scenery.stats.tractorTriangles).toBeLessThanOrEqual(4_000 * 1.30);
  expect(scenery.stats.workCornerTriangles).toBeGreaterThan(1_200);
  expect(scenery.stats.boundaryTriangles).toBeGreaterThan(3_000);
  expect(scenery.stats.triangleCount).toBeGreaterThanOrEqual(6_000 * 0.70);
  expect(scenery.stats.triangleCount).toBeLessThanOrEqual(12_000 * 1.30);
  expect(scenery.data.length).toBe(scenery.stats.vertexCount * WILDERNESS_VERTEX_STRIDE_FLOATS);
});

test("P0 scenery uses bounded world geometry and the intended material families", () => {
  const { data } = createWildernessSceneryGeometryData();
  const kinds = new Set<number>();
  let invalid = 0;
  let outOfBounds = 0;
  let minNormalLength = Number.POSITIVE_INFINITY;
  let maxNormalLength = 0;

  for (let offset = 0; offset < data.length; offset += WILDERNESS_VERTEX_STRIDE_FLOATS) {
    const x = data[offset]!;
    const z = data[offset + 2]!;
    const nx = data[offset + 3]!;
    const ny = data[offset + 4]!;
    const nz = data[offset + 5]!;
    const kind = data[offset + 6]!;
    for (let index = 0; index < WILDERNESS_VERTEX_STRIDE_FLOATS; index += 1) {
      if (!Number.isFinite(data[offset + index]!)) invalid += 1;
    }
    if (Math.abs(x) > TERRAIN_MAX_X || Math.abs(z) > TERRAIN_MAX_Z) outOfBounds += 1;
    const length = Math.hypot(nx, ny, nz);
    minNormalLength = Math.min(minNormalLength, length);
    maxNormalLength = Math.max(maxNormalLength, length);
    kinds.add(Math.round(kind));
  }

  expect(invalid).toBe(0);
  expect(outOfBounds).toBe(0);
  expect(minNormalLength).toBeGreaterThan(0.98);
  expect(maxNormalLength).toBeLessThan(1.02);
  expect([...kinds].sort((a, b) => a - b)).toEqual([2, 3, 4, 5, 6]);
});

test("P0 tree crowns and hedge foliage are watertight after procedural deformation", () => {
  const { data } = createWildernessSceneryGeometryData();
  const edgeUse = new Map<string, number>();
  let foliageTriangles = 0;

  const vertexKey = (offset: number): string => [0, 1, 2]
    .map((axis) => Math.round(data[offset + axis]! * 100_000))
    .join(":");
  const addEdge = (a: string, b: string): void => {
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    edgeUse.set(key, (edgeUse.get(key) ?? 0) + 1);
  };

  const triangleStride = WILDERNESS_VERTEX_STRIDE_FLOATS * 3;
  for (let offset = 0; offset < data.length; offset += triangleStride) {
    const kind = Math.round(data[offset + 6]!);
    if (kind !== WILDERNESS_MATERIAL.foliage) continue;
    foliageTriangles += 1;
    const a = vertexKey(offset);
    const b = vertexKey(offset + WILDERNESS_VERTEX_STRIDE_FLOATS);
    const c = vertexKey(offset + WILDERNESS_VERTEX_STRIDE_FLOATS * 2);
    expect(a).not.toBe(b);
    expect(b).not.toBe(c);
    expect(c).not.toBe(a);
    addEdge(a, b);
    addEdge(b, c);
    addEdge(c, a);
  }

  expect(foliageTriangles).toBeGreaterThan(3_000);
  const openOrSplitEdges = [...edgeUse.values()].filter((count) => count !== 2);
  expect(openOrSplitEdges).toEqual([]);
});

test("P0 static scenery composes into the existing hardscape draw stream", () => {
  const combined = createWildernessHardscapeGeometryData();
  expect(combined.stats.baseTriangleCount).toBeGreaterThan(15_000);
  expect(combined.stats.wilderness.triangleCount).toBeGreaterThan(4_200);
  expect(combined.stats.triangleCount).toBe(
    combined.stats.baseTriangleCount + combined.stats.wilderness.triangleCount,
  );
  expect(combined.data.length).toBe(combined.stats.vertexCount * WILDERNESS_VERTEX_STRIDE_FLOATS);
});
