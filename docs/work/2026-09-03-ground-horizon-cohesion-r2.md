# Ground and horizon cohesion R2

Status: review
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
- Paths: `src/render/vgpu/terrain-surface.ts`, `src/render/vgpu/hardscape-geometry.ts`, `src/render/vgpu/soil-geometry.ts`, `src/render/vgpu/shaders/hardscape.wgsl`, `src/render/vgpu/shaders/sky.wgsl`, `src/render/vgpu/shaders/vegetation.wgsl`, `src/scene/snapshot.ts`, focused tests.
- Architecture boundary touched: no.

## Current state
- Completed: A1-A6 source implementation and focused numeric gates; A7 repository execution evidence.
- Current step: user / representative real-WebGPU visual review of the combined game camera.
- Next action: repair only visual issues that remain in the representative frame; otherwise merge is a separate explicit decision.
- Blocker: CI renders soil, meadow/sky/grass and hardscape as separate deterministic carriers; it does not prove the final combined WebGPU frame.

## Evidence
- User screenshot in current conversation is the visual baseline.
- Crystal Garden references: `scene/terrain/mesh.ts`, `scene/terrain/appearance.ts`, `scene/props/horizon-fill.ts`, `scene/create-scene.ts` hemisphere/fill pattern.
- Source/evidence head `a906236683f80c39d30aa9cce3ad1c3bec252495`.
- Verify run `33793901908` (#64) — success: shader/model/mock/Node/build, deterministic soil, meadow/sky/grass, hardscape and Canvas fallback evidence all passed; renderer-architecture browser probe was correctly skipped because this worklet does not change renderer architecture.
- Human review of the generated Node frames: terrain/stone square tiling is materially reduced, terrain palette is continuous, stone rows are no longer mirrored, fence silhouette is stable, grass perimeter is irregularized, and a low-contrast distant horizon is present.
- Combined real-WebGPU garden frame: `not_checked` — requires representative runtime visual review.
