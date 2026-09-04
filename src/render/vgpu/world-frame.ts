import { perspectiveCamera } from "vgpu/scene";

import {
  cameraDollyZoom,
  cameraVerticalFovDegrees,
  cameraVerticalPose,
} from "../../scene/camera-controls";
import type { GardenSceneSnapshot, Vec3, WeatherProfile } from "../../scene/snapshot";

export const WORLD_CAMERA_NEAR = 0.1;
export const WORLD_CAMERA_FAR = 140;
export const WORLD_CAMERA_HORIZONTAL_DISTANCE = 12.6;

// World-space azimuth of the sun, measured around +Y with x = sin(a), z = cos(a).
// The same direction drives the visible solar disc and every material's direct
// light term; camera pitch/zoom never creates a second lighting frame.
export const WORLD_SUN_AZIMUTH = -2.448;

export interface WorldCameraState {
  readonly viewProjection: ArrayLike<number>;
  readonly position: Vec3;
  readonly forward: Vec3;
  readonly right: Vec3;
  readonly up: Vec3;
  readonly aspect: number;
  readonly tanHalfFov: number;
}

export interface WorldLightingState {
  readonly sunDirection: Vec3;
  readonly directIntensity: number;
}

/**
 * Resolve the renderer-neutral camera view into the one perspective frame used
 * by both geometry and atmosphere. Camera range/pitch policy lives in
 * scene/camera-controls.ts; this module owns only the shared world basis.
 */
export function worldCameraFor(
  snapshot: GardenSceneSnapshot,
  size: readonly [number, number],
): WorldCameraState {
  const orbit = snapshot.camera.angle + Math.PI * 0.25;
  const dollyZoom = cameraDollyZoom(snapshot.camera.zoom);
  const distance = WORLD_CAMERA_HORIZONTAL_DISTANCE / dollyZoom;
  const vertical = cameraVerticalPose(snapshot.camera.zoom, snapshot.camera.elevation);
  const position: Vec3 = [
    Math.sin(orbit) * distance,
    vertical.positionY,
    Math.cos(orbit) * distance,
  ];
  const target: Vec3 = [0, vertical.targetY, 0];
  const forward = normalize3(subtract3(target, position));
  const right = normalize3(cross3(forward, [0, 1, 0]));
  const up = normalize3(cross3(right, forward));
  const aspect = size[0] / Math.max(1, size[1]);
  const fov = cameraVerticalFovDegrees(snapshot.camera.zoom);
  const camera = perspectiveCamera({
    fov,
    aspect,
    near: WORLD_CAMERA_NEAR,
    far: WORLD_CAMERA_FAR,
    position,
    target,
  });

  return {
    viewProjection: camera.viewProjection,
    position,
    forward,
    right,
    up,
    aspect,
    tanHalfFov: Math.tan((fov * Math.PI) / 360),
  };
}

export function worldLightingFor(weather: WeatherProfile): WorldLightingState {
  const horizontalLength = Math.cos(weather.sunElevation);
  const sunDirection = normalize3([
    Math.sin(WORLD_SUN_AZIMUTH) * horizontalLength,
    Math.sin(weather.sunElevation),
    Math.cos(WORLD_SUN_AZIMUTH) * horizontalLength,
  ]);
  return {
    sunDirection,
    directIntensity: 0.35 + weather.sunlight * 0.70,
  };
}

export function worldRayForNdc(
  camera: Pick<WorldCameraState, "forward" | "right" | "up" | "aspect" | "tanHalfFov">,
  x: number,
  y: number,
): Vec3 {
  return normalize3(add3(
    camera.forward,
    add3(
      scale3(camera.right, x * camera.aspect * camera.tanHalfFov),
      scale3(camera.up, y * camera.tanHalfFov),
    ),
  ));
}

function add3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function subtract3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function scale3(value: Vec3, scale: number): Vec3 {
  return [value[0] * scale, value[1] * scale, value[2] * scale];
}

function normalize3(value: Vec3): Vec3 {
  const length = Math.hypot(value[0], value[1], value[2]);
  if (length < 0.000001) return [0, 1, 0];
  return [value[0] / length, value[1] / length, value[2] / length];
}

function cross3(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}