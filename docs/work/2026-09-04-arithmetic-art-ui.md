# Arithmetic art and learning-flow integration

Status: review candidate — final acceptance and exact-head checks are recorded in [PR #30](https://github.com/StarObserverPro/Eric-s-Garden/pull/30).
Base main SHA: a85627a5c99be39adf84b1045cd2a1ce462e54c8
Dependency: PR #28, head 1a936b282863ac6266ccde0f6536a617b70aaa82. This PR is stacked on `agent/arithmetic-garden-r1`; it does not merge that branch or deploy main.

## Objective
Integrate the supplied Arithmetic Art R1 into the playable UI, preserve the operands and references needed to answer questions, and connect completed interactions to large, readable mathematics.

## Acceptance and evidence owners
| Acceptance | Final diff / evidence |
| --- | --- |
| A1: Actual local art in live UI; no Drive runtime dependency | `arithmetic-art.ts`, `art/arithmetic-r1/`; original/runtime SHA-256 tests, visible SVG geometry plus owned-cell paint bounds; real question, harvest and sharing screenshots |
| A2: Question, required counts and answer controls usable together | `arithmetic-question.ts`, `arithmetic-learning.css`, stats wiring in `main.ts`; wrong/correct/back/reopen, clipping and hit-testing at desktop, narrow touch and landscape reflow |
| A3: True large mathematics after the interaction, references retained, manual continuation | `arithmetic-learning.ts`, completion UI; actual harvested sums, current-column comparisons/addition/subtraction, equal-sharing division and multiplication, >=30px short recaps and >=26px long sums |
| A4: Close/back/reload/next/reset and pointer boundary remain safe | Full five-level mouse/touch browser journey, token conservation, save/reward invariance and existing fresh-pointer guard; no model/schema/renderer changes |

## Scope
- Carrier: central-bed crop orders, harvest review, equal-sharing baskets, optional statistics questions.
- Owners: `src/ui/`, UI wiring in `src/main.ts`, focused tests, the existing read-only Arithmetic Playability workflow, art provenance and experience documentation.
- No model, save-schema, resource/reward, renderer, camera, picking, dependency, merge or deployment changes. No Crystal Garden changes.
- Original art remains in the supplied Drive folder. Runtime derivatives, source copies and provenance are GitHub assets; sandbox workbench/evidence are not another product source.

## Current state / handoff
- Implemented: artwork placement, explicit target/collected question sources, preserved reference workspace, persistent large equations, ordinary-flow completion footer, and bounded SVG positioning.
- Local production build and 32 focused learning/gameplay/HUD tests pass. Local full Node-GPU tests lack an adapter; use the existing Verify workflow with its portable CPU renderer.
- Current step: PR review gate. Keep PR #30 draft until the candidate's Verify and Arithmetic Playability checks pass **and its screenshots are visually reviewed**. PR #30 records the resulting SHA, run/artifact IDs, review outcome and limitations without a self-referential documentation-commit loop.
- Next action after that gate: independent review. Merge/release requires separate user activation; account for the dependency on #28.
- Tooling limitation: sandbox Chromium blocks localhost. Browser evidence runs in GitHub Actions; the temporary source-workbench workflow has been removed.

## Evidence interpretation
Run 33935578645 / candidate 4bf846b completed both five-level action journeys, but its screenshots exposed mispositioned SVG operators/tokens. It is **not** final visual evidence. This candidate fixes the cells and adds viewport-and-painted-bounds assertions; final reviewed evidence is attached to PR #30.

The browser matrix covers mouse 1440x900; emulated touch 390x844 and 320x568; open-question reflow at 320x568, 844x390 and 1024x768. Gameplay journeys use Canvas fallback. Verify separately checks production WebGPU startup/presentation. No physical-device, Safari or full WebGPU five-level certification is claimed.

Experience: `docs/experience/arithmetic-art-learning-flow-r1.md`.
