# Portrait mobile HUD R1

Status: executing
Base main SHA: 44739d238f02335a04bee44399b1a34821eea545

## Authority
- Current explicit user input is authoritative for this execution route.
- `docs/UI_HUD_PORTRAIT_MOBILE_R1.md` is the baseline where the user has not supplied a more specific current instruction.
- Legacy implementation, compatibility CSS, and older layout assumptions must yield when they conflict with explicit current input; they may be preserved only outside the affected portrait surface.

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
- Completed: portrait DOM adaptation, overlay structure, strict-TypeScript cleanup, legacy `pill-btn` notebook-icon conflict isolation, explicit 44 px top action targets.
- Current step: validate the repaired PR head in repository Verify and inspect portrait interaction behavior.
- Next action: consume the new Verify result, fix any remaining concrete failure, then update PR evidence/readiness.
- Blocker: none.

## Evidence
- Previous Verify run `33769537414`: shader validation passed; 14 test files / 31 tests passed; build failed only on strict indexed-access errors at `src/ui/portrait-mobile.ts` lines 167 and 170.
- Repair commit `c08d6a315428a17058a789ad9e6100e16e1244c2`: removes unsafe indexed calls, prevents legacy `.pill-btn::after` from replacing the explicit notebook icon, and makes the two top interactive controls at least 44 px.
- Pending: repaired-head hosted Verify and portrait browser/touch interaction capture.
