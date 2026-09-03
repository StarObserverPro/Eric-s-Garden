export const HARDSCAPE_VERTEX_STRIDE_FLOATS = 9;
export const HARDSCAPE_STONE_COUNT = 28;
export const HARDSCAPE_FENCE_POST_COUNT = 24;
export const HARDSCAPE_FENCE_RAIL_SEGMENT_COUNT = 16;
export const TERRAIN_OUTER_Y = -0.39;
export const TERRAIN_INNER_Y = -0.205;

const TERRAIN_MIN_X = -5.70;
const TERRAIN_MAX_X = 5.70;
const TERRAIN_MIN_Z = -4.30;
const TERRAIN_MAX_Z = 4.30;
const STONE_SEGMENTS = 8;
const POST_SEGMENTS = 6;
const RAIL_SEGMENTS = 6;

type Vec3 = readonly [number, number, number];

export interface HardscapeGeometryStats {
  readonly terrainTriangles: number;
  /** Compatibility alias retained for older diagnostics/tests. */
  readonly gapTriangles: number;
  readonly stoneCount: number;
  readonly stoneTriangles: number;
  readonly fencePostCount: number;
  readonly fenceRailSegmentCount: number;
  readonly fenceTriangles: number;
  readonly triangleCount: number;
  readonly vertexCount: number;
}

export interface HardscapeGeometryData {
  readonly data: Float32Array<ArrayBuffer>;
  readonly stats: HardscapeGeometryStats;
}

export function createHardscapeGeometryData(): HardscapeGeometryData {
  const output: number[] = [];
  const terrainTriangles = appendTerrainSurface(output);
  const stoneTriangles = appendStones(output);
  const fenceTriangles = appendFence(output);
  const triangleCount = terrainTriangles + stoneTriangles + fenceTriangles;
  const data = new Float32Array(output) as Float32Array<ArrayBuffer>;

  return {
    data,
    stats: {
      terrainTriangles,
      gapTriangles: terrainTriangles,
      stoneCount: HARDSCAPE_STONE_COUNT,
      stoneTriangles,
      fencePostCount: HARDSCAPE_FENCE_POST_COUNT,
      fenceRailSegmentCount: HARDSCAPE_FENCE_RAIL_SEGMENT_COUNT,
      fenceTriangles,
      triangleCount,
      vertexCount: triangleCount * 3,
    },
  };
}

function appendTerrainSurface(output: number[]): number {
  const xs = terrainAxis(TERRAIN_MIN_X, [
    [-4.10, 0.46],
    [-3.25, 0.28],
    [3.25, 0.16],
    [4.10, 0.28],
    [TERRAIN_MAX_X, 0.46],
  ]);
  const zs = terrainAxis(TERRAIN_MIN_Z, [
    [-3.25, 0.46],
    [-2.55, 0.28],
    [2.55, 0.16],
    [3.25, 0.28],
    [TERRAIN_MAX_Z, 0.46],
  ]);
  let triangles = 0;

  for (let zIndex = 0; zIndex < zs.length - 1; zIndex += 1) {
    const z0 = zs[zIndex]!;
    const z1 = zs[zIndex + 1]!;
    for (let xIndex = 0; xIndex < xs.length - 1; xIndex += 1) {
      const x0 = xs[xIndex]!;
      const x1 = xs[xIndex + 1]!;
      const a: Vec3 = [x0, terrainHeightAt(x0, z0), z0];
      const b: Vec3 = [x1, terrainHeightAt(x1, z0), z0];
      const c: Vec3 = [x1, terrainHeightAt(x1, z1), z1];
      const d: Vec3 = [x0, terrainHeightAt(x0, z1), z1];
      const seed = hash2((x0 + x1) * 3.7, (z0 + z1) * 5.9);
      pushFlatTriangle(output, a, c, b, 0, seed, 0);
      pushFlatTriangle(output, a, d, c, 0, seed, 0);
      triangles += 2;
    }
  }

  return triangles;
}

function terrainAxis(
  start: number,
  segments: readonly (readonly [end: number, step: number])[],
): number[] {
  const values = [start];
  let current = start;
  for (const [end, step] of segments) {
    while (current + step < end - 1e-6) {
      current += step;
      values.push(current);
    }
    if (Math.abs(current - end) > 1e-6) {
      current = end;
      values.push(current);
    }
  }
  return values;
}

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

function appendStones(output: number[]): number {
  let triangles = 0;
  for (let index = 0; index < HARDSCAPE_STONE_COUNT; index += 1) {
    const rng = mulberry32(0x6d2b79f5 ^ Math.imul(index + 1, 0x45d9f3b));
    const center = stoneCenter(index, rng);
    const radiusX = 0.24 + rng() * 0.09;
    const radiusZ = 0.17 + rng() * 0.075;
    const height = 0.09 + rng() * 0.055;
    const rotation = (rng() - 0.5) * 0.72;
    triangles += appendStone(output, center, radiusX, radiusZ, height, rotation, rng(), rng);
  }
  return triangles;
}

function appendStone(
  output: number[],
  center: Vec3,
  radiusX: number,
  radiusZ: number,
  height: number,
  rotation: number,
  seed: number,
  rng: () => number,
): number {
  const lower: Vec3[] = [];
  const shoulder: Vec3[] = [];
  const upper: Vec3[] = [];
  for (let index = 0; index < STONE_SEGMENTS; index += 1) {
    const angle = rotation + index / STONE_SEGMENTS * Math.PI * 2;
    const irregular = 0.82 + rng() * 0.30;
    const x = Math.cos(angle);
    const z = Math.sin(angle);
    lower.push([
      center[0] + x * radiusX * irregular,
      center[1],
      center[2] + z * radiusZ * irregular,
    ]);
    shoulder.push([
      center[0] + x * radiusX * irregular * (0.96 + rng() * 0.08),
      center[1] + height * (0.34 + rng() * 0.08),
      center[2] + z * radiusZ * irregular * (0.96 + rng() * 0.08),
    ]);
    upper.push([
      center[0] + x * radiusX * irregular * (0.57 + rng() * 0.12),
      center[1] + height * (0.70 + rng() * 0.08),
      center[2] + z * radiusZ * irregular * (0.57 + rng() * 0.12),
    ]);
  }
  const top: Vec3 = [
    center[0] + (rng() - 0.5) * radiusX * 0.18,
    center[1] + height,
    center[2] + (rng() - 0.5) * radiusZ * 0.18,
  ];

  for (let index = 0; index < STONE_SEGMENTS; index += 1) {
    const next = (index + 1) % STONE_SEGMENTS;
    pushFlatTriangle(output, lower[index]!, lower[next]!, shoulder[next]!, 1, seed, 1);
    pushFlatTriangle(output, lower[index]!, shoulder[next]!, shoulder[index]!, 1, seed, 1);
    pushFlatTriangle(output, shoulder[index]!, shoulder[next]!, upper[next]!, 1, seed, 0);
    pushFlatTriangle(output, shoulder[index]!, upper[next]!, upper[index]!, 1, seed, 0);
    pushFlatTriangle(output, upper[index]!, upper[next]!, top, 1, seed, 0);
  }
  return STONE_SEGMENTS * 5;
}

function appendFence(output: number[]): number {
  const posts = fencePostPositions();
  let triangles = 0;
  for (let index = 0; index < posts.length; index += 1) {
    const rng = mulberry32(0x9e3779b9 ^ Math.imul(index + 11, 0x85ebca6b));
    triangles += appendPost(output, posts[index]!, rng(), rng);
  }

  const railHeights = [0.24, 0.62] as const;
  const sides: readonly (readonly [Vec3, Vec3])[] = [
    [[-4.8, 0, -3.55], [4.8, 0, -3.55]],
    [[-4.8, 0, 3.55], [4.8, 0, 3.55]],
    [[-4.8, 0, -3.55], [-4.8, 0, 3.55]],
    [[4.8, 0, -3.55], [4.8, 0, 3.55]],
  ];
  let railSegmentIndex = 0;
  for (let sideIndex = 0; sideIndex < sides.length; sideIndex += 1) {
    const [start, end] = sides[sideIndex]!;
    for (const height of railHeights) {
      const seed = hash2(sideIndex * 7.3 + height, height * 19.1);
      const sag = 0.025 + seed * 0.028;
      const middle: Vec3 = [
        (start[0] + end[0]) * 0.5,
        height - sag,
        (start[2] + end[2]) * 0.5,
      ];
      const a: Vec3 = [start[0], height + (seed - 0.5) * 0.022, start[2]];
      const b: Vec3 = [end[0], height - (seed - 0.5) * 0.018, end[2]];
      triangles += appendRailSegment(output, a, middle, 0.055 + seed * 0.012, seed);
      railSegmentIndex += 1;
      triangles += appendRailSegment(output, middle, b, 0.055 + seed * 0.012, seed + 0.37);
      railSegmentIndex += 1;
    }
  }

  if (railSegmentIndex !== HARDSCAPE_FENCE_RAIL_SEGMENT_COUNT) {
    throw new Error(`Unexpected rail segment count: ${railSegmentIndex}`);
  }
  return triangles;
}

function appendPost(output: number[], position: Vec3, seed: number, rng: () => number): number {
  const rootY = -0.43;
  const height = 1.18 + (rng() - 0.5) * 0.15;
  const midY = rootY + height * 0.52;
  const bevelY = rootY + height - 0.11;
  const leanX = (rng() - 0.5) * 0.045;
  const leanZ = (rng() - 0.5) * 0.045;
  const lowerRadius = 0.088 + rng() * 0.023;
  const midRadius = lowerRadius * (0.91 + rng() * 0.05);
  const topRadius = lowerRadius * (0.74 + rng() * 0.07);
  const lower: Vec3[] = [];
  const middle: Vec3[] = [];
  const upper: Vec3[] = [];
  const rotation = rng() * Math.PI * 2;

  for (let index = 0; index < POST_SEGMENTS; index += 1) {
    const angle = rotation + index / POST_SEGMENTS * Math.PI * 2;
    const x = Math.cos(angle);
    const z = Math.sin(angle);
    lower.push([position[0] + x * lowerRadius, rootY, position[2] + z * lowerRadius]);
    middle.push([
      position[0] + leanX * 0.5 + x * midRadius,
      midY,
      position[2] + leanZ * 0.5 + z * midRadius,
    ]);
    upper.push([
      position[0] + leanX + x * topRadius,
      bevelY,
      position[2] + leanZ + z * topRadius,
    ]);
  }
  const cap: Vec3 = [
    position[0] + leanX + (rng() - 0.5) * 0.025,
    rootY + height,
    position[2] + leanZ + (rng() - 0.5) * 0.025,
  ];

  for (let index = 0; index < POST_SEGMENTS; index += 1) {
    const next = (index + 1) % POST_SEGMENTS;
    pushFlatTriangle(output, lower[index]!, lower[next]!, middle[next]!, 2, seed, 0);
    pushFlatTriangle(output, lower[index]!, middle[next]!, middle[index]!, 2, seed, 0);
    pushFlatTriangle(output, middle[index]!, middle[next]!, upper[next]!, 2, seed, 0);
    pushFlatTriangle(output, middle[index]!, upper[next]!, upper[index]!, 2, seed, 0);
    pushFlatTriangle(output, upper[index]!, upper[next]!, cap, 2, seed, 0);
  }
  return POST_SEGMENTS * 5;
}

function appendRailSegment(output: number[], start: Vec3, end: Vec3, radius: number, seed: number): number {
  const direction = normalize(subtract(end, start));
  const side = normalize([direction[2], 0, -direction[0]]);
  const startRing: Vec3[] = [];
  const endRing: Vec3[] = [];

  for (let index = 0; index < RAIL_SEGMENTS; index += 1) {
    const angle = index / RAIL_SEGMENTS * Math.PI * 2;
    const sideAmount = Math.cos(angle) * radius;
    const yAmount = Math.sin(angle) * radius * 0.88;
    startRing.push([
      start[0] + side[0] * sideAmount,
      start[1] + yAmount,
      start[2] + side[2] * sideAmount,
    ]);
    endRing.push([
      end[0] + side[0] * sideAmount,
      end[1] + yAmount,
      end[2] + side[2] * sideAmount,
    ]);
  }

  for (let index = 0; index < RAIL_SEGMENTS; index += 1) {
    const next = (index + 1) % RAIL_SEGMENTS;
    pushFlatTriangle(output, startRing[index]!, startRing[next]!, endRing[next]!, 2, seed, 1);
    pushFlatTriangle(output, startRing[index]!, endRing[next]!, endRing[index]!, 2, seed, 1);
  }
  return RAIL_SEGMENTS * 2;
}

function stoneCenter(index: number, rng: () => number): Vec3 {
  if (index < 18) {
    const row = Math.floor(index / 2);
    const side = index % 2;
    const baseX = side === 0 ? -3.92 : 3.92;
    const x = baseX + (rng() - 0.5) * 0.10;
    const z = -2.98 + row * 0.75 + (rng() - 0.5) * 0.10;
    return [x, terrainHeightAt(x, z) + 0.004, z];
  }
  const column = index - 18;
  const x = -3.34 + column * 0.74 + (rng() - 0.5) * 0.08;
  const z = 3.10 + (rng() - 0.5) * 0.08;
  return [x, terrainHeightAt(x, z) + 0.004, z];
}

function fencePostPositions(): Vec3[] {
  const positions: Vec3[] = [];
  for (const z of [-3.55, 3.55]) {
    for (let step = 0; step < 8; step += 1) positions.push([-4.8 + step * (9.6 / 7), 0, z]);
  }
  for (const x of [-4.8, 4.8]) {
    for (let step = 1; step < 5; step += 1) positions.push([x, 0, -3.55 + step * (7.1 / 5)]);
  }
  if (positions.length !== HARDSCAPE_FENCE_POST_COUNT) {
    throw new Error(`Unexpected fence post count: ${positions.length}`);
  }
  return positions;
}

function pushFlatTriangle(
  output: number[],
  a: Vec3,
  b: Vec3,
  c: Vec3,
  materialKind: number,
  seed: number,
  part: number,
): void {
  let normal = normalize(cross(subtract(b, a), subtract(c, a)));
  if (normal[1] < -0.82) normal = [-normal[0], -normal[1], -normal[2]];
  pushVertex(output, a, normal, materialKind, seed, part);
  pushVertex(output, b, normal, materialKind, seed, part);
  pushVertex(output, c, normal, materialKind, seed, part);
}

function pushVertex(
  output: number[],
  position: Vec3,
  normal: Vec3,
  materialKind: number,
  seed: number,
  part: number,
): void {
  output.push(
    position[0], position[1], position[2],
    normal[0], normal[1], normal[2],
    materialKind, seed, part,
  );
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
  if (length < 0.000001) return [0, 1, 0];
  return [value[0] / length, value[1] / length, value[2] / length];
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

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}
