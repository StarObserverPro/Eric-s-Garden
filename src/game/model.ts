import { countCare, countOrder, countSharing, normalizeSharing, sharingBasketCount, type SharingState } from "./arithmetic";

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
  sharing: SharingState | null;
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
    sharing: null,
  };
}

export function loadState(storage: StorageLike): GameState {
  try {
    const parsed = JSON.parse(storage.getItem(SAVE_KEY) ?? "{}") as Partial<GameState>;
    const base = blankState();
    const loaded: GameState = {
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
      sharing: null,
    };
    loaded.sharing = normalizeSharing(parsed.sharing, basketOrder(loaded), loaded.level);
    return loaded;
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
  seed = (seed ^ (seed >>> 16)) >>> 0;
  seed = Math.imul(seed, 0x7feb352d) >>> 0;
  seed = (seed ^ (seed >>> 15)) >>> 0;
  seed = Math.imul(seed, 0x846ca68b) >>> 0;
  seed = (seed ^ (seed >>> 16)) >>> 0;
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
  if (state.planted || state.completed) return { toast: "种子已经播好了，继续照顾这一篮吧。" };
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
  state.sharing = null;
  addLog(state, "🌱", "种子播好了", `这一关一共 ${crops.length} 棵。`);
  return applyWeatherHelp(state) ?? { toast: "种子都播好了！选 💧 浇水，再点菜地。" };
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
    const care = countCare(state.plots, MAX_STAGE);
    const text = `已浇 ${care.watered} 块，还剩 ${care.remaining} 块。`;
    addLog(state, "💧", `给${CROPS[plot.crop][0]}浇水`, text);
    return { toast: `💧 ${text}`, toastMs: 1200 };
  }

  if (state.tool === "spray") {
    if (!plot.pest) return { toast: "这里没有小虫。", toastMs: 1000 };
    plot.pest = false;
    const remaining = countCare(state.plots, MAX_STAGE).pests;
    const text = remaining ? `又保护了 1 块，还剩 ${remaining} 块有小虫。` : "小虫都走啦，可以继续长大了。";
    addLog(state, "🛡️", `保护${CROPS[plot.crop][0]}`, text);
    return { toast: text, toastMs: 1400 };
  }

  if (plot.stage < MAX_STAGE) return { toast: "还没成熟，再照顾一下吧。", toastMs: 1000 };

  const wasComplete = basketOrder(state).complete;
  plot.harvested = true;
  const crop = plot.crop;
  state.harvested[crop] = harvestedCount(state, crop) + 1;
  state.totalHarvest[crop] = (Number(state.totalHarvest[crop]) || 0) + 1;
  const order = basketOrder(state);
  addLog(state, "🧺", `摘到${CROPS[crop][0]}`, `已有 ${order.collected} 棵，还差 ${order.remaining} 棵装满。`);
  const finished = !wasComplete && order.complete;
  if (finished) {
    state.stars += 3;
    addLog(state, "⭐", `第 ${state.level + 1} 关完成`, `${order.lines.map((line) => line.collected).join(" + ")} = ${order.target}，这一篮装满啦！得到 3 颗星。`);
  }
  return {
    toast: order.complete ? "🧺 这一篮装满啦！" : `${CROPS[crop][1]} 已有 ${order.collected} / ${order.target}，还差 ${order.remaining} 棵。`,
    toastMs: 900,
    finished,
  };
}

export function grow(state: GameState): ActionResult {
  if (basketOrder(state).complete) return { finished: true };
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
  return applyWeatherHelp(state) ?? {};
}

export function advanceLevel(state: GameState): ActionResult {
  if (!basketOrder(state).complete) return { toast: `这一篮还差 ${basketOrder(state).remaining} 棵，先去菜地里摘吧。` };
  if (state.level >= LEVELS.length - 1) {
    state.completed = true;
    return { toast: "🌟 全部通关！", toastMs: 2200 };
  }
  state.level += 1;
  state.planted = false;
  state.round = 0;
  state.plots = [];
  state.harvested = {};
  state.sharing = null;
  state.tool = "harvest";
  addLog(state, "🚪", `来到第 ${state.level + 1} 关`, currentLevel(state).hint);
  return {};
}

export function livingPlots(state: GameState): PlotState[] {
  return state.plots.filter((plot) => plot.crop && !plot.harvested && plot.stage < MAX_STAGE);
}

/** Read-only order projection; counters remain owned by the garden. */
export function basketOrder(state: GameState) {
  return countOrder(currentLevel(state).targets, state.harvested);
}

export function sharingProgress(state: GameState) {
  return countSharing(basketOrder(state), state.sharing, state.level);
}

export function startSharing(state: GameState): ActionResult {
  const order = basketOrder(state);
  if (!order.complete) return { toast: "先把这一篮摘满，再来分一分。" };
  if (!sharingBasketCount(order.target, state.level)) return { toast: "这一篮先收好，下一篮再分一分。" };
  state.sharing ??= { placements: Array<number>(order.target).fill(-1) };
  return {};
}

export function putInBasket(state: GameState, basket: number): ActionResult {
  const before = sharingProgress(state);
  if (!before.active || !Number.isInteger(basket) || !before.baskets[basket]) return {};
  const token = before.unassigned[0];
  if (token === undefined) return { toast: "都放进篮子了。需要调整时，可以拿回 1 棵。" };
  state.sharing!.placements[token] = basket;
  const after = sharingProgress(state);
  if (after.equal) {
    addLog(state, "🧺", "每篮一样多啦", `${after.tokens.length} ÷ ${after.baskets.length} = ${after.each}；${after.baskets.length} × ${after.each} = ${after.tokens.length}。`);
    return { toast: `每篮 ${after.each} 棵，一样多啦！`, toastMs: 1800 };
  }
  if (after.unassigned.length === 0) return { toast: "每篮还不一样多。拿回 1 棵，再放一放吧。", toastMs: 2200 };
  return {};
}

export function takeFromBasket(state: GameState, basket: number): ActionResult {
  const view = sharingProgress(state);
  if (!view.active || !Number.isInteger(basket)) return {};
  const tokens = view.baskets[basket];
  const token = tokens?.[tokens.length - 1];
  if (token === undefined) return {};
  state.sharing!.placements[token] = -1;
  return {};
}

export function restartSharing(state: GameState): ActionResult {
  if (!sharingProgress(state).active) return {};
  state.sharing!.placements.fill(-1);
  return { toast: "菜都拿回来了，重新分一分。", toastMs: 1200 };
}

/** Only a successful sow/grow transition calls this. Reloads, blocked growth,
 * renderer switches and HUD updates never grant another rainfall allowance. */
function applyWeatherHelp(state: GameState): ActionResult | undefined {
  if (weatherIdForState(state) !== "sunshower") return undefined;
  const growing = livingPlots(state);
  const dry = growing.filter((plot) => !plot.watered);
  if (!dry.length) return undefined;
  const offset = (state.level + state.round) % dry.length;
  const helped = Array.from({ length: Math.min(4, dry.length) }, (_, index) => dry[(index + offset) % dry.length]!);
  for (const plot of helped) plot.watered = true;
  const remaining = countCare(state.plots, MAX_STAGE).remaining;
  const text = `雨水帮忙浇了 ${helped.length} 块，还剩 ${remaining} 块。`;
  addLog(state, "🌦️", "雨水帮忙啦", text);
  return { toast: `🌦️ ${text}`, toastMs: 2400 };
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
