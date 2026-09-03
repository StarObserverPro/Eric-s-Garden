import { expect, test } from "vitest";
import { draw, frame, geometry, init, target, type Frame, type FramePass, type Target } from "vgpu/mock";

import { createVegetationVertices } from "../src/render/vgpu/geometry";
import vegetationShader from "../src/render/vgpu/shaders/vegetation.wgsl";

test("segmented vegetation shader reflects and records with gust lighting uniforms", async () => {
  const gpu = await init();
  const output = target(gpu, { size: [96, 96], format: "rgba8unorm", depth: true });
  const vegetationGeometry = geometry(gpu, {
    buffers: [{
      data: createVegetationVertices().buffer,
      stride: 28,
      attributes: {
        local_position: "float32x3",
        local_normal: "float32x3",
        part: "float32",
      },
    }],
  });
  const vegetation = draw(gpu, {
    shader: vegetationShader,
    geometry: vegetationGeometry,
    instances: 4,
    cull: "none",
  });
  vegetation.set({
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
    lightParams: [1.05, 0.022, 0, 1.05],
  });
  await vegetation.compile(output);
  expect(() => frame(gpu, (current: Frame) => current.pass(
    { target: output, clear: [0, 0, 0, 1], clearDepth: 1 },
    (pass: FramePass) => pass.draw(vegetation),
  ))).not.toThrow();

  vegetationGeometry.destroy();
  (output as Target & { destroy(): void }).destroy();
  gpu.dispose();
  expect(gpu.disposed).toBe(true);
}, 20_000);
