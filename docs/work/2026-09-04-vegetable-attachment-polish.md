# Vegetable attachment and recognition polish

Status: executing
Base main SHA: e8592b373b888b620808e4510c1f55f9b4e4bfd0

## Objective
Refine the existing six vegetables so organ connections, surface normals and indispensable identifying structures remain convincing at close range and during growth/wind.

## Acceptance
- A1 — Triangle winding agrees with outward/front normals; curved surfaces derive normals from their actual shape, not unrelated approximations.
- A2 — Leaves start at their petiole/rachis endpoints, fruit and calyx use one attachment frame, and shared growth/wind does not pull connected organs apart.
- A3 — Corn has a recognizably layered husk around an oriented ear, silk and tassel. Preserve carrot divided fronds, tomato compound leaves/trusses, pumpkin vine/lobed leaves/peduncle, lettuce rosette and strawberry trifoliate leaves/calyces; add missing necessary recognition details rather than equalizing part counts.
- A4 — Inspect fixed-view six-crop/detail/soil-contact rendered evidence and numeric regression checks. Keep one crop carrier/draw and existing game/save/renderer ownership.

## Non-goals
- No new crop roster, game/save changes, scenery/HUD work, dependency upgrades, merge or deployment.

## Scene carrier and affected owners
- Carrier: existing crops in central beds and pumpkin's existing overflow footprint.
- Paths: src/render/vgpu/crop-geometry.ts; src/render/vgpu/shaders/crop.wgsl; focused crop tests and evidence; one experience note.
- Architecture boundary touched: no.

## Current state
- Completed: none.
- Current step: reproduce from exact main artifact, audit primitive winding and attachment transforms.
- Next action: repair geometry and deformation, then compare the same render views.
- Blocker: local checkout cannot reach GitHub DNS; connector and Verify artifact roundtrip are available. Sandbox is a temporary workbench only; authoritative changes go to this GitHub PR.

## Evidence
- Main Verify run 33897662369 / artifact 9946411924; source recovered from its exact-build source maps and baseline render captures inspected.
- Numeric baseline: all 7,394 triangles have winding opposed to the supplied normals.
