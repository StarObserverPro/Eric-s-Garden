# Upgrade notes

## 2026-09-02 — non-vegetable Phase 1 & 2

This upgrade preserves the R2 game and save key while replacing the single-file renderer with the minimum architecture needed for the garden world.

### Added

- TypeScript, Vite and typed WGSL production build.
- Pinned `vgpu` / `@vgpu/wgsl` 0.3.1 integration.
- One renderer-neutral `GardenSceneSnapshot` and one shared `requestAnimationFrame` owner.
- vgpu renderer with one WebGPU context, manual frames, an offscreen depth target and three passes.
- Procedural soil for all twelve beds, with the existing `watered` flag driving visible wetness.
- Static bundled ground, stone path and low wooden fence.
- One instanced grass/wildflower layer with GPU wind and 500 / 1,500 / 4,000 tiers.
- Sky gradient, sun glow, drifting cloud cover, cloud shadow and level weather variation.
- Explicit DPR caps and a collapsed diagnostic/control panel.
- Automatic playable Canvas fallback for unsupported WebGPU, initialization/render failure and device loss.
- Game-model, snapshot, vgpu mock and Dawn-backed Node verification.

### Preserved

- `eric-secret-garden-r2` persistence key.
- Five levels, targets, questions, watering, pest, growth, harvest and star semantics.
- Drag rotation, pinch/wheel zoom and plot interaction.
- Existing child-facing UI, notebook, statistics and completion dialogs.
- Static deployability.

### Deliberately deferred

Vegetable geometry, shaders, materials, crop instancing, growth-curve changes and pest-art changes are not part of this upgrade. The vgpu path temporarily projects the original seedling/crop emoji from the same camera matrix; this layer is state-free and exists only as the handoff seam for the vegetable thread.

### Migration

No game-save migration is required. Rendering preferences use a separate key, `eric-secret-garden-render-r1`. A device without working WebGPU simply starts and remains on the Canvas renderer.
