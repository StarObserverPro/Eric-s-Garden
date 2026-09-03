# Hardscape R1

Status: review
Base main SHA: e48792114e7d191e023f89ffd95771e71d94f7ae

## Objective
Replace the placeholder box-based path/fence presentation with a coherent low-poly hardscape layer and give the spaces between raised beds an intentional packed-earth surface.

## Acceptance
- A1 — The side/front stepping-stone route reads as individual irregular low-poly stones with non-flat facets and material variation, not scaled cuboids.
- A2 — The perimeter fence reads as rustic wood: distinct tapered posts, slightly varied lean/height, faceted rails and mild rail sag rather than a perfect box grid.
- A3 — The exposed spaces between the twelve soil mounds read as compacted garden aisles with small relief and mineral/gravel variation instead of bare generic green ground.
- A4 — Hardscape stays static and renderer-neutral game state, saves, plot picking, crop presentation, soil material, grass/vegetation and sky/weather ownership remain unchanged.
- A5 — The hardscape shader is part of `shader:check`; deterministic geometry tests and a Dawn-backed Node render/readback cover the new carrier; final PR Verify must be green.

## Non-goals
- Grass density, wildflowers, vegetation wind or recovered grass assets.
- Sky, sunlight, cloud assets or weather redesign.
- Vegetable geometry/growth or soil/wetting redesign.
- Canvas fallback art parity beyond preserving playability.

## Scene carrier and affected owners
- Carrier: fence/path + central-bed gaps
- Paths: `src/render/vgpu/hardscape-geometry.ts`, `src/render/vgpu/hardscape.ts`, `src/render/vgpu/shaders/hardscape.wgsl`, `src/render/vgpu/vgpu-renderer.ts`, `tests/hardscape-*`, `package.json`
- Architecture boundary touched: no

## Current state
- Completed: A1, A2, A3, A4 source implementation; A5 focused tests/check wiring
- Current step: final-head hosted verification and diff review
- Next action: inspect Verify, repair only affected failures, then hand the PR back for visual review/merge decision
- Blocker: representative real-WebGPU browser visual capture is not available through the GitHub-only execution surface

## Evidence
- Geometry contract: `tests/hardscape-geometry.test.ts`
- Dawn-backed render/readback: `tests/hardscape-render-node.test.ts`
- Shader validation: `package.json` includes `hardscape.wgsl` in `shader:check`
- Hosted final-head Verify: pending PR run
- WebGPU browser visual: not_checked — requires a representative WebGPU browser/device
