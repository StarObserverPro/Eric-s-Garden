# Vegetable botany and optics refinement R4

Status: executing
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
- Completed: A2–A4; R3 merged in PR #18; the geometry validation timeout was removed by replacing per-float assertion overhead with one complete scan plus summary assertions; R4 run `33829264906` was fully green and its fixed evidence showed the lettuce silhouette improvement.
- Current step: final tomato canopy pass expands only high-flex compound-leaf carriers from +18% to +30%; shader/model/Node/build and crop evidence steps are green in run `33829584060`.
- Next action: inspect the final tomato node-detail artifact after the workflow uploads it, then move to review if A1/A5 remain visually satisfied.
- Blocker: run `33829584060` is currently waiting in the unchanged `Capture the playable Canvas fallback` Chrome screenshot step after all crop checks/evidence completed; do not weaken or bypass that gate.

## Evidence
- R3 Verify run `33828605126`: fully green after the assertion-scan optimization.
- R4 Verify run `33829264906`: fully green; fixed node/rosette evidence captured; renderer-architecture WebGPU probe correctly skipped because R4 is crop-shader-only.
- R4 final-canopy run `33829584060`: shader/model/mock/Node/build, crop visual evidence, botanical detail evidence, and crop-soil contact all green; unchanged Canvas fallback tail still in progress at last check.
