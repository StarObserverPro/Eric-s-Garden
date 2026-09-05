import "../styles.css";

import {
  CROPS,
  LEVELS,
  MAX_STAGE,
  actOnPlot,
  advanceLevel,
  basketOrder,
  currentLevel,
  grow,
  harvestedCount,
  harvestedTotal,
  loadState,
  plant,
  resetState,
  saveState,
  setTool,
  startSharing,
  putInBasket,
  takeFromBasket,
  restartSharing,
  type ActionResult,
  type CropId,
  type GameState,
  type Tool,
} from "./game/model";
import {
  DEFAULT_RENDER_SETTINGS,
  isDprTier,
  isInstanceTier,
  type RenderSettings,
} from "./render/contract";
import { RenderRuntime } from "./render/runtime";
import {
  syncSettingsControls,
  updateDiagnostics,
  type DiagnosticsElements,
} from "./diagnostics/panel";
import {
  CAMERA_DEFAULT_ELEVATION,
  CAMERA_ZOOM_MIN,
  clampCameraElevation,
  maxCameraZoom,
  maxCanvasCameraZoom,
  type CameraViewState,
} from "./scene/camera-controls";
import { countCare } from "./game/arithmetic";
import { renderOrder, renderArithmeticCompletion, type SharingAction } from "./ui/arithmetic";
import { cropArt, feedbackArt } from "./ui/arithmetic-art";
import { hudArtImage, legacyHudArtName, setHudLabel } from "./ui/general-hud-art";
import { gardenQuestion } from "./ui/arithmetic-learning";
import { renderLearningQuestion } from "./ui/arithmetic-question";
import { createSceneSnapshot } from "./scene/snapshot";

const RENDER_SETTINGS_KEY = "eric-secret-garden-render-r1";
const CAMERA_VIEW_KEY = "eric-secret-garden-camera-view-r1";

const element = {
  stage: byId<HTMLElement>("gardenStage"),
  canvas2d: byId<HTMLCanvasElement>("gardenCanvas2d"),
  gpuCanvas: byId<HTMLCanvasElement>("gardenCanvasGpu"),
  cropOverlay: byId<HTMLElement>("cropOverlay"),
  target: byId<HTMLElement>("targetList"),
  orderHud: byId<HTMLElement>("orderHud"),
  badge: byId<HTMLElement>("levelBadge"),
  weather: byId<HTMLElement>("weatherBadge"),
  progress: byId<HTMLElement>("levelProgress"),
  progressFill: byId<HTMLElement>("progressFill"),
  title: byId<HTMLElement>("missionTitle"),
  hint: byId<HTMLElement>("missionHint"),
  water: byId<HTMLElement>("waterStatus"),
  spray: byId<HTMLElement>("sprayStatus"),
  growth: byId<HTMLElement>("growthStatus"),
  stars: byId<HTMLElement>("starCount"),
  eventLog: byId<HTMLElement>("eventLog"),
  unlockIcon: byId<HTMLElement>("unlockIcon"),
  unlockTitle: byId<HTMLElement>("unlockTitle"),
  unlockText: byId<HTMLElement>("unlockText"),
  grow: byId<HTMLButtonElement>("growBtn"),
  growIcon: byId<HTMLElement>("growIcon"),
  growLabel: byId<HTMLElement>("growLabel"),
  growSubLabel: byId<HTMLElement>("growSubLabel"),
  toast: byId<HTMLElement>("toast"),
  stats: byId<HTMLDialogElement>("statsDialog"),
  statsBody: byId<HTMLElement>("statsBody"),
  statsFoot: byId<HTMLElement>("statsFoot"),
  statsSummary: byId<HTMLElement>("statsSummary"),
  questionButton: byId<HTMLButtonElement>("questionBtn"),
  questionBox: byId<HTMLElement>("questionBox"),
  levelDialog: byId<HTMLDialogElement>("levelDialog"),
  completeTitle: byId<HTMLElement>("completeTitle"),
  completeText: byId<HTMLElement>("completeText"),
  reward: byId<HTMLElement>("levelReward"),
  levelQuestion: byId<HTMLElement>("levelQuestion"),
  next: byId<HTMLButtonElement>("nextLevelBtn"),
  statsButton: byId<HTMLButtonElement>("statsBtn"),
  speakButton: byId<HTMLButtonElement>("speakBtn"),
  resetButton: byId<HTMLButtonElement>("resetBtn"),
  retryRenderer: byId<HTMLButtonElement>("retryRendererBtn"),
};

const diagnostics: DiagnosticsElements = {
  rendererName: byId<HTMLElement>("rendererName"),
  rendererMessage: byId<HTMLElement>("rendererMessage"),
  fps: byId<HTMLElement>("diagFps"),
  frame: byId<HTMLElement>("diagFrame"),
  drawCalls: byId<HTMLElement>("diagDraws"),
  instances: byId<HTMLElement>("diagInstances"),
  passes: byId<HTMLElement>("diagPasses"),
  resources: byId<HTMLElement>("diagResources"),
  dpr: byId<HTMLElement>("diagDpr"),
  indicator: byId<HTMLElement>("rendererIndicator"),
  preference: byId<HTMLSelectElement>("rendererPreference"),
  instanceTier: byId<HTMLSelectElement>("instanceTier"),
  dprTier: byId<HTMLSelectElement>("dprTier"),
};

let state = loadState(localStorage);
let renderSettings = loadRenderSettings();
let cameraView = loadCameraView(state.camera.zoom);
let toastTimer = 0;
let statsScrollBeforeQuestion = 0;

syncSettingsControls(diagnostics, renderSettings);
const runtime = new RenderRuntime({
  canvas2d: element.canvas2d,
  gpuCanvas: element.gpuCanvas,
  cropOverlay: element.cropOverlay,
  settings: renderSettings,
  snapshot: createSceneSnapshot(state, cameraView),
  onMetrics: (metrics) => {
    updateDiagnostics(diagnostics, metrics);
    reconcileCameraZoom();
  },
  onFallback: (message) => showToast(message, 2600),
});

function update(): void {
  const level = currentLevel(state);
  const order = basketOrder(state);
  const harvested = order.collected;
  const target = order.target;
  element.badge.textContent = `第 ${state.level + 1} 关`;
  element.weather.textContent = level.weather;
  element.progress.textContent = `${harvested} / ${target}`;
  element.progressFill.style.width = `${Math.min(100, target > 0 ? harvested / target * 100 : 0)}%`;
  element.title.textContent = level.title;
  element.hint.textContent = order.complete ? "菜都装好了，去看看这一篮吧。" : state.round >= MAX_STAGE ? `还差 ${order.remaining} 棵，看看哪种菜还没装满。` : level.hint;
  setHudLabel(element.stars, "reward-star", String(state.stars));

  renderOrder(element.target, element.orderHud, state);
  const care = countCare(state.plots, MAX_STAGE);
  setHudLabel(element.water, "status-water", `还需 ${care.remaining} 块`);
  element.water.setAttribute("aria-label", `已浇 ${care.watered} 块，共 ${care.total} 块，还需 ${care.remaining} 块`);
  setHudLabel(element.spray, care.pests ? "status-pest" : "status-protected", care.pests ? `还剩 ${care.pests} 块` : "无小虫");
  setHudLabel(element.growth, "status-grow", `生长 ${state.round}/${MAX_STAGE}`);

  if (order.complete) {
    element.growIcon.replaceChildren(hudArtImage("tool-harvest"));
    element.growLabel.textContent = "看看菜篮";
    element.growSubLabel.textContent = "分一分，或者开始下一关";
  } else if (!state.planted) {
    element.growIcon.replaceChildren(hudArtImage("tool-grow"));
    element.growLabel.textContent = "播种";
    element.growSubLabel.textContent = "按一下开始今天的菜园";
  } else if (state.round < MAX_STAGE) {
    element.growIcon.replaceChildren(hudArtImage("tool-grow"));
    element.growLabel.textContent = care.remaining ? "先浇水" : care.pests ? "赶走小虫" : "长大一步";
    element.growSubLabel.textContent = care.remaining ? `还需 ${care.remaining} 块 · 点菜地浇水`
      : care.pests ? `还有 ${care.pests} 块 · 点小虫保护它` : "照顾好了，让小苗长高吧";
  } else {
    element.growIcon.replaceChildren(hudArtImage("tool-harvest"));
    element.growLabel.textContent = "收菜";
    element.growSubLabel.textContent = "换成收菜，点成熟蔬菜";
  }

  element.eventLog.replaceChildren(...state.log.map((entry) => logItem(entry.icon, entry.title, entry.text)));
  if (state.level < 2) {
    element.unlockIcon.replaceChildren(hudArtImage("utility-lock"));
    element.unlockTitle.textContent = "菜地成长计划";
    element.unlockText.textContent = `再过 ${2 - state.level} 关解锁生菜`;
  } else if (state.level < 4) {
    element.unlockIcon.replaceChildren(cropArt("lettuce"));
    element.unlockTitle.textContent = "生菜已经解锁";
    element.unlockText.textContent = `再过 ${4 - state.level} 关会见到草莓`;
  } else {
    element.unlockIcon.replaceChildren(cropArt("strawberry"));
    element.unlockTitle.textContent = "草莓已经解锁";
    element.unlockText.textContent = state.completed ? "秘密菜园 R2 已全部通关" : "最后一关，把它们照顾成熟吧";
  }

  document.querySelectorAll<HTMLButtonElement>(".tool-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.tool === state.tool);
  });
  runtime.setSnapshot(createSceneSnapshot(state, cameraView));
  if (element.levelDialog.open) renderArithmeticCompletion(element.levelQuestion, state, shareAction);
}

function shareAction(action: SharingAction): void {
  if (action.kind === "start") commit(startSharing(state));
  else if (action.kind === "restart") commit(restartSharing(state));
  else if (action.kind === "put") commit(putInBasket(state, action.basket));
  else if (action.kind === "take") commit(takeFromBasket(state, action.basket));
}

function commit(result: ActionResult, options: { showComplete?: boolean } = {}): void {
  saveState(localStorage, state);
  update();
  if (result.toast) showToast(result.toast, result.toastMs);
  if (result.finished || options.showComplete) showLevelComplete();
}

function showLevelComplete(): void {
  const last = state.level === LEVELS.length - 1;
  if (element.stats.open) element.stats.close();
  element.levelDialog.querySelector(".celebration-icon")?.replaceChildren(hudArtImage("reward-star"));
  element.completeTitle.textContent = last ? "秘密菜园大丰收！" : "这一篮收好啦！";
  element.completeText.textContent = last
    ? "你把 R2 的五关都照顾完了。"
    : `第 ${state.level + 1} 关完成，得到 3 颗星。`;
  element.reward.replaceChildren(
    rewardPill("⭐ +3"),
    rewardPill(`🧺 ${harvestedTotal(state)} 棵`),
  );
  renderArithmeticCompletion(element.levelQuestion, state, shareAction);
  element.next.textContent = last ? "看看我的菜园 →" : "下一关 →";
  if (!element.levelDialog.open) element.levelDialog.showModal();
}

function showStats(): void {
  if (element.levelDialog.open) element.levelDialog.close();
  endQuestion(false);
  const cropIds = (Object.keys(CROPS) as CropId[]).filter(
    (crop) => currentLevel(state).targets[crop] || state.totalHarvest[crop],
  );
  let sum = 0;
  let target = 0;
  let left = 0;
  element.statsBody.replaceChildren(
    ...cropIds.map((crop) => {
      const harvested = harvestedCount(state, crop);
      const cropTarget = currentLevel(state).targets[crop] ?? 0;
      const remaining = Math.max(0, cropTarget - harvested);
      sum += harvested;
      target += cropTarget;
      left += remaining;
      const row = document.createElement("tr");
      const cropCell = tableCell(CROPS[crop][0]);
      cropCell.prepend(cropArt(crop));
      row.append(
        cropCell,
        tableCell(String(harvested)),
        tableCell(cropTarget ? String(cropTarget) : "—"),
        tableCell(cropTarget ? String(remaining) : "—"),
      );
      return row;
    }),
  );
  const totalRow = document.createElement("tr");
  totalRow.append(
    tableCell("合计"),
    tableCell(String(sum)),
    tableCell(String(target)),
    tableCell(String(left)),
  );
  element.statsFoot.replaceChildren(totalRow);
  const lifetime = Object.values(state.totalHarvest).reduce<number>((acc, count) => acc + (Number(count) || 0), 0);
  element.statsSummary.replaceChildren(
    summaryCell(sum, "本关已摘"),
    summaryCell(lifetime, "总共摘过"),
    summaryCell(state.stars, "星星"),
  );
  element.questionBox.hidden = true;
  if (!element.stats.open) element.stats.showModal();
  element.stats.querySelector(".dialog-shell")?.scrollTo(0, 0);
}

function endQuestion(restoreFocus = true): void {
  element.questionBox.hidden = true;
  element.questionBox.replaceChildren();
  delete element.stats.dataset.learning;
  if (restoreFocus) {
    element.stats.querySelector(".dialog-shell")?.scrollTo(0, statsScrollBeforeQuestion);
    element.questionButton.focus({ preventScroll: true });
  }
}

function startQuestion(): void {
  statsScrollBeforeQuestion = element.stats.querySelector(".dialog-shell")?.scrollTop ?? 0;
  element.stats.dataset.learning = "true";
  element.questionBox.hidden = false;
  renderLearningQuestion(element.questionBox, gardenQuestion(state), () => endQuestion());
  // The needed column is copied into the question surface before unrelated
  // statistics are collapsed. Start at the title, not the old table scroll.
  element.stats.querySelector(".dialog-shell")?.scrollTo(0, 0);
}

function showToast(text: string, duration = 1700): void {
  element.toast.textContent = text;
  element.toast.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => element.toast.classList.remove("show"), duration);
}

function updateCameraOnly(): void {
  saveState(localStorage, state);
  saveCameraView(cameraView);
  runtime.setSnapshot(createSceneSnapshot(state, cameraView));
}

function reconcileCameraZoom(): void {
  const nextZoom = clamp(cameraView.zoom, CAMERA_ZOOM_MIN, maxZoomForStage());
  if (Math.abs(nextZoom - cameraView.zoom) < 0.0001) return;
  cameraView = { ...cameraView, zoom: nextZoom };
  saveCameraView(cameraView);
  runtime.setSnapshot(createSceneSnapshot(state, cameraView));
}

function applyRenderSettings(next: RenderSettings): void {
  renderSettings = next;
  saveRenderSettings(next);
  syncSettingsControls(diagnostics, next);
  void runtime.applySettings(next);
}

document.querySelectorAll<HTMLButtonElement>(".tool-btn").forEach((button) => {
  button.addEventListener("click", () => {
    const tool = button.dataset.tool;
    if (tool === "harvest" || tool === "water" || tool === "spray") commit(setTool(state, tool));
  });
});
element.grow.addEventListener("click", () => {
  if (state.round >= MAX_STAGE && !basketOrder(state).complete) commit(setTool(state, "harvest"));
  else commit(grow(state));
});
element.statsButton.addEventListener("click", showStats);
element.speakButton.addEventListener("click", () => {
  if (!("speechSynthesis" in window)) {
    showToast("这个浏览器暂时不能朗读。");
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(
    `第${state.level + 1}关。${element.title.textContent}。${element.hint.textContent}。${element.growLabel.textContent}，${element.growSubLabel.textContent}。`,
  );
  utterance.lang = "zh-CN";
  utterance.rate = 0.88;
  window.speechSynthesis.speak(utterance);
});
element.resetButton.addEventListener("click", () => {
  if (window.confirm("要把 Eric 的秘密菜园重新从第 1 关开始吗？")) {
    state = resetState(localStorage);
    element.levelDialog.close();
    element.stats.close();
    update();
    showToast("已经重新开始。");
  }
});
element.questionButton.addEventListener("click", startQuestion);
element.stats.addEventListener("close", () => endQuestion(false));
document.querySelector('[data-tool="water"] > span')?.replaceChildren(hudArtImage("tool-water"));
element.next.addEventListener("click", () => {
  const result = advanceLevel(state);
  saveState(localStorage, state);
  element.levelDialog.close();
  update();
  if (result.toast) showToast(result.toast, result.toastMs);
});

diagnostics.preference.addEventListener("change", () => {
  applyRenderSettings({
    ...renderSettings,
    preference: diagnostics.preference.value === "canvas" ? "canvas" : "auto",
  });
});
diagnostics.instanceTier.addEventListener("change", () => {
  const value = Number(diagnostics.instanceTier.value);
  if (isInstanceTier(value)) applyRenderSettings({ ...renderSettings, instances: value });
});
diagnostics.dprTier.addEventListener("change", () => {
  const value = Number(diagnostics.dprTier.value);
  if (isDprTier(value)) applyRenderSettings({ ...renderSettings, maxDpr: value });
});
element.retryRenderer.addEventListener("click", () => void runtime.applySettings(renderSettings));

interface DragState {
  readonly originX: number;
  readonly originY: number;
  readonly angle: number;
  readonly elevation: number;
  readonly started: number;
  moved: boolean;
}

interface PinchState {
  readonly distance: number;
  readonly zoom: number;
}

const pointers = new Map<number, { x: number; y: number }>();
let drag: DragState | undefined;
let pinch: PinchState | undefined;

element.stage.addEventListener("pointerdown", (event) => {
  if ((event.target as Element).closest(".render-panel")) return;
  element.stage.setPointerCapture(event.pointerId);
  const point = stagePoint(event);
  pointers.set(event.pointerId, point);
  if (pointers.size === 1) {
    drag = {
      originX: point.x,
      originY: point.y,
      angle: state.camera.angle,
      elevation: cameraView.elevation,
      started: performance.now(),
      moved: false,
    };
  } else if (pointers.size === 2) {
    const values = [...pointers.values()];
    pinch = {
      distance: distance(values[0]!, values[1]!),
      zoom: cameraView.zoom,
    };
    drag = undefined;
  }
});

element.stage.addEventListener("pointermove", (event) => {
  if (!pointers.has(event.pointerId)) return;
  const point = stagePoint(event);
  pointers.set(event.pointerId, point);
  if (pointers.size === 2 && pinch) {
    const values = [...pointers.values()];
    const currentDistance = distance(values[0]!, values[1]!);
    const nextZoom = pinch.zoom * currentDistance / Math.max(1, pinch.distance);
    cameraView = {
      ...cameraView,
      zoom: clamp(nextZoom, CAMERA_ZOOM_MIN, maxZoomForStage()),
    };
    updateCameraOnly();
  } else if (drag) {
    const deltaX = point.x - drag.originX;
    const deltaY = point.y - drag.originY;
    if (Math.hypot(deltaX, deltaY) > 7) drag.moved = true;
    state.camera.angle = drag.angle + deltaX * 0.006;
    cameraView = {
      ...cameraView,
      elevation: clampCameraElevation(drag.elevation - deltaY * 0.004),
    };
    updateCameraOnly();
  }
});

const finishPointer = (event: PointerEvent): void => {
  if (!pointers.has(event.pointerId)) return;
  const point = stagePoint(event);
  const click = pointers.size === 1 && drag && !drag.moved && performance.now() - drag.started < 550;
  pointers.delete(event.pointerId);
  if (click) {
    const index = runtime.pickPlot(point.x, point.y);
    if (index !== null) commit(actOnPlot(state, index));
  }
  if (pointers.size < 2) pinch = undefined;
  if (!pointers.size) {
    drag = undefined;
    updateCameraOnly();
  }
};

element.stage.addEventListener("pointerup", finishPointer);
element.stage.addEventListener("pointercancel", finishPointer);
element.stage.addEventListener("wheel", (event) => {
  if ((event.target as Element).closest(".render-panel")) return;
  event.preventDefault();
  cameraView = {
    ...cameraView,
    zoom: clamp(
      cameraView.zoom * (event.deltaY > 0 ? 0.93 : 1.07),
      CAMERA_ZOOM_MIN,
      maxZoomForStage(),
    ),
  };
  updateCameraOnly();
}, { passive: false });

const resizeCamera = (): void => {
  runtime.resize();
  reconcileCameraZoom();
};
window.addEventListener("resize", resizeCamera);
if ("ResizeObserver" in window) new ResizeObserver(resizeCamera).observe(element.stage);
window.addEventListener("beforeunload", () => runtime.dispose(), { once: true });

update();
runtime.start();

function loadRenderSettings(): RenderSettings {
  try {
    const parsed = JSON.parse(localStorage.getItem(RENDER_SETTINGS_KEY) ?? "{}") as Partial<RenderSettings>;
    const instances = Number(parsed.instances);
    const maxDpr = Number(parsed.maxDpr);
    return {
      preference: parsed.preference === "canvas" ? "canvas" : "auto",
      instances: isInstanceTier(instances) ? instances : DEFAULT_RENDER_SETTINGS.instances,
      maxDpr: isDprTier(maxDpr) ? maxDpr : DEFAULT_RENDER_SETTINGS.maxDpr,
    };
  } catch {
    return { ...DEFAULT_RENDER_SETTINGS };
  }
}

function saveRenderSettings(settings: RenderSettings): void {
  try {
    localStorage.setItem(RENDER_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Rendering preferences are optional; the game save remains independent.
  }
}

function loadCameraView(fallbackZoom: number): CameraViewState {
  const size = stageSize();
  try {
    const parsed = JSON.parse(localStorage.getItem(CAMERA_VIEW_KEY) ?? "{}") as Partial<CameraViewState>;
    const zoom = Number(parsed.zoom);
    const elevation = Number(parsed.elevation);
    return {
      zoom: clamp(
        Number.isFinite(zoom) ? zoom : fallbackZoom,
        CAMERA_ZOOM_MIN,
        maxCanvasCameraZoom(size.width, size.height),
      ),
      elevation: clampCameraElevation(
        Number.isFinite(elevation) ? elevation : CAMERA_DEFAULT_ELEVATION,
      ),
    };
  } catch {
    return {
      zoom: clamp(fallbackZoom, CAMERA_ZOOM_MIN, maxCanvasCameraZoom(size.width, size.height)),
      elevation: CAMERA_DEFAULT_ELEVATION,
    };
  }
}

function saveCameraView(view: CameraViewState): void {
  try {
    localStorage.setItem(CAMERA_VIEW_KEY, JSON.stringify(view));
  } catch {
    // Camera composition is optional view state and must not affect the game save.
  }
}

function maxZoomForStage(): number {
  const size = stageSize();
  return element.gpuCanvas.classList.contains("is-active")
    ? maxCameraZoom(size.width, size.height)
    : maxCanvasCameraZoom(size.width, size.height);
}

function stageSize(): { width: number; height: number } {
  const rect = element.stage.getBoundingClientRect();
  return {
    width: Math.max(1, rect.width || element.stage.clientWidth || 1),
    height: Math.max(1, rect.height || element.stage.clientHeight || 1),
  };
}

function logItem(iconText: string, titleText: string, bodyText: string): HTMLElement {
  const item = document.createElement("div");
  item.className = "log-item";
  const icon = document.createElement("span");
  icon.className = "log-icon";
  const art = legacyHudArtName(iconText);
  if (art) icon.append(hudArtImage(art));
  else icon.textContent = iconText;
  const content = document.createElement("div");
  const title = document.createElement("b");
  title.textContent = titleText;
  const body = document.createElement("p");
  body.textContent = bodyText;
  content.append(title, body);
  item.append(icon, content);
  return item;
}

function rewardPill(text: string): HTMLElement {
  const pill = document.createElement("span");
  pill.className = "reward-pill";
  const token = text.trim().split(/\s+/)[0] ?? "";
  const art = legacyHudArtName(token);
  if (art) {
    pill.append(hudArtImage(art), document.createTextNode(` ${text.slice(token.length).trim()}`));
  } else {
    pill.textContent = text;
  }
  return pill;
}

function summaryCell(value: number, label: string): HTMLElement {
  const cell = document.createElement("div");
  cell.className = "summary-cell";
  const amount = document.createElement("b");
  amount.textContent = String(value);
  const name = document.createElement("span");
  name.textContent = label;
  cell.append(amount, name);
  return cell;
}

function tableCell(text: string): HTMLTableCellElement {
  const cell = document.createElement("td");
  cell.textContent = text;
  return cell;
}

function stagePoint(event: PointerEvent | WheelEvent): { x: number; y: number } {
  const rect = element.stage.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function isCropId(value: string): value is CropId {
  return value in CROPS;
}

function byId<T extends HTMLElement>(id: string): T {
  const value = document.getElementById(id);
  if (!value) throw new Error(`Missing required element #${id}`);
  return value as T;
}
