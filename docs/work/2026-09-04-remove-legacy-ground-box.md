# Remove legacy ground/box path

Status: executing
Base main SHA: 36afd4614afdbf22b997bb1916de308b9e046030

## Objective
Retire the still-active legacy ground box and delete the now-dead plot/path/fence box shader and geometry path without changing the current soil, hardscape, vegetation, crop, or watering behavior.

## Acceptance
- A1 — `VgpuRenderer` no longer creates, draws, bundles, updates, counts, or destroys the legacy `garden-ground` / box geometry resource.
- A2 — `garden.wgsl` contains only the watering-can path; old ground/plot/path/fence box placement and material branches are gone, and the watering-can shader still validates.
- A3 — the standalone `createBoxVertices()` legacy geometry generator is removed, with no remaining references.

## Non-goals
- Do not redesign terrain, hardscape, soil, vegetation, crops, watering visuals, camera, UI, gameplay, or fallback behavior.
- Do not fold in wilderness P0/P1 work or dependency upgrades.

## Scene carrier and affected owners
- Carrier: central beds + fence/path cleanup seam
- Paths: `src/render/vgpu/vgpu-renderer.ts`, `src/render/vgpu/shaders/garden.wgsl`, `src/render/vgpu/geometry.ts`
- Architecture boundary touched: no; the existing vgpu renderer remains the single frame/resource owner.

## Current state
- Completed: none
- Current step: remove legacy box ownership from the renderer and shader.
- Next action: run residual-reference review and repository verification on the PR head.
- Blocker: none; open wilderness P0 also edits `geometry.ts`, but only around vegetation additions, so this branch stays based on fresh `main` and keeps its change bounded.

## Evidence
- Pending: shader validation, tests/build, residual-reference review, exact PR diff.
