# Arithmetic art and visible-reference learning flow — R1

## Context and ownership

Eric's Garden only. Integration is stacked on arithmetic gameplay PR #28; art documentation PR #29 is independent. Runtime work belongs to `src/ui/` and the UI wiring in `src/main.ts`. The canonical game model, saves, resources, rendering and picking are unchanged.

## What the audit found

The old optional statistics quiz used a static level question and answered only with a short success message. Its necessary counts lived in a larger statistics surface that also contained unrelated lifetime/reward information. Sharing already produced valid mathematics, but its recap was small, and a sticky next-level control could paint above content while scrolling.

The supplied art was delivered as contact sheets, not ready-to-place individual icons. Its division token was visually incorrect: two bars and a decorative dot. Treating either the contact sheets or their filenames as automatically correct would have produced wrong or illegible runtime UI.

## Implemented decisions

1. **Name and freeze the source column.** Before harvest completion, optional questions explicitly use the current level's targets; after completion they use the actual collected crop counts. Lifetime totals never become hidden operands. Questions and equations are derived from that same projection.
2. **Keep evidence with the question.** Relevant crop/count references are copied into the question workspace before unrelated statistics collapse. Desktop uses adjacent references and answers; narrow screens use a compact vertical sequence. Wrong answers retain references. Correct answers replace choices, not evidence, with a persistent large equation/comparison. An explicit back button restores the full statistics table and focus.
3. **Explain the completed action.** Harvest receipts show the actual crop-count sum. Equal sharing reveals separate division and multiplication recaps only after the distribution is genuinely equal; per-basket counts and unit captions accompany them. The actual arrangement remains available above. Equations do not auto-dismiss or gate the next level.
4. **Do not paint over the work.** Only one native modal is owned at a time. Irrelevant toast feedback is suppressed while a dialog is open. The completion footer is ordinary document flow, not sticky. Decoration cannot intercept pointer input. The existing fresh-pointer boundary on completion is retained.

## Reusable art chain

The four original sheets are preserved with SHA-256 provenance under `src/ui/art/arithmetic-r1/source/`. `scripts/prepare-arithmetic-art.py` deterministically extracts local SVG symbols, normalizes their view boxes, repairs only the derived division glyph, and uses the source numeral-card geometry with native text. Runtime code references a single bundled sprite. Original files stay unchanged in Drive and in the repository source copy; no font files or remote artwork fetches are required.

## Verification method and tooling lessons

Use the existing bounded Arithmetic Playability workflow rather than adding a self-writing CI or a new deployment route. Its journeys start with fresh saves, use actual mouse clicks and touchscreen taps, play all five levels, correct deliberately uneven sharing, and test back/reopen/reload/next/reset.

The question extension independently checks the source count values, wrong/correct behavior, preserved references, answer and return target sizes, equation font size, horizontal overflow, ancestor scroll clipping and `elementFromPoint` hit-testing. It also checks that visible SVG references have non-empty geometry. The first browser run caught a test-oracle mistake: after a correct answer, the deliberately hidden answer-choice icons were incorrectly still required to have painted bounds. The check now covers **visible** artwork while retaining all required-reference and layout assertions. Downloaded screenshots confirmed the displayed artwork was present.

A more important defect survived the second automated run: percentage-sized SVGs inside implicit grid tracks painted operators below their equations and crop tokens outside their slots. Screenshot review caught it. Operator and sharing-token cells now explicitly own positioned SVG viewports. Additional assertions check that both the SVG viewport and the painted `use` rectangle fit the cell; a non-empty SVG bounding box or a visible equation wrapper alone is insufficient.

The sandbox browser rejected localhost with `ERR_BLOCKED_BY_ADMINISTRATOR`; no local browser pass is claimed and that policy was not bypassed. GitHub Actions is the browser evidence environment. The repository-documented read-only source artifact roundtrip supplied the exact workbench; its temporary workflow was removed. Artifact source-tree blob hashes matched the local edited files before the test correction.

Local production compilation and the focused learning/gameplay/HUD suite passed. Full local Node-GPU tests lacked a WebGPU adapter; the normal Verify workflow installs the portable CPU renderer and is authoritative for those checks. Full action journeys use Canvas fallback; the independent Verify browser probe covers WebGPU production startup/presentation, not a full WebGPU or physical-device gameplay benchmark.

Final reviewed runs, candidate identifiers and acceptance results belong to `docs/work/2026-09-04-arithmetic-art-ui.md` and PR #30. Do not treat an earlier run or a draft PR as release evidence.
