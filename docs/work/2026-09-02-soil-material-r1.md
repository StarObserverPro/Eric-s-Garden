# Soil material R1

Status: review
Base main SHA: `ed37451ca76883872b2caf0cc170de7cfbb1b746`

## Objective
Replace the flat box-like bed material with a visibly three-dimensional, deterministic tilled-garden soil surface before doing any further wetting simulation work.

## Acceptance
- A1 — The twelve beds use real high-density soil geometry rather than the shared 36-vertex box top; final combined carrier is 150,528 triangles / 451,584 vertices.
- A2 — Dry soil alone reads as cultivated loam: broad mound, >34 cm audited mound-to-shoulder relief, subtle rake structure, irregular collapsing edges, exposed ground-closing soil, and 480 faceted clods/occasional pebbles.
- A3 — A dedicated soil shader provides multiscale color variation, micro-normal breakup, slope/facet lighting, dry roughness and view-dependent specular response without textures or external assets.
- A4 — Existing per-bed wetness remains only a compatibility material input. No wetting propagation, compute simulation, or new moisture state is introduced in this worklet.
- A5 — Crop rendering, growth, grass density/wind, path, fence, sky, game state meaning, saves, frame ownership and fallback semantics are unchanged.
- A6 — Geometry stats, mock shader compile, strict WGSL validation, Dawn-backed Node render evidence and the existing production/fallback checks pass.

## Non-goals
- Wetting fronts, water diffusion, puddles or drying simulation.
- Vegetable geometry or growth work.
- Grass, path, fence, sky or weather redesign.
- New rendering framework or raw WebGPU path.

## Scene carrier and affected owners
- Carrier: central beds / soil only
- Paths: `src/render/vgpu/soil-geometry.ts`, `src/render/vgpu/shaders/soil.wgsl`, `src/render/vgpu/vgpu-renderer.ts`, soil-specific tests and verification evidence
- Architecture boundary touched: no

## Current state
- Completed: A1–A6
- Current step: review
- Next action: user visual review / merge decision; wetting remains a separate future worklet
- Blocker: none

## Evidence
- final head before documentation close: `6ca0209b2e937ad23a3cb48c918eb809bf1ddf1e`
- GitHub Actions Verify run `33709039067` — success
- strict `soil.wgsl` and existing shader validation
- `tests/soil-geometry.test.ts` — 72×72 plot grids, 480 aggregates, >34 cm real relief and >140k triangle gate
- `tests/vgpu-mock.test.ts` — dedicated soil material compile/draw
- `tests/soil-render-node.test.ts` — Dawn-backed render/readback plus deterministic `browser-evidence/soil-node.ppm`
- human visual audit of the generated frame; the first slab-like iteration was rejected and the final shoulder/clod revision was retained
- full `npm run check` and existing Canvas fallback smoke
- experience note: `docs/experience/procedural-soil-r1.md`
