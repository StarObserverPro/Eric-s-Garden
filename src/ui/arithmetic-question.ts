import { CROPS } from "../game/model";
import { cropArt, equation, feedbackArt, numberTile } from "./arithmetic-art";
import type { LearningQuestion } from "./arithmetic-learning";

/** The question and the evidence it needs share one surface, not two overlays. */
export function renderLearningQuestion(container: HTMLElement, question: LearningQuestion, back: () => void): void {
  container.replaceChildren();
  container.dataset.source = question.source;
  const source = node("p", "question-source", question.sourceLabel);
  const title = node("h3", "question-title", question.prompt);
  title.tabIndex = -1;
  const layout = node("div", "question-layout");
  const references = node("div", "question-references");
  references.setAttribute("role", "list");
  references.setAttribute("aria-label", question.sourceLabel);
  for (const {crop, count} of question.references) {
    const item = node("div", "question-reference");
    item.setAttribute("role", "listitem");
    item.dataset.crop = crop;
    item.dataset.count = String(count);
    item.append(cropArt(crop), node("span", "question-crop-name", CROPS[crop][0]), node("b", "question-reference-count", String(count)));
    references.append(item);
  }
  const work = node("div", "question-work");
  const answers = node("div", "answer-row");
  const result = node("div", "answer-result");
  result.setAttribute("role", "status");
  result.setAttribute("aria-live", "polite");
  result.tabIndex = -1;
  let complete = false;
  for (const choice of question.choices) {
    const button = node("button", "answer-btn");
    button.type = "button";
    button.dataset.answer = choice.value;
    if (choice.crop) button.append(cropArt(choice.crop));
    button.append(choice.count === undefined ? document.createTextNode(choice.label) : numberTile(choice.count));
    button.addEventListener("click", () => {
      if (complete) return;
      const correct = question.correct.includes(choice.value);
      result.replaceChildren();
      if (correct) {
        complete = true;
        container.dataset.answered = "true";
        answers.hidden = true;
        const success = node("div", "question-success", "看，这就是刚才的数学！");
        success.prepend(feedbackArt("correct"));
        result.append(success, equation(question.equation), node("p", "question-explanation", question.explanation));
        result.focus({ preventScroll: true });
      } else {
        // No penalty, countdown, red failure screen, or hidden references.
        result.append(feedbackArt("retry"), document.createTextNode("再看看上面的数量，试一次。"));
      }
    });
    answers.append(button);
  }
  work.append(answers, result);
  layout.append(references, work);
  const returnButton = node("button", "question-return", "← 返回完整统计表");
  returnButton.type = "button";
  returnButton.addEventListener("click", back);
  delete container.dataset.answered;
  container.append(source, title, layout, returnButton);
  title.focus({ preventScroll: true });
}
function node<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}
