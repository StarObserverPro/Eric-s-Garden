import { describe, expect, test } from "vitest";
import { draw, frame, geometry, init, target, type Frame, type FramePass, type Target } from "vgpu/mock";

import gardenShader from "../src/render/vgpu/shaders/garden.wgsl";
import {
  WATERING_CAN_VERTEX_STRIDE_FLOATS,
  createWateringCanVertices,
} from "../src/render/vgpu/watering-can-geometry";

describe("procedural watering can", () => {
  test("has a readable body, long spout and separate water strands", () => {
    const data = createWateringCanVertices();
    expect(data.length % (WATERING_CAN_VERTEX_STRIDE_FLOATS * 3)).toBe(0);
    expect(data.length / WATERING_CAN_VERTEX_STRIDE_FLOATS).toBeGreaterThan(500);

    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    const parts = new Set<number>();
    for (let offset = 0; offset < data.length; offset += WATERING_CAN_VERTEX_STRIDE_FLOATS) {
      const x = data[offset]!;
      const y = data[offset + 1]!;
      const part = data[offset + 6]!;
      expect(Number.isFinite(x)).toBe(true);
      expect(Number.isFinite(y)).toBe(true);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      parts.add(part);
    }
    expect(parts).toEqual(new Set([0, 1, 2]));
    expect(minX).toBeLessThan(-0.35);
    expect(maxX).toBeGreaterThan(1.05);
    expect(maxY).toBeGreaterThan(0.75);
    expect(minY).toBeLessThan(-0.45);
  });

  test("compiles and records the active watering-can shader mode", async () => {
    const gpu = await init();
    const output = target(gpu, { size: [64, 64], format: "rgba8unorm", depth: true });
    const canGeometry = geometry(gpu, {
      buffers: [{
        data: createWateringCanVertices().buffer,
        stride: WATERING_CAN_VERTEX_STRIDE_FLOATS * 4,
        attributes: {
          local_position: "float32x3",
          local_normal: "float32x3",
          part: "float32",
        },
      }],
    });
    const can = draw(gpu, {
      shader: gardenShader,
      geometry: canGeometry,
      cull: "none",
    });
    can.set({
      viewProjection: new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
      ]),
      cameraPosition: [3, 4, 5, 1],
      scene: [0.5, 0.3, 0.4, 1],
      weather: [0, 4, 5, 0.35],
      lightDirection: [-0.62, 0.34, -0.69, 0],
      lightColor: [1, 0.78, 0.46, 1],
      ambientColor: [0.46, 0.58, 0.63, 1],
      fogColor: [0.74, 0.77, 0.70, 1],
      lightParams: [1.05, 0.022, 0, 1.05],
      wet0: [0, 0, 0, 0],
      wet1: [0, 0, 0, 0],
      wet2: [0, 0, 0, 0],
    });
    await can.compile(output);
    expect(() => frame(gpu, (current: Frame) => {
      current.pass(
        { target: output, clear: [0, 0, 0, 1], clearDepth: 1 },
        (pass: FramePass) => pass.draw(can),
      );
    })).not.toThrow();

    canGeometry.destroy();
    (output as Target & { destroy(): void }).destroy();
    gpu.dispose();
    expect(gpu.disposed).toBe(true);
  }, 20_000);
});
