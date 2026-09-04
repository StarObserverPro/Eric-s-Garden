# Camera range and pitch R1

Status: review
Base main SHA: d71cc1c5273bf14ea75f710d9613b133b33d3732
PR: #19

## Objective
Relax the garden camera so close inspection can frame roughly one plot across the viewport while vertical orbit can reach a horizontal eye-level view.

## Acceptance
- A1 — The existing far zoom limit remains 0.76 and the old 0.76–1.35 camera behavior is unchanged.
- A2 — Beyond 1.35, zoom continues optically to a viewport-aware near limit targeting about 94% screen width for one 1.24 m plot diagonal; desktop and portrait phone use different computed maxima.
- A3 — One-finger/mouse drag keeps horizontal orbit and adds vertical elevation control from the current high view down to a horizontal view; the existing high view is unchanged.
- A4 — Pinch and wheel share the same dynamic limits; resize/orientation changes clamp an over-zoomed view back into the new viewport range.
- A5 — Game-state/save schema and renderer ownership do not change; extended zoom/elevation are separate view state.

## Non-goals
- Camera panning or first-person movement.
- Changing the existing far view or maximum/high camera composition.
- Reworking the Canvas fallback projection model.
- Horizon, sun, sky, lighting, or terrain visual redesign.

## Scene carrier and affected owners
- Carrier: central beds
- Paths: `src/main.ts`, `src/scene/snapshot.ts`, `src/scene/camera-controls.ts`, `src/render/vgpu/vgpu-renderer.ts`, `tests/camera-controls.test.ts`
- Architecture boundary touched: no; elevation and extended zoom are renderer-neutral scene-view state and stay outside the gameplay save schema.

## Current state
- Completed: viewport-aware zoom calibration, optical close zoom, vertical vgpu pitch, input wiring, resize clamping, Canvas zoom calibration, focused tests, diff review.
- Current step: PR review.
- Next action: merge only when explicitly requested.
- Blocker: none.

## Evidence
- PR #19 head `a4525d288a7a3fa3dc70c9db804a61066daeaa44`: Verify run #93 passed before this documentation-only status update.
- `npm run check`: pass (shader validation, Vitest, TypeScript, production Vite build).
- Existing soil, meadow, hardscape, crop, and crop-soil Node evidence: pass.
- WebGPU architecture browser smoke: pass; production build reported `vgpu · WebGPU` ready.
- Canvas fallback production capture: pass.
- Focused camera tests cover far-limit preservation, renderer-specific desktop/portrait near limits, optical transition, and high/flat elevation endpoints.
