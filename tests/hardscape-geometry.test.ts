import { expect, test } from "vitest";

import {
  createHardscapeGeometryData,
  createStoneCenters,
  HARDSCAPE_FENCE_POST_COUNT,
  HARDSCAPE_FENCE_RAIL_SEGMENT_COUNT,
  HARDSCAPE_STONE_COUNT,
  HARDSCAPE_STONE_MIN_SEPARATION,
  HARDSCAPE_VERTEX_STRIDE_FLOATS,
  TERRAIN_INNER_Y,
  TERRAIN_OUTER_Y,
  terrainHeightAt,
} from "../src/render/vgpu/hardscape-geometry";

test("hardscape bakes adaptive terrain, outward stones and stable rustic fence into one static mesh", () => {
  const hardscape = createHardscapeGeometryData();
  expect(hardscape.stats.stoneCount).toBe(HARDSCAPE_STONE_COUNT);
  expect(hardscape.stats.fencePostCount).toBe(HARDSCAPE_FENCE_POST_COUNT);
  expect(hardscape.stats.fenceRailSegmentCount).toBe(HARDSCAPE_FENCE_RAIL_SEGMENT_COUNT);
  expect(hardscape.stats.terrainTriangles).toBeGreaterThan(4_000);
  expect(hardscape.stats.terrainTriangles).toBeLessThan(7_000);
  expect(hardscape.stats.gapTriangles).toBe(hardscape.stats.terrainTriangles);
  expect(hardscape.stats.stoneTriangles).toBe(HARDSCAPE_STONE_COUNT * 40);
  expect(hardscape.stats.fenceTriangles).toBe(912);
  expect(hardscape.stats.triangleCount).toBe(
    hardscape.stats.terrainTriangles + hardscape.stats.stoneTriangles + hardscape.stats.fenceTriangles,
  );
  expect(hardscape.data.length).toBe(hardscape.stats.vertexCount * HARDSCAPE_VERTEX_STRIDE_FLOATS);
});

test("terrain spends more triangles around the bed field while preserving a smooth analytic surface", () => {
  const { data, stats } = createHardscapeGeometryData();
  let centralTriangles = 0;
  let outerTriangles = 0;
  let smoothNormalTriangles = 0;

  for (let triangle = 0; triangle < stats.terrainTriangles; triangle += 1) {
    const base = triangle * 3 * HARDSCAPE_VERTEX_STRIDE_FLOATS;
    const vertices = [0, 1, 2].map((vertex) => {
      const offset = base + vertex * HARDSCAPE_VERTEX_STRIDE_FLOATS;
      return {
        x: data[offset]!,
        z: data[offset + 2]!,
        normal: [data[offset + 3]!, data[offset + 4]!, data[offset + 5]!] as const,
      };
    });
    const centerX = (vertices[0]!.x + vertices[1]!.x + vertices[2]!.x) / 3;
    const centerZ = (vertices[0]!.z + vertices[1]!.z + vertices[2]!.z) / 3;
    if (Math.abs(centerX) < 3.2 && Math.abs(centerZ) < 2.55) centralTriangles += 1;
    if (Math.abs(centerX) > 4.1 || Math.abs(centerZ) > 3.25) outerTriangles += 1;

    const a = vertices[0]!.normal;
    const b = vertices[1]!.normal;
    const c = vertices[2]!.normal;
    const normalSpread = Math.max(
      Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]),
      Math.hypot(a[0] - c[0], a[1] - c[1], a[2] - c[2]),
      Math.hypot(b[0] - c[0], b[1] - c[1], b[2] - c[2]),
    );
    if (normalSpread > 0.001) smoothNormalTriangles += 1;
  }

  expect(centralTriangles).toBeGreaterThan(outerTriangles * 2);
  expect(smoothNormalTriangles).toBeGreaterThan(stats.terrainTriangles * 0.75);

  const inner = terrainHeightAt(0, 0);
  const outer = terrainHeightAt(5.5, 4.0);
  expect(inner).toBeGreaterThan(TERRAIN_INNER_Y - 0.03);
  expect(inner).toBeLessThan(TERRAIN_INNER_Y + 0.03);
  expect(outer).toBeGreaterThan(TERRAIN_OUTER_Y - 0.04);
  expect(outer).toBeLessThan(TERRAIN_OUTER_Y + 0.04);
  expect(inner - outer).toBeGreaterThan(0.14);
});

test("stepping stones use deterministic constrained random placement rather than mirrored rows", () => {
  const first = createStoneCenters();
  const second = createStoneCenters();
  expect(first).toEqual(second);
  expect(first).toHaveLength(HARDSCAPE_STONE_COUNT);

  let mirroredMatches = 0;
  for (let index = 0; index < first.length; index += 1) {
    for (let other = index + 1; other < first.length; other += 1) {
      const distance = Math.hypot(
        first[index]![0] - first[other]![0],
        first[index]![2] - first[other]![2],
      );
      expect(distance).toBeGreaterThanOrEqual(HARDSCAPE_STONE_MIN_SEPARATION - 1e-6);
    }
    if (first.some((candidate, candidateIndex) => (
      candidateIndex !== index
      && Math.abs(candidate[0] + first[index]![0]) < 0.02
      && Math.abs(candidate[2] - first[index]![2]) < 0.02
    ))) {
      mirroredMatches += 1;
    }
  }
  expect(mirroredMatches).toBeLessThan(4);
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
    expect(Math.abs(x)).toBeLessThanOrEqual(5.75);
    expect(Math.abs(z)).toBeLessThanOrEqual(4.35);
    const normalLength = Math.hypot(nx, ny, nz);
    expect(normalLength).toBeGreaterThan(0.98);
    expect(normalLength).toBeLessThan(1.02);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    kinds.add(Math.round(kind));
  }

  expect(minY).toBeGreaterThan(-0.46);
  expect(maxY).toBeGreaterThan(0.74);
  expect(maxY).toBeLessThan(0.84);
  expect([...kinds].sort()).toEqual([0, 1, 2]);
});
