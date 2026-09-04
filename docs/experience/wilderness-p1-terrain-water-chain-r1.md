# Wilderness P1 terrain-water chain R1

## Why this pattern exists
A small farm pond is cheap only if it is treated as a deformation/material problem inside the existing world renderer. The failure mode is to add a blue surface, then separately invent shoreline meshes, reed draws and reflection resources until the pond becomes both visually detached and disproportionately expensive.

## Reusable chain
1. **Terrain owns the basin.** Put the bowl in the same analytic `terrainHeightAt()` authority used by visible terrain and normals. Never maintain a second CPU pond-height function.
2. **Water datum comes from the bank.** Sample the uncarved outer bank and put the level surface below its lowest point. A constant chosen by eye tends to leak through the downhill edge when the carrier changes.
3. **Clip geometry before shading.** A small regular grid is enough, but only emit cells whose corners are actually submerged and inside the irregular water footprint. This avoids alpha/discard shoreline cards.
4. **Spend one opaque draw.** Two low-frequency vertex waves, shallow/deep depth coloring, view-dependent sky mix, a controlled sun lobe, rain response and normal scene fog give most of the visual return without reflection/refraction targets or transparency sorting.
5. **Shoreline is terrain material, not another mesh.** A wet/mud ring keyed to the same pond radius can live in the existing hardscape/terrain fragment path.
6. **Reuse vegetation quality prefixes.** Reserve a deterministic sparse subset of existing vegetation instances for reeds. Put the fewest reed instances in the first/minimum prefix and progressively more in later prefixes, so the existing governor naturally degrades shoreline dressing.
7. **Keep existing country grass out of water.** When mid/far procedural grass shares the same carrier, reject or push roots that land inside the pond before evaluating terrain height.
8. **Group props by function and concatenate geometry.** Barrel/crate/boards belong to the existing hardscape draw; a tiny independent prop draw is usually a worse trade than a few dozen static triangles.

## Stacking lesson from P0 → P1
P1's specification says P0 is a prerequisite. When P0 and P1 are built concurrently, do not let P1 mature against stale `main`: stack P1 directly on the live P0 head, reconcile the shared terrain/hardscape/vegetation owners there, and retarget the P1 PR to the P0 branch. Once P0 lands, the P1 PR naturally collapses to its intended delta.

For this project the composed axes are deliberately different: P0 owns the east gate / dirt road / tractor work carrier; P1 occupies the back-left water corner. That spatial separation is cheaper and more legible than trying to interleave both feature groups in the same midground silhouette.

## Budget rule
Keep the water contribution independently measurable. The expected budget shape is:
- passes: unchanged;
- water: +1 draw;
- reeds: +0 draws;
- bank props: +0 draws;
- water textures / fullscreen passes / reflection targets: 0;
- water grid: small enough to remain comfortably inside the document limit before using any user-authorized contingency.

The authorized contingency is not a target. Use it only after evidence shows a visible defect that cannot be fixed by composition, clipping or shader response first.
