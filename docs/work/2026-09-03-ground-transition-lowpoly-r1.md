# Ground transition low-poly R1

Status: active
Base main SHA: `8d11a9cb3e25d19e325d14b1a492bf8c6d07f723`

## Objective
Unify the visible garden ground so the meadow, bed aisles and soil shoulders read as one continuous terrain system: coarse low-poly ground at the perimeter, progressively denser geometry toward the central beds, and high-density soil only where cultivated earth needs it.

## Acceptance
- A1 — Replace the central gap-only surface with one conforming terrain mesh covering the garden top. Mesh spacing is coarse at the meadow perimeter, medium through the transition band, and fine around the bed field; no punched rectangular bed holes or competing ground sheets remain visible.
- A2 — Keep the meadow/grass root datum near `y=-0.39`, but lift the terrain smoothly toward roughly `y=-0.20` around the beds so existing perimeter vegetation and fence placement remain coherent.
- A3 — Lower the soil beds from the current ~45–50 cm apparent rise to roughly 15–22 cm above their surrounding terrain. Soil shoulders overlap/feather into the terrain with only a short closing skirt rather than a deep vertical wall.
- A4 — Move stepping stones outward from the bed edges and place their bases from the terrain height instead of a fixed `y`.
- A5 — Ground material transitions from meadow-like green/brown low-poly facets to compacted warm earth near beds; soil albedo and diffuse lighting are lifted enough that existing macro/meso/micro detail remains readable in the current low-angle daylight.
- A6 — Preserve crop/game state, crop geometry/growth, the newly merged grass density/variation/AA behavior, fence topology, weather ownership, renderer ownership and fallback semantics.
- A7 — Focused geometry/shader/render checks and final Verify pass. Representative real-WebGPU visual review remains required for final appearance acceptance.

## Non-goals
- Vegetable redesign or growth changes.
- Further grass density/wind/AA tuning.
- Wetting propagation or moisture simulation redesign.
- HUD/UI work, renderer architecture changes, dependency upgrades or deployment.

## Scene carrier and affected paths
- Carrier: whole garden ground + soil/ground transition + stepping-stone placement.
- Primary paths: `src/render/vgpu/hardscape-geometry.ts`, `src/render/vgpu/shaders/hardscape.wgsl`, `src/render/vgpu/soil-geometry.ts`, `src/render/vgpu/shaders/soil.wgsl`.
- Focused tests: `tests/hardscape-geometry.test.ts`, `tests/soil-geometry.test.ts`, existing hardscape/soil shader and Node render checks.
- Architecture boundary touched: no.

## Current step
Implement the conforming adaptive terrain first, then lower/feather soil, then reconcile material lighting and stones.

## Blockers
None at source level. Real WebGPU visual capture may require hosted/device evidence after CI.
