import { describe, expect, test } from "vitest";

import {
  SOIL_CLODS_PER_PLOT,
  SOIL_GRID_RESOLUTION,
  SOIL_VERTEX_STRIDE_FLOATS,
  createSoilGeometryData,
} from "../src/render/vgpu/soil-geometry";
import { terrainHeightAt } from "../src/render/vgpu/terrain-surface";
import { PLOT_POSITIONS } from "../src/scene/snapshot";

describe("procedural soil geometry", () => {
  test("builds cultivated relief with terrain-conforming shoulders and faceted aggregates", () => {
    const { data, stats } = createSoilGeometryData();
    expect(stats.gridResolution).toBe(SOIL_GRID_RESOLUTION);
    expect(stats.clodCount).toBe(SOIL_CLODS_PER_PLOT * 12);
    expect(stats.triangleCount).toBeGreaterThan(140_000);
    expect(stats.vertexCount).toBe(stats.triangleCount * 3);
    expect(data.length).toBe(stats.vertexCount * SOIL_VERTEX_STRIDE_FLOATS);

    const plotIndices = new Set<number>();
    const surfaceTypes = new Set<number>();
    let minTop = Number.POSITIVE_INFINITY;
    let maxTop = Number.NEGATIVE_INFINITY;
    let sampledNormals = 0;
    let edgeSamples = 0;
    let maxEdgeLift = Number.NEGATIVE_INFINITY;
    let minEdgeLift = Number.POSITIVE_INFINITY;

    for (let offset = 0; offset < data.length; offset += SOIL_VERTEX_STRIDE_FLOATS) {
      const type = Math.round(data[offset + 8]!);
      const plotIndex = Math.round(data[offset + 6]!);
      plotIndices.add(plotIndex);
      surfaceTypes.add(type);
      if (type === 0) {
        const x = data[offset]!;
        const y = data[offset + 1]!;
        const z = data[offset + 2]!;
        minTop = Math.min(minTop, y);
        maxTop = Math.max(maxTop, y);
        const center = PLOT_POSITIONS[plotIndex]!;
        const localEdge = Math.max(Math.abs(x - center[0]), Math.abs(z - center[2]));
        if (localEdge > 0.62) {
          const edgeLift = y - terrainHeightAt(x, z);
          maxEdgeLift = Math.max(maxEdgeLift, edgeLift);
          minEdgeLift = Math.min(minEdgeLift, edgeLift);
          edgeSamples += 1;
        }
      }
      if (sampledNormals < 200 && offset % (SOIL_VERTEX_STRIDE_FLOATS * 97) === 0) {
        const nx = data[offset + 3]!;
        const ny = data[offset + 4]!;
        const nz = data[offset + 5]!;
        expect(Math.hypot(nx, ny, nz)).toBeCloseTo(1, 4);
        sampledNormals += 1;
      }
    }

    expect(plotIndices.size).toBe(12);
    expect(surfaceTypes).toEqual(new Set([0, 1, 2]));
    expect(maxTop - minTop).toBeGreaterThan(0.15);
    expect(maxTop - minTop).toBeLessThan(0.28);
    expect(minTop).toBeGreaterThan(-0.24);
    expect(maxTop).toBeLessThan(0.06);
    expect(edgeSamples).toBeGreaterThan(2_000);
    expect(minEdgeLift).toBeGreaterThan(-0.006);
    expect(maxEdgeLift).toBeLessThan(0.028);
  });
});
