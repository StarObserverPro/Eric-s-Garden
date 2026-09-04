import { expect, test } from "vitest";
import { draw, frame, geometry, init, target, type Frame, type FramePass, type Target } from "vgpu/mock";

import {
  createWaterGeometryData,
  WATER_VERTEX_STRIDE_FLOATS,
} from "../src/render/vgpu/water-geometry";
import waterShader from "../src/render/vgpu/shaders/water.wgsl";

test("opaque pond water shader reflects and records with weather uniforms", async () => {
  const gpu = await init();
  const output = target(gpu, { size: [96, 96], format: "rgba8unorm", depth: true });
  const waterData = createWaterGeometryData();
  const waterGeometry = geometry(gpu, {
    buffers: [{
      data: waterData.data.buffer,
      stride: WATER_VERTEX_STRIDE_FLOATS * 4,
      attributes: {
        world_position: "float32x3",
        water_depth: "float32",
      },
    }],
  });
  const water = draw(gpu, {
    shader: waterShader,
    geometry: waterGeometry,
    cull: "none",
  });
  water.set({
    viewProjection: new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    ]),
    cameraPosition: [4, 4, 6, 1],
    scene: [2, 0.6, 0.3, 1],
    lightDirection: [-0.62, 0.34, -0.69, 0],
    lightColor: [1, 0.78, 0.46, 1],
    ambientColor: [0.46, 0.58, 0.63, 1],
    fogColor: [0.74, 0.77, 0.70, 1],
    lightParams: [1.05, 0.022, 0.2, 1.05],
    skyColor: [0.61, 0.73, 0.79, 1],
  });
  await water.compile(output);
  expect(() => frame(gpu, (current: Frame) => current.pass(
    { target: output, clear: [0, 0, 0, 1], clearDepth: 1 },
    (pass: FramePass) => pass.draw(water),
  ))).not.toThrow();

  waterGeometry.destroy();
  (output as Target & { destroy(): void }).destroy();
  gpu.dispose();
  expect(gpu.disposed).toBe(true);
}, 20_000);
