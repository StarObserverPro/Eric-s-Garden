import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { expect, test } from "vitest";
import { draw, frame, geometry, init, target, type Frame, type FramePass, type Target } from "vgpu/node";
import { perspectiveCamera } from "vgpu/scene";

import { createWildernessHardscapeGeometryData } from "../src/render/vgpu/wilderness-hardscape-geometry";
import hardscapeShader from "../src/render/vgpu/shaders/hardscape.wgsl";

const WIDTH = 480;
const HEIGHT = 360;

test("hardscape renderer produces visible garden terrain and P0 countryside scenery", async () => {
  const gpu = await init({ label: "eric-garden-hardscape-evidence" });
  const output = target(gpu, { size: [WIDTH, HEIGHT], format: "rgba8unorm", depth: true });
  const hardscapeData = createWildernessHardscapeGeometryData();
  const hardscapeGeometry = geometry(gpu, {
    buffers: [{
      data: hardscapeData.data.buffer,
      stride: 36,
      attributes: {
        world_position: "float32x3",
        world_normal: "float32x3",
        material_kind: "float32",
        material_seed: "float32",
        part: "float32",
      },
    }],
  });
  const hardscape = draw(gpu, { shader: hardscapeShader, geometry: hardscapeGeometry, cull: "none" });
  const cameraPosition = [12.5, 6.1, 11.5] as const;
  const camera = perspectiveCamera({
    fov: 44,
    aspect: WIDTH / HEIGHT,
    near: 0.1,
    far: 100,
    position: cameraPosition,
    target: [4.2, 0.20, 0.25],
  });
  hardscape.set({
    viewProjection: camera.viewProjection,
    cameraPosition: [...cameraPosition, 1],
    scene: [2.5, 0.32, 0.18, 1],
    lightDirection: [-0.48, 0.86, -0.31, 0],
    lightColor: [1.0, 0.91, 0.72, 1],
    ambientColor: [0.42, 0.48, 0.40, 1],
    fogColor: [0.72, 0.76, 0.68, 1],
    lightParams: [1.0, 0.015, 0, 1.0],
  });
  await hardscape.compile(output);
  frame(gpu, (current: Frame) => current.pass(
    { target: output, clear: [0.18, 0.28, 0.16, 1], clearDepth: 1 },
    (pass: FramePass) => pass.draw(hardscape),
  ));

  const pixels = await output.read();
  let changedPixels = 0;
  let warmPixels = 0;
  let darkPixels = 0;
  let greenPixels = 0;
  let minLuma = 255;
  let maxLuma = 0;
  const clear = [46, 71, 41] as const;
  for (let offset = 0; offset + 3 < pixels.length; offset += 4) {
    const r = pixels[offset]!;
    const g = pixels[offset + 1]!;
    const b = pixels[offset + 2]!;
    const delta = Math.abs(r - clear[0]) + Math.abs(g - clear[1]) + Math.abs(b - clear[2]);
    if (delta > 24) changedPixels += 1;
    if (r > b * 1.30 && r > g * 1.06) warmPixels += 1;
    if (r + g + b < 145) darkPixels += 1;
    if (g > r * 1.18 && g > b * 1.10) greenPixels += 1;
    const luma = Math.round(r * 0.299 + g * 0.587 + b * 0.114);
    minLuma = Math.min(minLuma, luma);
    maxLuma = Math.max(maxLuma, luma);
  }
  expect(changedPixels).toBeGreaterThan(10_000);
  expect(warmPixels).toBeGreaterThan(900);
  expect(darkPixels).toBeGreaterThan(250);
  expect(greenPixels).toBeGreaterThan(1_000);
  expect(maxLuma - minLuma).toBeGreaterThan(30);

  const evidencePath = process.env.HARDSCAPE_EVIDENCE_PATH;
  if (evidencePath) writePpm(evidencePath, pixels);

  hardscapeGeometry.destroy();
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
