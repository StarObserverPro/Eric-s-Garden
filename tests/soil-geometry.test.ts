import { describe, expect, test } from "vitest";

import {
  SOIL_CLODS_PER_PLOT,
  SOIL_GRID_RESOLUTION,
  SOIL_VERTEX_STRIDE_FLOATS,
  createSoilGeometryData,
} from "../src/render/vgpu/soil-geometry";

describe("procedural soil geometry", () => {
  test("builds real relief, collapsing shoulders and hundreds of faceted aggregates", () => {
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

    for (let offset = 0; offset < data.length; offset += SOIL_VERTEX_STRIDE_FLOATS) {
      const type = Math.round(data[offset + 8]!);
      plotIndices.add(Math.round(data[offset + 6]!));
      surfaceTypes.add(type);
      if (type === 0) {
        minTop = Math.min(minTop, data[offset + 1]!);
        maxTop = Math.max(maxTop, data[offset + 1]!);
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
    expect(maxTop - minTop).toBeGreaterThan(0.34);
  });
});
