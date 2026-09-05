# General HUD Art R1 runtime integration

Status: executing
Base main SHA: 1602f7b7a783418f552d23593ef5481c42b69379

## Objective
Replace visible HUD emoji/placeholder symbols with the approved General HUD Art R1 delivery, and switch arithmetic equations from decorated R1 operator tokens to clean R2 operators.

## Acceptance
- A1 — Brand, tools, care status, utilities, gestures, rewards/events and unlock surfaces render project art instead of emoji placeholders while keeping existing labels and hit targets.
- A2 — Weather uses the approved weather symbols and `+ − × ÷ =` use the clean R2 operator tokens with no decorative marks competing with the math glyph.
- A3 — Existing save/game/renderer truth is unchanged; old log emoji values are presentation-mapped at render time rather than migrated.
- A4 — Runtime is self-contained in GitHub with no Drive/network dependency; Drive remains the external art master.

## Non-goals
- No gameplay, save-schema, renderer, crop geometry, layout, hit-target, or deployment change.
- No replacement of semantic close/next controls or inequality glyphs that are not placeholder art.

## Scene carrier and affected owners
- Carrier: DOM HUD / arithmetic overlays only.
- Paths: `src/ui/general-hud-art.*`, `src/ui/art/general-hud-r1/`, `src/ui/arithmetic-art.ts`, focused test/docs.
- Architecture boundary touched: no.

## Current state
- Completed: local integration candidate.
- Current step: publish runtime assets/code to branch.
- Next action: CI + visual review on PR.
- Blocker: none.

## Evidence
- Local: 21 approved assets are 128×128 RGBA WebP; TypeScript adapter/operator integration compiles standalone.
