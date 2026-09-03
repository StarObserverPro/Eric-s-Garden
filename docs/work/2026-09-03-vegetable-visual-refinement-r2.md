# Vegetable visual refinement R2

Status: executing
Base main SHA: 1a1d56e39ac9b9cba3841d2c9c7bfdb8d7c09f8a

## Objective
Raise the six crop models from readable procedural placeholders to a visibly lit, materially differentiated, self-consistent low-poly crop set, with an unmistakable pumpkin vine.

## Acceptance
- A1 — Leaves show clear front/back and facet lighting instead of near-flat green under the fixed crop QA light.
- A2 — Harvest organs read as volumes with crop-appropriate roughness/specular and low-poly surface variation rather than uniformly colored ellipsoids.
- A3 — Major organ intersections are constrained at attachments and outer silhouette boundaries; no obvious leaf/fruit/stem clipping in the fixed lineup and pumpkin close-up.
- A4 — Pumpkin owns a continuous raised primary vine with visible thickness and branching/tendril cues from the home root toward the outward footprint; one primary pumpkin fruit remains associated with the home plot.
- A5 — Run at least three fixed-state visual feedback passes (baseline/round-1/round-2 or later), with focused geometry/shader checks and stored crop evidence.

## Non-goals
- Do not change crop counts, stage semantics, harvest quantity, saves, plot roots, renderer ownership, or the render governor.
- Do not add a second scene graph/model loader or import a new third-party runtime asset pack.

## Scene carrier and affected owners
- Carrier: central beds / crops.
- Paths: `src/render/vgpu/crop-geometry.ts`, `src/render/vgpu/shaders/crop.wgsl`, focused crop tests/evidence, `.github/workflows/verify.yml`; renderer wiring only if required for evidence parity.
- Architecture boundary touched: no.

## Current state
- Completed: baseline issue classification from current main.
- Current step: establish fixed crop lineup and pumpkin close-up evidence, then repair leaf/fruit lighting and pumpkin vine visibility.
- Next action: add crop Node evidence and first material/geometry pass.
- Blocker: none.

## Evidence
- PR and Verify run on final head.
- Fixed crop lineup and pumpkin close-up PPM artifacts from Node/vgpu evidence path.
- Focused crop geometry/shader tests plus `npm run check`.
