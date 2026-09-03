# Vegetable Spatial Carrier R1

This note records the reusable spatial lesson from the first 3D vegetable carrier. It adapts the procedural-world rule that authored spatial facts and procedural presentation must remain separate.

## 1. Plot position is the fact

`ScenePlot.position` / `PLOT_POSITIONS` remains the only authority for where a crop unit is planted. Soil, picking, hardscape clearance and crop rendering must consume that authority rather than inventing parallel crop coordinates.

The crop renderer may decide how geometry grows around that root, but it may not move the root because a generated plant would look nicer elsewhere.

## 2. Root, home footprint and presentation overflow are different concepts

Each rendered crop has:

- a **plot root** — authored game/scene fact;
- a **home footprint** — the ordinary visible mass expected to remain around its bed;
- optional **presentation overflow** — leaves, runners or vines that can visually extend outside the bed without changing ownership.

For the current six crops:

- carrot, tomato, corn, lettuce and strawberry keep their main mass at bed scale; small leaf-tip overflow is harmless;
- pumpkin is the explicit large-overflow exception: vine and leaves may travel outward, but the root and one primary pumpkin fruit stay attached to the home plot.

The pumpkin carrier orients its long local +X vine outward from the garden center at render time. This is a presentation transform around the authoritative root, not a new placement system.

## 3. Stable local frame makes growth cheap

Every species uses a normalized local frame:

- local soil/root frame starts at the plot root;
- +Y is up;
- organs carry their own attachment anchor;
- stage growth scales each organ from its attachment anchor instead of from world origin;
- plot-local orientation is applied after growth.

This means stage progression can remain continuous even when new organs emerge, while the root never slides laterally or vertically.

## 4. Rendering budget follows product importance, not object count

There are only twelve crop roots, so crop geometry is intentionally treated as a high-value `core` workload rather than being forced into grass-like triangle austerity. R1 uses one crop draw and a high-detail six-species superset. The dynamic render governor continues to reduce dressing vegetation first; it does not remove game-truth crops.

A low object count is therefore not a reason to make crops visually cheap. It is an opportunity to spend more geometry/material budget per crop while keeping total scene cost bounded.

## 5. Future multi-plant / bundled harvest path

The current game truth remains one crop unit per plot. A later product revision can make one plot visually contain several plants and harvest as one bundle/box without changing plot coordinates:

```text
plot root (game truth)
  -> plot-local cluster layout (presentation or later game quantity)
     -> member 0
     -> member 1
     -> member 2 ...
  -> one harvest unit: bundle / bunch / box
```

Do not implement this merely as hidden extra plants while gameplay still says “one carrot”. When activated, align the product meaning of counts/questions/harvest first. The renderer is already compatible with plot-local multiplicity because member positions can be derived as local offsets under the same root.

## 6. Source/reference boundary

Quaternius Ultimate Crops Pack is used as a CC0 stage/silhouette reference and potential geometry donor. Raw third-party packs stay outside GitHub by default. The repository stores compact provenance and project-normalized runtime geometry/code, not an undifferentiated source archive.
