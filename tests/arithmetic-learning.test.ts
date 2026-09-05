import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { blankState, plant, actOnPlot, MAX_STAGE, basketOrder } from "../src/game/model";
import { gardenQuestion, harvestEquation } from "../src/ui/arithmetic-learning";
import { equationText } from "../src/ui/arithmetic-art";

describe("question / action / visible mathematics use the same quantities", () => {
  test.each([
    [0, "tomato", "4 > 3"], [1, "corn", "3 > 2"],
    [2, "lettuce", "1 + 1 + 1 + 1 = 4"], [3, "2", "3 − 1 = 2"], [4, "6", "3 + 3 = 6"],
  ])("level %i names its column and derives its answer", (level, answer, equation) => {
    const state = blankState(); state.level = Number(level); plant(state);
    const before = JSON.stringify(state);
    const question = gardenQuestion(state);
    expect(question.source).toBe("target");
    expect(question.sourceLabel).toContain("不是已摘");
    expect(question.correct).toContain(answer);
    expect(question.choices.some(choice => question.correct.includes(choice.value))).toBe(true);
    for (const ref of question.references) expect(ref.count).toBe(basketOrder(state).lines.find(line => line.crop === ref.crop)?.target);
    expect(equationText(question.equation)).toBe(equation);
    expect(JSON.stringify(state)).toBe(before);

    // Complete via canonical harvest actions, then the displayed source changes
    // to actual collected counts, not an unrelated lifetime or target column.
    state.round = MAX_STAGE; state.tool = "harvest";
    state.plots.forEach(plot => { if (plot.crop) { plot.stage = MAX_STAGE; plot.pest = false; } });
    state.plots.forEach((_, index) => actOnPlot(state, index));
    const completed = JSON.stringify(state);
    const result = gardenQuestion(state);
    expect(result.source).toBe("collected");
    for (const ref of result.references) expect(ref.count).toBe(state.harvested[ref.crop]);
    expect(equationText(result.equation)).toBe(equation);
    const parts = harvestEquation(state);
    expect(parts.at(-1)).toBe(basketOrder(state).collected);
    expect(JSON.stringify(state)).toBe(completed);
  });

  test("a partial harvest never masquerades as the target or cumulative harvest", () => {
    const state = blankState(); plant(state);
    state.harvested = {carrot: 1}; state.totalHarvest = {carrot: 200, tomato: 100};
    expect(equationText(harvestEquation(state))).toBe("1 + 0 + 0 + 0 = 1");
    expect(gardenQuestion(state).references.find(line => line.crop === "carrot")?.count).toBe(3);
    expect(gardenQuestion(state).source).toBe("target");
  });

  test("shipped division glyph has one bar and two dots; originals are preserved", () => {
    const sprite = readFileSync(new URL("../src/ui/art/arithmetic-r1/runtime.svg", import.meta.url), "utf8");
    const divide = sprite.match(/<symbol id="op-divide"[\s\S]*?<\/symbol>/)?.[0] ?? "";
    expect(divide).toContain('d="M42 73h66"');
    expect(divide.match(/<circle/g)).toHaveLength(2);
    expect(divide).toContain('cy="44"'); expect(divide).toContain('cy="102"');
    expect(divide).not.toContain("M40 61h70M40 86h70");
    const source = readFileSync(new URL("../src/ui/art/arithmetic-r1/source/arithmetic_operator_tokens.svg", import.meta.url), "utf8");
    expect(source).toContain("M40 61h70M40 86h70");
    expect(sprite).not.toMatch(/<script|<foreignObject|https?:\/\/(?!www.w3.org)/);
  });
});
