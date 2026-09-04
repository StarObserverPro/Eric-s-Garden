# Desktop HUD R1

Status: executing
Base main SHA: 36afd4614afdbf22b997bb1916de308b9e046030
Spec: `docs/UI_HUD_DESKTOP_R1.md`
Implementation PR: #22

## Authority
- Current explicit user instruction activates construction against `docs/UI_HUD_DESKTOP_R1.md`.
- The desktop HUD specification is authoritative for desktop / wide landscape geometry and information ownership.
- Portrait phone remains governed by `docs/UI_HUD_PORTRAIT_MOBILE_R1.md`; this route may only touch portrait code where needed to arbitrate viewport adapters safely.

## Objective
Replace the permanent three-column desktop page layout with a garden-first HUD overlay while preserving one shared game/UI state source and all renderer/save semantics.

## Acceptance
- A1 — Desktop garden fills the interaction viewport and is not squeezed by permanent left/right layout columns.
- A2 — Top HUD has exactly three equal-height outer containers: left brand, centered status, right utilities.
- A3 — Left brand/mission share both outer edges; right utilities/feedback/bottom utility stack share their right anchor and width budget.
- A4 — Level, in-track progress, weather, and stars live only in the centered status container; mission keeps task/targets/care state.
- A5 — Target grid and three-state row consume mission content width exactly with the shared 12 px sibling gap.
- A6 — Former notebook/event sidebar becomes an overlay drawer; opening it does not change renderer geometry or page scroll.
- A7 — Immediate feedback uses the right feedback anchor; there is no permanent event-log column.
- A8 — Center action dock is content-derived. At the wide reference it is 932 px = 16 + 150 + 12 + 150 + 12 + 150 + 12 + 414 + 16.
- A9 — Rotation/zoom help and `画面与帮助` form the right 39 + 12 + 39 = 90 px stack aligned vertically with the center dock.
- A10 — Normal desktop UI exposes no raw renderer metrics until the collapsed support surface is opened.
- A11 — Desktop and portrait adapters are mutually exclusive and restore the same original DOM when leaving their viewport regime.
- A12 — Repository Verify passes; browser evidence covers 1906×937, 1440×900, and 1280×800 without page overflow or HUD-region overlap.

## Non-goals
- Renderer architecture or performance changes.
- Camera behavior changes.
- Soil, crop, grass, sky, hardscape, or wilderness visual work.
- Game-state or save-schema changes.
- Portrait redesign or tablet-landscape redesign.
- A new general-purpose UI framework.

## Implementation seam
- `src/ui/desktop-hud.ts` owns desktop DOM placement and notebook/support behavior only.
- `src/ui/desktop-hud.css` owns desktop-only glass surfaces and geometry.
- `src/ui/portrait-mobile.ts` remains the entry adapter and arbitrates portrait vs. wide desktop before `main.ts` loads.
- Existing IDs and event owners stay intact; state-bearing DOM nodes are moved, never cloned.
- `styles.css`, renderer modules, game model, and save contracts remain untouched.

## Responsive geometry
- 1280-class desktop: 300 / 520 / 260 side-center-side budgets and a 680 px center dock to prevent overlap.
- 1440-class desktop: 320 / 552 / 272 budgets and an 820 px center dock.
- 1700+ desktop: exact R1 reference budgets 344 / 596 / 292 and the 932 px center dock.
- Desktop activation begins at 1240 px landscape; narrower non-portrait layouts fall back to the existing non-desktop structure rather than overlapping HUD islands.

## Verification seam
- Source contract test: `tests/desktop-hud-source.test.ts` checks adapter arbitration, one-state DOM moves, and exact wide-reference CSS arithmetic.
- Browser matrix helper: `tests/desktop-hud-browser-evidence.js` is injected only into a temporary copied production HTML page during Verify; it is not part of the runtime product entry.
- Verify keeps the ordinary single Canvas fallback capture for unrelated PRs. When desktop-HUD-owned paths change it instead captures and checks 1906×937, 1440×900, and 1280×800 at DPR 1.
- Reusable evidence pattern is recorded in `docs/experience/desktop-hud-browser-matrix.md`.

## Current state
- Completed: specification merge; desktop placement adapter; desktop stylesheet; viewport arbitration with portrait; source-level geometry/ownership tests.
- Completed evidence: Verify run #118 on head `982b9fd4e1b54f6d56bb23f5ef047a42daf508d0` passed all shader/model/mock/Node/build checks and the existing 1440×1100 Canvas browser capture.
- Visual inspection of that hosted screenshot confirms the renderer is viewport-dominant and the new top/left/bottom/right HUD regions are in the intended overlay topology. The CI Linux image lacks Chinese glyph fonts, so Chinese text appears as tofu boxes there; geometry remains inspectable.
- Sandbox follow-up: the local managed Chromium policy blocks localhost/file navigation, so sandbox-only viewport captures cannot be used as acceptance evidence.
- Current step: move the three contractual viewport captures and deterministic no-overlap/no-scroll assertions into repository Verify and consume the resulting PR run.
- Blocker: none.
