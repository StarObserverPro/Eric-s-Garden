export const WATERING_CAN_VERTEX_STRIDE_FLOATS = 7;

const BODY_SEGMENTS = 14;
const HANDLE_SEGMENTS = 8;
const SPOUT_SEGMENTS = 10;

type Vec3 = readonly [number, number, number];

export function createWateringCanVertices(): Float32Array<ArrayBuffer> {
  const output: number[] = [];

  appendFrustumY(output, [0, 0.04, 0], 0.36, 0.32, 0.54, BODY_SEGMENTS, 0);
  appendFrustumY(output, [0, 0.37, 0], 0.30, 0.22, 0.12, BODY_SEGMENTS, 0);

  appendTubePath(
    output,
    [
      [-0.26, 0.34, 0],
      [-0.43, 0.61, 0],
      [-0.22, 0.80, 0],
      [0.18, 0.80, 0],
      [0.31, 0.43, 0],
    ],
    0.052,
    HANDLE_SEGMENTS,
    1,
  );

  appendTubePath(
    output,
    [
      [0.28, 0.12, 0],
      [0.53, 0.16, 0],
      [0.77, 0.27, 0],
      [0.98, 0.32, 0],
    ],
    0.058,
    SPOUT_SEGMENTS,
    1,
  );
  appendTaperedTubeSegment(output, [0.96, 0.32, 0], [1.10, 0.325, 0], 0.075, 0.13, 12, 1);

  const dropletOffsets = [-0.045, -0.015, 0.018, 0.047] as const;
  for (let index = 0; index < dropletOffsets.length; index += 1) {
    const z = dropletOffsets[index]!;
    const yTop = 0.055 - index * 0.022;
    const yBottom = -0.55 + index * 0.045;
    appendTubeSegment(output, [1.095, yTop, z], [1.095, yBottom, z], 0.0085, 6, 2);
  }

  return new Float32Array(output) as Float32Array<ArrayBuffer>;
}

function appendFrustumY(
  output: number[],
  center: Vec3,
  bottomRadius: number,
  topRadius: number,
  height: number,
  segments: number,
  part: number,
): void {
  const half = height * 0.5;
  const bottomY = center[1] - half;
  const topY = center[1] + half;
  const slope = (bottomRadius - topRadius) / Math.max(0.0001, height);

  for (let index = 0; index < segments; index += 1) {
    const a0 = index / segments * Math.PI * 2;
    const a1 = (index + 1) / segments * Math.PI * 2;
    const b0: Vec3 = [center[0] + Math.cos(a0) * bottomRadius, bottomY, center[2] + Math.sin(a0) * bottomRadius];
    const b1: Vec3 = [center[0] + Math.cos(a1) * bottomRadius, bottomY, center[2] + Math.sin(a1) * bottomRadius];
    const t0: Vec3 = [center[0] + Math.cos(a0) * topRadius, topY, center[2] + Math.sin(a0) * topRadius];
    const t1: Vec3 = [center[0] + Math.cos(a1) * topRadius, topY, center[2] + Math.sin(a1) * topRadius];
    const n0 = normalize([Math.cos(a0), slope, Math.sin(a0)]);
    const n1 = normalize([Math.cos(a1), slope, Math.sin(a1)]);
    pushTriangle(output, b0, b1, t1, n0, n1, n1, part);
    pushTriangle(output, b0, t1, t0, n0, n1, n0, part);
    pushFlatTriangle(output, [center[0], bottomY, center[2]], b1, b0, [0, -1, 0], part);
    pushFlatTriangle(output, [center[0], topY, center[2]], t0, t1, [0, 1, 0], part);
  }
}

function appendTubePath(
  output: number[],
  points: readonly Vec3[],
  radius: number,
  segments: number,
  part: number,
): void {
  for (let index = 0; index + 1 < points.length; index += 1) {
    appendTubeSegment(output, points[index]!, points[index + 1]!, radius, segments, part);
  }
}

function appendTubeSegment(
  output: number[],
  start: Vec3,
  end: Vec3,
  radius: number,
  segments: number,
  part: number,
): void {
  appendTaperedTubeSegment(output, start, end, radius, radius, segments, part);
}

function appendTaperedTubeSegment(
  output: number[],
  start: Vec3,
  end: Vec3,
  startRadius: number,
  endRadius: number,
  segments: number,
  part: number,
): void {
  const axis = normalize(subtract(end, start));
  const helper: Vec3 = Math.abs(axis[1]) < 0.92 ? [0, 1, 0] : [1, 0, 0];
  const sideA = normalize(cross(axis, helper));
  const sideB = normalize(cross(axis, sideA));

  for (let index = 0; index < segments; index += 1) {
    const a0 = index / segments * Math.PI * 2;
    const a1 = (index + 1) / segments * Math.PI * 2;
    const r0 = radial(sideA, sideB, a0);
    const r1 = radial(sideA, sideB, a1);
    const s0 = add(start, scale(r0, startRadius));
    const s1 = add(start, scale(r1, startRadius));
    const e0 = add(end, scale(r0, endRadius));
    const e1 = add(end, scale(r1, endRadius));
    pushTriangle(output, s0, e1, s1, r0, r1, r1, part);
    pushTriangle(output, s0, e0, e1, r0, r0, r1, part);
    pushFlatTriangle(output, start, s1, s0, scale(axis, -1), part);
    pushFlatTriangle(output, end, e0, e1, axis, part);
  }
}

function radial(sideA: Vec3, sideB: Vec3, angle: number): Vec3 {
  return normalize(add(scale(sideA, Math.cos(angle)), scale(sideB, Math.sin(angle))));
}

function pushTriangle(
  output: number[],
  a: Vec3,
  b: Vec3,
  c: Vec3,
  normalA: Vec3,
  normalB: Vec3,
  normalC: Vec3,
  part: number,
): void {
  pushVertex(output, a, normalA, part);
  pushVertex(output, b, normalB, part);
  pushVertex(output, c, normalC, part);
}

function pushFlatTriangle(
  output: number[],
  a: Vec3,
  b: Vec3,
  c: Vec3,
  normal: Vec3,
  part: number,
): void {
  pushTriangle(output, a, b, c, normal, normal, normal, part);
}

function pushVertex(output: number[], position: Vec3, normal: Vec3, part: number): void {
  output.push(
    position[0], position[1], position[2],
    normal[0], normal[1], normal[2],
    part,
  );
}

function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function subtract(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function scale(value: Vec3, amount: number): Vec3 {
  return [value[0] * amount, value[1] * amount, value[2] * amount];
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
