export const CAMERA_ZOOM_MIN = 0.76;
export const CAMERA_DOLLY_ZOOM_MAX = 1.35;
export const CAMERA_ELEVATION_MIN = 0;
export const CAMERA_ELEVATION_MAX = 1;
export const CAMERA_DEFAULT_ELEVATION = CAMERA_ELEVATION_MAX;
export const CAMERA_BASE_FOV_DEGREES = 42;

const CAMERA_HORIZONTAL_DISTANCE = 12.6;
const CAMERA_HIGH_Y = 7.6;
const CAMERA_HIGH_TARGET_Y = -0.12;
const CAMERA_FLAT_Y = 0.36;
const PLOT_DIAGONAL = 1.24 * Math.SQRT2;
const TARGET_PLOT_SCREEN_WIDTH = 0.94;
const ABSOLUTE_ZOOM_MAX = 14.5;

export interface CameraViewState {
  readonly zoom: number;
  readonly elevation: number;
}

export interface CameraVerticalPose {
  readonly positionY: number;
  readonly targetY: number;
}

export function maxCameraZoom(viewportWidth: number, viewportHeight: number): number {
  const width = Math.max(1, viewportWidth);
  const height = Math.max(1, viewportHeight);
  const aspect = width / height;
  const baseTanHalfFov = Math.tan((CAMERA_BASE_FOV_DEGREES * Math.PI) / 360);
  const horizontalTanHalfFov = baseTanHalfFov * aspect;
  const dollyDistance = CAMERA_HORIZONTAL_DISTANCE / CAMERA_DOLLY_ZOOM_MAX;
  const highY = CAMERA_HIGH_Y / CAMERA_DOLLY_ZOOM_MAX;
  const cameraDistance = Math.hypot(dollyDistance, highY - CAMERA_HIGH_TARGET_Y);
  const plotScreenFraction = PLOT_DIAGONAL / (2 * cameraDistance * horizontalTanHalfFov);
  const opticalFactor = TARGET_PLOT_SCREEN_WIDTH / Math.max(0.001, plotScreenFraction);
  return clamp(
    CAMERA_DOLLY_ZOOM_MAX * Math.max(1, opticalFactor),
    CAMERA_DOLLY_ZOOM_MAX,
    ABSOLUTE_ZOOM_MAX,
  );
}

export function clampCameraZoom(
  zoom: number,
  viewportWidth: number,
  viewportHeight: number,
): number {
  return clamp(finiteOr(zoom, 1), CAMERA_ZOOM_MIN, maxCameraZoom(viewportWidth, viewportHeight));
}

export function clampCameraElevation(elevation: number): number {
  return clamp(finiteOr(elevation, CAMERA_DEFAULT_ELEVATION), CAMERA_ELEVATION_MIN, CAMERA_ELEVATION_MAX);
}

export function cameraDollyZoom(zoom: number): number {
  return clamp(finiteOr(zoom, 1), CAMERA_ZOOM_MIN, CAMERA_DOLLY_ZOOM_MAX);
}

export function cameraVerticalFovDegrees(zoom: number): number {
  const dollyZoom = cameraDollyZoom(zoom);
  const lensZoom = Math.max(1, finiteOr(zoom, 1) / dollyZoom);
  const baseTanHalfFov = Math.tan((CAMERA_BASE_FOV_DEGREES * Math.PI) / 360);
  return Math.atan(baseTanHalfFov / lensZoom) * 360 / Math.PI;
}

export function cameraVerticalPose(zoom: number, elevation: number): CameraVerticalPose {
  const dollyZoom = cameraDollyZoom(zoom);
  const t = clampCameraElevation(elevation);
  const highY = CAMERA_HIGH_Y / dollyZoom;
  return {
    positionY: mix(CAMERA_FLAT_Y, highY, t),
    targetY: mix(CAMERA_FLAT_Y, CAMERA_HIGH_TARGET_Y, t),
  };
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
