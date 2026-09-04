# Wilderness enrichment P1 — farm pond

Status: verifying
Stack base: PR #23 `agent/wilderness-enrichment-p0-r1` @ `3c428df526686dd7764626b24de2145f3746237b`

## Objective
Add a terrain-integrated midground farm/rainwater pond with coherent water, shoreline vegetation, and a small functional bank-side dressing group while keeping the garden primary and the renderer within the existing three-pass architecture.

## Acceptance
- A1 — One analytic terrain authority owns the basin and its normals; water reads as seated inside an irregular wet shoreline rather than a surface card.
- A2 — Opaque depth-writing water has shallow/deep variation, two low-frequency wind-driven waves, controlled sun response, weather cooling/darkening, and scene fog.
- A3 — Reeds reuse P0's vegetation draw and bank-side props reuse P0's hardscape draw; reduced/minimum vegetation tiers naturally reduce reeds while preserving basin/water structure.
- A4 — P1 remains three passes and targets one added water draw, zero water textures, zero fullscreen resources, and <= 1,950 water triangles (the user-authorized +30% envelope over the specification ceiling).
- A5 — Canvas fallback/game/save/input semantics remain unchanged.
- A6 — P1 is spatially composed against P0's east gate / road / tractor carrier instead of assuming the pre-P0 wilderness.

## Non-goals
- No independent reimplementation of P0 road, tractor, gate, meadow layering, or field-boundary work in the P1 delta.
- No fishing/water gameplay, save state, transparency, reflection/refraction target, SSR, compute water, ripple target, shadow map, post-process pass, or new scene graph.
- No P2 birds, tumbleweed, flying leaves, or other ephemeral enrichment.

## Scene carrier and affected owners
- Carrier: back-left water corner, diagonal from P0's east-gate road/work carrier.
- Paths: `src/render/vgpu/terrain-surface.ts`, `src/render/vgpu/water-geometry.ts`, `src/render/vgpu/water.ts`, `src/render/vgpu/shaders/water.wgsl`, `src/render/vgpu/pond-dressing-geometry.ts`, `src/render/vgpu/hardscape.ts`, `src/render/vgpu/shaders/hardscape.wgsl`, `src/render/vgpu/shaders/vegetation.wgsl`, `src/render/vgpu/vgpu-renderer.ts`, focused tests and shader-check wiring.
- Architecture boundary touched: no; the existing world pass gains exactly one material/draw owner.

## Current state
- Completed: basin authority, clipped water grid, water shader/layer, wet shore, P0-compatible reed integration, country-grass pond exclusion, grouped bank props, renderer integration, focused tests.
- Current step: exact-head CI and representative visual verification.
- Next action: resolve Verify findings, then record measured budgets/evidence and mark this packet complete.
- Dependency: PR #24 is intentionally stacked on PR #23 until P0 lands on `main`.

## Evidence
- Code intent: 3 passes; 9 draws versus P0's 8; water +1 draw; props/reeds +0; no water texture/fullscreen/extra target.
- Pending exact-head results: shader validation, `npm run check`, hosted Canvas fallback, WebGPU evidence and measured water triangle count.
