import type { GardenSceneSnapshot } from "../../scene/snapshot";

export interface Point { readonly x: number; readonly y: number }
export interface GroundPoint { readonly x: number; readonly z: number }

/** The existing Canvas camera is parallel/isometric, not a pinhole camera.
 * Every ground footprint, vertical height and paint-order key uses this view.
 * Keep its framing in sync with maxCanvasCameraZoom and the input contract. */
export function canvasProjection(width: number, height: number, camera: GardenSceneSnapshot["camera"]) {
  const cosine = Math.cos(camera.angle);
  const sine = Math.sin(camera.angle);
  const scale = Math.min(width / 13.4, height / 9.6) * camera.zoom;
  const depthX = cosine + sine;
  const depthZ = cosine - sine;
  const depth = (x: number, z: number) => x * depthX + z * depthZ;
  return {
    scale, depthX, depthZ, depth,
    point(x: number, z: number, y: number): Point {
      return {
        x: width * 0.5 + (x * (cosine - sine) - z * (sine + cosine)) * scale,
        y: height * 0.59 + depth(x, z) * scale * 0.42 - y * scale,
      };
    },
    /** Footprints have counter-clockwise winding in world X/Z. */
    facesViewer(a: GroundPoint, b: GroundPoint): boolean {
      return (b.z - a.z) * depthX - (b.x - a.x) * depthZ > 1e-8;
    },
  };
}

export type CanvasProjection = ReturnType<typeof canvasProjection>;

/** A clipped-corner footprint, rather than a screen-space rounded rectangle. */
export function footprint(x: number, z: number, halfX: number, halfZ: number, bevel = 0): GroundPoint[] {
  const b = Math.min(Math.max(0, bevel), halfX * 0.5, halfZ * 0.5);
  if (!b) return [
    { x: x - halfX, z: z - halfZ }, { x: x + halfX, z: z - halfZ },
    { x: x + halfX, z: z + halfZ }, { x: x - halfX, z: z + halfZ },
  ];
  return [
    { x: x - halfX + b, z: z - halfZ }, { x: x + halfX - b, z: z - halfZ },
    { x: x + halfX, z: z - halfZ + b }, { x: x + halfX, z: z + halfZ - b },
    { x: x + halfX - b, z: z + halfZ }, { x: x - halfX + b, z: z + halfZ },
    { x: x - halfX, z: z + halfZ - b }, { x: x - halfX, z: z - halfZ + b },
  ];
}
