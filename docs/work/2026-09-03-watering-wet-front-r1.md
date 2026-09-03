# Watering wet-front R1

Status: executing
Base main SHA: `3b108c3a85da6dfa013736e4b66b846dc0cd0ac4`

## Objective
Make watering read as a short physical action: a small long-spout can arrives at the target bed and the soil wets unevenly before the whole bed is saturated.

## Acceptance
- A1 — A newly watered bed takes between 1 and 3 seconds to become visually fully wet; the implemented deterministic range is 1.45–2.55 seconds across the twelve beds.
- A2 — Wetting starts as one or more irregular local patches with a noisy boundary and expands/merges across the cultivated surface; the whole bed must not switch color in one frame.
- A3 — A procedural small watering can, proportionally based on Crystal Garden's `long-spout-can` silhouette, appears at the newly watered bed, tips toward it, shows a narrow pour, then leaves.
- A4 — `plot.watered` remains the only gameplay/save truth. Wet-front progress, can motion and pour visibility remain renderer-local visual state and are never persisted.
- A5 — Existing soil material, crop state/growth, input semantics, Canvas playability, renderer ownership and fallback behavior remain intact.
- A6 — Focused timing/model tests, WGSL validation, vgpu mock rendering and the repository Verify workflow pass on the final head.

## Non-goals
- Puddles, standing water, runoff, erosion or drying simulation.
- A compute/ping-pong moisture texture unless the analytic field proves visibly insufficient.
- Tool inventory/equipment gameplay or importing Crystal Garden's Three.js scene graph.
- Redesigning soil geometry, crops, grass, hardscape, sky or HUD.

## Scene carrier and affected owners
- Carrier: central beds
- Paths: `src/render/vgpu/vgpu-renderer.ts`, `src/render/vgpu/shaders/soil.wgsl`, `src/render/vgpu/shaders/garden.wgsl`, `src/render/vgpu/wetting-visual.ts`, `src/render/vgpu/watering-can-geometry.ts`, focused tests and `docs/experience/watering-wet-front-r1.md`
- Architecture boundary touched: no; the existing vgpu renderer remains the single WebGPU scene/frame owner

## Current state
- Completed: none
- Current step: implement renderer-local wet progress, analytic wet front and procedural can draw
- Next action: run focused checks and hosted Verify, then review exact-head evidence
- Blocker: none

## Evidence
- Crystal Garden reference inspected: `app/crystal-garden/scene/equipment/visuals.ts` `makeWateringCan()` / `long-spout-can` proportions; reimplemented locally without Three.js.
