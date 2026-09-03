import { expect, test } from "vitest";
import { draw, frame, geometry, init, target, type Frame, type FramePass, type Target } from "vgpu/node";
import { perspectiveCamera } from "vgpu/scene";

import { createSoilGeometryData } from "../src/render/vgpu/soil-geometry";
import gardenShader from "../src/render/vgpu/shaders/garden.wgsl";
import soilShader from "../src/render/vgpu/shaders/soil.wgsl";
import {
  WATERING_CAN_VERTEX_STRIDE_FLOATS,
  createWateringCanVertices,
} from "../src/render/vgpu/watering-can-geometry";

const WIDTH = 320;
const HEIGHT = 240;
const CAMERA_POSITION = [5.7, 4.25, 6.4] as const;

const CAMERA = perspectiveCamera({
  fov: 41,
  aspect: WIDTH / HEIGHT,
  near: 0.1,
  far: 80,
  position: CAMERA_POSITION,
  target: [0, -0.02, 0],
});

const SHARED = {
  viewProjection: CAMERA.viewProjection,
  cameraPosition: [...CAMERA_POSITION, 1],
  lightDirection: [-0.62, 0.34, -0.69, 0],
  lightColor: [1, 0.78, 0.46, 1],
  ambientColor: [0.46, 0.58, 0.63, 1],
  fogColor: [0.74, 0.77, 0.70, 1],
  lightParams: [1.05, 0.022, 0, 1.05],
} as const;

test("partial watering changes a local subset before full-bed saturation", async () => {
  const gpu = await init({ label: "eric-watering-wet-front-evidence" });
  const output = target(gpu, { size: [WIDTH, HEIGHT], format: "rgba8unorm", depth: true });
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
  const soil = draw(gpu, { shader: soilShader, geometry: soilGeometry, cull: "none" });
  const renderWetness = async (progress: number): Promise<Uint8Array> => {
    soil.set({
      ...SHARED,
      scene: [2.5, 0.18, 1, 0],
      wet0: [0, 0, 0, 0],
      wet1: [0, progress, 0, 0],
      wet2: [0, 0, 0, 0],
    });
    await soil.compile(output);
    frame(gpu, (current: Frame) => current.pass(
      { target: output, clear: [0.43, 0.58, 0.35, 1], clearDepth: 1 },
      (pass: FramePass) => pass.draw(soil),
    ));
    return output.read();
  };

  const dry = await renderWetness(0);
  const partial = await renderWetness(0.28);
  const full = await renderWetness(1);
  const partialChanged = changedPixelCount(dry, partial);
  const fullChanged = changedPixelCount(dry, full);

  expect(partialChanged).toBeGreaterThan(80);
  expect(fullChanged).toBeGreaterThan(partialChanged * 1.3);

  soilGeometry.destroy();
  (output as Target & { destroy(): void }).destroy();
  gpu.dispose();
}, 60_000);

test("the active watering can produces visible body and pour pixels", async () => {
  const gpu = await init({ label: "eric-watering-can-evidence" });
  const output = target(gpu, { size: [WIDTH, HEIGHT], format: "rgba8unorm", depth: true });
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
  const can = draw(gpu, { shader: gardenShader, geometry: canGeometry, cull: "none" });
  can.set({
    ...SHARED,
    scene: [1.5, 0.3, 0.25, 1],
    weather: [0, 4, 5, 0.35],
    wet0: [0, 0, 0, 0],
    wet1: [0, 0.35, 0, 0],
    wet2: [0, 0, 0, 0],
  });
  await can.compile(output);
  frame(gpu, (current: Frame) => current.pass(
    { target: output, clear: [0.04, 0.04, 0.04, 1], clearDepth: 1 },
    (pass: FramePass) => pass.draw(can),
  ));
  const pixels = await output.read();

  let visible = 0;
  let waterLike = 0;
  for (let offset = 0; offset + 3 < pixels.length; offset += 4) {
    const r = pixels[offset]!;
    const g = pixels[offset + 1]!;
    const b = pixels[offset + 2]!;
    if (r + g + b > 45) visible += 1;
    if (b > r * 1.3 && b > g * 1.05 && b > 45) waterLike += 1;
  }
  expect(visible).toBeGreaterThan(120);
  expect(waterLike).toBeGreaterThan(8);

  canGeometry.destroy();
  (output as Target & { destroy(): void }).destroy();
  gpu.dispose();
}, 60_000);

function changedPixelCount(a: Uint8Array, b: Uint8Array): number {
  let changed = 0;
  for (let offset = 0; offset + 3 < a.length && offset + 3 < b.length; offset += 4) {
    const delta = Math.abs(a[offset]! - b[offset]!) +
      Math.abs(a[offset + 1]! - b[offset + 1]!) +
      Math.abs(a[offset + 2]! - b[offset + 2]!);
    if (delta >= 6) changed += 1;
  }
  return changed;
}
