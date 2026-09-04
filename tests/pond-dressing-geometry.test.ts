import { expect, test } from "vitest";

import {
  createPondDressingGeometryData,
  POND_DRESSING_VERTEX_STRIDE_FLOATS,
} from "../src/render/vgpu/pond-dressing-geometry";

test("pond dressing is one small hardscape-compatible functional group", () => {
  const dressing = createPondDressingGeometryData();
  expect(dressing.triangleCount).toBe(80);
  expect(dressing.vertexCount).toBe(dressing.triangleCount * 3);
  expect(dressing.data.length).toBe(dressing.vertexCount * POND_DRESSING_VERTEX_STRIDE_FLOATS);

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  for (let offset = 0; offset < dressing.data.length; offset += POND_DRESSING_VERTEX_STRIDE_FLOATS) {
    const x = dressing.data[offset]!;
    const y = dressing.data[offset + 1]!;
    const z = dressing.data[offset + 2]!;
    const nx = dressing.data[offset + 3]!;
    const ny = dressing.data[offset + 4]!;
    const nz = dressing.data[offset + 5]!;
    const kind = dressing.data[offset + 6]!;
    expect([x, y, z, nx, ny, nz, kind].every(Number.isFinite)).toBe(true);
    expect(Math.hypot(nx, ny, nz)).toBeGreaterThan(0.98);
    expect(Math.hypot(nx, ny, nz)).toBeLessThan(1.02);
    expect(Math.round(kind)).toBe(2);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }

  expect(maxX - minX).toBeLessThan(2.1);
  expect(maxZ - minZ).toBeLessThan(2.4);
});
