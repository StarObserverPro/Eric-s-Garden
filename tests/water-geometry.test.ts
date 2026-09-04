import { expect, test } from "vitest";

import {
  createWaterGeometryData,
  WATER_GRID_X,
  WATER_GRID_Z,
  WATER_VERTEX_STRIDE_FLOATS,
} from "../src/render/vgpu/water-geometry";
import {
  POND_CENTER_X,
  POND_CENTER_Z,
  POND_RADIUS_X,
  POND_RADIUS_Z,
  POND_WATER_Y,
  pondRadiusAt,
  pondWetShoreAt,
  terrainHeightAt,
} from "../src/render/vgpu/terrain-surface";

test("P1 pond is one analytic basin with a dry outer bank", () => {
  expect(terrainHeightAt(POND_CENTER_X, POND_CENTER_Z)).toBeLessThan(POND_WATER_Y - 0.35);
  expect(pondWetShoreAt(POND_CENTER_X, POND_CENTER_Z)).toBeLessThan(0.01);

  for (let index = 0; index < 24; index += 1) {
    const angle = index / 24 * Math.PI * 2;
    const x = POND_CENTER_X + Math.cos(angle) * POND_RADIUS_X * 1.25;
    const z = POND_CENTER_Z + Math.sin(angle) * POND_RADIUS_Z * 1.25;
    expect(terrainHeightAt(x, z)).toBeGreaterThan(POND_WATER_Y + 0.02);
  }

  const wetX = POND_CENTER_X + POND_RADIUS_X * 0.90;
  expect(pondWetShoreAt(wetX, POND_CENTER_Z)).toBeGreaterThan(0.45);
  expect(pondWetShoreAt(POND_CENTER_X + POND_RADIUS_X * 1.45, POND_CENTER_Z)).toBeLessThan(0.01);
});

test("water grid is bounded, submerged and remains far below the P1 triangle budget", () => {
  const water = createWaterGeometryData();
  expect(WATER_GRID_X).toBe(24);
  expect(WATER_GRID_Z).toBe(16);
  expect(water.stats.triangleCount).toBeGreaterThan(250);
  expect(water.stats.triangleCount).toBeLessThan(1_500);
  expect(water.stats.vertexCount).toBe(water.stats.triangleCount * 3);
  expect(water.data.length).toBe(water.stats.vertexCount * WATER_VERTEX_STRIDE_FLOATS);
  expect(water.stats.minDepth).toBeGreaterThan(0.006);
  expect(water.stats.maxDepth).toBeGreaterThan(0.30);

  for (let offset = 0; offset < water.data.length; offset += WATER_VERTEX_STRIDE_FLOATS) {
    const x = water.data[offset]!;
    const y = water.data[offset + 1]!;
    const z = water.data[offset + 2]!;
    const depth = water.data[offset + 3]!;
    expect(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z) && Number.isFinite(depth)).toBe(true);
    expect(y).toBeCloseTo(POND_WATER_Y, 5);
    expect(depth).toBeGreaterThan(0.006);
    expect(pondRadiusAt(x, z)).toBeLessThan(0.91);
    expect(terrainHeightAt(x, z)).toBeLessThan(y);
  }
});
