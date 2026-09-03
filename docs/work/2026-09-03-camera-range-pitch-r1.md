# Camera range and pitch R1

Status: executing
Base main SHA: d71cc1c5273bf14ea75f710d9613b133b33d3732

## Objective
Relax the garden camera so close inspection can frame roughly one plot across the viewport while vertical orbit can reach a horizontal eye-level view.

## Acceptance
- A1 — The existing far zoom limit remains 0.76 and the old 0.76–1.35 camera behavior is unchanged.
- A2 — Beyond 1.35, zoom continues optically to a viewport-aware near limit targeting about 94% screen width for one 1.24 m plot diagonal; desktop and portrait phone use different computed maxima.
- A3 — One-finger/mouse drag keeps horizontal orbit and adds vertical elevation control from the current high view down to a horizontal view; the existing high view is unchanged.
- A4 — Pinch and wheel share the same dynamic limits; resize/orientation changes clamp an over-zoomed view back into the new viewport range.
- A5 — Game-state/save semantics and renderer ownership do not change.

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
- Completed: helper math and focused unit tests drafted.
- Current step: wire view state into input and the vgpu camera.
- Next action: run typecheck/tests and inspect the PR diff.
- Blocker: none.

## Evidence
- Pending focused Vitest and build/typecheck results.
