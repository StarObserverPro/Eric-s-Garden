# Wilderness P0 single-draw layering R1

## Pattern

Eric's Garden can add a visibly larger countryside without adding a renderer owner:

- keep terrain-scale road/rut/contact variation in the existing hardscape world-coordinate material;
- concatenate procedural tractor/work/boundary geometry into the existing hardscape vertex stream;
- carry two simplified mid/far grass clusters inside each existing vegetation instance rather than creating a second vegetation draw;
- let the existing vegetation render-bundle tier select how many combined instances execute.

This preserves one `Gpu`, one frame owner, the three-pass frame and the existing hardscape/vegetation draws while still separating near-detail grass from middle-distance field texture.

## Budget lesson

At the default 1,500 vegetation tier, two 6-triangle country clusters per instance produce 3,000 mid/far clusters and 18k added triangles. That is a useful countryside fill ratio without raising instance count. Cap the mid/far branch by `instance_index` so an optional 4,000 near-grass ceiling does not silently become 8,000 distant clusters.

Static scenery benefits from spending triangles on silhouette-bearing primitives (tractor tires, foliage crowns, hay cylinders) rather than creating extra draws or textures. Keep new static geometry measured separately even when it is concatenated into the hardscape buffer.

## Contact rule

A prop that visually rests on the field should use `terrainHeightAt` for placement. For heavy/recognizable objects, pair that with a low-frequency terrain material contact mask or local grass redistribution. Do not add floating road cards or screen-space fake ground shadows merely to hide a contact seam.

## Stop conditions

Escalate beyond this pattern only when one of these becomes true:

- the shared hardscape shader can no longer keep material kinds readable;
- static scenery needs independent lifecycle/visibility rather than one baked generation;
- mid/far vegetation needs a quality policy that cannot be expressed by the existing instance-tier bundles;
- measured frame pressure shows that vertex work from degenerate capped clusters is materially worse than one extra governed draw.

Until then, a new pass, scene graph, texture pipeline or generic asset system is unnecessary complexity.
