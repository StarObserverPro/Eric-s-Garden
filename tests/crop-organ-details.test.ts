import { expect, test } from "vitest";
import { createCropGeometryData, cropAttachmentFrame, cropFramePoint, CROP_VERTEX_STRIDE_FLOATS as S, type Vec3 } from "../src/render/vgpu/crop-geometry";

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const point = (data: Float32Array, offset: number): Vec3 => [data[offset]!, data[offset + 1]!, data[offset + 2]!];
type Triangle = readonly [Vec3, Vec3, Vec3];

function rayDistance(origin: Vec3, direction: Vec3, triangle: Triangle): number {
  const [a, b, c] = triangle;
  const e1 = sub(b, a);
  const e2 = sub(c, a);
  const p = cross(direction, e2);
  const determinant = dot(e1, p);
  if (Math.abs(determinant) < 1e-10) return Infinity;
  const tvec = sub(origin, a);
  const u = dot(tvec, p) / determinant;
  if (u < -1e-6 || u > 1 + 1e-6) return Infinity;
  const q = cross(tvec, e1);
  const v = dot(direction, q) / determinant;
  if (v < -1e-6 || u + v > 1 + 1e-6) return Infinity;
  const distance = dot(e2, q) / determinant;
  return distance > 1e-6 ? distance : Infinity;
}

test("corn husks wrap the basal cob without radial holes or yellow protrusions", () => {
  const { data } = createCropGeometryData();
  const frame = cropAttachmentFrame([0.066, 1.010, 0.014], [0.30, 0.94, 0.11]);
  const husks: Triangle[] = [];
  const cob: Triangle[] = [];
  for (let offset = 0; offset < data.length; offset += S * 3) {
    if (Math.round(data[offset + 9]!) !== 2) continue;
    const material = Math.round(data[offset + 10]!);
    if (material === 2 || material === 4) {
      (material === 4 ? husks : cob).push([point(data, offset), point(data, offset + S), point(data, offset + S * 2)]);
    }
  }
  let failures = 0;
  for (const height of [0.025, 0.07, 0.15]) {
    const origin = cropFramePoint(frame, [0, height, 0]);
    for (let sample = 0; sample < 24; sample += 1) {
      const angle = sample / 24 * Math.PI * 2;
      const direction: Vec3 = [0, 1, 2].map((i) => frame.x[i]! * Math.cos(angle) + frame.z[i]! * Math.sin(angle)) as unknown as Vec3;
      const huskDistance = Math.min(...husks.map((triangle) => rayDistance(origin, direction, triangle)));
      const cobDistance = Math.min(...cob.map((triangle) => rayDistance(origin, direction, triangle)));
      if (!Number.isFinite(huskDistance) || huskDistance > 0.14 || huskDistance < cobDistance - 1e-5) failures += 1;
    }
  }
  expect(failures).toBe(0);
});

test("strawberry seeds stay on a berry surface and inherit that cluster's growth pivot", () => {
  const { data } = createCropGeometryData();
  const berries = new Map<string, Vec3[]>();
  const seeds: { point: Vec3; group: string }[] = [];
  for (let offset = 0; offset < data.length; offset += S) {
    if (Math.round(data[offset + 9]!) !== 5) continue;
    const material = Math.round(data[offset + 10]!);
    const group = [...point(data, offset + 6), data[offset + 11]!].map((v) => v.toFixed(6)).join(",");
    if (material === 2) {
      const positions = berries.get(group) ?? [];
      positions.push(point(data, offset));
      berries.set(group, positions);
    }
    if (material === 3) seeds.push({ point: point(data, offset), group });
  }
  expect(seeds.length).toBeGreaterThan(0);
  let farthest = 0;
  for (const seed of seeds) {
    const surface = berries.get(seed.group) ?? [];
    let nearestSquared = Infinity;
    for (const vertex of surface) {
      const delta = sub(seed.point, vertex);
      nearestSquared = Math.min(nearestSquared, dot(delta, delta));
    }
    farthest = Math.max(farthest, Math.sqrt(nearestSquared));
  }
  expect(farthest).toBeLessThan(0.006);
});
