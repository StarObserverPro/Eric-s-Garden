import {
  draw,
  geometry,
  type Draw,
  type Geometry,
  type Gpu,
  type Target,
} from "vgpu";

import { createHardscapeGeometryData } from "./hardscape-geometry";
import hardscapeShader from "./shaders/hardscape.wgsl";

export interface HardscapeUniforms {
  readonly viewProjection: ArrayLike<number>;
  readonly cameraPosition: readonly number[];
  readonly scene: readonly number[];
  readonly lightDirection: readonly number[];
  readonly lightColor: readonly number[];
  readonly ambientColor: readonly number[];
  readonly fogColor: readonly number[];
  readonly lightParams: readonly number[];
}

export interface HardscapeLayer {
  readonly draw: Draw;
  readonly triangleCount: number;
  set(values: HardscapeUniforms): void;
  destroy(): void;
}

export async function createHardscapeLayer(
  gpu: Gpu,
  target: Target,
  uniforms: HardscapeUniforms,
): Promise<HardscapeLayer> {
  const data = createHardscapeGeometryData();
  let hardscapeGeometry: Geometry | undefined;
  try {
    hardscapeGeometry = geometry(gpu, {
      label: `garden-hardscape-${data.stats.triangleCount}-triangles`,
      buffers: [{
        data: data.data.buffer,
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
    const hardscape = draw(gpu, {
      shader: hardscapeShader,
      geometry: hardscapeGeometry,
      cull: "none",
      label: "garden-hardscape",
    });
    setHardscapeUniforms(hardscape, uniforms);
    await hardscape.compile(target);

    return {
      draw: hardscape,
      triangleCount: data.stats.triangleCount,
      set(values: HardscapeUniforms): void {
        setHardscapeUniforms(hardscape, values);
      },
      destroy(): void {
        hardscapeGeometry?.destroy();
      },
    };
  } catch (error) {
    hardscapeGeometry?.destroy();
    throw error;
  }
}

function setHardscapeUniforms(drawable: Draw, values: HardscapeUniforms): void {
  drawable.set({
    viewProjection: values.viewProjection,
    cameraPosition: values.cameraPosition,
    scene: values.scene,
    lightDirection: values.lightDirection,
    lightColor: values.lightColor,
    ambientColor: values.ambientColor,
    fogColor: values.fogColor,
    lightParams: values.lightParams,
  });
}
