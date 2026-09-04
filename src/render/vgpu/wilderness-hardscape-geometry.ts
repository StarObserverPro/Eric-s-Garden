import {
  createHardscapeGeometryData,
  HARDSCAPE_VERTEX_STRIDE_FLOATS,
  type HardscapeGeometryStats,
} from "./hardscape-geometry";
import {
  createWildernessSceneryGeometryData,
  type WildernessSceneryStats,
} from "./wilderness-scenery-geometry";

export interface WildernessHardscapeGeometryStats extends HardscapeGeometryStats {
  readonly baseTriangleCount: number;
  readonly wilderness: WildernessSceneryStats;
}

export interface WildernessHardscapeGeometryData {
  readonly data: Float32Array<ArrayBuffer>;
  readonly stats: WildernessHardscapeGeometryStats;
}

/** Compose P0 static scenery into the existing hardscape vertex stream so the
 * renderer still records exactly one hardscape draw. */
export function createWildernessHardscapeGeometryData(): WildernessHardscapeGeometryData {
  const base = createHardscapeGeometryData();
  const wilderness = createWildernessSceneryGeometryData();
  const data = new Float32Array(base.data.length + wilderness.data.length) as Float32Array<ArrayBuffer>;
  data.set(base.data, 0);
  data.set(wilderness.data, base.data.length);

  const triangleCount = base.stats.triangleCount + wilderness.stats.triangleCount;
  return {
    data,
    stats: {
      ...base.stats,
      baseTriangleCount: base.stats.triangleCount,
      wilderness: wilderness.stats,
      triangleCount,
      vertexCount: triangleCount * 3,
    },
  };
}

export { HARDSCAPE_VERTEX_STRIDE_FLOATS };
