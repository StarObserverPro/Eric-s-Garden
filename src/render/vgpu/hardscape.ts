import {
  draw,
  geometry,
  type Draw,
  type Geometry,
  type Gpu,
  type Target,
} from "vgpu";

import { createPondDressingGeometryData } from "./pond-dressing-geometry";
import {
  createWildernessHardscapeGeometryData,
  HARDSCAPE_VERTEX_STRIDE_FLOATS,
} from "./wilderness-hardscape-geometry";
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
  const wilderness = createWildernessHardscapeGeometryData();
  const pond = createPondDressingGeometryData();
  const merged = new Float32Array(wilderness.data.length + pond.data.length);
  merged.set(wilderness.data, 0);
  merged.set(pond.data, wilderness.data.length);
  const triangleCount = wilderness.stats.triangleCount + pond.triangleCount;

  let hardscapeGeometry: Geometry | undefined;
  try {
    hardscapeGeometry = geometry(gpu, {
      label: `garden-hardscape-${triangleCount}-triangles`,
      buffers: [{
        data: merged.buffer,
        stride: HARDSCAPE_VERTEX_STRIDE_FLOATS * 4,
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
      label: "garden-hardscape-wilderness-p0-p1",
    });
    setHardscapeUniforms(hardscape, uniforms);
    await hardscape.compile(target);

    return {
      draw: hardscape,
      triangleCount,
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
