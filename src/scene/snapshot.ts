import type { CropId, GameState } from "../game/model";

export type Vec3 = readonly [number, number, number];

export interface WeatherProfile {
  readonly id: "sunny" | "partly-cloudy" | "cloudy" | "breezy" | "sunshower";
  readonly skyTop: Vec3;
  readonly skyHorizon: Vec3;
  readonly sunlight: number;
  readonly cloudiness: number;
  readonly wind: number;
  readonly rain: number;
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
  };
  readonly level: number;
  readonly weather: WeatherProfile;
  readonly plots: readonly ScenePlot[];
}

const WEATHER: readonly WeatherProfile[] = [
  {
    id: "sunny",
    skyTop: [0.53, 0.73, 0.83],
    skyHorizon: [0.91, 0.85, 0.61],
    sunlight: 1,
    cloudiness: 0.14,
    wind: 0.28,
    rain: 0,
  },
  {
    id: "partly-cloudy",
    skyTop: [0.55, 0.7, 0.76],
    skyHorizon: [0.86, 0.82, 0.64],
    sunlight: 0.84,
    cloudiness: 0.38,
    wind: 0.4,
    rain: 0,
  },
  {
    id: "cloudy",
    skyTop: [0.48, 0.6, 0.64],
    skyHorizon: [0.72, 0.72, 0.63],
    sunlight: 0.62,
    cloudiness: 0.72,
    wind: 0.44,
    rain: 0,
  },
  {
    id: "breezy",
    skyTop: [0.54, 0.72, 0.79],
    skyHorizon: [0.84, 0.82, 0.63],
    sunlight: 0.82,
    cloudiness: 0.35,
    wind: 1,
    rain: 0,
  },
  {
    id: "sunshower",
    skyTop: [0.43, 0.63, 0.72],
    skyHorizon: [0.82, 0.78, 0.58],
    sunlight: 0.72,
    cloudiness: 0.62,
    wind: 0.68,
    rain: 0.58,
  },
] as const;

export const PLOT_POSITIONS: readonly Vec3[] = Array.from({ length: 12 }, (_, index) => [
  (index % 4 - 1.5) * 1.65,
  0,
  (Math.floor(index / 4) - 1) * 1.75,
] as const);

export function createSceneSnapshot(state: GameState): GardenSceneSnapshot {
  const emptyPlots = Array.from({ length: 12 }, (_, index) => ({
    index,
    crop: null,
    stage: 0,
    watered: false,
    pest: false,
    harvested: false,
  }));
  const plots = state.plots.length ? state.plots : emptyPlots;
  return {
    camera: {
      angle: state.camera.angle,
      zoom: state.camera.zoom,
    },
    level: state.level,
    weather: WEATHER[state.level] ?? WEATHER[0]!,
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
