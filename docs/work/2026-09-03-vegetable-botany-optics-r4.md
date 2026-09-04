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
- Completed: R3 merged in PR #18; timeout-only geometry test repair is on main and Verify green.
- Current step: port the post-merge tomato/lettuce shader refinement onto fresh main.
- Next action: run Verify and inspect node/rosette evidence against R3.
- Blocker: none.

## Evidence
- R3 Verify run `33828605126` is green after the assertion-scan optimization.
- R4 requires shader validation, `npm run check`, crop node/rosette evidence, WebGPU browser probe, and final Verify.
