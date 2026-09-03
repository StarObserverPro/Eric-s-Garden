import { describe, expect, it } from "vitest";

import {
  CAMERA_BASE_FOV_DEGREES,
  CAMERA_DOLLY_ZOOM_MAX,
  CAMERA_ZOOM_MIN,
  cameraDollyZoom,
  cameraVerticalFovDegrees,
  cameraVerticalPose,
  clampCameraElevation,
  clampCameraZoom,
  maxCameraZoom,
} from "../src/scene/camera-controls";

describe("camera controls", () => {
  it("keeps the existing far limit and old dolly segment unchanged", () => {
    expect(clampCameraZoom(0.1, 1920, 1080)).toBe(CAMERA_ZOOM_MIN);
    expect(cameraDollyZoom(1)).toBe(1);
    expect(cameraDollyZoom(CAMERA_DOLLY_ZOOM_MAX)).toBe(CAMERA_DOLLY_ZOOM_MAX);
    expect(cameraVerticalFovDegrees(CAMERA_DOLLY_ZOOM_MAX)).toBeCloseTo(CAMERA_BASE_FOV_DEGREES, 8);
  });

  it("sets a desktop near limit around one plot width and a lower portrait-phone limit", () => {
    const desktop = maxCameraZoom(1920, 1080);
    const phone = maxCameraZoom(390, 844);

    expect(desktop).toBeGreaterThan(10);
    expect(desktop).toBeLessThan(11.2);
    expect(phone).toBeGreaterThan(2.6);
    expect(phone).toBeLessThan(2.9);
    expect(desktop).toBeGreaterThan(phone * 3);
  });

  it("uses optical zoom after the old 1.35 dolly ceiling", () => {
    const nearZoom = maxCameraZoom(1920, 1080);
    expect(cameraDollyZoom(nearZoom)).toBe(CAMERA_DOLLY_ZOOM_MAX);
    expect(cameraVerticalFovDegrees(nearZoom)).toBeLessThan(6);
  });

  it("preserves the previous high camera and reaches a truly horizontal low view", () => {
    const high = cameraVerticalPose(1, 1);
    expect(high.positionY).toBeCloseTo(7.6, 8);
    expect(high.targetY).toBeCloseTo(-0.12, 8);

    const flat = cameraVerticalPose(1, 0);
    expect(flat.positionY).toBeCloseTo(flat.targetY, 8);
    expect(flat.positionY).toBeCloseTo(0.36, 8);
    expect(clampCameraElevation(-4)).toBe(0);
    expect(clampCameraElevation(4)).toBe(1);
  });
});
