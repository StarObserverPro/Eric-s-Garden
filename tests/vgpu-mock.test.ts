import { describe, expect, test } from "vitest";
import { draw, frame, geometry, init, target, type Frame, type FramePass, type Target } from "vgpu/mock";

import { createBoxVertices } from "../src/render/vgpu/geometry";
import gardenShader from "../src/render/vgpu/shaders/garden.wgsl";

describe("vgpu garden shader", () => {
  test("reflects, compiles and records the procedural soil draw on the mock adapter", async () => {
    const gpu = await init();
    const output = target(gpu, { size: [64, 64], format: "rgba8unorm", depth: true });
    const box = geometry(gpu, {
      buffers: [{
        data: createBoxVertices().buffer,
        stride: 28,
        attributes: {
          local_position: "float32x3",
          local_normal: "float32x3",
          part: "float32",
        },
      }],
    });
    const soil = draw(gpu, {
      shader: gardenShader,
      geometry: box,
      instances: 12,
      cull: "back",
    });
    soil.set({
      viewProjection: new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
      ]),
      scene: [0, 0.4, 0.2, 1],
      weather: [0, 1, 0.7, 0.6],
      wet0: [1, 0, 0, 0],
      wet1: [0, 0, 0, 0],
      wet2: [0, 0, 0, 0],
    });
    await soil.compile(output);
    expect(() => frame(gpu, (current: Frame) => {
      current.pass({ target: output, clear: [0, 0, 0, 1] }, (pass: FramePass) => pass.draw(soil));
    })).not.toThrow();
    box.destroy();
    (output as Target & { destroy(): void }).destroy();
    gpu.dispose();
    expect(gpu.disposed).toBe(true);
  });
});
