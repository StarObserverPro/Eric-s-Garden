import {
  TERRAIN_INNER_Y,
  TERRAIN_MAX_X,
  TERRAIN_MAX_Z,
  TERRAIN_MIN_X,
  TERRAIN_MIN_Z,
  TERRAIN_OUTER_Y,
  terrainHeightAt,
  terrainNormalAt,
  type TerrainVec3,
} from "./terrain-surface";

export {
  TERRAIN_INNER_Y,
  TERRAIN_OUTER_Y,
  terrainHeightAt,
} from "./terrain-surface";

export const HARDSCAPE_VERTEX_STRIDE_FLOATS = 9;
export const HARDSCAPE_STONE_COUNT = 28;
export const HARDSCAPE_FENCE_POST_COUNT = 24;
export const HARDSCAPE_FENCE_RAIL_SEGMENT_COUNT = 16;
export const HARDSCAPE_STONE_MIN_SEPARATION = 0.52;

const STONE_SEGMENTS = 8;
const POST_SEGMENTS = 6;
const RAIL_SEGMENTS = 6;

type Vec3 = TerrainVec3;

interface SurfaceVertex {
  readonly position: Vec3;
  readonly normal: Vec3;
}

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
  // Keep the bed field dense, then increase spacing by orders of magnitude as
  // distance grows. The distant country is still the same mesh/height owner;
  // it is not a second scene or a screen-space horizon card.
  const xs = terrainAxis(TERRAIN_MIN_X, [
    [-36, 8.0],
    [-18, 4.0],
    [-8.0, 2.0],
    [-5.70, 0.80],
    [-4.10, 0.46],
    [-3.25, 0.28],
    [3.25, 0.16],
    [4.10, 0.28],
    [5.70, 0.46],
    [8.0, 0.80],
    [18, 2.0],
    [36, 4.0],
    [TERRAIN_MAX_X, 8.0],
  ]);
  const zs = terrainAxis(TERRAIN_MIN_Z, [
    [-30, 6.0],
    [-15, 3.0],
    [-7.0, 1.60],
    [-4.30, 0.70],
    [-3.25, 0.46],
    [-2.55, 0.28],
    [2.55, 0.16],
    [3.25, 0.28],
    [4.30, 0.46],
    [7.0, 0.70],
    [15, 1.60],
    [30, 3.0],
    [TERRAIN_MAX_Z, 6.0],
  ]);
  const vertices: SurfaceVertex[][] = Array.from({ length: zs.length }, () => []);

  for (let zIndex = 0; zIndex < zs.length; zIndex += 1) {
    for (let xIndex = 0; xIndex < xs.length; xIndex += 1) {
      vertices[zIndex]![xIndex] = terrainVertex(xs, zs, xIndex, zIndex);
    }
  }

  let triangles = 0;
  for (let zIndex = 0; zIndex < zs.length - 1; zIndex += 1) {
    for (let xIndex = 0; xIndex < xs.length - 1; xIndex += 1) {
      const a = vertices[zIndex]![xIndex]!;
      const b = vertices[zIndex]![xIndex + 1]!;
      const c = vertices[zIndex + 1]![xIndex + 1]!;
      const d = vertices[zIndex + 1]![xIndex]!;
      const seed = hash2((xIndex + 1) * 7.3, (zIndex + 1) * 11.9);
      const alternateDiagonal = ((xIndex * 73856093) ^ (zIndex * 19349663)) & 1;
      if (alternateDiagonal === 0) {
        pushSurfaceTriangle(output, a, c, b, 0, seed, 0);
        pushSurfaceTriangle(output, a, d, c, 0, seed, 0);
      } else {
        pushSurfaceTriangle(output, a, d, b, 0, seed, 0);
        pushSurfaceTriangle(output, b, d, c, 0, seed, 0);
      }
      triangles += 2;
    }
  }

  return triangles;
}

function terrainVertex(
  xs: readonly number[],
  zs: readonly number[],
  xIndex: number,
  zIndex: number,
): SurfaceVertex {
  const sourceX = xs[xIndex]!;
  const sourceZ = zs[zIndex]!;
  const boundary = xIndex === 0 || zIndex === 0 || xIndex === xs.length - 1 || zIndex === zs.length - 1;
  const xSpacing = localSpacing(xs, xIndex);
  const zSpacing = localSpacing(zs, zIndex);
  const jitterScale = Math.min(Math.min(xSpacing, zSpacing) * 0.18, 0.72);
  const jitterX = boundary ? 0 : (hash2(sourceX * 13.7 + zIndex, sourceZ * 5.9 + xIndex) - 0.5) * jitterScale;
  const jitterZ = boundary ? 0 : (hash2(sourceX * 3.1 - zIndex, sourceZ * 17.3 - xIndex) - 0.5) * jitterScale;
  const x = sourceX + jitterX;
  const z = sourceZ + jitterZ;
  return {
    position: [x, terrainHeightAt(x, z), z],
    normal: terrainNormalAt(x, z),
  };
}

function localSpacing(axis: readonly number[], index: number): number {
  const previous = index > 0 ? Math.abs(axis[index]! - axis[index - 1]!) : Number.POSITIVE_INFINITY;
  const next = index < axis.length - 1 ? Math.abs(axis[index + 1]! - axis[index]!) : Number.POSITIVE_INFINITY;
  return Math.min(previous, next);
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

function appendStones(output: number[]): number {
  const centers = createStoneCenters();
  let triangles = 0;
  for (let index = 0; index < centers.length; index += 1) {
    const rng = mulberry32(0x6d2b79f5 ^ Math.imul(index + 1, 0x45d9f3b));
    const radiusX = 0.22 + rng() * 0.105;
    const radiusZ = 0.16 + rng() * 0.085;
    const height = 0.08 + rng() * 0.055;
    const rotation = (rng() - 0.5) * 1.4;
    triangles += appendStone(output, centers[index]!, radiusX, radiusZ, height, rotation, rng(), rng);
  }
  return triangles;
}

export function createStoneCenters(): readonly Vec3[] {
  const rng = mulberry32(0x3a7f19d3);
  const centers: Vec3[] = [];
  let attempts = 0;

  while (centers.length < HARDSCAPE_STONE_COUNT && attempts < 5000) {
    attempts += 1;
    const lane = rng();
    let x = 0;
    let z = 0;
    if (lane < 0.27) {
      x = -3.62 - rng() * 0.55;
      z = -2.72 + rng() * 5.44;
    } else if (lane < 0.54) {
      x = 3.62 + rng() * 0.55;
      z = -2.72 + rng() * 5.44;
    } else if (lane < 0.78) {
      x = -3.15 + rng() * 6.30;
      z = 2.84 + rng() * 0.40;
    } else {
      x = -3.15 + rng() * 6.30;
      z = -2.84 - rng() * 0.40;
    }

    const nearest = centers.reduce(
      (distance, center) => Math.min(distance, Math.hypot(center[0] - x, center[2] - z)),
      Number.POSITIVE_INFINITY,
    );
    if (nearest < HARDSCAPE_STONE_MIN_SEPARATION) continue;
    centers.push([x, terrainHeightAt(x, z) + 0.006, z]);
  }

  if (centers.length !== HARDSCAPE_STONE_COUNT) {
    throw new Error(`Unable to place ${HARDSCAPE_STONE_COUNT} stepping stones with constrained spacing.`);
  }
  return centers;
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
      const sag = 0.010 + seed * 0.012;
      const middle: Vec3 = [
        (start[0] + end[0]) * 0.5,
        height - sag,
        (start[2] + end[2]) * 0.5,
      ];
      const a: Vec3 = [start[0], height + (seed - 0.5) * 0.010, start[2]];
      const b: Vec3 = [end[0], height - (seed - 0.5) * 0.008, end[2]];
      triangles += appendRailSegment(output, a, middle, 0.054 + seed * 0.009, seed);
      railSegmentIndex += 1;
      triangles += appendRailSegment(output, middle, b, 0.054 + seed * 0.009, seed + 0.37);
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
  const height = 1.18 + (rng() - 0.5) * 0.06;
  const midY = rootY + height * 0.52;
  const bevelY = rootY + height - 0.105;
  const leanX = (rng() - 0.5) * 0.016;
  const leanZ = (rng() - 0.5) * 0.016;
  const lowerRadius = 0.091 + rng() * 0.017;
  const midRadius = lowerRadius * (0.93 + rng() * 0.035);
  const topRadius = lowerRadius * (0.77 + rng() * 0.05);
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
    position[0] + leanX + (rng() - 0.5) * 0.012,
    rootY + height,
    position[2] + leanZ + (rng() - 0.5) * 0.012,
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

function pushSurfaceTriangle(
  output: number[],
  a: SurfaceVertex,
  b: SurfaceVertex,
  c: SurfaceVertex,
  materialKind: number,
  seed: number,
  part: number,
): void {
  pushVertex(output, a.position, a.normal, materialKind, seed, part);
  pushVertex(output, b.position, b.normal, materialKind, seed, part);
  pushVertex(output, c.position, c.normal, materialKind, seed, part);
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
