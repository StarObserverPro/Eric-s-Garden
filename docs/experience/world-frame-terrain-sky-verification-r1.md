# Experience note: one world frame needs one authority chain

When terrain, atmosphere and sunlight are developed in parallel, the easiest failure mode is not a bad shader. It is duplicated authority: one camera for geometry, another implicit camera for sky, a painted far-ground silhouette, or a sun disc whose direction does not match material lighting.

The useful ownership split for Eric's Garden is:

- `scene/camera-controls.ts` owns user-facing camera policy such as zoom range, FOV and vertical pose;
- `render/vgpu/world-frame.ts` consumes that policy and produces the exact world camera basis used by geometry and sky rays;
- one normalized world-space sun direction feeds both the visible solar disc and direct material lighting;
- distant terrain remains geometry sampled from the same terrain-height authority, but its polygon spacing may increase aggressively with distance;
- the sky pass owns atmosphere, clouds and sun only. It must not own ground or hedge silhouettes.

Verification needs to follow the same semantic boundaries. Three practical lessons came out of this change:

1. For WGSL source-contract tests, read the raw `.wgsl` file. A transformed test import may be a compiled module object/array rather than source text.
2. For large procedural meshes, scan every vertex but aggregate validity/bounds/normal failures and assert once. Creating an assertion object per scalar can turn a cheap geometry check into a test timeout.
3. Visual evidence thresholds should describe composition semantically and proportionally. A fixed quota such as “20,000 blue pixels” silently bakes in an old camera composition; a low shared-camera horizon probe should instead require visible foreground, horizon/warm atmosphere, upper-atmosphere area and luminance range.

A useful diagnostic rule follows: if moving the world camera breaks only a sky-pixel quota while world-ray, sun-direction and geometry contracts remain correct, first audit the evidence composition before changing the renderer back toward a split camera.