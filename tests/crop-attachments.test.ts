import { expect, test } from "vitest";
import {
  CROP_VERTEX_STRIDE_FLOATS as S,
  createCropGeometryData,
  cropAttachmentFrame,
  cropFramePoint,
  type Vec3,
} from "../src/render/vgpu/crop-geometry";

const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const point = (data: Float32Array, offset: number): Vec3 => [data[offset]!, data[offset + 1]!, data[offset + 2]!];
const pointKey = (data: Float32Array, offset: number): string => point(data, offset).map((v) => v.toFixed(6)).join(",");

function facing(data: Float32Array, offset: number): number {
  const a = point(data, offset);
  const face = cross(sub(point(data, offset + S), a), sub(point(data, offset + 2 * S), a));
  const normal: Vec3 = [0, 1, 2].map((lane) => data[offset + 3 + lane]! + data[offset + S + 3 + lane]! + data[offset + 2 * S + 3 + lane]!) as unknown as Vec3;
  return dot(face, normal) / (Math.hypot(...face) * Math.hypot(...normal));
}

test("every emitted surface has nondegenerate CCW faces agreeing with its shading normals", () => {
  const { data } = createCropGeometryData();
  let minFacing = 1;
  let invalid = 0;
  for (let offset = 0; offset < data.length; offset += S * 3) {
    const value = facing(data, offset);
    if (!Number.isFinite(value)) invalid += 1;
    minFacing = Math.min(minFacing, value);
  }
  expect(invalid).toBe(0);
  expect(minFacing).toBeGreaterThan(0.05);
  // Demonstrate that this catches the former defect; unit-length normals alone did not.
  const reversed = data.slice(0, S * 3);
  reversed.set(data.slice(S * 2, S * 3), S);
  reversed.set(data.slice(S, S * 2), S * 2);
  expect(facing(reversed, 0)).toBeLessThan(0);
});

test("harvest bodies are closed two-manifold meshes, not open triangle shells", () => {
  const { data } = createCropGeometryData();
  const edges = new Map<string, number>();
  for (let offset = 0; offset < data.length; offset += S * 3) {
    if (Math.round(data[offset + 10]!) !== 2) continue;
    const keys = [0, 1, 2].map((i) => pointKey(data, offset + i * S));
    for (let edge = 0; edge < 3; edge += 1) {
      const key = `${data[offset + 9]}:` + [keys[edge]!, keys[(edge + 1) % 3]!].sort().join("|");
      edges.set(key, (edges.get(key) ?? 0) + 1);
    }
  }
  expect(edges.size).toBeGreaterThan(0);
  expect([...edges.values()].filter((count) => count !== 2)).toEqual([]);
});

test("attachment frames preserve the physical origin, normal axes and right-handedness", () => {
  const origin: Vec3 = [0.12, 0.84, -0.03];
  const axes: Vec3[] = [[0, 1, 0], [1, 0, 0], [0, 0, 1], [0.30, 0.94, 0.11]];
  for (const direction of axes) {
    for (const hint of [[0, 0, 1] as Vec3, [1, 0, 0] as Vec3, direction]) {
      const frame = cropAttachmentFrame(origin, direction, hint);
      expect(cropFramePoint(frame, [0, 0, 0])).toEqual(origin);
      expect(dot(cross(frame.x, frame.y), frame.z)).toBeCloseTo(1, 10);
      expect(dot(frame.x, frame.y)).toBeCloseTo(0, 10);
      expect(dot(frame.y, frame.z)).toBeCloseTo(0, 10);
      for (const axis of [frame.x, frame.y, frame.z]) expect(Math.hypot(...axis)).toBeCloseTo(1, 10);
      const tip = sub(cropFramePoint(frame, [0, 0.37, 0]), origin);
      expect(dot(tip, frame.y)).toBeCloseTo(0.37, 10);
      expect(dot(tip, frame.x)).toBeCloseTo(0, 10);
    }
  }
  expect(() => cropAttachmentFrame(origin, [0, 0, 0])).toThrow();
});

test("dependent organs share the actual carrier pivot and growth timing of their support", () => {
  const { data } = createCropGeometryData();
  const groups = new Map<string, { support: boolean; dependent: boolean }>();
  for (let offset = 0; offset < data.length; offset += S) {
    const crop = Math.round(data[offset + 9]!);
    if (crop === 4) continue; // Lettuce blades are independently rooted in the basal crown.
    const material = Math.round(data[offset + 10]!);
    const flex = data[offset + 12]!;
    const key = `${crop}/${pointKey(data, offset + 6)}/${data[offset + 11]!.toFixed(6)}`;
    const group = groups.get(key) ?? { support: false, dependent: false };
    group.support ||= material === 1 || (crop === 2 && material === 0 && flex < 0.25); // corn sheath
    group.dependent ||= material === 0 || material === 4 || (material === 2 && crop !== 0);
    groups.set(key, group);
  }
  expect([...groups.values()].some((group) => group.dependent)).toBe(true);
  expect([...groups.entries()].filter(([, group]) => group.dependent && !group.support)).toEqual([]);
});

test("the corn husk and cob really use the same tilted ear frame", () => {
  const { data } = createCropGeometryData();
  const frame = cropAttachmentFrame([0.066, 1.010, 0.014], [0.30, 0.94, 0.11]);
  const cobHeights: number[] = [];
  const huskHeights: number[] = [];
  const huskRadii: number[] = [];
  for (let offset = 0; offset < data.length; offset += S) {
    if (Math.round(data[offset + 9]!) !== 2) continue;
    const material = Math.round(data[offset + 10]!);
    const local = sub(point(data, offset), frame.origin);
    if (material === 2) cobHeights.push(dot(local, frame.y));
    if (material === 4) {
      huskHeights.push(dot(local, frame.y));
      huskRadii.push(Math.hypot(dot(local, frame.x), dot(local, frame.z)));
    }
  }
  expect(Math.min(...cobHeights)).toBeCloseTo(0, 5);
  expect(Math.max(...cobHeights)).toBeCloseTo(0.37, 5);
  expect(Math.min(...huskHeights)).toBeCloseTo(0, 5);
  expect(Math.max(...huskHeights)).toBeGreaterThan(0.30);
  expect(Math.max(...huskHeights)).toBeLessThan(Math.max(...cobHeights));
  expect(Math.max(...huskRadii)).toBeGreaterThan(0.07);
});
