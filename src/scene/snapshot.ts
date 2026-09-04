import {
  weatherIdForState,
  type CropId,
  type GameState,
  type WeatherId,
} from "../game/model";
import { CAMERA_DEFAULT_ELEVATION, type CameraViewState } from "./camera-controls";

export type Vec3 = readonly [number, number, number];

export interface WeatherProfile {
  readonly id: WeatherId;
  readonly skyTop: Vec3;
  readonly skyHorizon: Vec3;
  readonly sunlight: number;
  readonly cloudiness: number;
  readonly wind: number;
  readonly rain: number;
  readonly sunElevation: number;
  readonly sunColor: Vec3;
  /** Diffuse environment radiance. It includes a restrained neutral fill so
   * shadow-facing surfaces stay readable without inventing a second sun. */
  readonly ambientColor: Vec3;
  readonly fogColor: Vec3;
  readonly fogDensity: number;
  readonly exposure: number;
}

export interface ScenePlot {
  readonly index: number;
  readonly position: Vec3;
  readonly wetness: number;
  readonly crop: CropId | null;
  readonly stage: number;
  readonly pest: boolean;
  readonly harvested: boolean;
}

export interface GardenSceneSnapshot {
  readonly camera: {
    readonly angle: number;
    readonly zoom: number;
    readonly elevation: number;
  };
  readonly level: number;
  readonly weather: WeatherProfile;
  readonly plots: readonly ScenePlot[];
}

const NEUTRAL_FILL: Vec3 = [0.12, 0.12, 0.12];
const WEATHER_AMBIENT_WEIGHT = 0.86;

export function withNeutralDiffuseFill(weatherAmbient: Vec3): Vec3 {
  return [
    Math.min(1, weatherAmbient[0] * WEATHER_AMBIENT_WEIGHT + NEUTRAL_FILL[0]),
    Math.min(1, weatherAmbient[1] * WEATHER_AMBIENT_WEIGHT + NEUTRAL_FILL[1]),
    Math.min(1, weatherAmbient[2] * WEATHER_AMBIENT_WEIGHT + NEUTRAL_FILL[2]),
  ];
}

const WEATHER: readonly WeatherProfile[] = [
  {
    id: "sunny",
    skyTop: [0.43, 0.64, 0.78],
    skyHorizon: [0.95, 0.75, 0.50],
    sunlight: 1,
    cloudiness: 0.14,
    wind: 0.28,
    rain: 0,
    sunElevation: 0.28,
    sunColor: [1, 0.76, 0.42],
    ambientColor: withNeutralDiffuseFill([0.46, 0.58, 0.63]),
    fogColor: [0.74, 0.77, 0.70],
    fogDensity: 0.022,
    exposure: 1.05,
  },
  {
    id: "partly-cloudy",
    skyTop: [0.48, 0.66, 0.76],
    skyHorizon: [0.89, 0.75, 0.56],
    sunlight: 0.84,
    cloudiness: 0.38,
    wind: 0.4,
    rain: 0,
    sunElevation: 0.35,
    sunColor: [1, 0.82, 0.56],
    ambientColor: withNeutralDiffuseFill([0.48, 0.58, 0.62]),
    fogColor: [0.73, 0.74, 0.68],
    fogDensity: 0.024,
    exposure: 1.02,
  },
  {
    id: "cloudy",
    skyTop: [0.42, 0.54, 0.62],
    skyHorizon: [0.67, 0.69, 0.66],
    sunlight: 0.62,
    cloudiness: 0.72,
    wind: 0.44,
    rain: 0,
    sunElevation: 0.48,
    sunColor: [0.91, 0.91, 0.82],
    ambientColor: withNeutralDiffuseFill([0.43, 0.51, 0.57]),
    fogColor: [0.61, 0.66, 0.66],
    fogDensity: 0.03,
    exposure: 1,
  },
  {
    id: "breezy",
    skyTop: [0.35, 0.56, 0.72],
    skyHorizon: [0.95, 0.66, 0.38],
    sunlight: 0.82,
    cloudiness: 0.35,
    wind: 1,
    rain: 0,
    sunElevation: 0.17,
    sunColor: [1, 0.70, 0.36],
    ambientColor: withNeutralDiffuseFill([0.43, 0.52, 0.60]),
    fogColor: [0.77, 0.65, 0.52],
    fogDensity: 0.025,
    exposure: 1.06,
  },
  {
    id: "sunshower",
    skyTop: [0.38, 0.57, 0.68],
    skyHorizon: [0.86, 0.70, 0.47],
    sunlight: 0.72,
    cloudiness: 0.62,
    wind: 0.68,
    rain: 0.58,
    sunElevation: 0.12,
    sunColor: [1, 0.72, 0.41],
    ambientColor: withNeutralDiffuseFill([0.42, 0.53, 0.59]),
    fogColor: [0.68, 0.67, 0.59],
    fogDensity: 0.033,
    exposure: 1.03,
  },
] as const;

export const PLOT_POSITIONS: readonly Vec3[] = Array.from({ length: 12 }, (_, index) => [
  (index % 4 - 1.5) * 1.65,
  0,
  (Math.floor(index / 4) - 1) * 1.75,
] as const);

export function createSceneSnapshot(
  state: GameState,
  cameraView: CameraViewState = {
    zoom: state.camera.zoom,
    elevation: CAMERA_DEFAULT_ELEVATION,
  },
): GardenSceneSnapshot {
  const emptyPlots = Array.from({ length: 12 }, (_, index) => ({
    index,
    crop: null,
    stage: 0,
    watered: false,
    pest: false,
    harvested: false,
  }));
  const plots = state.plots.length ? state.plots : emptyPlots;
  const weatherId = weatherIdForState(state);
  const weather = WEATHER.find((profile) => profile.id === weatherId) ?? WEATHER[0]!;
  return {
    camera: {
      angle: state.camera.angle,
      zoom: cameraView.zoom,
      elevation: cameraView.elevation,
    },
    level: state.level,
    weather,
    plots: plots.map((plot, index): ScenePlot => ({
      index,
      position: PLOT_POSITIONS[index] ?? [0, 0, 0],
      wetness: plot.watered ? 1 : 0,
      crop: plot.crop,
      stage: plot.stage,
      pest: plot.pest,
      harvested: plot.harvested,
    })),
  };
}
