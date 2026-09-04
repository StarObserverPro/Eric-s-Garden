import { terrainHeightAt } from "./terrain-surface";

export const POND_DRESSING_VERTEX_STRIDE_FLOATS = 9;

export interface PondDressingGeometryData {
  readonly data: Float32Array<ArrayBuffer>;
  readonly triangleCount: number;
  readonly vertexCount: number;
}

type Vec3 = readonly [number, number, number];

/**
 * One small functional bank-side group: a rain barrel, crate and three rough
 * boards leading down the wet bank. It is intentionally baked into the existing
 * hardscape owner rather than receiving its own draw.
 */
export function createPondDressingGeometryData(): PondDressingGeometryData {
  const output: number[] = [];
  let triangles = 0;

  const barrelX = -7.02;
  const barrelZ = 8.12;
  const barrelY = terrainHeightAt(barrelX, barrelZ) + 0.015;
  triangles += appendCylinder(output, [barrelX, barrelY, barrelZ], 0.27, 0.72, 8, 2, 0.63);

  const crateX = -7.60;
  const crateZ = 7.96;
  const crateY = terrainHeightAt(crateX, crateZ) + 0.15;
  triangles += appendBox(output, [crateX, crateY, crateZ], 0.42, 0.30, 0.36, -0.20, 2, 0.31);

  const boards = [
    [-7.62, 8.67, 0.52],
    [-7.94, 9.02, 0.46],
    [-8.28, 9.37, 0.40],
  ] as const;
  for (let index = 0; index < boards.length; index += 1) {
    const [x, z, length] = boards[index]!;
    const y = terrainHeightAt(x, z) + 0.035;
    triangles += appendBox(output, [x, y, z], 0.34, 0.055, length, -0.76, 2, 0.18 + index * 0.13);
  }

  const data = new Float32Array(output) as Float32Array<ArrayBuffer>;
  return {
    data,
    triangleCount: triangles,
    vertexCount: triangles * 3,
  };
}

function appendBox(
  output: number[],
  center: Vec3,
  width: number,
  height: number,
  length: number,
  yaw: number,
  materialKind: number,
  seed: number,
): number {
  const hx = width * 0.5;
  const hy = height * 0.5;
  const hz = length * 0.5;
  const local: Vec3[] = [
    [-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz], [-hx, -hy, hz],
    [-hx, hy, -hz], [hx, hy, -hz], [hx, hy, hz], [-hx, hy, hz],
  ];
  const vertices = local.map((point) => transform(point, center, yaw));
  const faces = [
    [0, 2, 1], [0, 3, 2],
    [4, 5, 6], [4, 6, 7],
    [0, 1, 5], [0, 5, 4],
    [1, 2, 6], [1, 6, 5],
    [2, 3, 7], [2, 7, 6],
    [3, 0, 4], [3, 4, 7],
  ] as const;
  for (const [a, b, c] of faces) {
    pushFlatTriangle(output, vertices[a]!, vertices[b]!, vertices[c]!, materialKind, seed, 1);
  }
  return faces.length;
}

function appendCylinder(
  output: number[],
  center: Vec3,
  radius: number,
  height: number,
  segments: number,
  materialKind: number,
  seed: number,
): number {
  const bottomY = center[1];
  const topY = center[1] + height;
  const bottom: Vec3[] = [];
  const top: Vec3[] = [];
  for (let index = 0; index < segments; index += 1) {
    const angle = index / segments * Math.PI * 2;
    const irregular = 0.96 + hash(index + seed * 11) * 0.06;
    const x = Math.cos(angle) * radius * irregular;
    const z = Math.sin(angle) * radius * irregular;
    bottom.push([center[0] + x, bottomY, center[2] + z]);
    top.push([center[0] + x * 0.97, topY, center[2] + z * 0.97]);
  }
  const bottomCenter: Vec3 = [center[0], bottomY, center[2]];
  const topCenter: Vec3 = [center[0], topY, center[2]];
  for (let index = 0; index < segments; index += 1) {
    const next = (index + 1) % segments;
    pushFlatTriangle(output, bottom[index]!, bottom[next]!, top[next]!, materialKind, seed, 0);
    pushFlatTriangle(output, bottom[index]!, top[next]!, top[index]!, materialKind, seed, 0);
    pushFlatTriangle(output, topCenter, top[index]!, top[next]!, materialKind, seed, 1);
    pushFlatTriangle(output, bottomCenter, bottom[next]!, bottom[index]!, materialKind, seed, 1);
  }
  return segments * 4;
}

function transform(point: Vec3, center: Vec3, yaw: number): Vec3 {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return [
    center[0] + point[0] * c + point[2] * s,
    center[1] + point[1],
    center[2] - point[0] * s + point[2] * c,
  ];
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
  const normal = normalize(cross(subtract(b, a), subtract(c, a)));
  for (const point of [a, b, c]) {
    output.push(
      point[0], point[1], point[2],
      normal[0], normal[1], normal[2],
      materialKind, seed, part,
    );
  }
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

function hash(value: number): number {
  const sine = Math.sin(value * 12.9898 + 78.233) * 43758.5453;
  return sine - Math.floor(sine);
}
