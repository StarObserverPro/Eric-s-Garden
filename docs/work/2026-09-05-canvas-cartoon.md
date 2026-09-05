# Canvas cartoon readability

Status: executing
Base main SHA: 1bd36be32a29cb15c796df8a2a5f253ff384760f
Dependencies completed: #28 → #29 → #30 merged; #30 passed both workflows again after integration.

## Objective
Give the playable Canvas fallback a coherent cartoon diorama: planted crops, broad shapes, consistent projection and camera-correct occlusion.

## Acceptance
- A1 — All six crops and four growth stages use authored filled silhouettes, not floating emoji. Roots and shadows meet the soil.
- A2 — Soil sides, stone footprints, fences and object ordering follow the same rotating orthographic projection. Front/back roles reverse correctly at quarter turns.
- A3 — Grass, furrows, rain and outlines remain readable without hairlines at 390px and 320px; objects scale with the garden rather than independent CSS sizes.
- A4 — Visible crop/soil hit regions agree with drawing, including rotation and DPR changes. Real desktop/touch five-level flow remains playable with #30 art and recaps.
- A5 — Review deterministic before/after frames and final-head CI; then merge under the user's authorization. No deployment.

## Non-goals
WebGPU appearance, camera/input ownership, game/save semantics, row sowing, new scene carriers, dependencies, backend, and external asset generation.

## Scene carrier and affected owners
Canvas central beds/crops, fence/path, vegetation edge and weather. `src/render/canvas2d/`, focused Canvas tests and the existing arithmetic browser-evidence workflow. One renderer remains active; no second scene graph or gameplay state.

## Current state
Baseline Canvas blob verified against GitHub: 90981d8d90962352b7f3f79ea3e1929ca49a96c2. Initial defects: fixed fence order, screen-sized stones/hit circles, hairline vegetation, emoji crop centers above their roots. Local source transport is a GitHub workbench; only hash-verified source owners may be authored. All implementation goes to GitHub; screenshots are verification artifacts, not external production assets.

## Evidence
Local TypeScript and five focused projection tests pass. The synthetic browser matrix passes sixteen viewport/quarter-turn cases plus stage, zoom, wetness, harvested, resize and lifecycle checks. Final integrated production journey and hosted Verify remain pending. Full action journeys and visual claims in this worklet are Canvas, not WebGPU or physical-device performance claims.
