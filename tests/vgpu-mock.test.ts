import { describe, expect, test } from "vitest";
import { draw, frame, geometry, init, target, type Frame, type FramePass, type Target } from "vgpu/mock";

import { createSoilGeometryData } from "../src/render/vgpu/soil-geometry";
import soilShader from "../src/render/vgpu/shaders/soil.wgsl";

describe("vgpu soil material", () => {
  test("reflects, compiles and records the dedicated high-density soil draw", async () => {
    const gpu = await init();
    const output = target(gpu, { size: [64, 64], format: "rgba8unorm", depth: true });
    const soilData = createSoilGeometryData();
    const soilGeometry = geometry(gpu, {
      buffers: [{
        data: soilData.data.buffer,
        stride: 36,
        attributes: {
          position: "float32x3",
          normal: "float32x3",
          plot_index: "float32",
          material_seed: "float32",
          surface_type: "float32",
        },
      }],
    });
    const soil = draw(gpu, {
      shader: soilShader,
      geometry: soilGeometry,
      cull: "none",
    });
    soil.set({
      viewProjection: new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
      ]),
      cameraPosition: [3, 4, 5, 1],
      scene: [0, 0.2, 1, 0],
      wet0: [0, 0, 0, 0],
      wet1: [0, 0, 0, 0],
      wet2: [0, 0, 0, 0],
    });
    await soil.compile(output);
    expect(() => frame(gpu, (current: Frame) => {
      current.pass({ target: output, clear: [0, 0, 0, 1], clearDepth: 1 }, (pass: FramePass) => pass.draw(soil));
    })).not.toThrow();
    soilGeometry.destroy();
    (output as Target & { destroy(): void }).destroy();
    gpu.dispose();
    expect(gpu.disposed).toBe(true);
  }, 20_000);
});
