# Procedural wilderness geometry + weather repair R1

Status: review
Base main SHA: e8592b373b888b620808e4510c1f55f9b4e4bfd0

## Objective
Repair the wilderness procedural presentation so bushes and tree crowns are closed low-poly solids, only the near garden/fence vegetation remains, and weather varies reproducibly instead of being fixed by level.

## Acceptance
- A1 — Bushes read as grounded, horizontally layered hedge masses rather than detached round/tumbleweed-like blobs.
- A2 — Procedural foliage blobs are watertight: adjacent triangles share the same transformed edge positions and visible crown/bush cracks are removed.
- A3 — The vegetation draw retains the detailed near/fence grass and removes the P0 mid/far country-grass clusters and their triangle/shader cost.
- A4 — Weather is pseudo-randomized from a stable level + growth-round shuffle, stays stable for the same game state, visits all five weather families over rounds 0–4, and the HUD label and renderer-neutral snapshot resolve the same weather family.
- A5 — No game-loop, save-schema, renderer/frame-owner, terrain authority, pass-count, or scene-graph change is introduced.

## Non-goals
- Rebuild the near grass blade silhouette in this worklet.
- Add P2 tumbleweed, birds, particles, or new gameplay weather effects.
- Remove the existing orchard/tree groups or wilderness props.

## Scene carrier and affected owners
- Carrier: vegetation edge + wilderness field boundary + sky/weather
- Paths: `src/render/vgpu/wilderness-scenery-geometry.ts`, `src/render/vgpu/geometry.ts`, `src/render/vgpu/shaders/vegetation.wgsl`, `src/game/model.ts`, `src/scene/snapshot.ts`, focused tests
- Architecture boundary touched: no

## Current state
- Completed: A1–A5 implementation and focused regression coverage.
- Current step: final clean-head Verify after removal of the temporary diagnostic workflow and addition of the experience note.
- Next action: review/merge only when explicitly requested.
- Blocker: none.

## Evidence
- Static budget: near vegetation is 50 triangles/instance instead of 62, removing 18,000 triangles at the default 1,500-instance tier; the retired far-root/mid-cluster WGSL path is removed too.
- Geometry: focused near-only vegetation test passes; foliage edge census proves every quantized foliage edge is consumed exactly twice, catching the prior face-owned crack mechanism.
- Weather: focused selector tests prove the same state is stable, rounds 0–4 visit all five existing weather profiles, and HUD label + renderer-neutral snapshot agree. A signed 32-bit XOR bug found during CI was repaired by normalizing each hash stage with `>>> 0`.
- Diagnostic run `33924040461`: WGSL, focused geometry/weather tests, full Vitest suite, TypeScript and production build all passed.
- Formal Verify run `33924040473`: `npm run check`, deterministic soil/meadow/hardscape/crop evidence, production crop-soil contact evidence, Canvas fallback and artifact retention all passed. WebGPU browser probe was correctly skipped because renderer architecture was outside this diff.
- Final clean-head Verify is required after governance cleanup before the PR is considered ready.
