export type TerrainVec3 = readonly [number, number, number];

export const TERRAIN_OUTER_Y = -0.378;
export const TERRAIN_INNER_Y = -0.205;
export const TERRAIN_MIN_X = -5.70;
export const TERRAIN_MAX_X = 5.70;
export const TERRAIN_MIN_Z = -4.30;
export const TERRAIN_MAX_Z = 4.30;

const BED_HALF_EXTENT = 0.70;

/**
 * Analytic height authority shared by the visible low-poly terrain and anything
 * that must physically sit on or feather into it. Keep this independent from
 * render-target tessellation so density changes cannot reopen height seams.
 */
export function terrainHeightAt(x: number, z: number): number {
  const dx = Math.max(0, Math.abs(x) - 3.20);
  const dz = Math.max(0, Math.abs(z) - 2.55);
  const outsideBedField = Math.hypot(dx, dz);
  const innerInfluence = 1 - smoothstep(0.05, 1.35, outsideBedField);
  const broad = valueNoise2(x * 0.55, z * 0.55) - 0.5;
  const fine = valueNoise2(x * 1.9 + 6.4, z * 1.9 - 3.8) - 0.5;
  const broadAmplitude = lerp(0.036, 0.016, innerInfluence);
  const fineAmplitude = lerp(0.008, 0.012, innerInfluence);
  return lerp(TERRAIN_OUTER_Y, TERRAIN_INNER_Y, innerInfluence)
    + broad * broadAmplitude
    + fine * fineAmplitude;
}

/** Smooth analytic normal used by the terrain carrier to avoid exposing its
 * adaptive tessellation as a checkerboard lighting pattern. */
export function terrainNormalAt(x: number, z: number): TerrainVec3 {
  const eps = 0.075;
  const left = terrainHeightAt(x - eps, z);
  const right = terrainHeightAt(x + eps, z);
  const down = terrainHeightAt(x, z - eps);
  const up = terrainHeightAt(x, z + eps);
  return normalize([left - right, eps * 2, down - up]);
}

export function nearestBedEdgeDistance(x: number, z: number): number {
  let closest = Number.POSITIVE_INFINITY;
  for (let index = 0; index < 12; index += 1) {
    const centerX = (index % 4 - 1.5) * 1.65;
    const centerZ = (Math.floor(index / 4) - 1) * 1.75;
    const dx = Math.max(0, Math.abs(x - centerX) - BED_HALF_EXTENT);
    const dz = Math.max(0, Math.abs(z - centerZ) - BED_HALF_EXTENT);
    closest = Math.min(closest, Math.hypot(dx, dz));
  }
  return closest;
}

function valueNoise2(x: number, z: number): number {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const tx = smooth01(x - x0);
  const tz = smooth01(z - z0);
  const a = hash2(x0, z0);
  const b = hash2(x0 + 1, z0);
  const c = hash2(x0, z0 + 1);
  const d = hash2(x0 + 1, z0 + 1);
  return lerp(lerp(a, b, tx), lerp(c, d, tx), tz);
}

function hash2(x: number, z: number): number {
  const sine = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return sine - Math.floor(sine);
}

function smooth01(value: number): number {
  return value * value * (3 - 2 * value);
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return smooth01(t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function normalize(value: TerrainVec3): TerrainVec3 {
  const length = Math.hypot(value[0], value[1], value[2]);
  if (length < 0.000001) return [0, 1, 0];
  return [value[0] / length, value[1] / length, value[2] / length];
}
