# Experience note: split the garden world without splitting ownership

This note records the reusable part of the Phase 1/2 non-vegetable construction. It is not a boot requirement.

## The useful split

“Do the world now; do vegetables in another thread” is safe only when the split is by **presentation carrier**, not by game state or frame loop.

The working chain is:

```text
game model
  -> serializable game state
  -> renderer-neutral GardenSceneSnapshot
  -> one RenderRuntime / one requestAnimationFrame owner
      -> VgpuRenderer, or
      -> Canvas2DRenderer fallback
```

Soil consumes only plot position and wetness. Environment consumes only camera and weather. The later vegetable renderer can consume crop/stage/pest fields from the same snapshot. No thread needs to fork the save model, camera, input, or scheduler.

## Why the temporary crop marker is acceptable

The WebGPU path would otherwise make the child-facing game less legible until vegetable art exists. The temporary marker layer:

- is projected with the same vgpu camera matrix;
- has `pointer-events: none`;
- owns no state and starts no frame loop;
- preserves the exact old seedling/crop emoji behavior;
- is explicitly outside the Phase 1/2 GPU acceptance contract.

This is a migration seam, not a second renderer. Remove it when GPU crop geometry reaches visual and interaction parity.

## vgpu chain that proved useful

- Pin `vgpu` and `@vgpu/wgsl` together.
- Let Vite load typed `.wgsl` modules.
- Use manual `frame(gpu, callback)` inside the application-owned RAF rather than adding a vgpu `frameLoop`.
- Precompile draws against the depth target before recording bundles.
- Update packed uniform values in place; do not rebind resources that a bundle captured.
- Keep raw device-loss observation under `src/render/vgpu/raw/`.
- Treat resize as generation replacement: build a new offscreen target and bundles, swap only when ready, then retire the old generation.
- Keep quality knobs small and inspectable: instance tier plus DPR cap.

## Handoff rule for the vegetable thread

Replace only the crop marker carrier and add crop-specific shaders/materials below `src/render/vgpu/`. Do not introduce another `requestAnimationFrame`, another WebGPU device, another camera, another scene snapshot, or a crop-only save model. Canvas crop markers remain the fallback reference until the new crop path reaches parity.
