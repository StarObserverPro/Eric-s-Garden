import "./desktop-hud.css";

let mounted = false;
let allowStatsPassthrough = false;
let restoreMoves: Array<() => void> = [];
let createdNodes: HTMLElement[] = [];
let notebook: HTMLElement | undefined;
let notebookButton: HTMLButtonElement | undefined;

const statsButton = requireElement<HTMLButtonElement>("statsBtn");
statsButton.addEventListener("click", interceptNotebookButton, { capture: true });
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && mounted && notebook?.classList.contains("is-desktop-open")) {
    closeNotebook();
  }
});

export function mountDesktopHud(): void {
  if (mounted) return;
  mounted = true;
  document.body.classList.add("desktop-hud-active");

  const app = requireElement<HTMLElement>("app");
  const brandWrap = requireSelector<HTMLElement>(".brand-wrap");
  const brandEyebrow = requireSelector<HTMLElement>(".brand-wrap .eyebrow");
  const mission = requireSelector<HTMLElement>(".mission-card");
  notebook = requireSelector<HTMLElement>(".notebook-card");
  const notebookHeading = requireSelector<HTMLElement>(".notebook-heading", notebook);
  const renderPanel = requireSelector<HTMLDetailsElement>(".render-panel");
  const renderSummarySmall = requireSelector<HTMLElement>(".render-panel summary small", renderPanel);
  const stageCorner = requireSelector<HTMLElement>(".stage-corner-left");
  const toast = requireElement<HTMLElement>("toast");
  const progressRow = requireSelector<HTMLElement>(".mission-progress-row", mission);
  const progressTrack = requireSelector<HTMLElement>(".progress-track", progressRow);
  const levelProgress = requireElement<HTMLElement>("levelProgress");
  const speakButton = requireElement<HTMLButtonElement>("speakBtn");
  const resetButton = requireElement<HTMLButtonElement>("resetBtn");

  const topLeft = create("section", "desktop-top-hud desktop-top-left");
  const topCenter = create("section", "desktop-top-hud desktop-top-center");
  const topRight = create("section", "desktop-top-hud desktop-top-right");
  const feedback = create("div", "desktop-right-feedback");
  const bottomRight = create("section", "desktop-bottom-right");

  topLeft.setAttribute("aria-label", "菜园标题");
  topCenter.setAttribute("aria-label", "关卡状态");
  topRight.setAttribute("aria-label", "全局工具");
  feedback.setAttribute("aria-label", "即时提示");
  bottomRight.setAttribute("aria-label", "视角和画面帮助");

  app.append(topLeft, topCenter, topRight, feedback, bottomRight);
  createdNodes.push(topLeft, topCenter, topRight, feedback, bottomRight);

  brandEyebrow.dataset.desktopOriginalText = brandEyebrow.textContent ?? "";
  brandEyebrow.textContent = "ERIC'S SECRET GARDEN";
  move(brandWrap, topLeft);

  progressTrack.dataset.desktopOriginalAriaHidden = progressTrack.getAttribute("aria-hidden") ?? "";
  progressTrack.removeAttribute("aria-hidden");
  move(levelProgress, progressTrack);
  move(requireElement("levelBadge"), topCenter);
  move(progressRow, topCenter);
  move(requireElement("weatherBadge"), topCenter);
  move(requireElement("starCount"), topCenter);

  statsButton.dataset.desktopOriginalText = statsButton.textContent ?? "";
  statsButton.textContent = "📓 小本本";
  statsButton.setAttribute("aria-label", "打开菜园小本本");
  statsButton.setAttribute("title", "菜园小本本");
  statsButton.setAttribute("aria-expanded", "false");
  notebookButton = statsButton;

  move(speakButton, topRight);
  move(statsButton, topRight);
  move(resetButton, topRight);

  notebook.id = "desktopNotebook";
  notebook.setAttribute("aria-hidden", "true");

  const closeButton = create("button", "desktop-notebook-close") as HTMLButtonElement;
  closeButton.type = "button";
  closeButton.textContent = "×";
  closeButton.setAttribute("aria-label", "关闭菜园小本本");
  closeButton.addEventListener("click", closeNotebook);
  notebookHeading.append(closeButton);
  createdNodes.push(closeButton);

  const notebookActions = create("div", "desktop-notebook-actions");
  const statsInside = create("button", "desktop-notebook-stats") as HTMLButtonElement;
  statsInside.type = "button";
  statsInside.textContent = "📊 看我的收菜统计";
  statsInside.addEventListener("click", openStatsFromNotebook);
  notebookActions.append(statsInside);
  notebook.append(notebookActions);
  createdNodes.push(notebookActions, statsInside);

  renderSummarySmall.dataset.desktopOriginalText = renderSummarySmall.textContent ?? "";
  renderSummarySmall.textContent = "画面与帮助";
  renderPanel.open = false;

  const cornerLabels = [...stageCorner.querySelectorAll<HTMLElement>("span")];
  const rotateLabel = cornerLabels[0];
  const zoomLabel = cornerLabels[1];
  if (rotateLabel) {
    rotateLabel.dataset.desktopOriginalText = rotateLabel.textContent ?? "";
    rotateLabel.textContent = "↔ 拖动旋转";
  }
  if (zoomLabel) {
    zoomLabel.dataset.desktopOriginalText = zoomLabel.textContent ?? "";
    zoomLabel.textContent = "滚轮缩放";
  }

  move(renderPanel, bottomRight);
  move(stageCorner, bottomRight);
  // Keep the order defined by the construction spec: interaction help first,
  // renderer/support second. Moving both nodes preserves their existing state.
  bottomRight.prepend(stageCorner);
  move(toast, feedback);
}

export function unmountDesktopHud(): void {
  if (!mounted) return;
  mounted = false;
  closeNotebook();

  const brandEyebrow = document.querySelector<HTMLElement>(".brand-wrap .eyebrow");
  const progressTrack = document.querySelector<HTMLElement>(".progress-track");
  const renderSummarySmall = document.querySelector<HTMLElement>(".render-panel summary small");
  const stageCorner = document.querySelector<HTMLElement>(".stage-corner-left");

  for (const restore of [...restoreMoves].reverse()) restore();
  restoreMoves = [];

  for (const node of [...createdNodes].reverse()) node.remove();
  createdNodes = [];

  restoreDatasetText(brandEyebrow);
  restoreDatasetText(renderSummarySmall);
  stageCorner?.querySelectorAll<HTMLElement>("span").forEach(restoreDatasetText);

  if (progressTrack) {
    const original = progressTrack.dataset.desktopOriginalAriaHidden;
    if (original === undefined) {
      // Nothing to restore.
    } else if (original) {
      progressTrack.setAttribute("aria-hidden", original);
    } else {
      progressTrack.removeAttribute("aria-hidden");
    }
    delete progressTrack.dataset.desktopOriginalAriaHidden;
  }

  const originalStatsText = statsButton.dataset.desktopOriginalText;
  statsButton.textContent = originalStatsText ?? "📊 统计表";
  delete statsButton.dataset.desktopOriginalText;
  statsButton.removeAttribute("title");
  statsButton.removeAttribute("aria-expanded");
  statsButton.setAttribute("aria-label", "统计表");

  if (notebook) {
    notebook.classList.remove("is-desktop-open");
    notebook.removeAttribute("aria-hidden");
    notebook.removeAttribute("id");
  }

  notebook = undefined;
  notebookButton = undefined;
  document.body.classList.remove("desktop-hud-active");
}

function interceptNotebookButton(event: MouseEvent): void {
  if (!mounted || allowStatsPassthrough) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (notebook?.classList.contains("is-desktop-open")) closeNotebook();
  else openNotebook();
}

function openNotebook(): void {
  if (!notebook) return;
  notebook.classList.add("is-desktop-open");
  notebook.setAttribute("aria-hidden", "false");
  notebookButton?.setAttribute("aria-expanded", "true");
  notebook.scrollTop = 0;
}

function closeNotebook(): void {
  notebook?.classList.remove("is-desktop-open");
  notebook?.setAttribute("aria-hidden", "true");
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

function restoreDatasetText(node: HTMLElement | undefined | null): void {
  if (!node) return;
  const original = node.dataset.desktopOriginalText;
  if (original === undefined) return;
  node.textContent = original;
  delete node.dataset.desktopOriginalText;
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
