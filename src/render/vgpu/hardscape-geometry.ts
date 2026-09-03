import { PLOT_POSITIONS } from "../../scene/snapshot";

export const HARDSCAPE_VERTEX_STRIDE_FLOATS = 9;
export const HARDSCAPE_STONE_COUNT = 28;
export const HARDSCAPE_FENCE_POST_COUNT = 24;
export const HARDSCAPE_FENCE_RAIL_SEGMENT_COUNT = 16;

const GAP_MIN_X = -3.22;
const GAP_MAX_X = 3.22;
const GAP_MIN_Z = -2.50;
const GAP_MAX_Z = 2.50;
const GAP_STEP = 0.12;
const BED_CLEARANCE = 0.69;
const STONE_SEGMENTS = 8;
const POST_SEGMENTS = 6;
const RAIL_SEGMENTS = 6;

type Vec3 = readonly [number, number, number];

export interface HardscapeGeometryStats {
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
  const gapTriangles = appendGapSurface(output);
  const stoneTriangles = appendStones(output);
  const fenceTriangles = appendFence(output);
  const triangleCount = gapTriangles + stoneTriangles + fenceTriangles;
  const data = new Float32Array(output) as Float32Array<ArrayBuffer>;

  return {
    data,
    stats: {
      gapTriangles,
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

function appendGapSurface(output: number[]): number {
  const xCells = Math.ceil((GAP_MAX_X - GAP_MIN_X) / GAP_STEP);
  const zCells = Math.ceil((GAP_MAX_Z - GAP_MIN_Z) / GAP_STEP);
  let triangles = 0;

  for (let zIndex = 0; zIndex < zCells; zIndex += 1) {
    const z0 = GAP_MIN_Z + zIndex * GAP_STEP;
    const z1 = Math.min(GAP_MAX_Z, z0 + GAP_STEP);
    for (let xIndex = 0; xIndex < xCells; xIndex += 1) {
      const x0 = GAP_MIN_X + xIndex * GAP_STEP;
      const x1 = Math.min(GAP_MAX_X, x0 + GAP_STEP);
      const corners: readonly [number, number][] = [
        [x0, z0],
        [x1, z0],
        [x1, z1],
        [x0, z1],
      ];
      if (corners.some(([x, z]) => insideBed(x, z))) continue;

      const a: Vec3 = [x0, gapHeight(x0, z0), z0];
      const b: Vec3 = [x1, gapHeight(x1, z0), z0];
      const c: Vec3 = [x1, gapHeight(x1, z1), z1];
      const d: Vec3 = [x0, gapHeight(x0, z1), z1];
      const seed = hash2((x0 + x1) * 7.1, (z0 + z1) * 9.7);
      pushFlatTriangle(output, a, c, b, 0, seed, 0);
      pushFlatTriangle(output, a, d, c, 0, seed, 0);
      triangles += 2;
    }
  }

  return triangles;
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
    const x = side === 0 ? -3.42 : 3.42;
    return [x + (rng() - 0.5) * 0.08, -0.392, -2.9 + row * 0.72 + (rng() - 0.5) * 0.08];
  }
  const column = index - 18;
  return [-3.15 + column * 0.7 + (rng() - 0.5) * 0.07, -0.392, 2.85 + (rng() - 0.5) * 0.07];
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

function insideBed(x: number, z: number): boolean {
  return PLOT_POSITIONS.some(([plotX, , plotZ]) => (
    Math.abs(x - plotX) < BED_CLEARANCE && Math.abs(z - plotZ) < BED_CLEARANCE
  ));
}

function gapHeight(x: number, z: number): number {
  const broad = (hash2(Math.floor(x * 4), Math.floor(z * 4)) - 0.5) * 0.012;
  const fine = (hash2(Math.round(x * 17), Math.round(z * 17)) - 0.5) * 0.009;
  return -0.397 + broad + fine;
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
