# Desktop HUD R1

Status: executing
Base main SHA: 0e7de253d5df1d75c4d1649526c2555540b4959e
Spec branch: `agent/desktop-hud-spec-r1`

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
- A12 — Repository Verify passes; browser evidence must cover 1906×937, 1440×900, and 1280×800 before claiming visual completion.

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

## Current state
- Completed: specification recovery from PR #21; desktop placement adapter; desktop stylesheet; viewport arbitration with portrait; source-level geometry/ownership tests.
- Current step: commit the implementation on PR #21 and consume repository Verify.
- Next action: repair any concrete CI failure, then inspect available browser evidence and update PR readiness honestly.
- Blocker: browser evidence availability may be limited by the hosted Verify viewport matrix; lack of a requested viewport is an evidence gap, not a code-pass claim.

## Experience note
No new repository capability or external execution chain is introduced here. This construction reuses the existing viewport-adapter pattern established by the portrait HUD, so no separate `docs/experience/` entry is warranted unless verification exposes a new reusable failure mode.
