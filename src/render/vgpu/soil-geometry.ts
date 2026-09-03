import { PLOT_POSITIONS } from "../../scene/snapshot";
import { terrainHeightAt } from "./terrain-surface";

export const SOIL_GRID_RESOLUTION = 72;
export const SOIL_CLODS_PER_PLOT = 40;
export const SOIL_VERTEX_STRIDE_FLOATS = 9;

const SOIL_HALF_EXTENT = 0.69;
const CLODS_SEGMENTS = 8;

type Vec3 = readonly [number, number, number];

interface SurfaceVertex {
  readonly position: Vec3;
  readonly normal: Vec3;
}

export interface SoilGeometryStats {
  readonly gridResolution: number;
  readonly clodCount: number;
  readonly surfaceTriangles: number;
  readonly skirtTriangles: number;
  readonly clodTriangles: number;
  readonly triangleCount: number;
  readonly vertexCount: number;
}

export interface SoilGeometryData {
  readonly data: Float32Array<ArrayBuffer>;
  readonly stats: SoilGeometryStats;
}

export function createSoilGeometryData(): SoilGeometryData {
  const output: number[] = [];
  let surfaceTriangles = 0;
  let skirtTriangles = 0;
  let clodTriangles = 0;
  let clodCount = 0;

  for (let plotIndex = 0; plotIndex < PLOT_POSITIONS.length; plotIndex += 1) {
    const surface = createPlotSurface(plotIndex);
    surfaceTriangles += appendSurface(output, surface, plotIndex);
    skirtTriangles += appendSkirt(output, surface, plotIndex);
    const clods = appendClods(output, plotIndex);
    clodTriangles += clods.triangles;
    clodCount += clods.count;
  }

  const triangleCount = surfaceTriangles + skirtTriangles + clodTriangles;
  const data = new Float32Array(output) as Float32Array<ArrayBuffer>;
  return {
    data,
    stats: {
      gridResolution: SOIL_GRID_RESOLUTION,
      clodCount,
      surfaceTriangles,
      skirtTriangles,
      clodTriangles,
      triangleCount,
      vertexCount: triangleCount * 3,
    },
  };
}

function createPlotSurface(plotIndex: number): SurfaceVertex[][] {
  const resolution = SOIL_GRID_RESOLUTION;
  const positions: Vec3[][] = Array.from({ length: resolution + 1 }, () => []);
  const seed = plotSeed(plotIndex);

  for (let z = 0; z <= resolution; z += 1) {
    const v = z / resolution * 2 - 1;
    for (let x = 0; x <= resolution; x += 1) {
      const u = x / resolution * 2 - 1;
      positions[z]![x] = soilWorldPoint(plotIndex, u, v, seed);
    }
  }

  const surface: SurfaceVertex[][] = Array.from({ length: resolution + 1 }, () => []);
  for (let z = 0; z <= resolution; z += 1) {
    for (let x = 0; x <= resolution; x += 1) {
      const left = positions[z]![Math.max(0, x - 1)]!;
      const right = positions[z]![Math.min(resolution, x + 1)]!;
      const down = positions[Math.max(0, z - 1)]![x]!;
      const up = positions[Math.min(resolution, z + 1)]![x]!;
      const tangentX = subtract(right, left);
      const tangentZ = subtract(up, down);
      surface[z]![x] = {
        position: positions[z]![x]!,
        normal: normalize(cross(tangentZ, tangentX)),
      };
    }
  }
  return surface;
}

function appendSurface(output: number[], surface: SurfaceVertex[][], plotIndex: number): number {
  const seed = materialSeed(plotIndex, 0);
  let triangles = 0;
  for (let z = 0; z < SOIL_GRID_RESOLUTION; z += 1) {
    for (let x = 0; x < SOIL_GRID_RESOLUTION; x += 1) {
      const a = surface[z]![x]!;
      const b = surface[z]![x + 1]!;
      const c = surface[z + 1]![x + 1]!;
      const d = surface[z + 1]![x]!;
      pushSurfaceTriangle(output, a, c, b, plotIndex, seed, 0);
      pushSurfaceTriangle(output, a, d, c, plotIndex, seed, 0);
      triangles += 2;
    }
  }
  return triangles;
}

function appendSkirt(output: number[], surface: SurfaceVertex[][], plotIndex: number): number {
  const r = SOIL_GRID_RESOLUTION;
  const seed = materialSeed(plotIndex, 1);
  const edges: readonly (readonly [SurfaceVertex, SurfaceVertex])[] = [
    ...Array.from({ length: r }, (_, x) => [surface[0]![x]!, surface[0]![x + 1]!] as const),
    ...Array.from({ length: r }, (_, z) => [surface[z]![r]!, surface[z + 1]![r]!] as const),
    ...Array.from({ length: r }, (_, x) => [surface[r]![r - x]!, surface[r]![r - x - 1]!] as const),
    ...Array.from({ length: r }, (_, z) => [surface[r - z]![0]!, surface[r - z - 1]![0]!] as const),
  ];

  for (const [a, b] of edges) {
    const bottomA: Vec3 = [
      a.position[0],
      terrainHeightAt(a.position[0], a.position[2]) - 0.008,
      a.position[2],
    ];
    const bottomB: Vec3 = [
      b.position[0],
      terrainHeightAt(b.position[0], b.position[2]) - 0.008,
      b.position[2],
    ];
    const normal = normalize(cross(subtract(b.position, a.position), subtract(bottomA, a.position)));
    pushFlatTriangle(output, a.position, b.position, bottomB, normal, plotIndex, seed, 1);
    pushFlatTriangle(output, a.position, bottomB, bottomA, normal, plotIndex, seed, 1);
  }
  return edges.length * 2;
}

function appendClods(output: number[], plotIndex: number): { triangles: number; count: number } {
  const rng = mulberry32(plotSeed(plotIndex) ^ 0x5f356495);
  let triangles = 0;
  let count = 0;

  for (let clodIndex = 0; clodIndex < SOIL_CLODS_PER_PLOT; clodIndex += 1) {
    let u = rng() * 1.56 - 0.78;
    let v = rng() * 1.56 - 0.78;
    for (let retry = 0; retry < 4 && u * u + v * v < 0.04; retry += 1) {
      u = rng() * 1.56 - 0.78;
      v = rng() * 1.56 - 0.78;
    }
    const center = soilWorldPoint(plotIndex, u, v, plotSeed(plotIndex));
    const large = rng() > 0.74;
    const radius = 0.021 + rng() * 0.032 + (large ? 0.025 + rng() * 0.024 : 0);
    const radiusX = radius * (0.72 + rng() * 0.66);
    const radiusZ = radius * (0.70 + rng() * 0.69);
    const height = radius * (0.54 + rng() * 0.78);
    const rotation = rng() * Math.PI * 2;
    const seed = rng();
    triangles += appendClod(
      output,
      [center[0], center[1] + 0.003, center[2]],
      radiusX,
      radiusZ,
      height,
      rotation,
      plotIndex,
      seed,
      rng,
    );
    count += 1;
  }

  return { triangles, count };
}

function appendClod(
  output: number[],
  center: Vec3,
  radiusX: number,
  radiusZ: number,
  height: number,
  rotation: number,
  plotIndex: number,
  seed: number,
  rng: () => number,
): number {
  const lower: Vec3[] = [];
  const middle: Vec3[] = [];
  const upper: Vec3[] = [];

  for (let index = 0; index < CLODS_SEGMENTS; index += 1) {
    const angle = rotation + index / CLODS_SEGMENTS * Math.PI * 2;
    lower.push(clodPoint(center, angle, radiusX * (0.75 + rng() * 0.18), radiusZ * (0.75 + rng() * 0.18), height * 0.05));
    middle.push(clodPoint(center, angle + 0.05 * (rng() - 0.5), radiusX * (0.9 + rng() * 0.24), radiusZ * (0.9 + rng() * 0.24), height * (0.42 + rng() * 0.08)));
    upper.push(clodPoint(center, angle + Math.PI / CLODS_SEGMENTS * 0.35, radiusX * (0.48 + rng() * 0.2), radiusZ * (0.48 + rng() * 0.2), height * (0.76 + rng() * 0.08)));
  }
  const top: Vec3 = [
    center[0] + (rng() - 0.5) * radiusX * 0.25,
    center[1] + height,
    center[2] + (rng() - 0.5) * radiusZ * 0.25,
  ];

  for (let index = 0; index < CLODS_SEGMENTS; index += 1) {
    const next = (index + 1) % CLODS_SEGMENTS;
    pushClodTriangle(output, lower[index]!, lower[next]!, middle[next]!, plotIndex, seed);
    pushClodTriangle(output, lower[index]!, middle[next]!, middle[index]!, plotIndex, seed);
    pushClodTriangle(output, middle[index]!, middle[next]!, upper[next]!, plotIndex, seed);
    pushClodTriangle(output, middle[index]!, upper[next]!, upper[index]!, plotIndex, seed);
    pushClodTriangle(output, upper[index]!, upper[next]!, top, plotIndex, seed);
  }
  return CLODS_SEGMENTS * 5;
}

function clodPoint(center: Vec3, angle: number, radiusX: number, radiusZ: number, y: number): Vec3 {
  return [
    center[0] + Math.cos(angle) * radiusX,
    center[1] + y,
    center[2] + Math.sin(angle) * radiusZ,
  ];
}

function pushSurfaceTriangle(
  output: number[],
  a: SurfaceVertex,
  b: SurfaceVertex,
  c: SurfaceVertex,
  plotIndex: number,
  seed: number,
  surfaceType: number,
): void {
  pushVertex(output, a.position, a.normal, plotIndex, seed, surfaceType);
  pushVertex(output, b.position, b.normal, plotIndex, seed, surfaceType);
  pushVertex(output, c.position, c.normal, plotIndex, seed, surfaceType);
}

function pushFlatTriangle(
  output: number[],
  a: Vec3,
  b: Vec3,
  c: Vec3,
  normal: Vec3,
  plotIndex: number,
  seed: number,
  surfaceType: number,
): void {
  pushVertex(output, a, normal, plotIndex, seed, surfaceType);
  pushVertex(output, b, normal, plotIndex, seed, surfaceType);
  pushVertex(output, c, normal, plotIndex, seed, surfaceType);
}

function pushClodTriangle(output: number[], a: Vec3, b: Vec3, c: Vec3, plotIndex: number, seed: number): void {
  let normal = normalize(cross(subtract(b, a), subtract(c, a)));
  if (normal[1] < -0.45) normal = [-normal[0], -normal[1], -normal[2]];
  pushFlatTriangle(output, a, b, c, normal, plotIndex, seed, 2);
}

function pushVertex(
  output: number[],
  position: Vec3,
  normal: Vec3,
  plotIndex: number,
  seed: number,
  surfaceType: number,
): void {
  output.push(
    position[0], position[1], position[2],
    normal[0], normal[1], normal[2],
    plotIndex,
    seed,
    surfaceType,
  );
}

function soilWorldPoint(plotIndex: number, u: number, v: number, seed: number): Vec3 {
  const center = PLOT_POSITIONS[plotIndex] ?? [0, 0, 0];
  const squareEdge = Math.max(Math.abs(u), Math.abs(v));
  const superEdge = Math.pow(Math.pow(Math.abs(u), 4) + Math.pow(Math.abs(v), 4), 0.25);
  const edgeInfluence = smoothstep(0.56, 1, squareEdge);
  const cornerInset = smoothstep(0.98, 1.19, superEdge) * 0.075;
  const warpX = (valueNoise(u * 2.3 + 3.7, v * 2.1 - 5.1, seed + 101) - 0.5) * 0.14 * edgeInfluence;
  const warpZ = (valueNoise(u * 2.0 - 6.2, v * 2.5 + 1.9, seed + 211) - 0.5) * 0.14 * edgeInfluence;
  const x = center[0] + u * SOIL_HALF_EXTENT * (1 - cornerInset) * (1 + warpX);
  const z = center[2] + v * SOIL_HALF_EXTENT * (1 - cornerInset) * (1 + warpZ);
  return [x, soilHeight(u, v, x, z, seed), z];
}

function soilHeight(u: number, v: number, worldX: number, worldZ: number, seed: number): number {
  const squareEdge = Math.max(Math.abs(u), Math.abs(v));
  const edgeDistance = Math.max(0, 1 - squareEdge);
  const detailMask = 1 - smoothstep(0.68, 0.98, squareEdge);
  const interior = smoothstep(0.10, 0.36, edgeDistance) * detailMask;
  const mound = 0.175 * (1 - smoothstep(0.08, 0.94, squareEdge));
  const coarse = (fbm(u * 1.18 + 7.1, v * 1.18 - 2.7, seed + 17) - 0.5) * 0.046;
  const medium = (fbm(u * 3.65 - 4.4, v * 3.65 + 8.6, seed + 53) - 0.5) * 0.024;
  const rakeNoise = valueNoise(u * 2.15 + 9.2, v * 2.15 - 3.4, seed + 89) - 0.5;
  const rake = Math.sin((v * 5.2 + rakeNoise * 0.18) * Math.PI + seed * 0.00013) * 0.009;
  const shallowPits = (valueNoise(u * 5.8 - 1.7, v * 5.8 + 2.9, seed + 131) - 0.5) * 0.011;
  const edgeRuffle = (valueNoise(u * 7.4 + 2.3, v * 7.4 - 6.1, seed + 173) - 0.5)
    * 0.010
    * (1 - smoothstep(0.88, 1.0, squareEdge));
  return terrainHeightAt(worldX, worldZ)
    + 0.004
    + mound
    + interior * (coarse + medium + rake + shallowPits)
    + edgeRuffle;
}

function fbm(x: number, z: number, seed: number): number {
  let amplitude = 0.55;
  let frequency = 1;
  let sum = 0;
  let normalizer = 0;
  for (let octave = 0; octave < 4; octave += 1) {
    sum += valueNoise(x * frequency, z * frequency, seed + octave * 977) * amplitude;
    normalizer += amplitude;
    frequency *= 2.03;
    amplitude *= 0.48;
  }
  return sum / normalizer;
}

function valueNoise(x: number, z: number, seed: number): number {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const tx = smooth01(x - x0);
  const tz = smooth01(z - z0);
  const a = hashGrid(x0, z0, seed);
  const b = hashGrid(x0 + 1, z0, seed);
  const c = hashGrid(x0, z0 + 1, seed);
  const d = hashGrid(x0 + 1, z0 + 1, seed);
  return lerp(lerp(a, b, tx), lerp(c, d, tx), tz);
}

function hashGrid(x: number, z: number, seed: number): number {
  let value = Math.imul(x, 0x1f123bb5) ^ Math.imul(z, 0x5f356495) ^ Math.imul(seed, 0x27d4eb2d);
  value ^= value >>> 15;
  value = Math.imul(value, 0x85ebca6b);
  value ^= value >>> 13;
  return (value >>> 0) / 0xffffffff;
}

function plotSeed(plotIndex: number): number {
  return Math.imul(plotIndex + 1, 0x6d2b79f5) ^ 0x9e3779b9;
}

function materialSeed(plotIndex: number, salt: number): number {
  return hashGrid(plotIndex, salt, 0x51f15e5d);
}

function mulberry32(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function subtract(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function normalize(value: Vec3): Vec3 {
  const length = Math.hypot(value[0], value[1], value[2]);
  if (length < 1e-8) return [0, 1, 0];
  return [value[0] / length, value[1] / length, value[2] / length];
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
