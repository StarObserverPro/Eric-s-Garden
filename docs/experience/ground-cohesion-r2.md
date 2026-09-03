# Experience note: ground cohesion R2

## What failed after adaptive terrain R1

Adaptive triangle density alone did not make the garden read as one landscape. The R1 frame still exposed implementation boundaries in three ways: the soil shoulder and terrain did not share one height authority, terrain/stone color used grid-quantized hashes that revealed square cells, and the finite terrain ended against an empty sky behind the fence.

## R2 pattern

1. **One analytic surface authority.** Keep terrain height and smooth terrain normal functions independent from tessellation. Terrain vertices, stepping stones and bed shoulders sample the same height owner. A bed skirt is only an 8 mm crack closer below that sampled surface.
2. **Adaptive topology, non-grid presentation.** Coarse-to-fine terrain density remains useful, but interior vertices are deterministically jittered and cell diagonals alternate. Smooth analytic terrain normals stop triangle boundaries from becoming a checkerboard lighting pattern.
3. **Continuous material fields.** Large and medium ground/stone variation use interpolated world-space noise. Discrete hashes are reserved for tiny sparse flecks. Material frequencies must not line up with terrain cell size.
4. **Feather both geometry and palette.** Soil detail fades before the bed edge; the bed edge converges to terrain height. The terrain material adds a narrow loam apron around each bed so geometry and palette transition together.
5. **Finite near world, cheap distant closure.** The sky pass may own a low-contrast procedural far-ground/hedgerow silhouette behind the finite terrain. It is atmosphere/backdrop only: no interactions, no second scene graph, no external asset dependency.
6. **Neutral fill belongs in shared environment radiance.** If all materials already consume a shared ambient color, add restrained neutral diffuse energy there rather than inventing another shadow-casting light direction.
7. **Natural randomness is constrained, not mirrored jitter.** Stepping stones use seeded rejection sampling with minimum separation. Grass keeps its instance budget but uses a noisy perimeter envelope with occasional inward tufts. Fence variation is much smaller than its structural straightness.

## Crystal Garden learning boundary

The useful transferable ideas were Crystal Garden's shared terrain-height semantics, smooth macro appearance variation, feathered land-cover transitions, fogged low-cost horizon layers and hemisphere/fill lighting intent. Eric's Garden keeps its vgpu/WebGPU architecture; no Three.js terrain, scene graph or Crystal-specific governance is imported.

## Verification

Numeric gates should prove shared height conformity, smooth terrain normals, adaptive density, stone separation/determinism and bounded bed relief. Shader validation and Node render/readback prove execution. Final visual acceptance still needs the representative garden camera because continuity metrics cannot prove that a horizon, grass edge or terrain palette reads naturally.
