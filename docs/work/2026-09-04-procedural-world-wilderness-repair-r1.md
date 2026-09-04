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
- Completed: A1, A2, A3, A4 code + focused regression tests; A5 preserved by diff scope
- Current step: run repository Verify on the PR head and inspect failures/evidence
- Next action: repair any shader/test/build regression, then close out evidence
- Blocker: none

## Evidence
- Static diff: near vegetation is 50 triangles/instance instead of 62, removing 18,000 triangles at the default 1,500-instance tier.
- Focused tests added for foliage edge closure, near-only vegetation geometry, deterministic five-weather shuffle, and HUD/snapshot weather agreement.
- Pending repository `npm run check` and Verify evidence on the PR head.
