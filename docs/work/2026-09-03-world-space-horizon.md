# World-space horizon and sun

Status: verifying
Base main SHA: `bf1055cc01e2187f4a24d453f9bb895d507a8449`

## Objective
Make the garden, geometric ground, skyline, atmosphere and sun share one world coordinate system and one perspective camera, with progressively coarser distant terrain instead of a sky-painted fake ground.

## Acceptance
- A1 — Sky rays use the same camera forward/right/up basis as world geometry; no independent horizon-bearing sky camera remains.
- A2 — Distant ground is real world geometry sampled from the terrain height authority, with mesh spacing increasing materially outside the playable garden.
- A3 — `sky.wgsl` contains atmosphere/cloud/sun only; no procedural far-ground or hedge silhouette is painted in the sky pass.
- A4 — The camera-control authority keeps its existing high default and full zoom/pitch range; at the allowed low/flat inspection pose, one perspective frame crosses continuously from geometric ground through the real skyline into atmosphere, and the visible sun disc uses the same world-space sun direction consumed by materials.
- A5 — Focused geometry/world-frame/shader/Node/build checks pass; real-browser aesthetic review remains explicit.

## Non-goals
- Crop, watering, HUD, gameplay/save semantics, dependency upgrades, merge, or deployment.
- A full shadow-map system; this work only fixes shared world-space sun direction and visual placement.

## Scene carrier and affected owners
- Carrier: whole garden ground + sky/weather; direct dependency: camera framing.
- Camera policy authority: `src/scene/camera-controls.ts` (zoom range, FOV and vertical pose).
- Exact render-frame authority: `src/render/vgpu/world-frame.ts` (world camera basis/rays and world sun direction).
- Paths: `src/render/vgpu/world-frame.ts`, `src/render/vgpu/vgpu-renderer.ts`, `src/render/vgpu/terrain-surface.ts`, `src/render/vgpu/hardscape-geometry.ts`, `src/render/vgpu/shaders/sky.wgsl`, focused tests and experience note.
- Architecture boundary touched: no — one renderer, one frame owner, one vgpu/WebGPU context and one scene snapshot remain authoritative.

## Current state
- Completed: shared world camera basis; one world sun direction; real far-terrain carrier with distance-coarsened topology; atmosphere-only sky pass; focused world-frame and geometry verification repairs; reconciliation with current `main` camera/crop work; reusable verification experience note.
- Current step: hosted Verify on the reconciled head.
- Next action: repair only failures tied to this worklet, then record final evidence.
- Blocker: none.

## Evidence
- Previous reconciled run `33829470473`: original three failures reduced to one evidence-composition assertion; hardscape geometry performance and raw-WGSL source contracts passed.
- Latest Verify is running on the current PR head after switching the meadow evidence to the supported flat camera pose and preserving the close-zoom crop-marker cap from current `main`.