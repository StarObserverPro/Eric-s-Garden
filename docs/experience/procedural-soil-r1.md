# Experience note: procedural soil R1

## Why the previous carrier failed

A garden bed that is only a low-poly box plus fragment color noise can exercise WebGPU without producing meaningful soil. The visible result stays planar, edge lighting reads as a slab, and extra shader work does not create the mass, breakup or scale hierarchy that make cultivated earth recognizable.

For this project, soil quality should be built in three spatial bands rather than pushed into one shader:

1. **Macro form — real geometry.** The bed is a broad earthen mound with shoulders that fall toward the surrounding ground. Its outline may remain plot-readable, but the edge must warp, round and break instead of ending as a vertical rectangular wall.
2. **Meso form — real aggregates.** Centimeter-scale relief comes from the heightfield plus discrete faceted clods/occasional pebble-like pieces. These are geometry because they need silhouette and facet lighting.
3. **Micro form — material shading.** Fine grain, mineral flecks and sub-centimeter breakup belong in procedural albedo and micro-normal perturbation. They should enrich geometry, not substitute for it.

## R1 implementation

- Twelve plots are generated deterministically into one static soil carrier.
- Each plot uses a 72×72 top grid, a short ground-closing skirt, and 40 seeded faceted aggregates.
- Final carrier: **150,528 triangles / 451,584 vertices / 480 explicit aggregates**.
- The outer heightfield shoulder collapses toward the garden ground, so apparent thickness comes primarily from the earth mound rather than a dark side wall.
- A dedicated `soil.wgsl` owns soil color hierarchy, procedural micro-normal breakup, slope/facet lighting, rough diffuse response and view-dependent specular.
- Soil stays a separate draw/material from the generic ground/path/fence shader. This is important: future wetting can modify the soil material/state without turning the general garden shader into a collection of soil exceptions.

## Audit pattern

A green shader compile is not sufficient visual evidence. The soil worklet uses four layers of proof:

1. deterministic geometry assertions for plot count, triangle/vertex accounting, normalized normals, aggregate count and substantial real height range;
2. strict vgpu WGSL validation;
3. vgpu mock compile/draw coverage;
4. a Dawn/software-WebGPU Node render that reads pixels back, asserts visible brown area and luminance variation, and writes a deterministic PPM frame for human review.

The human review is load-bearing. The first passing frame still looked like chocolate slabs, so R1 was not accepted until the shoulder geometry was changed to collapse toward the ground and aggregate scale was increased.

## Wetting seam

This work intentionally does **not** solve wetting propagation. Existing per-plot wetness remains a compatibility material input only. A later wetting worklet should treat this soil carrier/material as the receiving surface and add spatial moisture state separately; it should not reopen the question of what dry soil geometry is.

## Performance note

The soil mesh is static but currently rebuilt with a vgpu generation on render-target resize. If profiling later shows resize/re-entry allocation cost matters, cache or share the deterministic CPU geometry across target generations. Do not prematurely build a generic mesh cache unless another real carrier needs the same lifecycle.
