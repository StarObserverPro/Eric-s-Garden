import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

import { blankState } from "../src/game/model";
import { createSceneSnapshot } from "../src/scene/snapshot";
import {
  worldCameraFor,
  worldLightingFor,
  worldRayForNdc,
} from "../src/render/vgpu/world-frame";

const skyShaderSource = readFileSync(
  new URL("../src/render/vgpu/shaders/sky.wgsl", import.meta.url),
  "utf8",
);

function horizonSnapshot() {
  return createSceneSnapshot(blankState(), { zoom: 1, elevation: 0 });
}

test("one world camera spans geometric ground and sky at the flat horizon view", () => {
  const camera = worldCameraFor(horizonSnapshot(), [1280, 720]);

  const top = worldRayForNdc(camera, 0, 1);
  const center = worldRayForNdc(camera, 0, 0);
  const bottom = worldRayForNdc(camera, 0, -1);

  expect(top[1]).toBeGreaterThan(0.20);
  expect(Math.abs(center[1])).toBeLessThan(0.02);
  expect(bottom[1]).toBeLessThan(-0.20);
});

test("the visible solar disc and material lighting use one world-space direction", () => {
  const snapshot = horizonSnapshot();
  const camera = worldCameraFor(snapshot, [1280, 720]);
  const lighting = worldLightingFor(snapshot.weather);
  const sun = lighting.sunDirection;

  const forward = dot(sun, camera.forward);
  const sunNdcX = dot(sun, camera.right) / (forward * camera.aspect * camera.tanHalfFov);
  const sunNdcY = dot(sun, camera.up) / (forward * camera.tanHalfFov);

  expect(Math.hypot(...sun)).toBeCloseTo(1, 5);
  expect(sun[1]).toBeGreaterThan(0);
  expect(forward).toBeGreaterThan(0);
  // The flat view is the explicit horizon-inspection pose added by the camera
  // controls. It must place the same world sun used by material lighting inside
  // the same perspective frustum, without inventing a sky-only camera.
  expect(Math.abs(sunNdcX)).toBeLessThan(1);
  expect(Math.abs(sunNdcY)).toBeLessThan(1);
});

test("the sky pass owns atmosphere only, not a painted ground or hedge", () => {
  expect(skyShaderSource).not.toContain("horizon_profile");
  expect(skyShaderSource).not.toContain("far_ground");
  expect(skyShaderSource).not.toContain("far_hedge");
  expect(skyShaderSource).toContain("sunDirection");
  expect(skyShaderSource).toContain("cameraForward");
});

function dot(a: readonly number[], b: readonly number[]): number {
  return a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
}