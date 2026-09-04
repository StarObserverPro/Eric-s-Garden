# Procedural geometry continuity + deterministic weather R1

## Why this exists

Two failures in the wilderness repair are general enough to keep as local engineering guidance: cracked low-poly foliage caused by face-owned deformation, and a deterministic weather hash that briefly produced invalid indices because JavaScript bitwise operations reintroduced signed integers.

## 1. Randomize logical vertices, not emitted faces

A closed procedural mesh can still crack even when it starts from a watertight primitive. If each emitted triangle independently perturbs its copy of a shared corner, adjacent faces no longer agree on the edge position.

For closed low-poly solids:

1. build/subdivide the logical topology;
2. derive one stable key per logical vertex;
3. calculate procedural deformation once per key;
4. reuse the exact transformed position for every incident face;
5. flat-shade after positions are fixed if the art direction needs faceted normals.

A useful regression gate is an undirected edge census over quantized world positions. For a closed manifold surface, every edge should be consumed exactly twice. This catches geometric cracks that triangle-count, bounds and normal-length tests cannot see.

## 2. Retire a procedural visual layer end to end

When a visual layer is removed for quality or budget reasons, remove both the geometry and the shader branch that existed only to position/shade it. Hiding or degenerating geometry in the shader preserves unnecessary vertex work and leaves stale presentation logic behind.

For the wilderness grass repair, the mid/far crossed-card clusters were removed from the shared vertex geometry and the associated country-root / mid-cluster shader path was removed in the same change. The detailed near/fence vegetation kept its existing draw owner.

## 3. Deterministic randomness must stay unsigned in JavaScript

JavaScript bitwise operators operate on signed 32-bit integers. A seeded hash that begins with `>>> 0` can become signed again after a later XOR assignment such as:

```ts
seed ^= seed >>> 16;
```

If that signed value is then used with `%`, negative remainders can produce invalid array indices.

Keep each hash stage explicitly unsigned:

```ts
seed = (seed ^ (seed >>> 16)) >>> 0;
```

For renderer-visible world variation, prefer stable state-derived seeds over `Math.random()` or frame-time randomness. Weather can then vary on a low-frequency semantic transition (for example level + growth round) while remaining reproducible for tests, screenshots, HUD labels and both renderers.

## 4. Evidence hierarchy

For this class of repair, verify in this order:

- focused topology / distribution / selector tests;
- WGSL validation;
- full model and render tests;
- TypeScript production build;
- existing deterministic Node render evidence and fallback browser evidence.

A green image or shader validation alone does not prove watertight topology, and a green topology test alone does not prove the renderer path still builds.
