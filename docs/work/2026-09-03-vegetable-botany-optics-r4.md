# Vegetable botany and optics refinement R4

Status: review
Base main SHA: bf1055cc01e2187f4a24d453f9bb895d507a8449

## Objective
Close the two remaining visible R3 defects—tomato canopy readability and lettuce rosette silhouette—using the existing crop carrier and organ material model without increasing render cost.

## Acceptance
- A1 — Tomato compound leaves read as a real canopy around the segmented stem and trusses; actual compound leaves gain visible area without enlarging fruit calyx/sepal carriers.
- A2 — Lettuce remains 24 independent crown-attached leaves but no longer reads as three concentric pointed rings; distal blades are broader/blunter and outer/middle/inner posture remains visibly distinct.
- A3 — Tomato leaf readability comes from matte diffuse/ambient response, not fake glossy highlights; the existing crop-specific roughness/transmission hierarchy remains intact.
- A4 — No new crop instances, draw calls, geometry triangles, game state, plot roots, or renderer ownership changes.
- A5 — Existing morphology/geometry contracts remain green and fixed crop detail evidence visibly supports A1–A3.

## Non-goals
- Do not reopen the full R3 topology rebuild or change crop counts/harvest/gameplay.
- Do not modify corn, carrot, pumpkin, or strawberry topology unless verification exposes a regression.

## Scene carrier and affected owners
- Carrier: central beds / crops.
- Paths: `src/render/vgpu/shaders/crop.wgsl`, fixed crop evidence/tests only if an existing view cannot judge the result.
- Architecture boundary touched: no.

## Current state
- Completed: A1–A5. R3 merged in PR #18. The crop geometry timeout was fixed without increasing the timeout by replacing roughly 290k per-float Vitest assertions with one complete finite/normal scan plus summary assertions. R4 preserves all existing crop topology and render ownership while refining only the tomato and lettuce presentation.
- Current step: review PR #20.
- Next action: merge only after explicit approval.
- Blocker: none.

## Evidence
- R3 Verify run `33828605126`: fully green after the assertion-scan optimization.
- R4 Verify run `33829264906`: fully green; fixed node/rosette evidence showed the lettuce silhouette improvement.
- R4 final shader code pass `33829584060`: shader/model/mock/Node/build and all crop evidence green; one runner later stalled in the unchanged Canvas fallback step.
- Final PR-head Verify run `33830009739`: fully green, including crop lineup, botanical node/rosette detail, crop-soil contact, Canvas fallback, and artifact upload. Renderer-architecture WebGPU probe correctly skipped because R4 changes only crop presentation, not renderer architecture.
- Final visual review: tomato high-flex compound leaves expand around their real stem-node anchors while low-flex calyx/sepal carriers stay unchanged; lettuce remains 24 independent crown leaves with less concentric yaw, broader/blunter distal blades, and distinct inner/outer posture.
