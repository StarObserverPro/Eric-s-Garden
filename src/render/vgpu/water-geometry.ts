import {
  POND_CENTER_X,
  POND_CENTER_Z,
  POND_RADIUS_X,
  POND_RADIUS_Z,
  POND_WATER_RADIUS,
  POND_WATER_Y,
  pondRadiusAt,
  terrainHeightAt,
} from "./terrain-surface";

export const WATER_GRID_X = 24;
export const WATER_GRID_Z = 16;
export const WATER_VERTEX_STRIDE_FLOATS = 4;

export interface WaterGeometryStats {
  readonly triangleCount: number;
  readonly vertexCount: number;
  readonly maxDepth: number;
  readonly minDepth: number;
}

export interface WaterGeometryData {
  readonly data: Float32Array<ArrayBuffer>;
  readonly stats: WaterGeometryStats;
}

interface WaterPoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly depth: number;
  readonly radius: number;
}

/**
 * Small regular water grid clipped by the actual carved terrain. No alpha or
 * fragment discard is needed: cells only exist where all corners are below the
 * level water datum and inside the irregular pond footprint.
 */
export function createWaterGeometryData(): WaterGeometryData {
  const rows: WaterPoint[][] = [];
  for (let zIndex = 0; zIndex <= WATER_GRID_Z; zIndex += 1) {
    const row: WaterPoint[] = [];
    const v = -1 + zIndex / WATER_GRID_Z * 2;
    for (let xIndex = 0; xIndex <= WATER_GRID_X; xIndex += 1) {
      const u = -1 + xIndex / WATER_GRID_X * 2;
      const x = POND_CENTER_X + u * POND_RADIUS_X * 0.94;
      const z = POND_CENTER_Z + v * POND_RADIUS_Z * 0.94;
      const terrainY = terrainHeightAt(x, z);
      row.push({
        x,
        y: POND_WATER_Y,
        z,
        depth: Math.max(0, POND_WATER_Y - terrainY),
        radius: pondRadiusAt(x, z),
      });
    }
    rows.push(row);
  }

  const output: number[] = [];
  let triangles = 0;
  let minDepth = Number.POSITIVE_INFINITY;
  let maxDepth = 0;

  for (let zIndex = 0; zIndex < WATER_GRID_Z; zIndex += 1) {
    for (let xIndex = 0; xIndex < WATER_GRID_X; xIndex += 1) {
      const a = rows[zIndex]![xIndex]!;
      const b = rows[zIndex]![xIndex + 1]!;
      const c = rows[zIndex + 1]![xIndex + 1]!;
      const d = rows[zIndex + 1]![xIndex]!;
      const points = [a, b, c, d] as const;
      if (!points.every((point) => point.depth > 0.006 && point.radius < POND_WATER_RADIUS)) continue;

      pushTriangle(output, a, b, c);
      pushTriangle(output, a, c, d);
      triangles += 2;
      for (const point of points) {
        minDepth = Math.min(minDepth, point.depth);
        maxDepth = Math.max(maxDepth, point.depth);
      }
    }
  }

  if (triangles === 0) throw new Error("P1 pond water geometry produced no submerged cells.");
  const data = new Float32Array(output) as Float32Array<ArrayBuffer>;
  return {
    data,
    stats: {
      triangleCount: triangles,
      vertexCount: triangles * 3,
      maxDepth,
      minDepth,
    },
  };
}

function pushTriangle(output: number[], a: WaterPoint, b: WaterPoint, c: WaterPoint): void {
  for (const point of [a, b, c]) {
    output.push(point.x, point.y, point.z, point.depth);
  }
}
