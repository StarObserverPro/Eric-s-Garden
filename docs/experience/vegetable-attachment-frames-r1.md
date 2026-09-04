# Vegetable attachment frames and surface QA R1

Scope: the existing six procedural vegetables; no new botanical framework or renderer owner. Implementation and evidence discussion: [PR #27](https://github.com/StarObserverPro/Eric-s-Garden/pull/27).

## What the old checks missed

At base `e8592b373b888b620808e4510c1f55f9b4e4bfd0`, all 7,394 crop triangles were wound opposite their supplied normals. Every normal could still be finite and unit-length, so the old normalization test passed. The fragment shader also mixed a strong screen-derivative face normal into fruit shading. Do not confuse a unit vector, front-facing classification, and an outward world-space normal.

The replacement check compares `cross(b-a, c-a)` with the average vertex normal, rejects degenerate faces, and includes a deliberately reversed triangle as a negative control. Smooth normals are accumulated from actual emitted faces inside one authored surface. Tube caps retain hard axial normals; separate organs are not accidentally welded together. Thin leaf/husk backs are shaded two-sided; fruit and stem normals remain outward.

## Attach a whole organ group, not a collection of independently animated parts

Use a physical base and an orthonormal right-handed frame: origin at attachment, +Y along growth, +Z the visible front, and X cross Y = Z. Rotate positions and normals through the same frame. Handle parallel axis/front hints explicitly. `cropAttachmentFrame` and `cropFramePoint` are small helpers for this carrier, not a general scene graph.

Author a leaflet from its actual petiole/rachis endpoint. A guessed leaf center minus half its length stops being a base as soon as the blade bends, tilts or changes length. Fruit apex, calyx and pedicel endpoint must agree. A parent stem needs to exist before its children emerge.

Connected support, fruit, calyx, husk, silk and seeds share the relevant group pivot and birth timing. A continuous wind field is evaluated at position for the whole plant, independent of per-material flex. Coincident points consequently receive the same displacement. Normals use the inverse transpose of that shear. Leaf-only enlargement, repulsion, jitter or stem inflation in the vertex shader can invalidate otherwise-correct authored joints; put shape and clearance changes in geometry and rebuild their normals instead.

## Recognition beats equal part counts

Keep the defining structures even in a simplified crop: carrot divided fronds and shoulder; tomato compound leaves and supported fruit trusses; corn leaf sheaths, wrapped ear, exposed kernels, silk and tassel; pumpkin vine, lobed leaves, peduncle and tendrils; lettuce cupped rosette; strawberry trifoliate leaves, calyx and visible seeds. The number of pieces is not required to match between crops.

Round-one fixed renders exposed two remaining omissions: the corn tip was too smooth and the berries had no seed detail. The correction adds low-resolution raised kernels and half-embedded seeds without another draw or vertex layout. It also closes the basal husk wrap and keeps upper leaves from masking the tassel. A husk with a green material is not proof of wrapping: the regression casts radial rays at three basal heights and checks the husk lies outside the cob. Berry seed vertices are checked against actual fruit vertices with the same growth group.

## Evidence and boundaries

Focused checks live in `tests/crop-attachments.test.ts` and `tests/crop-organ-details.test.ts`. Existing carrier, bounds, material, stage, lineup and crop-soil checks remain. `tests/crop-botany-render-node.test.ts` retains its original fixed mature views and adds two ear angles, four growth/wind states, and a growing rosette view. Its existing evidence environment variables also emit the extra PPMs into the same artifact; no workflow or browser-architecture expansion was needed.

Base evidence: Verify run `33897662369`, artifact `9946411924`. First inspected implementation: run `33924406462`, artifact `9956264889`, head `e6942295e62b3db5d464c12fe7bd0f89bb346df8`. Final exact-head results are recorded in the PR, not inferred from an earlier green build.

The final authored allocation is 9,398 triangles versus 7,394 (+27.1%), retaining one crop carrier/draw and the 13-float vertex layout. This is geometry allocation, not a measured frame-time increase. Node/vgpu software captures prove deterministic shader/model rendering, not target-device FPS or browser-WebGPU visual acceptance. Leaf overlap in a chosen view is not automatically a mesh intersection; use geometry and another view to distinguish them.

## Source transport in this environment

Direct sandbox GitHub DNS was unavailable. The connector's workflow-artifact download mounted the real ZIP; the exact build's source maps provided a temporary local workbench. Reuse the existing [source roundtrip procedure](github-actions-source-roundtrip-r1.md): check run/head provenance, write authoritative text back to the scoped GitHub branch, then validate the resulting head. Never treat the recovered sandbox copy as a second source of truth or ship it as a separate game asset.
