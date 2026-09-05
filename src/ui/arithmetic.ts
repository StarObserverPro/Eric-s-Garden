import {
  CROPS, MAX_STAGE, basketOrder, sharingProgress, type GameState,
} from "../game/model";
import { countCare, type OrderLine } from "../game/arithmetic";
import "./arithmetic.css";

export type SharingAction =
  | { kind: "start" | "restart" }
  | { kind: "put" | "take"; basket: number };

/** Both HUDs are projections of the same garden; neither stores quantities. */
export function renderOrder(list: HTMLElement, compact: HTMLElement, state: GameState): void {
  const order = basketOrder(state);
  list.setAttribute("aria-label", `今天的菜篮：已有 ${order.collected} 棵，目标 ${order.target} 棵，还差 ${order.remaining} 棵`);
  list.replaceChildren(...order.lines.map(orderChip));

  const care = countCare(state.plots, MAX_STAGE);
  const headline = node("div", "order-hud-head");
  headline.append(node("b", "order-hud-missing", order.complete ? "🧺 这一篮装满啦" : `🧺 还差 ${order.remaining} 棵`));
  const status = !state.planted ? "🌱 先播种"
    : care.pests && (state.tool === "spray" || !care.remaining) ? `🐛 还剩 ${care.pests} 块`
      : care.remaining ? `💧 还需 ${care.remaining} 块`
        : care.total ? "🌿 可以长大啦" : order.complete ? "✓ 收好啦" : "点成熟的菜";
  headline.append(node("span", "order-hud-care", status));
  const crops = node("div", "order-hud-crops");
  for (const line of order.lines) {
    const item = node("div", "order-hud-crop");
    item.dataset.crop = line.crop;
    item.dataset.complete = String(line.remaining === 0);
    item.setAttribute("aria-label", `${CROPS[line.crop][0]}，已有 ${line.collected}，目标 ${line.target}，还差 ${line.remaining}`);
    item.append(node("span", "order-hud-icon", CROPS[line.crop][1]), node("b", "order-hud-count", `${line.collected}/${line.target}`));
    crops.append(item);
  }
  compact.replaceChildren(headline, crops);
}

function orderChip(line: OrderLine): HTMLElement {
  const chip = node("div", "target-chip order-chip");
  chip.dataset.crop = line.crop;
  chip.dataset.complete = String(line.remaining === 0);
  chip.append(node("span", "emoji", CROPS[line.crop][1]), node("b", "order-crop-name", CROPS[line.crop][0]));
  const counts = node("div", "order-counts");
  counts.append(node("span", "order-owned", `已有 ${line.collected}/${line.target}`), node("span", "order-missing", line.remaining ? `还差 ${line.remaining}` : "✓ 满啦"));
  const slots = node("div", "order-slots");
  slots.setAttribute("aria-hidden", "true");
  for (let index = 0; index < line.target; index += 1) {
    const filled = index < line.collected;
    const slot = node("span", "order-slot", filled ? CROPS[line.crop][1] : "");
    slot.dataset.filled = String(filled);
    slots.append(slot);
  }
  chip.append(counts, slots);
  return chip;
}

/** Existing completion surface, not another modal or a care/level gate. */
export function renderArithmeticCompletion(
  container: HTMLElement,
  state: GameState,
  act: (action: SharingAction) => void,
): void {
  const order = basketOrder(state);
  if (!order.complete) { container.replaceChildren(); return; }
  guardCompletionGesture(container);
  const previousFocus = document.activeElement instanceof HTMLButtonElement && container.contains(document.activeElement)
    ? document.activeElement.dataset.focusKey : undefined;
  const content = document.createDocumentFragment();
  const receipt = node("div", "order-receipt");
  for (const line of order.lines) receipt.append(node("span", "order-receipt-item", `${CROPS[line.crop][1]} ${line.collected}`));
  content.append(receipt);
  content.append(node("p", "order-recap", `${order.lines.map((line) => line.collected).join(" + ")} = ${order.target}`));
  content.append(node("p", "order-recap-caption", "这一篮装满啦，还差 0 棵。"));

  const view = sharingProgress(state);
  if (!view.active) {
    const start = actionButton("🧺 试试平均分", "start", () => act({ kind: "start" }));
    start.classList.add("sharing-start");
    content.append(start, node("p", "sharing-optional", "也可以直接去下一关。"));
  } else {
    const section = node("section", "sharing-game");
    section.setAttribute("aria-label", "把收获平均分到篮子里");
    section.append(node("h3", "sharing-title", `分到 ${view.baskets.length} 个篮子，每篮一样多`));

    const pool = node("div", "sharing-pool");
    pool.append(node("b", "sharing-pool-count", `还没分：${view.unassigned.length} 棵`));
    const tokens = node("div", "sharing-pool-tokens");
    tokens.setAttribute("aria-label", "待分的收获");
    for (const token of view.unassigned) tokens.append(cropToken(view.tokens[token]!, token));
    if (!view.unassigned.length) tokens.append(node("span", "sharing-pool-empty", "都在小篮子里啦"));
    pool.append(tokens);
    section.append(pool);

    const baskets = node("div", "sharing-baskets");
    baskets.dataset.baskets = String(view.baskets.length);
    baskets.style.setProperty("--basket-count", String(view.baskets.length));
    view.baskets.forEach((assigned, index) => {
      const basket = node("section", "sharing-basket");
      basket.dataset.basket = String(index);
      basket.dataset.equal = String(view.equal);
      basket.setAttribute("aria-label", `第 ${index + 1} 篮，${assigned.length} 棵`);
      basket.append(node("h4", "sharing-basket-title", `🧺 第 ${index + 1} 篮`));
      basket.append(node("b", "sharing-basket-count", `${assigned.length} 棵`));
      const contents = node("div", "sharing-basket-tokens");
      for (const token of assigned) contents.append(cropToken(view.tokens[token]!, token));
      if (!assigned.length) contents.append(node("span", "sharing-empty", "空篮子"));
      basket.append(contents);
      const put = actionButton("放 1 棵", `put-${index}`, () => act({ kind: "put", basket: index }));
      put.dataset.shareAction = "put";
      put.setAttribute("aria-label", `给第 ${index + 1} 篮放 1 棵`);
      put.disabled = view.unassigned.length === 0;
      const take = actionButton("拿回 1 棵", `take-${index}`, () => act({ kind: "take", basket: index }));
      take.dataset.shareAction = "take";
      take.setAttribute("aria-label", `从第 ${index + 1} 篮拿回 1 棵`);
      take.classList.add("sharing-take");
      take.disabled = assigned.length === 0;
      basket.append(put, take);
      baskets.append(basket);
    });
    section.append(baskets);
    const result = node("div", "sharing-result");
    result.setAttribute("role", "status");
    result.dataset.equal = String(view.equal);
    if (view.equal) {
      result.append(node("b", "sharing-success", `✓ 每篮 ${view.each} 棵，一样多啦！`));
      result.append(node("p", "sharing-equation", `${view.tokens.length} ÷ ${view.baskets.length} = ${view.each}　·　${view.baskets.length} × ${view.each} = ${view.tokens.length}`));
    } else {
      result.textContent = view.unassigned.length ? "点篮子放 1 棵，多放了可以拿回来。" : "每篮还不一样多。拿回 1 棵，再放一放。";
    }
    section.append(result, actionButton("重新分", "restart", () => act({ kind: "restart" })));
    content.append(section);
  }
  container.replaceChildren(content);
  if (previousFocus) {
    const buttons = [...container.querySelectorAll<HTMLButtonElement>("[data-focus-key]")];
    const same = buttons.find((item) => item.dataset.focusKey === previousFocus && !item.disabled);
    const fallbackKey = previousFocus.startsWith("put-") ? previousFocus.replace("put-", "take-") : "put-0";
    const fallback = buttons.find((item) => item.dataset.focusKey === fallbackKey && !item.disabled);
    (same ?? fallback)?.focus({ preventScroll: true });
  }
}

function cropToken(crop: keyof typeof CROPS, token: number): HTMLElement {
  const item = node("span", "sharing-token", CROPS[crop][1]);
  item.dataset.token = String(token);
  item.setAttribute("aria-label", CROPS[crop][0]);
  return item;
}

function actionButton(text: string, key: string, click: () => void): HTMLButtonElement {
  const button = node("button", "sharing-action", text);
  button.type = "button";
  button.dataset.focusKey = key;
  button.addEventListener("click", click);
  return button;
}

function node<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

// Scene actions finish on pointerup. A newly opened dialog must not consume
// the trailing click from that same gesture (especially on touch screens).
const completionPresses = new WeakMap<HTMLDialogElement, { beganInside: boolean }>();
function guardCompletionGesture(container: HTMLElement): void {
  const dialog = container.closest("dialog");
  if (!dialog) return;
  let press = completionPresses.get(dialog);
  if (!press) {
    const boundary = { beganInside: false };
    completionPresses.set(dialog, boundary);
    press = boundary;
    dialog.addEventListener("pointerdown", () => { boundary.beganInside = true; }, { capture: true });
    dialog.addEventListener("click", (event) => {
      // detail=0 includes keyboard and assistive activation, not pointer clicks.
      if (event.detail > 0 && !boundary.beganInside) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, { capture: true });
  }
  if (!dialog.open) press.beganInside = false;
}
