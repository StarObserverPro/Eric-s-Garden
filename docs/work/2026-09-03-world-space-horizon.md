# World-space horizon and sun

Status: executing
Base main SHA: `d71cc1c5273bf14ea75f710d9613b133b33d3732`

## Objective
Make the garden, geometric ground, skyline, atmosphere and sun share one world coordinate system and one perspective camera, with progressively coarser distant terrain instead of a sky-painted fake ground.

## Acceptance
- A1 — Sky rays use the same camera forward/right/up basis as world geometry; no independent horizon-bearing sky camera remains.
- A2 — Distant ground is real world geometry sampled from the terrain height authority, with mesh spacing increasing materially outside the playable garden.
- A3 — `sky.wgsl` contains atmosphere/cloud/sun only; no procedural far-ground or hedge silhouette is painted in the sky pass.
- A4 — The default camera framing contains both ground and above-horizon rays, and the visible sun disc uses the same world-space sun direction consumed by materials.
- A5 — Focused geometry/world-frame/shader/Node/build checks pass; real-browser aesthetic review remains explicit.

## Non-goals
- Crop, watering, HUD, gameplay/save semantics, dependency upgrades, merge, or deployment.
- A full shadow-map system; this work only fixes shared world-space sun direction and visual placement.

## Scene carrier and affected owners
- Carrier: whole garden ground + sky/weather; direct dependency: camera framing.
- Paths: `src/render/vgpu/world-frame.ts`, `src/render/vgpu/vgpu-renderer.ts`, `src/render/vgpu/terrain-surface.ts`, `src/render/vgpu/hardscape-geometry.ts`, `src/render/vgpu/shaders/sky.wgsl`, focused tests and experience note.
- Architecture boundary touched: no — one renderer, one frame owner, one vgpu/WebGPU context and one scene snapshot remain authoritative.

## Current state
- Completed: none.
- Current step: replace the split sky/world camera semantics and move distant ground back into terrain geometry.
- Next action: run hosted verification and repair only failures tied to this worklet.
- Blocker: none.

## Evidence
- Pending focused tests and hosted Verify run.
