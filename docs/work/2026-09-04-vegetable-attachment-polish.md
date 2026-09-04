# Vegetable attachment and recognition polish

Status: review
Base main SHA: e8592b373b888b620808e4510c1f55f9b4e4bfd0
PR: https://github.com/StarObserverPro/Eric-s-Garden/pull/27

## Objective
Refine the existing six vegetables so organ connections, surface normals and indispensable identifying structures remain convincing at close range and during growth/wind. Part counts may differ; defining structures must not be omitted.

## Acceptance and implementation
- A1 — Correct CCW winding, nondegenerate faces, actual curved-surface normals and closed tube caps. `tests/crop-attachments.test.ts` checks orientation, a reversed-triangle negative control and closed harvest meshes.
- A2 — Base-authored leaflets; shared attachment frames, pivots and birth timing for connected organs; one continuous wind field with its inverse-transpose normal transform. Remove position-only shader patches. Check actual seed-to-fruit surface distance and shared growth groups.
- A3 — Corn has layered wrapping husks, a tilted cob, raised kernels, silk, sheaths and an exposed tassel. Preserve divided carrot foliage, compound tomato leaves/trusses, pumpkin vine/lobed leaves/peduncle and add tendrils, lettuce rosette, strawberry trifoliate leaves/calyces and add seeds. Radial-ray tests check the basal husk lies outside the cob without gaps.
- A4 — Preserve and inspect fixed-view six-crop/detail/pumpkin/production-soil evidence. Add ear front/back closeups, stage 1.5/2.4/3.3/4 with wind and a growing rosette capture. Record final exact-head Verify and visual observations in the PR.

## Non-goals and ownership
No new crop roster, game/save changes, scenery/HUD work, dependency upgrades, renderer lifecycle changes, merge or deployment. Same central-bed carrier and existing pumpkin overflow footprint. Runtime owners changed only in `src/render/vgpu/crop-geometry.ts` and `src/render/vgpu/shaders/crop.wgsl`.
Architecture boundary touched: no.

## Completed
Geometry and shader fixes, two refinement rounds, focused regression coverage and a durable experience note at `docs/experience/vegetable-attachment-frames-r1.md`.

Base: 7,394 triangles, all opposed to their supplied normals. Final authored allocation: 9,398 triangles (+27.1%), 28,194 vertices, same 13-float vertex layout and one crop carrier/draw. Numeric workbench audit: zero reversed/degenerate faces, closed harvest edges, covered basal husk rays, matching support groups. Allocation is not a target-device performance measurement.

## Evidence and current step
- Base Verify run 33897662369 / artifact 9946411924.
- First implementation Verify run 33924406462 / artifact 9956264889, head e6942295e62b3db5d464c12fe7bd0f89bb346df8: shader/model/build passed; fixed renders inspected. Inspection led to raised kernels/seeds, a tighter husk base, adjusted upper corn leaves/tassel and fuller compound leaflets.
- Current step: final-head hosted evidence review. The PR evidence comment is the authoritative final run/head/visual result, avoiding a self-referential commit SHA in this file.
- Browser-WebGPU visual and target-device performance are not claimed; model evidence uses the repository's Node/vgpu software renderer. Existing hosted Canvas fallback remains integration evidence, not crop-WebGPU proof.
- Blocker: none remaining in the source transport path. Direct sandbox DNS failed; connector artifact/source-map roundtrip worked. The sandbox is temporary only; changes are authoritative in this PR, not a separate external asset.

## Handoff
Review the final PR evidence, especially ear wrapping, leaf/support connections and fruit silhouette. Merge and deployment remain separate user-authorized actions. Remove this temporary packet after merge/cancellation; retain the experience note and focused tests.
