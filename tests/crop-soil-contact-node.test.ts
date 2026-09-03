import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { expect, test } from "vitest";
import { draw, frame, geometry, init, target, type Frame, type FramePass, type Target } from "vgpu/node";
import { perspectiveCamera } from "vgpu/scene";

import { CROP_INSTANCE_COUNT, CROP_VERTEX_STRIDE_FLOATS, createCropGeometryData } from "../src/render/vgpu/crop-geometry";
import { createSoilGeometryData } from "../src/render/vgpu/soil-geometry";
import cropShader from "../src/render/vgpu/shaders/crop.wgsl";
import soilShader from "../src/render/vgpu/shaders/soil.wgsl";
import { PLOT_POSITIONS } from "../src/scene/snapshot";

const WIDTH = 640;
const HEIGHT = 420;
const CARROT_PLOT = 5;
const PUMPKIN_PLOT = 6;

test("production soil and mature crops share a readable contact baseline", async () => {
  const gpu = await init({ label: "eric-garden-crop-soil-contact" });
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
  const soil = draw(gpu, { shader: soilShader, geometry: soilGeometry, cull: "none", label: "crop-soil-soil" });

  const cropData = createCropGeometryData();
  const cropGeometry = geometry(gpu, {
    buffers: [{
      data: cropData.data.buffer,
      stride: CROP_VERTEX_STRIDE_FLOATS * 4,
      attributes: {
        local_position: "float32x3",
        local_normal: "float32x3",
        anchor: "float32x3",
        crop_kind: "float32",
        material_kind: "float32",
        birth: "float32",
        flex: "float32",
      },
    }],
  });
  const crop = draw(gpu, {
    shader: cropShader,
    geometry: cropGeometry,
    instances: CROP_INSTANCE_COUNT,
    cull: "none",
    label: "crop-soil-crops",
  });

  const cameraPosition = [3.45, 1.72, 3.85] as const;
  const camera = perspectiveCamera({
    fov: 33,
    aspect: WIDTH / HEIGHT,
    near: 0.1,
    far: 40,
    position: cameraPosition,
    target: [0, 0.02, 0],
  });
  const lightDirection = [-0.62, 0.34, -0.69, 0] as const;
  const lightColor = [1, 0.78, 0.46, 1] as const;
  const ambientColor = [0.46, 0.58, 0.63, 1] as const;
  const fogColor = [0.74, 0.77, 0.70, 1] as const;
  const lightParams = [1.05, 0.022, 0, 1.05] as const;

  soil.set({
    viewProjection: camera.viewProjection,
    cameraPosition: [...cameraPosition, 1],
    scene: [2.5, 0.18, 1, 0],
    lightDirection,
    lightColor,
    ambientColor,
    fogColor,
    lightParams,
    wet0: [0, 0, 0, 0],
    wet1: [0, 0, 0, 0],
    wet2: [0, 0, 0, 0],
  });

  const kinds = Array.from({ length: CROP_INSTANCE_COUNT }, () => -1);
  kinds[CARROT_PLOT] = 0;
  kinds[PUMPKIN_PLOT] = 3;
  const stages = kinds.map((kind) => kind < 0 ? 0 : 4);
  const rootX = PLOT_POSITIONS.map((position) => position[0]);
  const rootY = PLOT_POSITIONS.map((position) => position[1]);
  const rootZ = PLOT_POSITIONS.map((position) => position[2]);
  crop.set({
    viewProjection: camera.viewProjection,
    cameraPosition: [...cameraPosition, 1],
    scene: [0, 0, 0.14, 1],
    lightDirection,
    lightColor,
    ambientColor,
    fogColor,
    lightParams,
    crop0: kinds.slice(0, 4),
    crop1: kinds.slice(4, 8),
    crop2: kinds.slice(8, 12),
    stage0: stages.slice(0, 4),
    stage1: stages.slice(4, 8),
    stage2: stages.slice(8, 12),
    rootX0: rootX.slice(0, 4),
    rootX1: rootX.slice(4, 8),
    rootX2: rootX.slice(8, 12),
    rootY0: rootY.slice(0, 4),
    rootY1: rootY.slice(4, 8),
    rootY2: rootY.slice(8, 12),
    rootZ0: rootZ.slice(0, 4),
    rootZ1: rootZ.slice(4, 8),
    rootZ2: rootZ.slice(8, 12),
  });

  await soil.compile(output);
  await crop.compile(output);
  frame(gpu, (current: Frame) => {
    current.pass(
      { target: output, clear: [0.20, 0.28, 0.16, 1], clearDepth: 1 },
      (pass: FramePass) => pass.draw(soil),
    );
    current.pass(
      { target: output, clear: false },
      (pass: FramePass) => pass.draw(crop),
    );
  });

  const pixels = await output.read();
  const stats = analyzePixels(pixels);
  console.info("crop-soil-contact", stats);
  expect(stats.brownPixels).toBeGreaterThan(8_000);
  expect(stats.greenPixels).toBeGreaterThan(500);
  expect(stats.warmPixels).toBeGreaterThan(180);
  expect(stats.lumaRange).toBeGreaterThan(45);

  const evidencePath = process.env.CROP_SOIL_EVIDENCE_PATH;
  if (evidencePath) writePpm(evidencePath, pixels);

  soilGeometry.destroy();
  cropGeometry.destroy();
  (output as Target & { destroy(): void }).destroy();
  gpu.dispose();
}, 60_000);

function analyzePixels(pixels: Uint8Array): {
  brownPixels: number;
  greenPixels: number;
  warmPixels: number;
  lumaRange: number;
} {
  let brownPixels = 0;
  let greenPixels = 0;
  let warmPixels = 0;
  let minLuma = 255;
  let maxLuma = 0;
  for (let offset = 0; offset + 3 < pixels.length; offset += 4) {
    const r = pixels[offset]!;
    const g = pixels[offset + 1]!;
    const b = pixels[offset + 2]!;
    const luma = Math.round(r * 0.299 + g * 0.587 + b * 0.114);
    minLuma = Math.min(minLuma, luma);
    maxLuma = Math.max(maxLuma, luma);
    if (r > g * 1.08 && g > b * 1.15) brownPixels += 1;
    if (g > r * 1.12 && g > b * 1.04) greenPixels += 1;
    if (r > g * 1.08 && r > b * 1.35) warmPixels += 1;
  }
  return { brownPixels, greenPixels, warmPixels, lumaRange: maxLuma - minLuma };
}

function writePpm(path: string, pixels: Uint8Array): void {
  mkdirSync(dirname(path), { recursive: true });
  const header = new TextEncoder().encode(`P6\n${WIDTH} ${HEIGHT}\n255\n`);
  const rgb = new Uint8Array(WIDTH * HEIGHT * 3);
  for (let source = 0, targetOffset = 0; source + 3 < pixels.length && targetOffset < rgb.length; source += 4) {
    rgb[targetOffset++] = pixels[source]!;
    rgb[targetOffset++] = pixels[source + 1]!;
    rgb[targetOffset++] = pixels[source + 2]!;
  }
  const ppm = new Uint8Array(header.length + rgb.length);
  ppm.set(header, 0);
  ppm.set(rgb, header.length);
  writeFileSync(path, ppm);
}