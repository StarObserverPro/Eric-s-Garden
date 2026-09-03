# Experience note: bake small static scenery when instances stop helping

Eric's Garden originally represented the stepping stones and fence as 64 box instances sharing the general garden shader. That was cheap to author, but it also made every hard surface look like a scaled primitive.

For a small diorama with fixed scenery, a better trade is to generate the hardscape once on the CPU and upload one static mesh:

- narrow packed-earth aisles can be triangulated around the known bed footprints;
- each stepping stone can carry its own low-poly rings and facets;
- fence posts and rails can carry deterministic lean, taper, sag and cross-section variation;
- one material-kind attribute lets one dedicated shader shade earth, stone and wood without pushing exceptions into the soil or vegetation shaders.

The useful rule is not “bake everything.” Use this when the carrier is static, small, deterministic and visually benefits from per-object topology. Keep instancing for repeated high-count families such as grass, where instance count and motion are the point.

This split also helps parallel visual work: hardscape owns its geometry and material module, while vegetation and sky can evolve without sharing shader edits.
