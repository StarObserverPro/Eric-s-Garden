# Arithmetic art and learning-flow integration

Status: executing
Base main SHA: a85627a5c99be39adf84b1045cd2a1ce462e54c8
Dependency: PR #28, head 1a936b282863ac6266ccde0f6536a617b70aaa82; this branch is stacked on agent/arithmetic-garden-r1, not an implicit merge to main.

## Objective
Integrate the supplied Arithmetic Art R1 into the playable UI, keep question operands and reference lists visible, and connect completed interactions to large, readable equations.

## Acceptance
- A1 — Supplied crop, operator, numeral and feedback SVG artwork appears in the real UI with fixed-size accessible containers; no Drive runtime dependency.
- A2 — Question, necessary crop/count list and answer controls remain usable together on desktop and narrow touch screens; irrelevant overlays cannot intercept them.
- A3 — Completed arithmetic interactions show true operation-specific equations in large text, retain the supporting quantities, and let Eric choose when to continue.
- A4 — Close/back/reopen/reload and fresh-pointer boundaries remain safe; no resource, reward, save-schema or renderer changes.

## Non-goals
- No merge/deployment, unrelated rendering work, new game systems, dependency upgrades or edits to Crystal Garden.
- Original art remains in the supplied Drive folder. Runtime derivatives and provenance go to GitHub; sandbox files are temporary workbench/evidence only.

## Scene carrier and affected owners
- Carrier: central-bed crop orders, harvest review, equal-sharing baskets and optional statistics questions.
- Paths: src/ui/, src/main.ts, index.html as necessary, local SVG assets, focused tests, docs/experience/.
- Architecture boundary touched: no.

## Current state
- Completed: source-of-truth and open-PR inspection; Drive art archive fetched.
- Current step: inspect UI/question ownership and establish exact-source browser workbench.
- Next action: integrate assets and repair question/reference/result flow.
- Blocker: sandbox has no GitHub DNS; use the repository-documented read-only Actions artifact roundtrip, then remove temporary source packaging before review.

## Evidence
- Pending focused math, actual desktop/touch journeys, screenshots and final-head integration check.
