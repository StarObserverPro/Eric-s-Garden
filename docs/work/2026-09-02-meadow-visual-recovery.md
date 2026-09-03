# Meadow visual recovery

Status: implementation complete; awaiting real-WebGPU visual review
Base main SHA: e8f1496d49acd55c6dd704c8ce957f5e703fcf67
PR: #5
Verified head: 2465fc99be1185907e2143f44e492660f25b9a31

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

## Result
- Grass: segmented four-leaf tufts, canopy/understory variation, sparse flowers, coherent gust bands, eddies, cantilever-style bend profile, flutter, root occlusion and back-light response.
- Sky/light: camera-orbit-consistent sun ray, horizon/twilight glow, lightweight Rayleigh/Mie-style terms, cloud field, warm direct light + cool ambient light, shared cloud shadow and exponential fog.
- Ground: richer turf mottling/thatch; existing procedural soil now receives the same sky light while retaining wetness/material behavior.
- Tone: restrained weather-aware exposure/saturation/contrast/vignette shaping rather than a separate demo filter stack.
- Deliberately omitted: foreign Three.js/WebGL runtime, second scene graph/frame loop, season/time UI/state and standalone terrain world.

## Verification
- Hosted `Verify` run #20 on head `2465fc99be1185907e2143f44e492660f25b9a31`: success.
- Pinned portable CPU renderer health check: success.
- All WGSL validation including the new vegetation shader: success.
- Model/mock/Node tests and production TypeScript/Vite build: success.
- Deterministic soil render evidence: success.
- Playable Canvas fallback capture: success.
- One native WGSL issue was found and repaired during verification: Naga correctly rejected compound assignment to an `xz` swizzle; the shader now accumulates horizontal displacement through whole `vec3` values.

## Remaining visual claim
No representative real-browser WebGPU capture is available through the current connected verification path. Therefore the integration is complete and verified, but final aesthetic claims about grass density, sun placement and color balance remain pending a real-WebGPU visual review. Do not infer those claims from the Canvas fallback or CPU/mock evidence.
