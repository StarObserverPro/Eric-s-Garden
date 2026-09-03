import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { expect, test } from "vitest";
import { draw, effect, frame, geometry, init, target, type Frame, type FramePass, type Target } from "vgpu/node";
import { perspectiveCamera } from "vgpu/scene";

import { createVegetationVertices } from "../src/render/vgpu/geometry";
import skyShader from "../src/render/vgpu/shaders/sky.wgsl";
import vegetationShader from "../src/render/vgpu/shaders/vegetation.wgsl";

const WIDTH = 640;
const HEIGHT = 420;
const INSTANCES = 1500;

const SKY_FORWARD = [-0.7060397, 0.0549170, -0.7060397] as const;
const SKY_RIGHT = [0.7071068, 0, -0.7071068] as const;
const SKY_UP = [0.0388322, 0.9984909, 0.0388322] as const;
const SUN_DIRECTION = [-0.6796793, 0.2758119, -0.6796793] as const;

test("headless vgpu renders the recovered sky and segmented meadow together", async () => {
  const gpu = await init({ label: "eric-garden-meadow-evidence" });
  const output = target(gpu, { size: [WIDTH, HEIGHT], format: "rgba8unorm", depth: true });

  const vegetationGeometry = geometry(gpu, {
    label: "meadow-evidence-segmented-tufts",
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
    instances: INSTANCES,
    cull: "none",
    label: `meadow-evidence-vegetation-${INSTANCES}`,
  });
  const sky = effect(gpu, skyShader, { label: "meadow-evidence-sky" });

  const cameraPosition = [8.91, 7.6, 8.91] as const;
  const camera = perspectiveCamera({
    fov: 42,
    aspect: WIDTH / HEIGHT,
    near: 0.1,
    far: 80,
    position: cameraPosition,
    target: [0, -0.12, 0],
  });
  const tanHalfFov = Math.tan((42 * Math.PI) / 360);

  const skyTop = [0.34, 0.57, 0.78] as const;
  const skyHorizon = [0.88, 0.69, 0.46] as const;
  const sunColor = [1.0, 0.79, 0.46] as const;
  const ambientColor = [0.45, 0.58, 0.64] as const;
  const fogColor = [0.75, 0.77, 0.69] as const;
  const scene = [2.6, 0.52, 0.28, 1.0] as const;

  sky.set({
    viewport: [WIDTH, HEIGHT, WIDTH / HEIGHT, tanHalfFov],
    skyTop: [...skyTop, 1],
    skyHorizon: [...skyHorizon, 1],
    sunColor: [...sunColor, 1],
    sunDirection: [...SUN_DIRECTION, 0],
    cameraForward: [...SKY_FORWARD, 0],
    cameraRight: [...SKY_RIGHT, 0],
    cameraUp: [...SKY_UP, 0],
    scene: [scene[0], 0, scene[2], scene[3]],
  });
  vegetation.set({
    viewProjection: camera.viewProjection,
    cameraPosition: [...cameraPosition, 1],
    scene,
    lightDirection: [...SUN_DIRECTION, 0],
    lightColor: [...sunColor, 1],
    ambientColor: [...ambientColor, 1],
    fogColor: [...fogColor, 1],
    lightParams: [0.96, 0.022, 0, 1.05],
  });

  await Promise.all([sky.compile(output), vegetation.compile(output)]);
  frame(gpu, (current: Frame) => {
    current.pass(
      { target: output, clear: [...skyTop, 1], clearDepth: 1 },
      (pass: FramePass) => pass.draw(sky),
    );
    current.pass(
      { target: output, clear: false },
      (pass: FramePass) => pass.draw(vegetation),
    );
  });

  const pixels = await output.read();
  let greenPixels = 0;
  let skyPixels = 0;
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
    if (g > r * 1.18 && g > b * 1.08) greenPixels += 1;
    if (b > r * 1.10 && b > g * 1.04) skyPixels += 1;
    if (r > b * 1.28 && g > b * 1.10) warmPixels += 1;
  }

  expect(greenPixels).toBeGreaterThan(1_500);
  expect(skyPixels).toBeGreaterThan(20_000);
  expect(warmPixels).toBeGreaterThan(2_000);
  expect(maxLuma - minLuma).toBeGreaterThan(55);

  const evidencePath = process.env.MEADOW_EVIDENCE_PATH;
  if (evidencePath) writePpm(evidencePath, pixels);

  vegetationGeometry.destroy();
  (output as Target & { destroy(): void }).destroy();
  gpu.dispose();
}, 60_000);

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
