import "./portrait-mobile.css";

const portraitPhone = window.matchMedia("(max-width: 760px) and (orientation: portrait)");

let mounted = false;
let allowStatsPassthrough = false;
let restoreMoves: Array<() => void> = [];
let createdNodes: HTMLElement[] = [];
let badgeObserver: MutationObserver | undefined;
let rendererObserver: MutationObserver | undefined;
let notebook: HTMLElement | undefined;
let notebookButton: HTMLButtonElement | undefined;

const statsButton = requireElement<HTMLButtonElement>("statsBtn");
const speakButton = requireElement<HTMLButtonElement>("speakBtn");
statsButton.addEventListener("click", interceptNotebookButton, { capture: true });
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && mounted && notebook?.classList.contains("is-portrait-open")) {
    closeNotebook();
  }
});

portraitPhone.addEventListener("change", applyPortraitMode);
applyPortraitMode();

// Load the existing application only after the portrait adapter has had a chance
// to move the original DOM nodes. main.ts keeps the single source of UI/game state.
void import("../main");

function applyPortraitMode(): void {
  if (portraitPhone.matches) mountPortraitHud();
  else unmountPortraitHud();
}

function mountPortraitHud(): void {
  if (mounted) return;
  mounted = true;
  document.body.classList.add("portrait-hud-active");

  const app = requireElement<HTMLElement>("app");
  const mission = requireSelector<HTMLElement>(".mission-card");
  notebook = requireSelector<HTMLElement>(".notebook-card");
  const notebookHeading = requireSelector<HTMLElement>(".notebook-heading", notebook);
  const renderPanel = requireSelector<HTMLDetailsElement>(".render-panel");
  const renderBody = requireSelector<HTMLElement>(".render-panel-body", renderPanel);
  const retryRenderer = requireElement<HTMLButtonElement>("retryRendererBtn");

  const topHud = create("div", "portrait-top-hud");
  topHud.setAttribute("aria-label", "菜园状态");
  // Current explicit HUD requirements own the portrait interaction surface.
  // Legacy mobile button widths may be narrower, so make the two real controls
  // explicit 44 px targets here instead of letting old compatibility CSS win.
  topHud.style.height = "56px";
  topHud.style.gridTemplateColumns = "38px minmax(58px, 1fr) 64px 44px 44px";
  app.append(topHud);
  createdNodes.push(topHud);

  move(requireElement("levelBadge"), topHud);
  move(requireSelector(".mission-progress-row", mission), topHud);
  move(requireElement("starCount"), topHud);
  move(speakButton, topHud);
  move(statsButton, topHud);

  rememberInlineStyle(speakButton);
  speakButton.style.width = "44px";
  speakButton.style.minWidth = "44px";
  speakButton.style.height = "44px";
  speakButton.style.minHeight = "44px";

  // The old mobile .pill-btn rule paints a hard-coded 📊 pseudo-element.
  // Remove that legacy class while portrait HUD owns this button so the user's
  // explicit notebook icon is rendered literally, then restore the class later.
  statsButton.dataset.portraitOriginalClass = statsButton.className;
  statsButton.classList.remove("pill-btn");
  statsButton.classList.add("icon-btn");
  rememberInlineStyle(statsButton);
  statsButton.style.width = "44px";
  statsButton.style.minWidth = "44px";
  statsButton.style.height = "44px";
  statsButton.style.minHeight = "44px";

  notebookButton = statsButton;
  notebookButton.textContent = "📓";
  notebookButton.setAttribute("aria-label", "打开菜园小本本");
  notebookButton.setAttribute("title", "菜园小本本");
  notebookButton.setAttribute("aria-expanded", "false");

  document.querySelectorAll<HTMLButtonElement>(".tool-btn").forEach((button) => {
    const label = button.querySelector("b")?.textContent?.trim();
    if (label) button.setAttribute("aria-label", label);
  });

  const closeButton = create("button", "portrait-notebook-close") as HTMLButtonElement;
  closeButton.type = "button";
  closeButton.textContent = "×";
  closeButton.setAttribute("aria-label", "关闭菜园小本本");
  closeButton.style.minWidth = "44px";
  closeButton.style.minHeight = "44px";
  closeButton.addEventListener("click", closeNotebook);
  notebookHeading.append(closeButton);
  createdNodes.push(closeButton);

  const body = create("div", "portrait-notebook-body");
  notebook.append(body);
  createdNodes.push(body);

  const goalSection = section("portrait-notebook-goal", "今天的目标");
  body.append(goalSection);
  createdNodes.push(goalSection);
  move(requireSelector(".mission-label", mission), goalSection);
  move(requireElement("missionTitle"), goalSection);
  move(requireElement("missionHint"), goalSection);
  move(requireElement("targetList"), goalSection);
  move(requireSelector(".status-strip", mission), goalSection);

  const historySection = section("portrait-notebook-history", "最近发生");
  body.append(historySection);
  createdNodes.push(historySection);
  move(requireElement("eventLog"), historySection);

  const unlockSection = section("portrait-notebook-unlock", "接下来");
  body.append(unlockSection);
  createdNodes.push(unlockSection);
  move(requireSelector(".unlock-box", notebook), unlockSection);

  const actionsSection = section("portrait-notebook-actions-wrap", "收菜记录");
  const actions = create("div", "portrait-notebook-actions");
  const statsInside = create("button", "portrait-notebook-stats") as HTMLButtonElement;
  statsInside.type = "button";
  statsInside.textContent = "📊 看我的收菜统计";
  statsInside.addEventListener("click", openStatsFromNotebook);
  actions.append(statsInside);
  move(requireElement("resetBtn"), actions);
  actionsSection.append(actions);
  body.append(actionsSection);
  createdNodes.push(actionsSection, actions, statsInside);

  const supportSection = section("portrait-notebook-support", "需要帮助？");
  body.append(supportSection);
  createdNodes.push(supportSection);
  move(renderPanel, supportSection);
  renderPanel.open = false;

  const supportStatus = create("p", "portrait-support-status");
  const supportActions = create("div", "portrait-support-actions");
  const compatibleButton = create("button") as HTMLButtonElement;
  const autoButton = create("button") as HTMLButtonElement;
  compatibleButton.type = "button";
  autoButton.type = "button";
  compatibleButton.textContent = "换成兼容画面";
  autoButton.textContent = "试试更好的画面";
  compatibleButton.addEventListener("click", () => selectRenderer("canvas"));
  autoButton.addEventListener("click", () => selectRenderer("auto"));
  supportActions.append(compatibleButton, autoButton);
  renderBody.prepend(supportStatus, supportActions);
  createdNodes.push(supportStatus, supportActions, compatibleButton, autoButton);

  retryRenderer.textContent = "再试一次";
  retryRenderer.dataset.portraitOriginalText = "重新检查 WebGPU";

  badgeObserver = new MutationObserver(normalizeLevelBadge);
  badgeObserver.observe(requireElement("levelBadge"), { childList: true, characterData: true, subtree: true });
  normalizeLevelBadge();

  const indicator = requireElement("rendererIndicator");
  const refreshSupportStatus = (): void => {
    const status = indicator.getAttribute("data-status");
    supportStatus.textContent = status === "ready"
      ? "画面正常"
      : status === "fallback"
        ? "正在用兼容画面"
        : status === "failed"
          ? "需要帮助"
          : "正在准备画面";
  };
  rendererObserver = new MutationObserver(refreshSupportStatus);
  rendererObserver.observe(indicator, { attributes: true, attributeFilter: ["data-status"] });
  refreshSupportStatus();
}

function unmountPortraitHud(): void {
  if (!mounted) return;
  mounted = false;
  closeNotebook();
  badgeObserver?.disconnect();
  badgeObserver = undefined;
  rendererObserver?.disconnect();
  rendererObserver = undefined;

  const badge = document.getElementById("levelBadge");
  const level = badge?.textContent?.match(/\d+/)?.[0];

  for (const restore of [...restoreMoves].reverse()) restore();
  restoreMoves = [];

  for (const node of [...createdNodes].reverse()) node.remove();
  createdNodes = [];

  if (badge && level) badge.textContent = `第 ${level} 关`;
  statsButton.textContent = "📊 统计表";
  statsButton.setAttribute("aria-label", "统计表");
  statsButton.removeAttribute("aria-expanded");
  statsButton.removeAttribute("title");
  restoreInlineStyle(statsButton);
  restoreInlineStyle(speakButton);
  if (statsButton.dataset.portraitOriginalClass !== undefined) {
    statsButton.className = statsButton.dataset.portraitOriginalClass;
    delete statsButton.dataset.portraitOriginalClass;
  }

  const retryRenderer = document.getElementById("retryRendererBtn");
  if (retryRenderer instanceof HTMLButtonElement) {
    retryRenderer.textContent = retryRenderer.dataset.portraitOriginalText ?? "重新检查 WebGPU";
    delete retryRenderer.dataset.portraitOriginalText;
  }

  notebook = undefined;
  notebookButton = undefined;
  document.body.classList.remove("portrait-hud-active");
}

function interceptNotebookButton(event: MouseEvent): void {
  if (!mounted || allowStatsPassthrough) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (notebook?.classList.contains("is-portrait-open")) closeNotebook();
  else openNotebook();
}

function openNotebook(): void {
  if (!notebook) return;
  notebook.classList.add("is-portrait-open");
  notebookButton?.setAttribute("aria-expanded", "true");
  const body = notebook.querySelector<HTMLElement>(".portrait-notebook-body");
  if (body) body.scrollTop = 0;
}

function closeNotebook(): void {
  notebook?.classList.remove("is-portrait-open");
  notebookButton?.setAttribute("aria-expanded", "false");
}

function openStatsFromNotebook(): void {
  closeNotebook();
  allowStatsPassthrough = true;
  try {
    statsButton.click();
  } finally {
    allowStatsPassthrough = false;
  }
}

function selectRenderer(value: "auto" | "canvas"): void {
  const preference = requireElement<HTMLSelectElement>("rendererPreference");
  preference.value = value;
  preference.dispatchEvent(new Event("change", { bubbles: true }));
}

function normalizeLevelBadge(): void {
  const badge = document.getElementById("levelBadge");
  if (!badge || !mounted) return;
  const numeric = badge.textContent?.match(/\d+/)?.[0];
  if (numeric && badge.textContent !== numeric) badge.textContent = numeric;
}

function move(node: HTMLElement, destination: HTMLElement): void {
  const parent = node.parentNode;
  if (!parent) throw new Error(`Cannot move detached node ${node.id || node.className}`);
  const next = node.nextSibling;
  restoreMoves.push(() => {
    if (next && next.parentNode === parent) parent.insertBefore(node, next);
    else parent.appendChild(node);
  });
  destination.append(node);
}

function rememberInlineStyle(node: HTMLElement): void {
  node.dataset.portraitOriginalStyle = node.getAttribute("style") ?? "";
}

function restoreInlineStyle(node: HTMLElement): void {
  const original = node.dataset.portraitOriginalStyle;
  if (original === undefined) return;
  if (original) node.setAttribute("style", original);
  else node.removeAttribute("style");
  delete node.dataset.portraitOriginalStyle;
}

function section(extraClass: string, label: string): HTMLElement {
  const wrapper = create("section", `portrait-notebook-section ${extraClass}`);
  const kicker = create("p", "portrait-notebook-kicker");
  kicker.textContent = label;
  wrapper.append(kicker);
  return wrapper;
}

function create<K extends keyof HTMLElementTagNameMap>(tag: K, className = ""): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function requireElement<T extends HTMLElement = HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!(node instanceof HTMLElement)) throw new Error(`Missing #${id}`);
  return node as T;
}

function requireSelector<T extends HTMLElement = HTMLElement>(selector: string, root: ParentNode = document): T {
  const node = root.querySelector(selector);
  if (!(node instanceof HTMLElement)) throw new Error(`Missing ${selector}`);
  return node as T;
}
