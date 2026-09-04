import {
  draw,
  geometry,
  type Draw,
  type Geometry,
  type Gpu,
  type Target,
} from "vgpu";

import {
  createWaterGeometryData,
  WATER_VERTEX_STRIDE_FLOATS,
} from "./water-geometry";
import waterShader from "./shaders/water.wgsl";

export interface WaterUniforms {
  readonly viewProjection: ArrayLike<number>;
  readonly cameraPosition: readonly number[];
  readonly scene: readonly number[];
  readonly lightDirection: readonly number[];
  readonly lightColor: readonly number[];
  readonly ambientColor: readonly number[];
  readonly fogColor: readonly number[];
  readonly lightParams: readonly number[];
  readonly skyColor: readonly number[];
}

export interface WaterLayer {
  readonly draw: Draw;
  readonly triangleCount: number;
  set(values: WaterUniforms): void;
  destroy(): void;
}

export async function createWaterLayer(
  gpu: Gpu,
  target: Target,
  uniforms: WaterUniforms,
): Promise<WaterLayer> {
  const data = createWaterGeometryData();
  let waterGeometry: Geometry | undefined;
  try {
    waterGeometry = geometry(gpu, {
      label: `garden-pond-water-${data.stats.triangleCount}-triangles`,
      buffers: [{
        data: data.data.buffer,
        stride: WATER_VERTEX_STRIDE_FLOATS * 4,
        attributes: {
          world_position: "float32x3",
          water_depth: "float32",
        },
      }],
    });
    const water = draw(gpu, {
      shader: waterShader,
      geometry: waterGeometry,
      cull: "none",
      label: "garden-pond-water",
    });
    setWaterUniforms(water, uniforms);
    await water.compile(target);

    return {
      draw: water,
      triangleCount: data.stats.triangleCount,
      set(values: WaterUniforms): void {
        setWaterUniforms(water, values);
      },
      destroy(): void {
        waterGeometry?.destroy();
      },
    };
  } catch (error) {
    waterGeometry?.destroy();
    throw error;
  }
}

function setWaterUniforms(drawable: Draw, values: WaterUniforms): void {
  drawable.set({
    viewProjection: values.viewProjection,
    cameraPosition: values.cameraPosition,
    scene: values.scene,
    lightDirection: values.lightDirection,
    lightColor: values.lightColor,
    ambientColor: values.ambientColor,
    fogColor: values.fogColor,
    lightParams: values.lightParams,
    skyColor: values.skyColor,
  });
}
