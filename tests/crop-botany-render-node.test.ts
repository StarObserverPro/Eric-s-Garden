import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { expect, test } from "vitest";
import { draw, frame, geometry, init, target, type Frame, type FramePass, type Target } from "vgpu/node";
import { perspectiveCamera } from "vgpu/scene";
import { CROP_INSTANCE_COUNT, CROP_VERTEX_STRIDE_FLOATS, createCropGeometryData } from "../src/render/vgpu/crop-geometry";
import cropShader from "../src/render/vgpu/shaders/crop.wgsl";

type Vec3 = readonly [number, number, number];
type Light4 = readonly [number, number, number, number];
const CLEAR = [0.12, 0.18, 0.11, 1] as const;
const SUN_COLOR = [1.0, 0.76, 0.42, 1] as const;
const AMBIENT_COLOR = [0.46, 0.58, 0.63, 1] as const;
const FOG_COLOR = [0.74, 0.77, 0.70, 1] as const;
const NODE_WIDTH = 700;
const NODE_HEIGHT = 500;
const ROSETTE_WIDTH = 640;
const ROSETTE_HEIGHT = 440;

test("fixed crop detail evidence exposes node attachments and rosette separation", async () => {
  const gpu = await init({ label: "eric-garden-crop-botany-evidence" });
  const cropData = createCropGeometryData();
  const cropGeometry = geometry(gpu, {
    buffers: [{
      data: cropData.data.buffer,
      stride: CROP_VERTEX_STRIDE_FLOATS * 4,
      attributes: {
        local_position: "float32x3", local_normal: "float32x3", anchor: "float32x3",
        crop_kind: "float32", material_kind: "float32", birth: "float32", flex: "float32",
      },
    }],
  });
  const crop = draw(gpu, { shader: cropShader, geometry: cropGeometry, instances: CROP_INSTANCE_COUNT, cull: "none", label: "crop-botany-visual-qa" });
  const nodeOutput = target(gpu, { size: [NODE_WIDTH, NODE_HEIGHT], format: "rgba8unorm", depth: true });
  const rosetteOutput = target(gpu, { size: [ROSETTE_WIDTH, ROSETTE_HEIGHT], format: "rgba8unorm", depth: true });
  try {
    const nodeCameraPosition = [2.75, 1.75, 3.55] as const;
    const nodeCamera = perspectiveCamera({ fov: 30, aspect: NODE_WIDTH / NODE_HEIGHT, near: 0.1, far: 30, position: nodeCameraPosition, target: [0.02, 0.78, 0] });
    setCropUniforms(crop, nodeCamera.viewProjection, nodeCameraPosition, [1, 2], [[-0.48, 0, 0], [0.48, 0, 0]], [0.56, 0.32, 0.76, 0]);
    await crop.compile(nodeOutput);
    const capture = async (output: Target): Promise<Uint8Array> => {
      frame(gpu, (current: Frame) => current.pass({ target: output, clear: CLEAR, clearDepth: 1 }, (pass: FramePass) => pass.draw(crop)));
      return output.read();
    };
    const nodePixels = await capture(nodeOutput);
    const nodeStats = analyzePixels(nodePixels, [31, 46, 28]);
    const nodePath = process.env.CROP_NODE_EVIDENCE_PATH;
    if (nodePath) writePpm(nodePath, nodePixels, NODE_WIDTH, NODE_HEIGHT);
    console.info("crop-botany-qa nodes", nodeStats);
    expect(nodeStats.changedPixels).toBeGreaterThan(2_000);
    expect(nodeStats.greenPixels).toBeGreaterThan(1_100);
    expect(nodeStats.warmPixels).toBeGreaterThan(120);
    expect(nodeStats.lumaRange).toBeGreaterThan(24);

    const rosetteCameraPosition = [1.75, 0.95, 2.15] as const;
    const rosetteCamera = perspectiveCamera({ fov: 28, aspect: ROSETTE_WIDTH / ROSETTE_HEIGHT, near: 0.1, far: 24, position: rosetteCameraPosition, target: [0, 0.18, 0] });
    setCropUniforms(crop, rosetteCamera.viewProjection, rosetteCameraPosition, [4, 5], [[-0.32, 0, 0], [0.34, 0, 0]], [-0.72, 0.16, -0.67, 0]);
    await crop.compile(rosetteOutput);
    const rosettePixels = await capture(rosetteOutput);
    const rosetteStats = analyzePixels(rosettePixels, [31, 46, 28]);
    const rosettePath = process.env.CROP_ROSETTE_EVIDENCE_PATH;
    if (rosettePath) writePpm(rosettePath, rosettePixels, ROSETTE_WIDTH, ROSETTE_HEIGHT);
    console.info("crop-botany-qa rosette", rosetteStats);
    expect(rosetteStats.changedPixels).toBeGreaterThan(1_400);
    expect(rosetteStats.greenPixels).toBeGreaterThan(850);
    expect(rosetteStats.warmPixels).toBeGreaterThan(100);
    expect(rosetteStats.lumaRange).toBeGreaterThan(24);

    // Additional captures share the same production shader/carrier, not a reference-only mesh.
    // These presence assertions do not substitute for inspecting the saved joints and silhouette.
    await crop.compile(nodeOutput);
    for (const stage of [1.5, 2.4, 3.3, 4]) {
      setCropUniforms(crop, nodeCamera.viewProjection, nodeCameraPosition, [1, 2], [[-0.48, 0, 0], [0.48, 0, 0]], [0.56, 0.32, 0.76, 0], stage, 2.4, 0.85);
      const pixels = await capture(nodeOutput);
      expect(analyzePixels(pixels, [31, 46, 28]).changedPixels).toBeGreaterThan(100);
      if (nodePath) writePpm(`${nodePath}.growth-${stage}.ppm`, pixels, NODE_WIDTH, NODE_HEIGHT);
    }
    for (const side of [1, -1]) {
      const cameraPosition: Vec3 = [side * 1.35, 1.38, side * 1.7];
      const camera = perspectiveCamera({ fov: 24, aspect: NODE_WIDTH / NODE_HEIGHT, near: 0.1, far: 30, position: cameraPosition, target: [0.11, 1.17, 0.03] });
      setCropUniforms(crop, camera.viewProjection, cameraPosition, [2], [[0, 0, 0]], [0.56, 0.32, 0.76, 0], 4, 2.4, 0.85);
      const pixels = await capture(nodeOutput);
      expect(analyzePixels(pixels, [31, 46, 28]).changedPixels).toBeGreaterThan(300);
      if (nodePath) writePpm(`${nodePath}.ear-${side === 1 ? "front" : "back"}.ppm`, pixels, NODE_WIDTH, NODE_HEIGHT);
    }
    await crop.compile(rosetteOutput);
    setCropUniforms(crop, rosetteCamera.viewProjection, rosetteCameraPosition, [4, 5], [[-0.32, 0, 0], [0.34, 0, 0]], [-0.72, 0.16, -0.67, 0], 3.0, 2.4, 0.85);
    const growingRosette = await capture(rosetteOutput);
    expect(analyzePixels(growingRosette, [31, 46, 28]).greenPixels).toBeGreaterThan(300);
    if (rosettePath) writePpm(`${rosettePath}.growth-3.ppm`, growingRosette, ROSETTE_WIDTH, ROSETTE_HEIGHT);
  } finally {
    cropGeometry.destroy();
    (nodeOutput as Target & { destroy(): void }).destroy();
    (rosetteOutput as Target & { destroy(): void }).destroy();
    gpu.dispose();
  }
}, 60_000);

function setCropUniforms(crop: ReturnType<typeof draw>, viewProjection: ArrayLike<number>, cameraPosition: Vec3, cropKinds: readonly number[], roots: readonly Vec3[], lightDirection: Light4, stage = 4, time = 0, wind = 0): void {
  const kinds = Array.from({ length: CROP_INSTANCE_COUNT }, (_, index) => cropKinds[index] ?? -1);
  const stages = Array.from({ length: CROP_INSTANCE_COUNT }, (_, index) => cropKinds[index] === undefined ? 0 : stage);
  const rootX = Array.from({ length: CROP_INSTANCE_COUNT }, (_, index) => roots[index]?.[0] ?? 0);
  const rootY = Array.from({ length: CROP_INSTANCE_COUNT }, (_, index) => roots[index]?.[1] ?? 0);
  const rootZ = Array.from({ length: CROP_INSTANCE_COUNT }, (_, index) => roots[index]?.[2] ?? 0);
  crop.set({
    viewProjection, cameraPosition: [...cameraPosition, 1], scene: [time, wind, 0.05, 1], lightDirection,
    lightColor: SUN_COLOR, ambientColor: AMBIENT_COLOR, fogColor: FOG_COLOR, lightParams: [1.05, 0.022, 0, 1.05],
    crop0: kinds.slice(0, 4), crop1: kinds.slice(4, 8), crop2: kinds.slice(8, 12),
    stage0: stages.slice(0, 4), stage1: stages.slice(4, 8), stage2: stages.slice(8, 12),
    rootX0: rootX.slice(0, 4), rootX1: rootX.slice(4, 8), rootX2: rootX.slice(8, 12),
    rootY0: rootY.slice(0, 4), rootY1: rootY.slice(4, 8), rootY2: rootY.slice(8, 12),
    rootZ0: rootZ.slice(0, 4), rootZ1: rootZ.slice(4, 8), rootZ2: rootZ.slice(8, 12),
  });
}

function analyzePixels(pixels: Uint8Array, clear: readonly [number, number, number]): { changedPixels: number; greenPixels: number; warmPixels: number; lumaRange: number } {
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
    if (g > r * 1.12 && g > b * 1.03) greenPixels += 1;
    if (r > g * 1.06 && r > b * 1.25) warmPixels += 1;
    const luma = Math.round(r * 0.299 + g * 0.587 + b * 0.114);
    minLuma = Math.min(minLuma, luma);
    maxLuma = Math.max(maxLuma, luma);
  }
  return { changedPixels, greenPixels, warmPixels, lumaRange: changedPixels > 0 ? maxLuma - minLuma : 0 };
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
