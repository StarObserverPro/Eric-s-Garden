import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { expect, test } from "vitest";
import { draw, frame, geometry, init, target, type Frame, type FramePass, type Target } from "vgpu/node";
import { perspectiveCamera } from "vgpu/scene";

import { createSoilGeometryData } from "../src/render/vgpu/soil-geometry";
import soilShader from "../src/render/vgpu/shaders/soil.wgsl";

const WIDTH = 480;
const HEIGHT = 360;

test("dedicated soil renderer produces a varied brown relief frame", async () => {
  const gpu = await init({ label: "eric-garden-soil-evidence" });
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
  const cameraPosition = [5.7, 4.25, 6.4] as const;
  const camera = perspectiveCamera({
    fov: 41,
    aspect: WIDTH / HEIGHT,
    near: 0.1,
    far: 80,
    position: cameraPosition,
    target: [0, -0.02, 0],
  });
  soil.set({
    viewProjection: camera.viewProjection,
    cameraPosition: [...cameraPosition, 1],
    scene: [2.5, 0.18, 1, 0],
    wet0: [0, 0, 0, 0],
    wet1: [0, 0, 0, 0],
    wet2: [0, 0, 0, 0],
  });
  await soil.compile(output);
  frame(gpu, (current: Frame) => current.pass(
    { target: output, clear: [0.43, 0.58, 0.35, 1], clearDepth: 1 },
    (pass: FramePass) => pass.draw(soil),
  ));

  const pixels = await output.read();
  let brownPixels = 0;
  let minLuma = 255;
  let maxLuma = 0;
  for (let offset = 0; offset + 3 < pixels.length; offset += 4) {
    const r = pixels[offset]!;
    const g = pixels[offset + 1]!;
    const b = pixels[offset + 2]!;
    const luma = Math.round(r * 0.299 + g * 0.587 + b * 0.114);
    minLuma = Math.min(minLuma, luma);
    maxLuma = Math.max(maxLuma, luma);
    if (r > g * 1.08 && g > b * 1.18) brownPixels += 1;
  }
  expect(brownPixels).toBeGreaterThan(7_000);
  expect(maxLuma - minLuma).toBeGreaterThan(45);

  const evidencePath = process.env.SOIL_EVIDENCE_PATH;
  if (evidencePath) writePpm(evidencePath, pixels);

  soilGeometry.destroy();
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
