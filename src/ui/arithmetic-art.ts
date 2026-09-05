import type { CropId } from "../game/model";

const spriteUrl = new URL("./art/arithmetic-r1/runtime.svg", import.meta.url).href;
const NS = "http://www.w3.org/2000/svg";
export type FeedbackArt = "correct" | "retry" | "water" | "star" | "seed" | "basket";
export type MathPart = number | "+" | "−" | "×" | "÷" | "=" | ">" | "<";
const operators: Partial<Record<MathPart, string>> = {
  "+": "plus", "−": "minus", "×": "multiply", "÷": "divide", "=": "equals",
};

/** Trusted local symbols only. Decorations never own pointer/focus targets. */
function symbol(id: string): SVGSVGElement {
  const svg = document.createElementNS(NS, "svg");
  svg.classList.add("arithmetic-art");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  const use = document.createElementNS(NS, "use");
  use.setAttribute("href", `${spriteUrl}#${id}`);
  svg.append(use);
  svg.dataset.art = id;
  return svg;
}
export function cropArt(crop: CropId): SVGSVGElement { return symbol(`crop-${crop}`); }
export function feedbackArt(name: FeedbackArt): SVGSVGElement { return symbol(`feedback-${name}`); }

export function numberTile(value: number): HTMLElement {
  const number = document.createElement("span");
  number.className = "math-number";
  for (const digit of String(value)) {
    const tile = document.createElement("span");
    tile.className = "math-digit";
    tile.append(symbol("number-tile"));
    const text = document.createElement("span");
    text.textContent = digit;
    tile.append(text);
    number.append(tile);
  }
  return number;
}

export function equationText(parts: readonly MathPart[]): string { return parts.join(" "); }
export function equation(parts: readonly MathPart[], className = ""): HTMLElement {
  const row = document.createElement("div");
  row.className = `math-equation ${parts.length > 7 ? "math-equation-long" : ""} ${className}`;
  row.setAttribute("role", "img");
  row.setAttribute("aria-label", equationText(parts));
  row.dataset.equation = equationText(parts);
  // Each following operator stays with its operand when a long sum wraps.
  let pair = document.createElement("span");
  pair.className = "math-pair";
  parts.forEach((part, index) => {
    if (typeof part !== "number") {
      if (pair.childNodes.length) row.append(pair);
      pair = document.createElement("span");
      pair.className = "math-pair";
      const operator = document.createElement("span");
      operator.className = "math-operator";
      const art = operators[part];
      if (art) {
        operator.append(symbol(`op-${art}`));
        const text = document.createElement("span");
        text.className = "math-readable-symbol";
        text.textContent = part;
        operator.append(text);
      } else operator.textContent = part;
      pair.append(operator);
    } else pair.append(numberTile(part));
    if (index < parts.length - 1) pair.append(document.createTextNode(" "));
  });
  if (pair.childNodes.length) row.append(pair);
  return row;
}
