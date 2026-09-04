# Wilderness enrichment P0 R1

Status: executing
Base main SHA: 0e7de253d5df1d75c4d1649526c2555540b4959e
Branch: `agent/wilderness-enrichment-p0-r1`

## Objective
Turn the fence exterior into a layered, directional countryside scene with a gate/road/work corner and asymmetric field boundaries while keeping the garden as the primary visual and interaction focus.

## Acceptance
- A1 — The fence exterior no longer reads as a uniform grass ring; low views show terrain, near detailed grass and a distinct mid/far grass layer.
- A2 — One clear fence opening, a gently curving dirt road and paired wheel ruts establish an exit direction on the shared terrain-height authority.
- A3 — A compact old farm tractor and small work corner provide credible scale and visible ground contact without an external model/material pipeline.
- A4 — At least one asymmetric hedge/field-boundary group and one tree group break the middle/far distance without forming a background wall or competing with the garden.
- A5 — The four principal camera azimuths retain at least one readable countryside relation and do not collapse into either empty ground or a uniform perimeter.
- A6 — The WebGPU path remains three passes and within the P0 draw budget; the added workload follows the existing quality governor. The user-authorized geometry/performance envelope may vary by up to 30% from the planning targets when that preserves ownership and frame stability.
- A7 — Canvas fallback, game state, saves and plot interaction semantics remain unchanged.

## Non-goals
- No pond/water surface, transient wildlife/particles, NPC/free movement, drivable vehicle physics, glTF/PBR pipeline, shadow map, reflection pass or new gameplay world.
- No renderer/frame-owner/fallback architecture change and no dependency upgrade.

## Scene carrier and affected owners
- Carrier: vegetation edge + fence/path + existing distant terrain.
- Paths: `src/render/vgpu/geometry.ts`, `src/render/vgpu/hardscape-geometry.ts`, `src/render/vgpu/wilderness-scenery-geometry.ts`, `src/render/vgpu/shaders/vegetation.wgsl`, `src/render/vgpu/shaders/hardscape.wgsl`, `tests/vegetation-geometry.test.ts`, `tests/hardscape-geometry.test.ts`.
- Architecture boundary touched: no — the existing `Gpu`, three-pass frame, hardscape draw, vegetation draw, quality bundles and Canvas renderer remain the owners.

## Current state
- Completed: fresh-main ownership audit and bounded implementation route.
- Current step: add terrain-contact masks, asymmetric fence opening/static scenery and a governor-scaled mid/far grass layer without increasing draw/pass count.
- Next action: run focused geometry checks, repository Verify and inspect any available browser evidence on the exact PR head.
- Blocker: representative target-GPU visual/performance evidence may remain blocked unless a WebGPU browser preview is available for the branch.

## Evidence
- Geometry budget: default 1,500 vegetation instances retain the existing detailed tuft and add two 6-triangle mid/far clusters per instance (~3,000 clusters / 18k added triangles); the mid/far branch is capped so the optional 4,000-instance ceiling does not turn into 8,000 distant clusters.
- Static budget target: procedural tractor/work corner + field-boundary/tree geometry stays in the existing hardscape draw and is measured explicitly in geometry tests.
- Runtime contract target: `3 passes / 8 draw calls`; no full-screen pass, runtime texture dependency or new scene graph.
