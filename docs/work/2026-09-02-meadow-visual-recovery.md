# Meadow grass variation + low-cost AA R1

Status: executing
Base main SHA: 1767b544bef4c105e866a68bb05faa84d84540b4
Branch: `agent/meadow-grass-variation-aa-r1`

## Objective
Tune the already-successful meadow grass after real visual review: add stronger natural variation, slightly more perceived density, and inexpensive edge smoothing without changing the renderer architecture or vegetation performance tiers.

## Acceptance
- A1 — Grass blades show clearly more deterministic dark/light and slight cool/warm variation while preserving existing weather, root occlusion and back-light behavior.
- A2 — Height variation exists at both tuft and individual-leaf level, so neighboring blades do not read as uniform ranks.
- A3 — The meadow reads slightly denser without changing the `500 / 1500 / 4000` instance-tier contract or runtime governor semantics.
- A4 — The final scene blit applies one bounded low-cost edge-aware anti-aliasing filter; no MSAA target, extra render pass or renderer ownership change is introduced.
- A5 — Vegetation geometry tests, WGSL validation and the bounded meadow render evidence remain healthy. Final aesthetic acceptance still comes from representative WebGPU review.

## Non-goals
- No redesign of the existing wind field, flowers, sky, weather or garden layout.
- No instance-tier increase, vgpu upgrade, new compute path or new renderer pass.
- No Canvas gameplay, crop, soil, hardscape, save or UI change.

## Scene carrier and affected owners
- Carrier: existing vegetation edge; dependent presentation owner: final scene blit.
- Paths: `src/render/vgpu/geometry.ts`, `src/render/vgpu/shaders/vegetation.wgsl`, `src/render/vgpu/shaders/blit.wgsl`, `tests/vegetation-geometry.test.ts`.
- Architecture boundary touched: no — one vgpu renderer, one frame owner, one active renderer and the existing three-pass frame remain unchanged.

## Current state
- Completed: implementation prepared on the bounded branch.
- Current step: run exact-head repository verification and inspect meadow evidence.
- Next action: repair only failures attributable to this visual worklet, then leave the PR ready for real WebGPU aesthetic review.
- Blocker: none.

## Evidence target
- Geometry: five grass blades per tuft, with the fifth using only three segments to increase blade geometry by about 14% rather than increasing instance count.
- Color/height: independent deterministic seeds for tuft height, per-leaf height, brightness and hue.
- Anti-aliasing: five scene samples in the existing final blit, blended only across detected high-contrast edges.
