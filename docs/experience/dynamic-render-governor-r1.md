# Dynamic render governor R1

## Why this exists

Eric's Garden already had the correct ownership skeleton: one renderer-neutral snapshot, one `RenderRuntime` requestAnimationFrame owner, one active renderer, one vgpu/WebGPU context, static bundles and explicit instance ceilings. What it did not have was a runtime policy that could reduce non-core GPU workload when a device could not sustain the authored ceiling.

Crystal Garden supplied the useful control idea: use slow p95 windows, degrade faster than recovery, and keep quality changes hysteretic. Its concrete Three/WebGL levers do not transfer directly because Eric's Garden submits an explicit WebGPU workload rather than mutating a Three.js scene graph.

## R1 architecture

```text
User RenderSettings (hard ceiling)
            |
requestAnimationFrame cadence
            v
     RenderGovernor
            |
            v
 RuntimeQualityProfile
            |
            v
      VgpuRenderer
            |
  pre-recorded vegetation
  render-bundle variants
```

The user's vegetation selection remains a ceiling. The governor may choose a lower prepared tier but must never exceed it.

R1 recognizes four budget classes for future consumers:

- `core` — gameplay truth and required feedback; never hidden for performance;
- `structure` — the world needed to read the scene; preserve unless a specific optical quality knob exists;
- `dressing` — density/distance/detail may scale;
- `ephemeral` — particles and optional transient effects are first candidates for reduction or disablement.

Only the existing vegetation workload is wired in R1. Do not add dummy fields for future effects merely to fill out the taxonomy.

## WebGPU-specific rule: do not call CPU encoding time "GPU frame time"

`performance.now()` around `renderer.render()` measures JavaScript work plus WebGPU command encoding/submission. The GPU executes asynchronously after submission, so that number is useful as a CPU diagnostic but is not GPU execution time.

R1 therefore drives the governor from requestAnimationFrame cadence p95 over two-second windows. `frameMs` remains the smoothed CPU-side render/encoding duration and is labeled as such in diagnostics. A later GPU timing worklet may add optional timestamp-query evidence if the pinned vgpu/device feature path is justified; it must not become a requirement that breaks otherwise valid devices.

## WebGPU-specific rule: quality switching should select workload, not reconstruct the world

vgpu 0.3.1 render bundles allow `BundleRecorder.draw(drawable, { instances })`. R1 exploits that directly:

1. create one vegetation `Draw` using one shader and one geometry;
2. compile that draw once for the scene target;
3. record bundle variants for every tier at or below the user's ceiling;
4. at render time select the bundle matching `RuntimeQualityProfile.vegetationInstances`.

Changing 4,000 -> 1,500 -> 500 instances therefore does not dispose or recreate the renderer, device, geometry, shader or pipeline. Resize still creates a new generation because the scene target changes; that is a separate resource-lifecycle seam.

The bundle API used here was checked against the exact `vgpu` `v0.3.1` tag, not only current upstream documentation.

## Hysteresis

The first policy is intentionally conservative:

- p95 >= 34 ms: strong pressure increase;
- p95 >= 27 ms: moderate pressure increase;
- p95 >= 24 ms: mild pressure increase;
- p95 <= 17.2 ms: recovery candidate;
- recovery changes pressure only after three consecutive fast windows.

Pressure maps to quality relative to the configured ceiling, not to a universal absolute quality. A 500-instance user ceiling stays 500 even at `full`; a 4,000 ceiling may step through 1,500 to 500.

These constants are policy, not physical truths. Change them only with fixed-device evidence rather than aesthetic preference.

## Hidden-page lifecycle

The single runtime owner now cancels its scheduled RAF while `document.visibilityState === "hidden"`. On resume it resets cadence/FPS/CPU timing samples before scheduling the next frame. The hidden interval therefore cannot be mistaken for sustained render pressure.

Do not add another visibility listener inside vegetation, weather or future effects. They consume runtime quality state; they do not own scheduling.

## Diagnostics

Runtime diagnostics expose:

- FPS;
- rAF cadence p95;
- CPU-side render/encoding ms;
- quality pressure and relative level;
- active vegetation tier;
- ordinary pass/draw/resource/DPR counts.

This separation matters during tuning: a low CPU encoding time with poor cadence can still indicate GPU/display pressure; a high CPU encoding time is actionable but should not be mislabeled as GPU time.

## Extension rule

Add the next quality lever only when a real consumer exists. Preferred order is:

1. optional `ephemeral` layers;
2. `dressing` density/distance/detail;
3. internal scene render scale if measurements show fragment cost dominates;
4. more advanced culling/indirect/compute only after simpler instancing and bundle controls are proven insufficient.

Do not prebuild a generic ECS, quality graph, shader graph or GPU-driven culling framework.

## Parallel-work note

The first implementation was developed while hardscape PR #7 was independently editing `vgpu-renderer.ts`. Governor integration is intentionally limited to vegetation bundle ownership and runtime scheduling. If the hardscape branch lands first, replay the vegetation-specific integration onto the new renderer rather than restoring obsolete path/fence code during conflict resolution.
