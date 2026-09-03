# WebGPU Surface lifecycle and verification R1

## What failed

Eric's Garden originally precompiled the final blit effect with the live browser `Surface`:

```ts
await blit.compile(output);
```

With pinned vgpu 0.3.1, a `Surface` may only be used while `frame(gpu)` is active. Passing it to `effect.compile(surface)` during initialization therefore throws `VGPU-SURFACE-NOT-IN-FRAME` even though shader validation, mock rendering and Node/Dawn offscreen targets are healthy.

## Correct pattern

Precompile browser presentation from the Surface's target signature, then touch the live Surface only inside the frame:

```ts
await blit.compile({ colors: [output.format] });

frame(gpu, (currentFrame) => {
  currentFrame.pass({ target: output }, (pass) => pass.draw(blit));
});
```

Use an offscreen `target(gpu, ...)` directly for compile/readback tests; that is a different lifecycle contract from a browser Surface.

## Verification lesson

A Node/Dawn render test and a Canvas fallback screenshot cannot prove the browser Surface lifecycle. For renderer/resource architecture changes, run a production build in a WebGPU-enabled browser and assert that Eric's Garden still reports `vgpu · WebGPU` after real animation frames.

vgpu 0.3.1 documents a Linux/container route using `agent-browser --webgpu --headed` with SwiftShader/Vulkan. This provides browser WebGPU correctness evidence without claiming hardware-GPU performance.

This is intentionally architecture-scoped. Pure crop/soil/vegetation/hardscape/material modeling changes should validate their own shader, geometry, bounded render or visual contract; they do not inherit the browser architecture smoke unless they also change renderer initialization, Surface/frame usage, resource lifecycle, fallback switching or build integration.
