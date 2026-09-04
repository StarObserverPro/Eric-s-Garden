# Wilderness enrichment P1 — farm pond

Status: executing
Base main SHA: 0e7de253d5df1d75c4d1649526c2555540b4959e

## Objective
Add a terrain-integrated midground farm/rainwater pond with coherent water, shoreline vegetation, and a small functional bank-side dressing group while keeping the garden primary and the renderer within the existing three-pass architecture.

## Acceptance
- A1 — One analytic terrain authority owns the basin and its normals; water reads as seated inside an irregular wet shoreline rather than a surface card.
- A2 — Opaque depth-writing water has shallow/deep variation, two low-frequency wind-driven waves, controlled sun response, weather cooling/darkening, and scene fog.
- A3 — Reeds reuse the vegetation draw and bank-side props reuse the hardscape draw; reduced/minimum vegetation tiers naturally reduce reeds while preserving basin/water structure.
- A4 — P1 remains three passes and targets one added water draw, zero water textures, zero fullscreen resources, and <= 1,950 water triangles (the user-authorized +30% envelope over the specification ceiling).
- A5 — Canvas fallback/game/save/input semantics remain unchanged.
- A6 — Final fixed-state visual evidence checks near/mid/far water, low-angle coverage, sunny/cloudy/rain, and opposite azimuths; final composition against the P0 road/tractor carrier is required after P0 is available.

## Non-goals
- No P0 road, tractor, gate, three-layer meadow, or field-boundary implementation in this packet.
- No fishing/water gameplay, save state, transparency, reflection/refraction target, SSR, compute water, ripple target, shadow map, post-process pass, or new scene graph.
- No P2 birds, tumbleweed, flying leaves, or other ephemeral enrichment.

## Scene carrier and affected owners
- Carrier: water corner
- Paths: `src/render/vgpu/terrain-surface.ts`, `src/render/vgpu/water-geometry.ts`, `src/render/vgpu/water.ts`, `src/render/vgpu/shaders/water.wgsl`, `src/render/vgpu/hardscape-geometry.ts`, `src/render/vgpu/shaders/hardscape.wgsl`, `src/render/vgpu/shaders/vegetation.wgsl`, `src/render/vgpu/vgpu-renderer.ts`, focused tests and shader-check wiring.
- Architecture boundary touched: no; one existing world pass gains one material/draw owner.

## Current state
- Completed: none
- Current step: implement shared pond authority, water owner, and zero-extra-draw shoreline dressing.
- Next action: run focused/static verification through the PR head, then inspect hosted evidence and reconcile against P0 when available.
- Blocker: P0 implementation is not present on base main, so P0-relative composition acceptance cannot yet be claimed.

## Evidence
- Pending: pond authority/geometry tests, shader validation, `npm run check`, hosted Canvas fallback, exact-head metrics and visual captures where available.
