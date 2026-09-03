# Experience note: adaptive ground transition R1

## Problem this mechanism solves

A small diorama can still look assembled from unrelated sheets when the meadow base, bed aisles and cultivated soil each own a separate height datum and cutout rule. Material tuning alone cannot hide a 30–50 cm geometric mismatch or a punched rectangular seam.

## Pattern

Use one continuous terrain carrier below the cultivated soil, then spend geometry density according to visual distance from the carrier that needs detail.

- **Outer meadow:** coarse conforming cells. Keep the grass-root datum stable and let large flat facets provide the low-poly read.
- **Transition band:** medium cells and a smooth height lift toward the bed field.
- **Bed field:** finer terrain cells, still much cheaper than the soil mesh. The terrain continues under the beds instead of cutting exact rectangular holes.
- **Cultivated soil:** retain the dedicated high-density soil heightfield/aggregates, but make its shoulder fall into and slightly overlap the terrain. A short skirt is only a crack-closing fallback, not the apparent bed wall.

R1 uses shared non-uniform X/Z axes rather than independent quadtree leaves. That gives real spatial density changes without T-junctions or crack-stitching code. It is deliberately less locally optimal than a quadtree, but much simpler and robust for this fixed 4×3 bed layout.

## Height ownership

Do not move every scene object to a new datum just because the beds are too tall. In this garden the newly tuned perimeter grass already roots around `y=-0.39`, so R1 leaves the outer terrain near that height and lifts only the central terrain toward roughly `y=-0.20`. Bed centers can then remain near the crop root datum while their shoulders are only ~15–22 cm above the local ground instead of ~45–50 cm.

Objects that sit on the transition surface, such as stepping stones, should sample the terrain height rather than keep a fixed legacy Y value.

## Material ownership

The unified terrain shader may blend meadow-like ground into compacted earth by distance to the bed footprints. Cultivated soil remains a separate material/draw because wetness and soil microstructure are distinct concerns. The transition should happen in height, density and palette together; no single fragment-noise layer should be asked to disguise incompatible geometry.

## Verification pattern

Gate the mechanism with geometry checks that prove:

- coarse and fine axis spacings both exist;
- the central terrain is meaningfully higher than the outer meadow while the outer datum stays stable;
- soil top relief is bounded to the intended shallow-bed range;
- hardscape remains finite/bounded and keeps its material families;
- existing shader validation and Node render/readback remain green.

Real WebGPU visual review is still load-bearing because numeric continuity does not prove that the low-poly density gradient reads naturally at the game camera.
