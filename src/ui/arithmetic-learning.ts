import { basketOrder, CROPS, type CropId, type GameState } from "../game/model";
import type { MathPart } from "./arithmetic-art";

export interface ReferenceCount { crop: CropId; count: number }
export interface LearningChoice { value: string; label: string; crop?: CropId; count?: number }
export interface LearningQuestion {
  source: "target" | "collected";
  sourceLabel: string;
  prompt: string;
  references: ReferenceCount[];
  choices: LearningChoice[];
  correct: string[];
  equation: MathPart[];
  explanation: string;
}

/** Freeze ONE explicitly named column for the whole question. Never ask about
 * future targets while presenting zero harvested counts as the reference. */
export function gardenQuestion(state: GameState): LearningQuestion {
  const order = basketOrder(state);
  const source: LearningQuestion["source"] = order.complete ? "collected" : "target";
  const counts = order.lines.map(line => ({ crop: line.crop, count: source === "collected" ? line.collected : line.target }));
  const get = (crop: CropId): number => counts.find(line => line.crop === crop)?.count ?? 0;
  const chooseCrops = (crops: CropId[]): LearningChoice[] => crops.map(crop => ({ value: crop, label: CROPS[crop][0], crop }));
  const reference = (crops: CropId[]) => counts.filter(line => crops.includes(line.crop));
  const numericChoices = (answer: number): LearningChoice[] =>
    [...new Set([Math.max(0, answer - 1), answer, answer + 1, answer + 2])].slice(0, 3)
      .map(count => ({ value: String(count), label: String(count), count }));
  const base = { source, sourceLabel: source === "collected" ? "看这一篮收获 · 单位：棵" : "看本关目标 · 不是已摘数量" };

  switch (state.level) {
    case 0: {
      const sorted = [...counts].sort((a,b) => b.count - a.count);
      const first = sorted[0]!;
      const next = sorted[1]!;
      return { ...base, prompt: "哪种菜最多？", references: counts,
        choices: chooseCrops(sorted.slice(0, 3).map(line => line.crop)),
        correct: sorted.filter(line => line.count === first.count).map(line => line.crop),
        equation: [first.count, first.count === next.count ? "=" : ">", next.count],
        explanation: first.count === next.count ? "它们一样多，都是最多的。" : `${CROPS[first.crop][0]} ${first.count} 棵，比第二多的${CROPS[next.crop][0]} ${next.count} 棵还多。` };
    }
    case 1: {
      const a = get("corn"), b = get("carrot");
      return { ...base, prompt: "玉米和胡萝卜，哪种更多？", references: reference(["corn", "carrot"]),
        choices: [...chooseCrops(["corn", "carrot"]), { value: "same", label: "一样多" }],
        correct: [a === b ? "same" : a > b ? "corn" : "carrot"],
        equation: [a, a === b ? "=" : a > b ? ">" : "<", b],
        explanation: `玉米 ${a} 棵，胡萝卜 ${b} 棵。${a === b ? "一样多。" : `${a > b ? "玉米" : "胡萝卜"}更多。`}` };
    }
    case 2: {
      const amount = get("lettuce");
      const parts: MathPart[] = [];
      for (let i = 0; i < amount; i += 1) { if (i) parts.push("+"); parts.push(1); }
      if (!parts.length) parts.push(0);
      parts.push("=", amount);
      const correct = counts.filter(line => line.count === amount).map(line => line.crop);
      return { ...base, prompt: `哪种菜有 ${amount} 棵？`, references: counts,
        choices: chooseCrops(["lettuce", "tomato", "corn"]), correct,
        equation: parts, explanation: `一棵一棵数，一共 ${amount} 棵。` };
    }
    case 3: {
      const a = get("tomato"), b = get("pumpkin"), difference = Math.abs(a-b);
      return { ...base, prompt: `${a >= b ? "番茄比南瓜" : "南瓜比番茄"}多几棵？`, references: reference(["tomato", "pumpkin"]),
        choices: numericChoices(difference), correct: [String(difference)],
        equation: [Math.max(a,b), "−", Math.min(a,b), "=", difference],
        explanation: `多的减去少的，相差 ${difference} 棵。` };
    }
    default: {
      const a = get("strawberry"), b = get("lettuce"), sum = a+b;
      return { ...base, prompt: "草莓和生菜合起来有几棵？", references: reference(["strawberry", "lettuce"]),
        choices: numericChoices(sum), correct: [String(sum)], equation: [a, "+", b, "=", sum],
        explanation: `${a} 棵草莓，加上 ${b} 棵生菜，一共 ${sum} 棵。` };
    }
  }
}

/** Actual harvest, not the prefilled order total. */
export function harvestEquation(state: GameState): MathPart[] {
  const counts = basketOrder(state).lines.map(line => line.collected);
  const parts: MathPart[] = [];
  counts.forEach((count, index) => { if (index) parts.push("+"); parts.push(count); });
  if (!parts.length) parts.push(0);
  parts.push("=", counts.reduce((a,b) => a+b, 0));
  return parts;
}
