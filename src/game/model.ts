export const SAVE_KEY = "eric-secret-garden-r2";
export const MAX_STAGE = 4;

export const CROPS = {
  carrot: ["胡萝卜", "🥕"],
  tomato: ["番茄", "🍅"],
  corn: ["玉米", "🌽"],
  pumpkin: ["南瓜", "🎃"],
  lettuce: ["生菜", "🥬"],
  strawberry: ["草莓", "🍓"],
} as const;

export type CropId = keyof typeof CROPS;
export type Tool = "harvest" | "water" | "spray";
export type WeatherId = "sunny" | "partly-cloudy" | "cloudy" | "breezy" | "sunshower";

export interface Question {
  readonly text: string;
  readonly answer: CropId | string;
  readonly choices: readonly (CropId | string)[];
  readonly numeric?: boolean;
}

export interface Level {
  readonly title: string;
  readonly hint: string;
  readonly weather: string;
  readonly targets: Readonly<Partial<Record<CropId, number>>>;
  readonly question: Question;
}

export const LEVELS: readonly Level[] = [
  {
    title: "先把今天的种子播下去",
    hint: "按下面的“播种 / 长大”，菜地会自动播下这一关需要的种子。",
    weather: "☀️ 晴朗",
    targets: { carrot: 3, tomato: 4, corn: 1, pumpkin: 2 },
    question: {
      text: "这一关里，哪一种菜最多？",
      answer: "tomato",
      choices: ["carrot", "tomato", "pumpkin"],
    },
  },
  {
    title: "照顾好第二篮蔬菜",
    hint: "叶子小的时候先浇水；看到小虫提示，再用喷药保护它。",
    weather: "🌤️ 晴间多云",
    targets: { carrot: 2, tomato: 3, corn: 3, pumpkin: 2 },
    question: {
      text: "玉米和胡萝卜，哪一种更多？",
      answer: "corn",
      choices: ["corn", "carrot"],
    },
  },
  {
    title: "新朋友：生菜来了",
    hint: "生菜长得快，但每一轮也要记得浇水。",
    weather: "🌥️ 多云",
    targets: { carrot: 2, tomato: 2, corn: 2, pumpkin: 2, lettuce: 4 },
    question: {
      text: "哪一种菜正好有 4 棵？",
      answer: "lettuce",
      choices: ["lettuce", "tomato", "corn"],
    },
  },
  {
    title: "风吹过菜地，继续照料",
    hint: "这一关种类更多。先看目标，再决定你要先照顾哪一块。",
    weather: "🍃 微风",
    targets: { carrot: 2, tomato: 3, corn: 2, pumpkin: 1, lettuce: 4 },
    question: {
      text: "番茄比南瓜多几棵？",
      answer: "2",
      choices: ["1", "2", "3"],
      numeric: true,
    },
  },
  {
    title: "秘密菜园的草莓日",
    hint: "最后一关会解锁草莓。把整篮菜照顾到成熟吧！",
    weather: "🌦️ 太阳雨",
    targets: { carrot: 1, tomato: 2, corn: 2, pumpkin: 1, lettuce: 3, strawberry: 3 },
    question: {
      text: "草莓和生菜一共有几棵？",
      answer: "6",
      choices: ["5", "6", "7"],
      numeric: true,
    },
  },
] as const;

const WEATHER_IDS: readonly WeatherId[] = [
  "sunny",
  "partly-cloudy",
  "cloudy",
  "breezy",
  "sunshower",
];
const WEATHER_STEPS = [1, 2, 3, 4] as const;
export const WEATHER_LABELS: Readonly<Record<WeatherId, string>> = {
  sunny: "☀️ 晴朗",
  "partly-cloudy": "🌤️ 晴间多云",
  cloudy: "🌥️ 多云",
  breezy: "🍃 微风",
  sunshower: "🌦️ 太阳雨",
};

export interface GardenLogEntry {
  readonly icon: string;
  readonly title: string;
  readonly text: string;
}

export interface CameraState {
  angle: number;
  zoom: number;
}

export interface PlotState {
  index: number;
  crop: CropId | null;
  stage: number;
  watered: boolean;
  pest: boolean;
  harvested: boolean;
}

export interface GameState {
  level: number;
  stars: number;
  tool: Tool;
  planted: boolean;
  round: number;
  plots: PlotState[];
  harvested: Partial<Record<CropId, number>>;
  totalHarvest: Partial<Record<CropId, number>>;
  log: GardenLogEntry[];
  camera: CameraState;
  completed: boolean;
}

export interface ActionResult {
  readonly toast?: string;
  readonly toastMs?: number;
  readonly finished?: boolean;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function blankState(): GameState {
  return {
    level: 0,
    stars: 0,
    tool: "harvest",
    planted: false,
    round: 0,
    plots: [],
    harvested: {},
    totalHarvest: {},
    log: [
      {
        icon: "👋",
        title: "欢迎回来",
        text: "今天也来照顾秘密菜园吧。",
      },
    ],
    camera: { angle: -0.08, zoom: 1 },
    completed: false,
  };
}

export function loadState(storage: StorageLike): GameState {
  try {
    const parsed = JSON.parse(storage.getItem(SAVE_KEY) ?? "{}") as Partial<GameState>;
    const base = blankState();
    return {
      ...base,
      ...parsed,
      level: clampInteger(parsed.level, 0, LEVELS.length - 1, base.level),
      stars: clampInteger(parsed.stars, 0, Number.MAX_SAFE_INTEGER, base.stars),
      tool: isTool(parsed.tool) ? parsed.tool : base.tool,
      round: clampInteger(parsed.round, 0, MAX_STAGE, base.round),
      plots: Array.isArray(parsed.plots) ? parsed.plots.map(normalizePlot).slice(0, 12) : [],
      harvested: normalizeCounts(parsed.harvested),
      totalHarvest: normalizeCounts(parsed.totalHarvest),
      log: Array.isArray(parsed.log) ? parsed.log.map(normalizeLog).slice(0, 6) : base.log,
      camera: {
        angle: finite(parsed.camera?.angle, base.camera.angle),
        zoom: clamp(finite(parsed.camera?.zoom, base.camera.zoom), 0.76, 1.35),
      },
      planted: Boolean(parsed.planted),
      completed: Boolean(parsed.completed),
    };
  } catch {
    return blankState();
  }
}

export function saveState(storage: StorageLike, state: GameState): void {
  storage.setItem(SAVE_KEY, JSON.stringify(state));
}

export function resetState(storage: StorageLike): GameState {
  storage.removeItem(SAVE_KEY);
  const state = blankState();
  saveState(storage, state);
  return state;
}

export function weatherIdForState(state: Pick<GameState, "level" | "round">): WeatherId {
  const level = Math.max(0, Math.min(LEVELS.length - 1, Math.floor(state.level)));
  const round = Math.max(0, Math.min(MAX_STAGE, Math.floor(state.round)));
  let seed = (Math.imul(level + 1, 0x9e3779b1) ^ 0xa511e9b3) >>> 0;
  seed ^= seed >>> 16;
  seed = Math.imul(seed, 0x7feb352d) >>> 0;
  seed ^= seed >>> 15;
  seed = Math.imul(seed, 0x846ca68b) >>> 0;
  seed ^= seed >>> 16;
  const offset = seed % WEATHER_IDS.length;
  const step = WEATHER_STEPS[(seed >>> 8) % WEATHER_STEPS.length]!;
  return WEATHER_IDS[(offset + round * step) % WEATHER_IDS.length]!;
}

export function currentLevel(state: GameState): Level {
  const base = LEVELS[Math.max(0, Math.min(LEVELS.length - 1, state.level))] ?? LEVELS[0]!;
  return {
    ...base,
    weather: WEATHER_LABELS[weatherIdForState(state)],
  };
}

export function totalTarget(state: GameState): number {
  return Object.values(currentLevel(state).targets).reduce<number>((sum, value) => sum + (value ?? 0), 0);
}

export function harvestedTotal(state: GameState): number {
  return Object.values(state.harvested).reduce<number>((sum, value) => sum + (Number(value) || 0), 0);
}

export function harvestedCount(state: GameState, crop: CropId): number {
  return Number(state.harvested[crop]) || 0;
}

export function addLog(state: GameState, icon: string, title: string, text: string): void {
  state.log.unshift({ icon, title, text });
  state.log = state.log.slice(0, 6);
}

export function plant(state: GameState): ActionResult {
  const crops: CropId[] = [];
  for (const [crop, count] of Object.entries(currentLevel(state).targets) as [CropId, number][]) {
    for (let index = 0; index < count; index += 1) crops.push(crop);
  }
  state.plots = Array.from({ length: 12 }, (_, index): PlotState => ({
    index,
    crop: crops[index] ?? null,
    stage: crops[index] ? 1 : 0,
    watered: false,
    pest: false,
    harvested: false,
  }));
  state.planted = true;
  state.round = 1;
  addLog(state, "🌱", "种子播好了", `这一关一共 ${crops.length} 棵。`);
  return { toast: "种子都播好了！选 💧 浇水，再点菜地。" };
}

export function setTool(state: GameState, tool: Tool): ActionResult {
  state.tool = tool;
  return {
    toast:
      tool === "water"
        ? "💧 点菜地浇水"
        : tool === "spray"
          ? "🧴 点有小虫的菜地"
          : "🧺 成熟后点蔬菜收菜",
    toastMs: 1100,
  };
}

export function actOnPlot(state: GameState, plotIndex: number): ActionResult {
  const plot = state.plots[plotIndex];
  if (!plot?.crop || plot.harvested) {
    return {
      toast: plot?.harvested ? "这一块已经收好啦。" : "这块现在是空的。",
      toastMs: 1000,
    };
  }

  if (state.tool === "water") {
    if (plot.stage >= MAX_STAGE) return { toast: "已经成熟，不用再浇水啦。", toastMs: 1000 };
    if (plot.watered) return { toast: "这块已经浇过水啦。", toastMs: 1000 };
    plot.watered = true;
    addLog(state, "💧", `给${CROPS[plot.crop][0]}浇水`, "泥土湿润了，小苗可以继续长。");
    return {};
  }

  if (state.tool === "spray") {
    if (!plot.pest) return { toast: "这里没有小虫。", toastMs: 1000 };
    plot.pest = false;
    addLog(state, "🛡️", `保护${CROPS[plot.crop][0]}`, "小虫走啦，这一块安全了。");
    return {};
  }

  if (plot.stage < MAX_STAGE) return { toast: "还没成熟，再照顾一下吧。", toastMs: 1000 };

  plot.harvested = true;
  const crop = plot.crop;
  state.harvested[crop] = harvestedCount(state, crop) + 1;
  state.totalHarvest[crop] = (Number(state.totalHarvest[crop]) || 0) + 1;
  addLog(state, "🧺", `摘到${CROPS[crop][0]}`, `篮子里现在有 ${harvestedTotal(state)} 棵菜。`);
  const finished = harvestedTotal(state) >= totalTarget(state);
  if (finished) {
    state.stars += 3;
    addLog(state, "⭐", `第 ${state.level + 1} 关完成`, "目标全部收进篮子，得到 3 颗星。");
  }
  return {
    toast: `${CROPS[crop][1]} 收进篮子！ ${harvestedTotal(state)} / ${totalTarget(state)}`,
    toastMs: 900,
    finished,
  };
}

export function grow(state: GameState): ActionResult {
  if (state.completed) return { toast: "秘密菜园 R2 已经全部通关啦！" };
  if (!state.planted) return plant(state);

  const living = state.plots.filter((plot) => plot.crop && !plot.harvested && plot.stage < MAX_STAGE);
  if (!living.length) return { toast: "都长大了，去收菜吧！" };

  const dry = living.filter((plot) => !plot.watered);
  if (dry.length) {
    state.tool = "water";
    return { toast: `还有 ${dry.length} 块没浇水。` };
  }

  const pests = living.filter((plot) => plot.pest);
  if (pests.length) {
    state.tool = "spray";
    return { toast: `有 ${pests.length} 块有小虫。` };
  }

  for (const plot of living) {
    plot.stage = Math.min(MAX_STAGE, plot.stage + 1);
    plot.watered = false;
  }
  state.round = Math.min(MAX_STAGE, state.round + 1);

  if (state.round === 3) {
    const affected = living
      .filter((_, index) => (index + state.level) % 4 === 1)
      .slice(0, Math.min(2, Math.max(1, state.level)));
    for (const plot of affected) plot.pest = true;
    addLog(state, "🐛", "发现几只小虫", `有 ${affected.length} 块菜地需要保护。`);
  } else if (state.round >= MAX_STAGE) {
    addLog(state, "✨", "蔬菜成熟啦", "换成“收菜”，点成熟的蔬菜装进篮子。");
    state.tool = "harvest";
  } else {
    addLog(state, "🌿", "小苗长高了", `现在是第 ${state.round} / ${MAX_STAGE} 个生长阶段。`);
  }
  return {};
}

export function advanceLevel(state: GameState): ActionResult {
  if (state.level >= LEVELS.length - 1) {
    state.completed = true;
    return { toast: "🌟 全部通关！", toastMs: 2200 };
  }
  state.level += 1;
  state.planted = false;
  state.round = 0;
  state.plots = [];
  state.harvested = {};
  state.tool = "harvest";
  addLog(state, "🚪", `来到第 ${state.level + 1} 关`, currentLevel(state).hint);
  return {};
}

export function livingPlots(state: GameState): PlotState[] {
  return state.plots.filter((plot) => plot.crop && !plot.harvested && plot.stage < MAX_STAGE);
}

function normalizePlot(value: unknown, index: number): PlotState {
  const plot = (value && typeof value === "object" ? value : {}) as Partial<PlotState>;
  const crop = typeof plot.crop === "string" && plot.crop in CROPS ? (plot.crop as CropId) : null;
  return {
    index: clampInteger(plot.index, 0, 11, index),
    crop,
    stage: clampInteger(plot.stage, 0, MAX_STAGE, crop ? 1 : 0),
    watered: Boolean(plot.watered),
    pest: Boolean(plot.pest),
    harvested: Boolean(plot.harvested),
  };
}

function normalizeLog(value: unknown): GardenLogEntry {
  const entry = (value && typeof value === "object" ? value : {}) as Partial<GardenLogEntry> & {
    i?: unknown;
    t?: unknown;
    x?: unknown;
  };
  return {
    icon: text(entry.icon ?? entry.i, "🌱"),
    title: text(entry.title ?? entry.t, "菜园记录"),
    text: text(entry.text ?? entry.x, "今天也有新变化。"),
  };
}

function normalizeCounts(value: unknown): Partial<Record<CropId, number>> {
  if (!value || typeof value !== "object") return {};
  const counts: Partial<Record<CropId, number>> = {};
  for (const crop of Object.keys(CROPS) as CropId[]) {
    const count = (value as Record<string, unknown>)[crop];
    if (typeof count === "number" && Number.isFinite(count) && count >= 0) counts[crop] = Math.floor(count);
  }
  return counts;
}

function isTool(value: unknown): value is Tool {
  return value === "harvest" || value === "water" || value === "spray";
}

function finite(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function clampInteger(value: unknown, minimum: number, maximum: number, fallback: number): number {
  return clamp(Math.floor(finite(value, fallback)), minimum, maximum);
}

function text(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length ? value : fallback;
}
