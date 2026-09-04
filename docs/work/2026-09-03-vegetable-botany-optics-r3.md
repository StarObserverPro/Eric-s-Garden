# Vegetable botany and optics refinement R3

Status: executing
Base main SHA: d71cc1c5273bf14ea75f710d9613b133b33d3732

## Objective
Make the six procedural crops obey their visible botanical structure and material optics at close garden-view distance without increasing scene ownership or relying on higher crop counts.

## Acceptance
- A1 — Tomato shows a segmented/bending main stem, alternate compound leaves, and fruit trusses whose peduncles/pedicels visibly connect fruit to real stem nodes.
- A2 — Corn shows stalk nodes, alternating leaves that originate at nodes/sheaths, one ear attached at a leaf axil, and a terminal tassel.
- A3 — Pumpkin keeps one main vine, alternate node-attached leaves, and one primary fruit connected to a vine node by a short thick peduncle; no side vine requirement.
- A4 — Strawberry reads as a crown plant: trifoliate leaves split through petiolules and fruit hangs from one or more branched flower/fruit peduncles rather than independent floating stems.
- A5 — Lettuce is built from visibly independent leaves attached around one crown; outer, middle, and inner leaves overlap/cup as a rosette/head without merging into one continuous shell.
- A6 — Carrot remains a basal rosette with finely divided compound foliage and a believable crown/shoulder transition.
- A7 — Optical response is differentiated by organ and crop: leaf upper/lower surfaces, stems, husks, and harvest organs use plausible reflection, roughness, and transmission/scattering cues; tomato/strawberry are smoother than pumpkin/carrot, coarse leaves remain matte, and thin leaves transmit more light than fruit/stems.
- A8 — Fixed Node evidence includes the six-crop lineup plus close views sufficient to judge fruit attachment, leaf order/head separation, and crop-soil contact; final Verify is green.

## Non-goals
- Do not change crop counts, game stages, harvest quantities, save semantics, plot roots, renderer ownership, the render governor, or the Canvas fallback contract.
- Do not import a third-party runtime asset pack or add a second scene graph/model loader.
- Quantity may be simplified; do not spend budget on invisible botanical completeness.

## Scene carrier and affected owners
- Carrier: central beds / crops.
- Paths: `src/render/vgpu/crop-geometry.ts`, `src/render/vgpu/shaders/crop.wgsl`, focused crop tests/evidence, `.github/workflows/verify.yml` only if evidence routing needs extension.
- Architecture boundary touched: no.

## Current state
- Completed: fresh-main audit and external botanical morphology cross-check.
- Current step: rebuild visible crop topology around real nodes/crowns/trusses and separate leaf/head surfaces.
- Next action: implement geometry first, then optical parameter pass against fixed evidence.
- Blocker: none.

## Evidence
- Geometry/topology tests tied to explicit crop morphology descriptors.
- Fixed Node crop lineup and targeted close-up evidence.
- Shader validation, `npm run check`, WebGPU browser probe, and final Verify run.
