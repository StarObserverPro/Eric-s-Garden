# Portrait mobile HUD R1

Status: executing
Base main SHA: 44739d238f02335a04bee44399b1a34821eea545

## Objective
Turn the portrait-phone layout into a garden-first overlay HUD that follows `docs/UI_HUD_PORTRAIT_MOBILE_R1.md` without changing game or renderer semantics.

## Acceptance
- A1 — Portrait play uses the garden as the viewport-dominant surface with no page scrolling or stacked permanent cards.
- A2 — The top HUD contains only numeric level, in-bar progress, combined star score, read-aloud, and notebook; weather and developer diagnostics are absent from normal portrait HUD.
- A3 — The bottom dock has three fixed icon-only tool slots plus one bounded primary-action slot and does not reflow with changing counters/text.
- A4 — Goal/history/harvest/support information is consolidated into one notebook sheet whose body scrolls internally; renderer support is normally collapsed and child-readable.
- A5 — Notebook/buttons do not leak gestures into garden rotate/zoom, and opening overlays does not resize the renderer.
- A6 — Existing desktop/tablet-landscape structure and game/render state ownership remain unchanged.

## Non-goals
- Desktop or tablet-landscape redesign.
- Game-state, save-schema, renderer, camera, weather, or crop behavior changes.
- Final icon artwork or final visual art direction.

## Scene carrier and affected owners
- Carrier: garden-wide portrait UI overlay around the existing garden stage.
- Paths: `index.html`, `src/ui/portrait-mobile.ts`, `src/ui/portrait-mobile.css`, this packet.
- Architecture boundary touched: no.

## Current state
- Completed: none.
- Current step: implement the portrait DOM adaptation and responsive overlay system against fresh main.
- Next action: add the portrait UI module/CSS, wire it from `index.html`, then run focused browser and repository checks.
- Blocker: none.

## Evidence
- Pending: portrait browser/touch interaction capture and final-head `npm run check` / hosted Verify.
