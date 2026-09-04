# Remove legacy ground/box path

Status: review
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
- Completed: A1, A2, A3
- Current step: exact-final-head verification and PR review.
- Next action: merge only after explicit release authorization.
- Blocker: none; open wilderness P0 also edits `geometry.ts`, but only around vegetation additions, so this branch stays based on fresh `main` and keeps its change bounded.

## Evidence
- Residual-reference review: updated renderer contains no `boxGeometry` or `garden-ground`; `garden.wgsl` contains no `BoxPlacement`, plot/path/fence box placement, or box material dispatch.
- Renderer accounting after retirement: 3 passes, 7 draws, fixed non-vegetation/crop instance overhead 3, base resources 16 plus vegetation tier bundles.
- Verify run #132 on implementation head `f0636bb70ce4df1d858e132213734bb18314a59f`: shader/model/mock/Node/build and deterministic visual evidence passed through the browser-probe install stage; final browser/lifecycle result superseded by the final packet commit and must be checked on the new exact head.
- PR: #25.
