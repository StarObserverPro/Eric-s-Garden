# Vegetable Baseline R1

Status: executing
Base main SHA: e02e637589aab2576b7ba6755fb2bc54d9265f2d

## Objective
Replace DOM crop emoji presentation on the vgpu path with recognizable, spatially anchored low-poly geometry for the existing six crops and four game stages.

## Acceptance
- A1 — carrot, tomato, corn, pumpkin, lettuce and strawberry render as distinct 3D crop silhouettes on the vgpu path; no crop requires its emoji to identify it.
- A2 — crop roots consume the existing `ScenePlot.position` / `PLOT_POSITIONS` authority. Ordinary crop mass stays within its home bed; pumpkin vine/leaves may spread beyond the bed while the plant root and single primary fruit remain anchored to the home plot.
- A3 — carrot exposes a restrained orange shoulder and uses fine divided foliage rather than generic strap leaves.
- A4 — the current game truth remains one crop unit per plot and stages `1..4`; renderer geometry changes do not change saves, level counts, harvest semantics or Canvas fallback.
- A5 — stage presentation progresses from juvenile to mature form with stable soil contact and species-scale targets; the crop carrier leaves a direct path for future plot-local multi-plant clusters without introducing that gameplay now.
- A6 — crop geometry is intentionally allowed a higher per-instance budget than grass/soil because only twelve crop roots exist; geometry and shader checks remain deterministic and bounded.
- A7 — Quaternius Ultimate Crops Pack is recorded as CC0 visual/stage reference and geometry donor. The raw third-party pack stays outside the repository; only project-authored/normalized runtime geometry and compact provenance enter GitHub.

## Non-goals
- Do not change the 12 plot positions, bed geometry, level crop counts, save schema, harvesting quantities, or implement bundled harvest yet.
- Do not add a second renderer, scene graph, WebGPU device, model loader framework, or dependency upgrade.
- Do not implement the final full-screen occluded topology-swap presentation in this worklet; this baseline uses one stable procedural crop carrier so stage readability can be reviewed first.

## Scene carrier and affected owners
- Carrier: central beds
- Paths: `src/render/vgpu/crop-geometry.ts`, `src/render/vgpu/shaders/crop.wgsl`, `src/render/vgpu/vgpu-renderer.ts`, crop tests, compact vegetable provenance/experience docs, `package.json`
- Architecture boundary touched: no

## Current state
- Completed: alignment, current-main audit, spatial authority audit, CC0 source verification
- Current step: build the crop geometry/shader carrier and replace the vgpu emoji glyphs with geometry while preserving pest/mature badges and picking.
- Next action: run hosted verification, repair only affected failures, then review the six species/stage silhouettes.
- Blocker: raw Quaternius ZIP binary cannot be ingested by the current connector execution surface; source remains reference-only for this worklet and runtime geometry is project-authored.

## Evidence
- Quaternius official/OpenGameArt source: 102 models, five growth stages, FBX/OBJ/Blend, CC0.
- Geometry contract tests: pending.
- WGSL validation: pending.
- `npm run check` on final branch head: pending.
