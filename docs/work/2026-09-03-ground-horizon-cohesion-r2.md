# Ground and horizon cohesion R2

Status: executing
Base main SHA: `1a1d56e39ac9b9cba3841d2c9c7bfdb8d7c09f8a`

## Objective
Make the garden read as one continuous low-poly landscape rather than a bed platform inside a rectangular grass border, while preserving the current game/crop semantics and the newly tuned meadow behavior.

## Acceptance
- A1 — Bed shoulders sample the same terrain height authority as the surrounding ground and feather into it; no deep skirt or visibly separate bed-platform datum remains.
- A2 — Terrain keeps adaptive density but loses the obvious square/checkerboard read through irregularized conforming topology, smooth terrain normals, and continuous world-space material variation.
- A3 — A low-cost fogged distant ground/horizon profile closes the world beyond the fence without adding a second scene graph or external asset dependency.
- A4 — Shared world ambient gains a restrained neutral diffuse/hemisphere fill so shadow-side soil, stone, fence, grass and crops remain readable without a second shadow direction.
- A5 — Stepping stones use deterministic constrained-random placement with non-mirrored spacing; fence post lean/height and rail sag are reduced to stable rustic variation.
- A6 — Grass perimeter distribution has a noisy feathered boundary with occasional inward/outward tufts instead of a rectangular strip edge; existing density, height variation, wind and AA behavior remain otherwise unchanged.
- A7 — Focused geometry/shader/Node/build checks pass; representative visual evidence is reviewed against the supplied screenshot.

## Non-goals
- Crop geometry/material redesign; PR #14 owns `crop.wgsl` and crop render evidence.
- Gameplay, saves, HUD, renderer ownership, dependency upgrades or deployment.
- Importing Crystal Garden's Three.js terrain architecture or full governance stack.

## Scene carrier and affected owners
- Carrier: central beds + whole garden ground + fence/path + sky/weather + vegetation edge.
- Paths: `src/render/vgpu/terrain-surface.ts`, `hardscape-geometry.ts`, `soil-geometry.ts`, `shaders/hardscape.wgsl`, `shaders/sky.wgsl`, `shaders/vegetation.wgsl`, `vgpu-renderer.ts`, focused tests.
- Architecture boundary touched: no.

## Current state
- Completed: none.
- Current step: extract the shared terrain height/normal owner and remove grid/material seams.
- Next action: implement terrain/soil conformity, then horizon/fill and perimeter randomization.
- Blocker: none; PR #14 overlaps only crop shader/evidence and is intentionally excluded.

## Evidence
- User screenshot in current conversation is the visual baseline.
- Crystal Garden references: `scene/terrain/mesh.ts`, `scene/terrain/appearance.ts`, `scene/props/horizon-fill.ts`, `scene/create-scene.ts` hemisphere/fill pattern.
