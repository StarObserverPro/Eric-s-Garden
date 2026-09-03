# Vegetable visual refinement R2

Status: review
Base main SHA: 1a1d56e39ac9b9cba3841d2c9c7bfdb8d7c09f8a

## Objective
Raise the six crop models from readable procedural placeholders to a visibly lit, materially differentiated, self-consistent low-poly crop set, with one clear pumpkin main vine.

## Acceptance
- A1 — Leaves show clear front/back, fold and facet lighting instead of near-flat green under the fixed crop QA light.
- A2 — Harvest organs read as volumes with crop-appropriate roughness/specular, non-degenerate pole topology and restrained low-poly surface variation.
- A3 — Major organ intersections are constrained at attachments and outer silhouettes; the pumpkin primary fruit has its own readable occupancy pocket.
- A4 — Pumpkin keeps one continuous raised, visible main vine and one primary fruit. Side vines are not required. Crop size/coverage is an art parameter, not a quality score.
- A5 — Crop collars, carrot shoulder and low pumpkin organs sit convincingly on/in the production cultivated-soil baseline without changing authoritative plot roots.
- A6 — Run repeated fixed-state visual feedback passes and keep focused geometry/shader/contact evidence.

## Non-goals
- Do not change crop counts, stage semantics, harvest quantity, saves, plot roots, renderer ownership, or the render governor.
- Do not add a second scene graph/model loader or import a new third-party runtime asset pack.
- Do not enlarge crops merely to satisfy evidence pixel coverage.

## Scene carrier and affected owners
- Carrier: central beds / crops.
- Paths: `src/render/vgpu/crop-geometry.ts`, `src/render/vgpu/shaders/crop.wgsl`, focused crop tests/evidence, `.github/workflows/verify.yml`.
- Architecture boundary touched: no.

## Current state
- Completed: A1–A6 implemented and independently evidenced.
- Current step: immediate user visual review of PR #14.
- Next action: only focused visual adjustment from review feedback; otherwise leave open for merge decision.
- Blocker: none.

## Evidence
- Round 2 — contact/material baseline; Verify `33795279459` green.
- Round 3 — oval leaves rebuilt around bilateral raised midribs; pumpkin palmate leaf changed from a single center fan to hub + inner/outer ring; Verify `33796016254` green.
- Round 4 — ellipsoid harvest geometry rebuilt with real north/south pole caps, removing degenerate repeated-pole triangles; Verify `33796460966` green.
- Round 5 — leaf reflectance, ambient fill, transmission and restrained waxy sheen refined. Fixed pumpkin median effective-pixel luma increased from about `28.2` to `49.2`; six-crop lineup from about `41.4` to `60.6`; Verify `33796845964` green.
- Round 6 — pumpkin root leaves moved out of the primary fruit occupancy pocket and three low-profile structural veins added per palmate leaf. Warm/fruit pixels in the fixed pumpkin close-up increased from `1657` to `2706` without a material overall-luma shift; Verify `33797328119` green.
- Integrated production contact evidence — `tests/crop-soil-contact-node.test.ts` renders production soil geometry/shader and crop geometry/shader together at canonical `PLOT_POSITIONS`; carrot shoulder/root and pumpkin soil contact are stored as `browser-evidence/crop-soil-contact-node.ppm`; Verify `33797684860` green.
- Latest geometry remains inside the existing bounded carrier contract (`>6000 && <8000` triangles, every crop `>450`, pumpkin-only overflow, total max radius `<1.50`).