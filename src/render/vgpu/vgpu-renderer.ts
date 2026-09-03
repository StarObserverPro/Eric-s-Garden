import {
  bundle,
  draw,
  effect,
  frame,
  geometry,
  init,
  sampler,
  surface,
  target,
  type Bundle,
  type BundleRecorder,
  type Draw,
  type Effect,
  type Frame,
  type FramePass,
  type Geometry,
  type Gpu,
  type Surface,
  type Target,
} from "vgpu";
import { perspectiveCamera } from "vgpu/scene";

import { CROPS } from "../../game/model";
import type { GardenSceneSnapshot, Vec3, WeatherProfile } from "../../scene/snapshot";
import {
  INSTANCE_TIERS,
  type GardenRenderer,
  type InstanceTier,
  type RenderSettings,
  type RendererMetrics,
  type RuntimeQualityProfile,
} from "../contract";
import { createBoxVertices, createVegetationVertices } from "./geometry";
import {
  createInstanceTierBundles,
  selectInstanceTierBundle,
  type InstanceTierBundles,
} from "./quality-bundles";
import { observeDeviceLoss } from "./raw/device-loss";
import { createSoilGeometryData } from "./soil-geometry";
import blitShader from "./shaders/blit.wgsl";
import gardenShader from "./shaders/garden.wgsl";
import skyShader from "./shaders/sky.wgsl";
import soilShader from "./shaders/soil.wgsl";
import vegetationShader from "./shaders/vegetation.wgsl";

interface CropMarker {
  readonly root: HTMLSpanElement;
  readonly glyph: HTMLSpanElement;
  readonly badge: HTMLSpanElement;
}

interface Generation {
  readonly size: readonly [number, number];
  readonly sceneTarget: Target;
  readonly boxGeometry: Geometry;
  readonly soilGeometry: Geometry;
  readonly vegetationGeometry: Geometry;
  readonly ground: Draw;
  readonly soil: Draw;
  readonly path: Draw;
  readonly fence: Draw;
  readonly vegetation: Draw;
  readonly sky: Effect;
  readonly blit: Effect;
  readonly staticBundle: Bundle;
  readonly soilBundle: Bundle;
  readonly vegetationBundles: InstanceTierBundles;
}

interface ProjectedPlot {
  readonly index: number;
  readonly x: number;
  readonly y: number;
  readonly radius: number;
}

interface CameraState {
  readonly viewProjection: ArrayLike<number>;
  readonly position: Vec3;
  readonly skyForward: Vec3;
  readonly skyRight: Vec3;
  readonly skyUp: Vec3;
  readonly aspect: number;
  readonly tanHalfFov: number;
}

interface LightingState {
  readonly sunDirection: Vec3;
  readonly directIntensity: number;
}

interface SharedWorldUniforms {
  readonly viewProjection: ArrayLike<number>;
  readonly cameraPosition: readonly number[];
  readonly scene: readonly number[];
  readonly lightDirection: readonly number[];
  readonly lightColor: readonly number[];
  readonly ambientColor: readonly number[];
  readonly fogColor: readonly number[];
  readonly lightParams: readonly number[];
  readonly wet0: readonly number[];
  readonly wet1: readonly number[];
  readonly wet2: readonly number[];
}

export class VgpuRenderer implements GardenRenderer {
  readonly kind = "vgpu" as const;

  readonly #canvas: HTMLCanvasElement;
  readonly #overlay: HTMLElement;
  readonly #settings: RenderSettings;
  readonly #gpu: Gpu;
  readonly #output: Surface;
  readonly #markers: CropMarker[];
  readonly #releaseError: () => void;
  readonly #releaseDeviceLoss: () => void;
  #snapshot: GardenSceneSnapshot;
  #generation: Generation;
  #qualityProfile: RuntimeQualityProfile;
  #projectedPlots: ProjectedPlot[] = [];
  #disposed = false;
  #fatalError: Error | undefined;
  #buildRevision = 0;
  #building: Promise<void> | undefined;

  private constructor(
    canvas: HTMLCanvasElement,
    overlay: HTMLElement,
    settings: RenderSettings,
    gpu: Gpu,
    output: Surface,
    snapshot: GardenSceneSnapshot,
    generation: Generation,
  ) {
    this.#canvas = canvas;
    this.#overlay = overlay;
    this.#settings = settings;
    this.#gpu = gpu;
    this.#output = output;
    this.#snapshot = snapshot;
    this.#generation = generation;
    this.#qualityProfile = {
      level: "full",
      vegetationInstances: settings.instances,
      pressure: 0,
    };
    this.#markers = createCropMarkers(overlay);
    this.#releaseError = gpu.onError((error: unknown) => {
      this.#fatalError = asError(error);
    });
    this.#releaseDeviceLoss = observeDeviceLoss(gpu, (error) => {
      this.#fatalError = error;
    });
  }

  static async create(
    canvas: HTMLCanvasElement,
    overlay: HTMLElement,
    settings: RenderSettings,
    snapshot: GardenSceneSnapshot,
  ): Promise<VgpuRenderer> {
    const gpu = await init({ label: "eric-secret-garden" });
    try {
      const output = surface(gpu, canvas, {
        dpr: [1, settings.maxDpr],
        clearColor: [0.45, 0.65, 0.72, 1],
      });
      const initialSize: readonly [number, number] = [output.size[0], output.size[1]];
      const generation = await createGeneration(gpu, output, settings, snapshot, initialSize);
      return new VgpuRenderer(canvas, overlay, settings, gpu, output, snapshot, generation);
    } catch (error) {
      gpu.dispose();
      throw error;
    }
  }

  setSnapshot(snapshot: GardenSceneSnapshot): void {
    this.#snapshot = snapshot;
  }

  setQualityProfile(profile: RuntimeQualityProfile): void {
    if (profile.vegetationInstances > this.#settings.instances) {
      throw new Error(
        `Runtime vegetation tier ${profile.vegetationInstances} exceeds the configured ceiling ${this.#settings.instances}.`,
      );
    }
    this.#qualityProfile = profile;
  }

  resize(): void {
    this.#requestGenerationIfNeeded();
  }

  render(timeMs: number): void {
    if (this.#disposed) return;
    if (this.#fatalError) throw this.#fatalError;
    this.#requestGenerationIfNeeded();

    const snapshot = this.#snapshot;
    const generation = this.#generation;
    const time = timeMs * 0.001;
    const camera = cameraFor(snapshot, generation.size);
    const lighting = lightingFor(snapshot.weather);
    const wetness = snapshot.plots.map((plot) => plot.wetness);
    const shared: SharedWorldUniforms = {
      viewProjection: camera.viewProjection,
      cameraPosition: [...camera.position, 1],
      scene: [
        time,
        snapshot.weather.wind,
        snapshot.weather.cloudiness,
        snapshot.weather.sunlight,
      ],
      lightDirection: [...lighting.sunDirection, 0],
      lightColor: [...snapshot.weather.sunColor, 1],
      ambientColor: [...snapshot.weather.ambientColor, 1],
      fogColor: [...snapshot.weather.fogColor, 1],
      lightParams: [
        lighting.directIntensity,
        snapshot.weather.fogDensity,
        snapshot.weather.rain,
        snapshot.weather.exposure,
      ],
      wet0: wetness.slice(0, 4),
      wet1: wetness.slice(4, 8),
      wet2: wetness.slice(8, 12),
    };
    setWorldUniforms(generation.ground, shared, snapshot, 0);
    setWorldUniforms(generation.path, shared, snapshot, 2);
    setWorldUniforms(generation.fence, shared, snapshot, 3);
    setVegetationUniforms(generation.vegetation, shared);
    setSoilUniforms(generation.soil, {
      ...shared,
      scene: [
        time,
        snapshot.weather.cloudiness,
        snapshot.weather.sunlight,
        snapshot.weather.rain,
      ],
    });

    generation.sky.set({
      viewport: [generation.size[0], generation.size[1], camera.aspect, camera.tanHalfFov],
      skyTop: [...snapshot.weather.skyTop, 1],
      skyHorizon: [...snapshot.weather.skyHorizon, 1],
      sunColor: [...snapshot.weather.sunColor, 1],
      sunDirection: [...lighting.sunDirection, 0],
      cameraForward: [...camera.skyForward, 0],
      cameraRight: [...camera.skyRight, 0],
      cameraUp: [...camera.skyUp, 0],
      scene: [
        time,
        snapshot.weather.rain,
        snapshot.weather.cloudiness,
        snapshot.weather.sunlight,
      ],
    });
    generation.blit.set({
      resolution: this.#output.size,
      tone: [snapshot.weather.exposure, snapshot.weather.rain, 0, 0],
      scene_tex: generation.sceneTarget,
    });

    const vegetationBundle = selectInstanceTierBundle(
      generation.vegetationBundles,
      this.#qualityProfile.vegetationInstances,
    );

    frame(this.#gpu, (currentFrame: Frame) => {
      currentFrame.pass(
        {
          target: generation.sceneTarget,
          clear: [...snapshot.weather.skyTop, 1],
          clearDepth: 1,
        },
        (pass: FramePass) => pass.draw(generation.sky),
      );
      currentFrame.pass(
        { target: generation.sceneTarget, clear: false },
        (pass: FramePass) => pass.bundles(
          generation.staticBundle,
          generation.soilBundle,
          vegetationBundle,
        ),
      );
      currentFrame.pass(
        { target: this.#output, clear: [0.04, 0.06, 0.05, 1] },
        (pass: FramePass) => pass.draw(generation.blit),
      );
    });

    this.#positionCropMarkers(camera.viewProjection);
  }

  pickPlot(x: number, y: number): number | null {
    let closest: ProjectedPlot | undefined;
    let distance = Number.POSITIVE_INFINITY;
    for (const plot of this.#projectedPlots) {
      const next = Math.hypot(x - plot.x, y - plot.y);
      if (next < plot.radius && next < distance) {
        closest = plot;
        distance = next;
      }
    }
    return closest?.index ?? null;
  }

  metrics(): RendererMetrics {
    return {
      kind: this.kind,
      passes: 3,
      drawCalls: 7,
      instances: this.#qualityProfile.vegetationInstances + 66,
      resources: 14 + this.#generation.vegetationBundles.size,
      dpr: Math.max(1, this.#canvas.width / Math.max(1, this.#canvas.clientWidth)),
    };
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#buildRevision += 1;
    this.#releaseError();
    this.#releaseDeviceLoss();
    cleanupGeneration(this.#generation);
    this.#gpu.dispose();
    this.#overlay.replaceChildren();
    this.#projectedPlots = [];
  }

  #requestGenerationIfNeeded(): void {
    const nextSize = this.#output.size;
    if (sameSize(nextSize, this.#generation.size) || this.#building) return;
    const revision = ++this.#buildRevision;
    const snapshot = this.#snapshot;
    const requested: readonly [number, number] = [nextSize[0], nextSize[1]];
    this.#building = createGeneration(this.#gpu, this.#output, this.#settings, snapshot, requested)
      .then((next) => {
        if (this.#disposed || revision !== this.#buildRevision) {
          cleanupGeneration(next);
          return;
        }
        const previous = this.#generation;
        this.#generation = next;
        cleanupGeneration(previous);
      })
      .catch((error: unknown) => {
        if (!this.#disposed && revision === this.#buildRevision) this.#fatalError = asError(error);
      })
      .finally(() => {
        if (revision === this.#buildRevision) this.#building = undefined;
      });
  }

  #positionCropMarkers(viewProjection: ArrayLike<number>): void {
    const width = this.#canvas.clientWidth;
    const height = this.#canvas.clientHeight;
    const zoom = this.#snapshot.camera.zoom;
    this.#projectedPlots = [];

    for (let index = 0; index < this.#markers.length; index += 1) {
      const marker = this.#markers[index]!;
      const plot = this.#snapshot.plots[index];
      if (!plot) {
        marker.root.hidden = true;
        continue;
      }
      const soilPoint = project(viewProjection, plot.position[0], 0.12, plot.position[2], width, height);
      this.#projectedPlots.push({
        index,
        x: soilPoint.x,
        y: soilPoint.y,
        radius: Math.max(27, 42 * zoom),
      });

      if (!plot.crop || plot.harvested) {
        marker.root.hidden = true;
        continue;
      }

      const stage = Math.max(1, plot.stage);
      const plantPoint = project(
        viewProjection,
        plot.position[0],
        0.42 + stage * 0.12,
        plot.position[2],
        width,
        height,
      );
      marker.root.hidden = false;
      marker.root.style.left = `${plantPoint.x}px`;
      marker.root.style.top = `${plantPoint.y}px`;
      marker.root.style.zIndex = String(Math.round(plantPoint.y));
      marker.root.style.setProperty("--crop-scale", String((0.76 + stage * 0.12) * zoom));
      marker.glyph.textContent = stage < 3 ? "🌱" : CROPS[plot.crop][1];
      marker.badge.textContent = plot.pest ? "🐛" : stage >= 4 ? "✨" : "";
    }
  }
}

async function createGeneration(
  gpu: Gpu,
  output: Surface,
  settings: RenderSettings,
  snapshot: GardenSceneSnapshot,
  size: readonly [number, number],
): Promise<Generation> {
  const sceneTarget = target(gpu, {
    size,
    format: "rgba8unorm",
    depth: true,
  });
  let boxGeometry: Geometry | undefined;
  let soilGeometry: Geometry | undefined;
  let vegetationGeometry: Geometry | undefined;

  try {
    boxGeometry = geometry(gpu, {
      label: "garden-boxes",
      buffers: [
        {
          data: createBoxVertices().buffer,
          stride: 28,
          attributes: {
            local_position: "float32x3",
            local_normal: "float32x3",
            part: "float32",
          },
        },
      ],
    });
    const soilData = createSoilGeometryData();
    soilGeometry = geometry(gpu, {
      label: `garden-soil-${soilData.stats.triangleCount}-triangles`,
      buffers: [
        {
          data: soilData.data.buffer,
          stride: 36,
          attributes: {
            position: "float32x3",
            normal: "float32x3",
            plot_index: "float32",
            material_seed: "float32",
            surface_type: "float32",
          },
        },
      ],
    });
    vegetationGeometry = geometry(gpu, {
      label: "garden-vegetation-segmented-tufts",
      buffers: [
        {
          data: createVegetationVertices().buffer,
          stride: 28,
          attributes: {
            local_position: "float32x3",
            local_normal: "float32x3",
            part: "float32",
          },
        },
      ],
    });

    const ground = draw(gpu, {
      shader: gardenShader,
      geometry: boxGeometry,
      instances: 1,
      cull: "back",
      label: "garden-ground",
    });
    const soil = draw(gpu, {
      shader: soilShader,
      geometry: soilGeometry,
      cull: "none",
      label: "garden-soil-high-density",
    });
    const path = draw(gpu, {
      shader: gardenShader,
      geometry: boxGeometry,
      instances: 28,
      cull: "back",
      label: "garden-path",
    });
    const fence = draw(gpu, {
      shader: gardenShader,
      geometry: boxGeometry,
      instances: 36,
      cull: "back",
      label: "garden-fence",
    });
    const vegetation = draw(gpu, {
      shader: vegetationShader,
      geometry: vegetationGeometry,
      instances: settings.instances,
      cull: "none",
      label: `garden-vegetation-${settings.instances}`,
    });
    const sky = effect(gpu, skyShader, { label: "garden-sky" });
    const blit = effect(gpu, blitShader, { label: "garden-blit" });

    const camera = cameraFor(snapshot, size);
    const lighting = lightingFor(snapshot.weather);
    const emptyWet = [0, 0, 0, 0];
    const shared: SharedWorldUniforms = {
      viewProjection: camera.viewProjection,
      cameraPosition: [...camera.position, 1],
      scene: [0, snapshot.weather.wind, snapshot.weather.cloudiness, snapshot.weather.sunlight],
      lightDirection: [...lighting.sunDirection, 0],
      lightColor: [...snapshot.weather.sunColor, 1],
      ambientColor: [...snapshot.weather.ambientColor, 1],
      fogColor: [...snapshot.weather.fogColor, 1],
      lightParams: [
        lighting.directIntensity,
        snapshot.weather.fogDensity,
        snapshot.weather.rain,
        snapshot.weather.exposure,
      ],
      wet0: emptyWet,
      wet1: emptyWet,
      wet2: emptyWet,
    };
    setWorldUniforms(ground, shared, snapshot, 0);
    setWorldUniforms(path, shared, snapshot, 2);
    setWorldUniforms(fence, shared, snapshot, 3);
    setVegetationUniforms(vegetation, shared);
    setSoilUniforms(soil, {
      ...shared,
      scene: [0, snapshot.weather.cloudiness, snapshot.weather.sunlight, snapshot.weather.rain],
    });
    sky.set({
      viewport: [size[0], size[1], camera.aspect, camera.tanHalfFov],
      skyTop: [...snapshot.weather.skyTop, 1],
      skyHorizon: [...snapshot.weather.skyHorizon, 1],
      sunColor: [...snapshot.weather.sunColor, 1],
      sunDirection: [...lighting.sunDirection, 0],
      cameraForward: [...camera.skyForward, 0],
      cameraRight: [...camera.skyRight, 0],
      cameraUp: [...camera.skyUp, 0],
      scene: [0, snapshot.weather.rain, snapshot.weather.cloudiness, snapshot.weather.sunlight],
    });
    blit.set({
      resolution: output.size,
      tone: [snapshot.weather.exposure, snapshot.weather.rain, 0, 0],
      scene_tex: sceneTarget,
      linear_samp: sampler(gpu, { minFilter: "linear", magFilter: "linear" }),
    });

    await Promise.all([
      ground.compile(sceneTarget),
      soil.compile(sceneTarget),
      path.compile(sceneTarget),
      fence.compile(sceneTarget),
      vegetation.compile(sceneTarget),
      sky.compile(sceneTarget),
      blit.compile(output),
    ]);

    const staticBundle = bundle(
      gpu,
      { target: sceneTarget, label: "garden-static" },
      (recorded: BundleRecorder) => {
        recorded.draw(ground);
        recorded.draw(path);
        recorded.draw(fence);
      },
    );
    const soilBundle = bundle(
      gpu,
      { target: sceneTarget, label: "garden-soil" },
      (recorded: BundleRecorder) => recorded.draw(soil),
    );
    const vegetationTiers: InstanceTier[] = INSTANCE_TIERS.filter(
      (tier) => tier <= settings.instances,
    );
    const vegetationBundles = createInstanceTierBundles(
      gpu,
      sceneTarget,
      vegetation,
      vegetationTiers,
      "garden-vegetation",
    );

    return {
      size,
      sceneTarget,
      boxGeometry,
      soilGeometry,
      vegetationGeometry,
      ground,
      soil,
      path,
      fence,
      vegetation,
      sky,
      blit,
      staticBundle,
      soilBundle,
      vegetationBundles,
    };
  } catch (error) {
    bestEffort(() => boxGeometry?.destroy());
    bestEffort(() => soilGeometry?.destroy());
    bestEffort(() => vegetationGeometry?.destroy());
    bestEffort(() => destroyTarget(sceneTarget));
    throw error;
  }
}

function setWorldUniforms(
  drawable: Draw,
  shared: SharedWorldUniforms,
  snapshot: GardenSceneSnapshot,
  kind: number,
): void {
  drawable.set({
    viewProjection: shared.viewProjection,
    cameraPosition: shared.cameraPosition,
    scene: shared.scene,
    weather: [snapshot.weather.rain, kind, 0, 0],
    lightDirection: shared.lightDirection,
    lightColor: shared.lightColor,
    ambientColor: shared.ambientColor,
    fogColor: shared.fogColor,
    lightParams: shared.lightParams,
    wet0: shared.wet0,
    wet1: shared.wet1,
    wet2: shared.wet2,
  });
}

function setVegetationUniforms(drawable: Draw, shared: SharedWorldUniforms): void {
  drawable.set({
    viewProjection: shared.viewProjection,
    cameraPosition: shared.cameraPosition,
    scene: shared.scene,
    lightDirection: shared.lightDirection,
    lightColor: shared.lightColor,
    ambientColor: shared.ambientColor,
    fogColor: shared.fogColor,
    lightParams: shared.lightParams,
  });
}

function setSoilUniforms(
  drawable: Draw,
  values: SharedWorldUniforms,
): void {
  drawable.set({
    viewProjection: values.viewProjection,
    cameraPosition: values.cameraPosition,
    scene: values.scene,
    lightDirection: values.lightDirection,
    lightColor: values.lightColor,
    ambientColor: values.ambientColor,
    fogColor: values.fogColor,
    lightParams: values.lightParams,
    wet0: values.wet0,
    wet1: values.wet1,
    wet2: values.wet2,
  });
}

function cameraFor(snapshot: GardenSceneSnapshot, size: readonly [number, number]): CameraState {
  const orbit = snapshot.camera.angle + Math.PI * 0.25;
  const distance = 12.6 / snapshot.camera.zoom;
  const position: Vec3 = [
    Math.sin(orbit) * distance,
    7.6 / snapshot.camera.zoom,
    Math.cos(orbit) * distance,
  ];
  const aspect = size[0] / Math.max(1, size[1]);
  const fov = 42;
  const camera = perspectiveCamera({
    fov,
    aspect,
    near: 0.1,
    far: 80,
    position,
    target: [0, -0.12, 0],
  });

  // The diorama camera points down at the garden, but the backdrop needs a
  // horizon-bearing basis. Tie that basis to the same orbit yaw so the sun
  // moves consistently when Eric rotates the garden without aiming the sky
  // through the ground.
  const skyForward = normalize3([-Math.sin(orbit), 0.055, -Math.cos(orbit)]);
  const skyRight = normalize3(cross3(skyForward, [0, 1, 0]));
  const skyUp = normalize3(cross3(skyRight, skyForward));
  return {
    viewProjection: camera.viewProjection,
    position,
    skyForward,
    skyRight,
    skyUp,
    aspect,
    tanHalfFov: Math.tan((fov * Math.PI) / 360),
  };
}

function lightingFor(weather: WeatherProfile): LightingState {
  const horizontalLength = Math.cos(weather.sunElevation);
  const sunDirection = normalize3([
    -0.64 * horizontalLength,
    Math.sin(weather.sunElevation),
    -0.77 * horizontalLength,
  ]);
  return {
    sunDirection,
    directIntensity: 0.35 + weather.sunlight * 0.70,
  };
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

function createCropMarkers(overlay: HTMLElement): CropMarker[] {
  overlay.replaceChildren();
  return Array.from({ length: 12 }, () => {
    const root = document.createElement("span");
    const glyph = document.createElement("span");
    const badge = document.createElement("span");
    root.className = "crop-marker";
    glyph.className = "crop-marker-glyph";
    badge.className = "crop-marker-badge";
    root.setAttribute("aria-hidden", "true");
    root.append(glyph, badge);
    overlay.append(root);
    return { root, glyph, badge };
  });
}

function project(
  matrix: ArrayLike<number>,
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
): { x: number; y: number } {
  const clipX = value(matrix, 0) * x + value(matrix, 4) * y + value(matrix, 8) * z + value(matrix, 12);
  const clipY = value(matrix, 1) * x + value(matrix, 5) * y + value(matrix, 9) * z + value(matrix, 13);
  const clipW = value(matrix, 3) * x + value(matrix, 7) * y + value(matrix, 11) * z + value(matrix, 15);
  const inverseW = Math.abs(clipW) > 0.00001 ? 1 / clipW : 1;
  return {
    x: (clipX * inverseW * 0.5 + 0.5) * width,
    y: (1 - (clipY * inverseW * 0.5 + 0.5)) * height,
  };
}

function value(matrix: ArrayLike<number>, index: number): number {
  return Number(matrix[index]) || 0;
}

function cleanupGeneration(generation: Generation): void {
  bestEffort(() => generation.boxGeometry.destroy());
  bestEffort(() => generation.soilGeometry.destroy());
  bestEffort(() => generation.vegetationGeometry.destroy());
  bestEffort(() => destroyTarget(generation.sceneTarget));
}

function destroyTarget(value: Target): void {
  (value as Target & { destroy(): void }).destroy();
}

function sameSize(a: readonly number[], b: readonly number[]): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function bestEffort(cleanup: () => void): void {
  try {
    cleanup();
  } catch {
    // Cleanup must never hide the primary render failure.
  }
}
