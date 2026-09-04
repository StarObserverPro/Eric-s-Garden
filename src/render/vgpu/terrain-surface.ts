export type TerrainVec3 = readonly [number, number, number];

export const TERRAIN_OUTER_Y = -0.378;
export const TERRAIN_INNER_Y = -0.205;
// The playable garden still lives inside roughly +/-6 m, but the same terrain
// authority continues into a deliberately coarse distant carrier. Its outer
// boundary sits well beyond the fence so the skyline is produced by geometry,
// not by the sky pass.
export const TERRAIN_MIN_X = -72;
export const TERRAIN_MAX_X = 72;
export const TERRAIN_MIN_Z = -60;
export const TERRAIN_MAX_Z = 60;

// P1 pond authority. The pond sits on the back-left diagonal, away from P0's
// east-gate road / tractor work corner so both enrichment carriers remain
// readable without competing for the same silhouette.
export const POND_CENTER_X = -10.0;
export const POND_CENTER_Z = 10.5;
export const POND_RADIUS_X = 3.6;
export const POND_RADIUS_Z = 2.6;
export const POND_WATER_RADIUS = 0.90;

const BED_HALF_EXTENT = 0.70;
const POND_WATERLINE_SAMPLE_RADIUS = 1.18;

/**
 * A level water datum chosen from the lowest part of the uncarved outer bank.
 * This keeps every water vertex inside actual terrain instead of letting a
 * fixed arbitrary Y plane leak through the downhill shore.
 */
export const POND_WATER_Y = calculatePondWaterLevel();

/**
 * Analytic height authority shared by the visible low-poly terrain and anything
 * that must physically sit on or feather into it. Keep this independent from
 * render-target tessellation so density changes cannot reopen height seams.
 */
export function terrainHeightAt(x: number, z: number): number {
  const base = terrainBaseHeightAt(x, z);
  return applyPondBasin(base, x, z);
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

/**
 * Irregular normalized pond radius. A value near 1 is the outer bank. The two
 * low-frequency warps prevent the shoreline from becoming a clean ellipse.
 */
export function pondRadiusAt(x: number, z: number): number {
  const dx = (x - POND_CENTER_X) / POND_RADIUS_X;
  const dz = (z - POND_CENTER_Z) / POND_RADIUS_Z;
  const warpedX = dx
    + Math.sin(dz * 2.7 + 0.4) * 0.055
    + Math.sin((dx - dz) * 4.1) * 0.025;
  const warpedZ = dz + Math.sin(dx * 3.1 - 1.1) * 0.045;
  return Math.hypot(warpedX, warpedZ);
}

/** Renderer-only wet/mud shoreline mask. */
export function pondWetShoreAt(x: number, z: number): number {
  const radius = pondRadiusAt(x, z);
  const fromWater = smoothstep(0.66, 0.82, radius);
  const toMeadow = 1 - smoothstep(1.02, 1.20, radius);
  return fromWater * toMeadow;
}

/** Positive where the terrain lies below the level water surface. */
export function pondWaterDepthAt(x: number, z: number): number {
  return Math.max(0, POND_WATER_Y - terrainHeightAt(x, z));
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

function terrainBaseHeightAt(x: number, z: number): number {
  const dx = Math.max(0, Math.abs(x) - 3.20);
  const dz = Math.max(0, Math.abs(z) - 2.55);
  const outsideBedField = Math.hypot(dx, dz);
  const innerInfluence = 1 - smoothstep(0.05, 1.35, outsideBedField);
  const broad = valueNoise2(x * 0.55, z * 0.55) - 0.5;
  const fine = valueNoise2(x * 1.9 + 6.4, z * 1.9 - 3.8) - 0.5;
  const broadAmplitude = lerp(0.036, 0.016, innerInfluence);
  const fineAmplitude = lerp(0.008, 0.012, innerInfluence);
  const localSurface = lerp(TERRAIN_OUTER_Y, TERRAIN_INNER_Y, innerInfluence)
    + broad * broadAmplitude
    + fine * fineAmplitude;

  // Beyond the local garden the same surface becomes broad rolling country.
  // This starts far outside the fence, so it cannot disturb bed/path contact,
  // and reaches eye-level ridges only at long distance where mesh density is
  // intentionally low and atmospheric fog is already strong.
  const radius = Math.hypot(x, z);
  const farInfluence = smoothstep(12, 38, radius);
  const distantBroad = valueNoise2(x * 0.031 + 8.7, z * 0.031 - 4.9) - 0.5;
  const distantMedium = valueNoise2(x * 0.071 - 12.4, z * 0.071 + 6.2) - 0.5;
  const farRise = farInfluence * (
    3.15
    + distantBroad * 2.20
    + distantMedium * 1.10
  );

  return localSurface + farRise;
}

function applyPondBasin(base: number, x: number, z: number): number {
  const radius = pondRadiusAt(x, z);
  if (radius >= 1.28) return base;

  // The bowl profile stays comfortably below water through most of the inner
  // footprint, then rises through a shallow shelf before meeting the bank.
  const bowl = smoothstep(0, 0.94, radius);
  const target = POND_WATER_Y
    - 0.46 * (1 - bowl)
    + Math.max(0, radius - 0.72) * 0.15;
  const carve = 1 - smoothstep(0.90, 1.28, radius);
  return lerp(base, Math.min(base, target), carve);
}

function calculatePondWaterLevel(): number {
  let lowestBank = Number.POSITIVE_INFINITY;
  const samples = 64;
  for (let index = 0; index < samples; index += 1) {
    const angle = index / samples * Math.PI * 2;
    const x = POND_CENTER_X + Math.cos(angle) * POND_RADIUS_X * POND_WATERLINE_SAMPLE_RADIUS;
    const z = POND_CENTER_Z + Math.sin(angle) * POND_RADIUS_Z * POND_WATERLINE_SAMPLE_RADIUS;
    lowestBank = Math.min(lowestBank, terrainBaseHeightAt(x, z));
  }
  return lowestBank - 0.045;
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
