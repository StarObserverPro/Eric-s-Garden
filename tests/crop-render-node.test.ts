import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { expect, test } from "vitest";
import { draw, frame, geometry, init, target, type Frame, type FramePass, type Target } from "vgpu/node";
import { perspectiveCamera } from "vgpu/scene";

import { CROP_INSTANCE_COUNT, CROP_VERTEX_STRIDE_FLOATS, createCropGeometryData } from "../src/render/vgpu/crop-geometry";
import cropShader from "../src/render/vgpu/shaders/crop.wgsl";

type Vec3 = readonly [number, number, number];

const LINEUP_WIDTH = 640;
const LINEUP_HEIGHT = 420;
const PUMPKIN_WIDTH = 560;
const PUMPKIN_HEIGHT = 360;

const SUN_DIRECTION = [-0.615, 0.276, -0.740, 0] as const;
const SUN_COLOR = [1.0, 0.76, 0.42, 1] as const;
const AMBIENT_COLOR = [0.46, 0.58, 0.63, 1] as const;
const FOG_COLOR = [0.74, 0.77, 0.70, 1] as const;
const CLEAR = [0.12, 0.18, 0.11, 1] as const;

test("crop renderer keeps a fixed six-crop visual QA lineup and pumpkin close-up", async () => {
  const gpu = await init({ label: "eric-garden-crop-evidence" });
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
    label: "crop-visual-qa",
  });

  const lineupOutput = target(gpu, {
    size: [LINEUP_WIDTH, LINEUP_HEIGHT],
    format: "rgba8unorm",
    depth: true,
  });
  const lineupRoots: readonly Vec3[] = [
    [-1.65, 0, 0.58],
    [0, 0, 0.58],
    [1.65, 0, 0.58],
    [-1.55, 0, -0.72],
    [0, 0, -0.72],
    [1.55, 0, -0.72],
  ];
  const lineupCameraPosition = [4.7, 3.1, 5.9] as const;
  const lineupCamera = perspectiveCamera({
    fov: 39,
    aspect: LINEUP_WIDTH / LINEUP_HEIGHT,
    near: 0.1,
    far: 40,
    position: lineupCameraPosition,
    target: [0, 0.60, 0],
  });
  setCropUniforms(crop, lineupCamera.viewProjection, lineupCameraPosition, [0, 1, 2, 3, 4, 5], lineupRoots);
  await crop.compile(lineupOutput);
  frame(gpu, (current: Frame) => current.pass(
    { target: lineupOutput, clear: CLEAR, clearDepth: 1 },
    (pass: FramePass) => pass.draw(crop),
  ));
  const lineupPixels = await lineupOutput.read();
  const lineupStats = analyzePixels(lineupPixels, [31, 46, 28]);
  const lineupPath = process.env.CROP_LINEUP_EVIDENCE_PATH;
  if (lineupPath) writePpm(lineupPath, lineupPixels, LINEUP_WIDTH, LINEUP_HEIGHT);
  console.info("crop-visual-qa lineup", lineupStats);
  // Coverage is only a render-presence check. Crop scale is an art parameter, not a quality score.
  expect(lineupStats.changedPixels).toBeGreaterThan(5_000);
  expect(lineupStats.greenPixels).toBeGreaterThan(2_500);
  expect(lineupStats.warmPixels).toBeGreaterThan(350);
  expect(lineupStats.lumaRange).toBeGreaterThan(28);

  const pumpkinOutput = target(gpu, {
    size: [PUMPKIN_WIDTH, PUMPKIN_HEIGHT],
    format: "rgba8unorm",
    depth: true,
  });
  const pumpkinRoot: Vec3 = [0.82, 0, 0];
  const pumpkinCameraPosition = [3.55, 1.55, 2.65] as const;
  const pumpkinCamera = perspectiveCamera({
    fov: 35,
    aspect: PUMPKIN_WIDTH / PUMPKIN_HEIGHT,
    near: 0.1,
    far: 30,
    position: pumpkinCameraPosition,
    target: [1.38, 0.18, 0.05],
  });
  setCropUniforms(crop, pumpkinCamera.viewProjection, pumpkinCameraPosition, [3], [pumpkinRoot]);
  await crop.compile(pumpkinOutput);
  frame(gpu, (current: Frame) => current.pass(
    { target: pumpkinOutput, clear: CLEAR, clearDepth: 1 },
    (pass: FramePass) => pass.draw(crop),
  ));
  const pumpkinPixels = await pumpkinOutput.read();
  const pumpkinStats = analyzePixels(pumpkinPixels, [31, 46, 28]);
  const pumpkinPath = process.env.PUMPKIN_EVIDENCE_PATH;
  if (pumpkinPath) writePpm(pumpkinPath, pumpkinPixels, PUMPKIN_WIDTH, PUMPKIN_HEIGHT);
  console.info("crop-visual-qa pumpkin", pumpkinStats);
  expect(pumpkinStats.changedPixels).toBeGreaterThan(1_500);
  expect(pumpkinStats.greenPixels).toBeGreaterThan(850);
  expect(pumpkinStats.warmPixels).toBeGreaterThan(220);

  cropGeometry.destroy();
  (lineupOutput as Target & { destroy(): void }).destroy();
  (pumpkinOutput as Target & { destroy(): void }).destroy();
  gpu.dispose();
}, 60_000);

function setCropUniforms(
  crop: ReturnType<typeof draw>,
  viewProjection: ArrayLike<number>,
  cameraPosition: readonly [number, number, number],
  cropKinds: readonly number[],
  roots: readonly Vec3[],
): void {
  const kinds = Array.from({ length: CROP_INSTANCE_COUNT }, (_, index) => cropKinds[index] ?? -1);
  const stages = Array.from({ length: CROP_INSTANCE_COUNT }, (_, index) => cropKinds[index] === undefined ? 0 : 4);
  const rootX = Array.from({ length: CROP_INSTANCE_COUNT }, (_, index) => roots[index]?.[0] ?? 0);
  const rootY = Array.from({ length: CROP_INSTANCE_COUNT }, (_, index) => roots[index]?.[1] ?? 0);
  const rootZ = Array.from({ length: CROP_INSTANCE_COUNT }, (_, index) => roots[index]?.[2] ?? 0);
  crop.set({
    viewProjection,
    cameraPosition: [...cameraPosition, 1],
    scene: [0, 0, 0.14, 1],
    lightDirection: SUN_DIRECTION,
    lightColor: SUN_COLOR,
    ambientColor: AMBIENT_COLOR,
    fogColor: FOG_COLOR,
    lightParams: [1.05, 0.022, 0, 1.05],
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
}

function analyzePixels(pixels: Uint8Array, clear: readonly [number, number, number]): {
  changedPixels: number;
  greenPixels: number;
  warmPixels: number;
  lumaRange: number;
} {
  let changedPixels = 0;
  let greenPixels = 0;
  let warmPixels = 0;
  let minLuma = 255;
  let maxLuma = 0;
  for (let offset = 0; offset + 3 < pixels.length; offset += 4) {
    const r = pixels[offset]!;
    const g = pixels[offset + 1]!;
    const b = pixels[offset + 2]!;
    const delta = Math.abs(r - clear[0]) + Math.abs(g - clear[1]) + Math.abs(b - clear[2]);
    if (delta <= 24) continue;
    changedPixels += 1;
    if (g > r * 1.14 && g > b * 1.04) greenPixels += 1;
    if (r > g * 1.08 && r > b * 1.35) warmPixels += 1;
    const luma = Math.round(r * 0.299 + g * 0.587 + b * 0.114);
    minLuma = Math.min(minLuma, luma);
    maxLuma = Math.max(maxLuma, luma);
  }
  return {
    changedPixels,
    greenPixels,
    warmPixels,
    lumaRange: changedPixels > 0 ? maxLuma - minLuma : 0,
  };
}

function writePpm(path: string, pixels: Uint8Array, width: number, height: number): void {
  mkdirSync(dirname(path), { recursive: true });
  const header = new TextEncoder().encode(`P6\n${width} ${height}\n255\n`);
  const rgb = new Uint8Array(width * height * 3);
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