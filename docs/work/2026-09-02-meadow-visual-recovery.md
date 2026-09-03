# Meadow visual recovery

Status: executing
Base main SHA: e8f1496d49acd55c6dd704c8ce957f5e703fcf67

## Objective
Recover the strongest sky light, grass motion/density, and atmospheric color ideas from the supplied wind-meadow source into Eric's Garden's existing vgpu Phase 2 scene without importing its Three.js/WebGL runtime.

## Acceptance
- A1 — The vgpu vegetation edge reads as layered grass rather than sparse crossed cards, with deterministic variation, root occlusion, back-light response, and coherent gust/eddy motion.
- A2 — The sky's sun/atmosphere is camera-consistent and the garden receives a matching warm/cool light and subtle distance fog rather than a disconnected screen-space sun.
- A3 — Existing weather levels still drive sunlight/cloud/rain/wind; no new gameplay state, second frame loop, Three.js dependency, or second scene graph is introduced.
- A4 — The changed WGSL/geometry/build contracts pass repository verification; missing real-WebGPU visual evidence is reported explicitly rather than inferred from fallback evidence.

## Non-goals
- Do not add the demo's season/time-of-day controls or autumn gameplay state.
- Do not import its Next.js/Sites shell, Three.js renderer, camera controls, or standalone terrain world.
- Do not change Canvas fallback gameplay semantics, crop logic, saves, or soil wetting behavior.

## Scene carrier and affected owners
- Carrier: vegetation edge + sky/weather; dependent material owners: ground/soil lighting.
- Paths: `src/scene/snapshot.ts`, `src/render/vgpu/geometry.ts`, `src/render/vgpu/vgpu-renderer.ts`, `src/render/vgpu/shaders/*.wgsl`, focused tests, `package.json` shader validation list.
- Architecture boundary touched: no — one existing vgpu renderer, frame owner, scene snapshot and WebGPU context remain authoritative.

## Current state
- Completed: source/demo audit and architecture mapping.
- Current step: port the useful visual mechanisms into the existing vgpu owners.
- Next action: run hosted verification on the exact PR head and fix any WGSL/type/test failures.
- Blocker: no representative real-WebGPU browser capture is available through the current connected execution path.

## Evidence
- Supplied external source reviewed locally; Three.js/WebGL shell explicitly excluded.
- Hosted `Verify` on final PR head will be the integration check; WebGPU visual remains a separate claim.
