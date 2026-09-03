# Vegetable Modeling & Growth Guide R1

Status: canonical planning guide; runtime work activates separately.

## 1. Product quality bar

Vegetables are constrained by real-world recognition. The goal is not botanical simulation for its own sake, but a child should be able to look at the crop and say what it is without relying on a label or emoji.

Review priority is fixed:

1. species silhouette / immediate recognizability;
2. whole-plant scale and proportion;
3. organ relationships and topology;
4. leaf / fruit / bulb / ear shape;
5. material and optical finish.

A beautiful shader cannot compensate for the wrong tomato architecture or a carrot top that reads as another plant.

## 2. Constraint matrix

| Topic | Level | Contract |
| --- | --- | --- |
| Species recognizability | **HARD** | Every promoted stage must plausibly read as the intended crop against real/model references. |
| Reference grounding | **HARD** | Modeling decisions must be traceable to enough references to judge silhouette, proportions, organ placement, and stage progression. |
| Current game-stage mapping | **HARD** | Renderer presentation must follow the renderer-neutral game model. On current `main`, that means stages `1..4`; the renderer must not invent a divergent stage truth. |
| Four stages forever | **SOFT** | Four stages are the current game baseline, not a permanent biological/modeling law. Changing the game stage count is a separate explicit game-model decision. |
| Batch synchronization | **HARD** | Crops planted in one game batch advance stage together. Real-world crop calendars do not create different clocks per species. |
| In-stage continuity | **HARD** | While a stage is visibly active, changes must be continuous enough to avoid a visible mesh/topology pop. |
| Cross-stage discontinuity | **HARD** | A large topology/model replacement is allowed, but when visible it must happen only under confirmed full-view occlusion; if not visible it may swap directly. |
| Occlusion motif | **RECOMMENDED** | Leaf sweep, garden letter, foreground foliage, mist, basket, etc. are interchangeable transition presentations. |
| Whole-stage static assets | **SOFT / allowed** | A stage may use a separately authored static model; not every crop needs a procedural organ generator. |
| Modular organ system | **SOFT / crop-dependent** | Use modular leaves/stems/fruits where it reduces work or improves growth. Do not force simple crops or good stage assets into unnecessary decomposition. |
| Canonical scale / soil frame | **HARD** | All stages of one species share a normalized root, soil plane, up axis, facing convention, and measured mature size targets. |
| Modular attachment frame | **HARD when modular** | Any independently attached organ uses a defined pivot and full orientation frame; no guessed position + Euler patchwork. |
| Difficulty-first expansion | **RECOMMENDED** | Prefer easy, distinct crops before adding additional tomato/vine-like complexity. |
| Reference count | **SOFT** | Target roughly 3–5 primary references per species; quality matters more than count. |
| Source website | **RECOMMENDED** | Search any useful model/photo/game-asset sources; do not bind the workflow to one site. |
| vgpu review path | **SOFT default** | Use the repository's vgpu path for interactive model review unless a better method preserves the HARD review outcomes and architecture boundaries. |
| Foliage simplicity | **RECOMMENDED** | Put budget into shape, thickness, pose, and recognizable structure before complex foliage optics. |
| Fruit / harvest-organ polish | **RECOMMENDED** | Fruiting crops may spend more geometry/material budget on the harvest organ than ordinary leaves. |
| Crystal/glow effects | **RECOMMENDED against by default** | Real vegetables do not need fantasy glow/transparency. Use only restrained optical treatment that still reads as the real crop. |
| Fixed geometry budgets | **SOFT / deferred** | Measure real crop scenes first; do not invent global triangle/draw caps in advance. |

## 3. Growth model: continuous inside, discrete between stages

### 3.1 Current batch semantics

Current `main` already provides the useful game rule:

- planting creates crop plots at stage 1;
- a successful Grow action advances all living ready plots by one stage;
- current maximum is stage 4;
- all crops in the batch move together.

The 3D system should exploit this instead of simulating separate tomato, corn, lettuce, and pumpkin calendars.

### 3.2 Stage-internal continuous change — HARD

Within one stage, valid continuous controls include:

- whole-plant scale / stature;
- leaf length, width, bend, opening, or pose;
- bulb/root/fruit swelling;
- fruit maturity color;
- stem extension;
- a new organ emerging from near-zero at an already valid attachment point;
- small wind-rest-pose differences that do not change topology.

A crop does **not** need to interpolate every vertex from seedling to maturity. It needs to look continuous during the interval Eric can actually see.

### 3.3 Stage boundary as an occluded topology boundary — HARD outcome

At a stage boundary the next representation may change substantially:

- different mesh;
- different leaf count;
- different branch count;
- different organ hierarchy;
- separately authored whole-plant model.

If the swap is in view, use a scene-level transition that confirms the camera is actually covered before replacing crop geometry:

1. request stage change;
2. transition enters the foreground;
3. transition reports `covered = true` or equivalent;
4. replace all affected batch crop stages;
5. render the new stage successfully;
6. release the cover.

Do not rely on a guessed `setTimeout(500)`; slow frames must not expose the swap.

Because the garden grows as a batch, one camera-cover event can hide **all crop swaps for that Grow action at once**. This is substantially cheaper and safer than inventing a separate transition for each plant.

Recommended variety across the three current boundaries:

- a broad leaf blows across the camera;
- a garden note/letter opens into the foreground;
- foreground foliage, mist, basket, or another garden event covers the view.

These motifs are presentation choices, not acceptance gates.

## 4. Geometry normalization

### 4.1 Whole-stage asset frame — HARD

Every runtime crop stage resolves to a normalized plant frame:

- +Y is up;
- local soil plane is `Y = 0`;
- root/origin is the intended center of soil contact;
- one stable forward convention is used across all stages of the species;
- scene scale is expressed consistently in project world units;
- stage replacement must not cause unexplained lateral or vertical jumps.

A downloaded model may retain arbitrary authoring coordinates internally if a deterministic wrapper normalizes it at runtime/import time.

### 4.2 Species size metadata — HARD

Before a species is accepted, record comparison targets/ranges for the attributes that materially affect its identity:

- mature height;
- mature spread;
- typical leaf-to-plant scale;
- fruit/bulb/root/ear size where present;
- expected visible harvest-organ count when relevant;
- soil exposure/depth for roots or bulbs when visible.

These are game-modeling anchors, not promises of botanical measurement precision.

### 4.3 Modular organ frame — HARD when modular

If leaves, branches, flowers, fruits, tendrils, etc. are separate attachable assets:

- origin = physical attachment point to parent;
- +Y = base-to-tip / growth direction;
- +Z = authored front normal;
- +X = right, preserving a right-handed frame;
- attachment uses a full orientation frame/quaternion, not guessed Euler rotations.

Normals, handedness, and mirroring must be inspectable. Double-sided leaves are an intentional rendering choice, not a way to hide broken normals.

## 5. Difficulty ladder

This ladder is a **RECOMMENDED construction order**, not a taxonomy or gate.

| Difficulty | Pattern | Examples | Main difficulty |
| --- | --- | --- | --- |
| D0 | bulb/base + narrow strap leaves | onion, garlic/garlic shoot, leek/scallion | simple base geometry, few long leaves, no branching |
| D1 | rosette / central leaf addition | lettuce, bok choy, spinach | leaves enlarge; new inner leaves can appear between stages |
| D2 | simple upright crop / simple fruiting bush | corn, eggplant, pepper | manageable stems/leaves; harvest organ gives strong identity |
| D3 | root crop / low fruiting rosette | radish, beet, carrot; strawberry around this range | root/leaf or leaf/fruit relationship needs more authored structure |
| D4 | complex semi-vining fruiting plant | tomato | compound leaf read, branching, clusters, semi-vining architecture |
| D5 | true vine / support-dependent plant | pumpkin, cucumber, beans | spatial route, nodes, tendrils, flowers/fruits, support interaction |

### Existing six crops

The current roster is not difficulty-optimized and should not be rewritten just to simplify modeling:

- lettuce — relatively easy;
- corn — moderate but structurally clear;
- strawberry — moderate;
- carrot — moderate/harder foliage;
- tomato — hard;
- pumpkin — hardest class because of vine topology.

For the hard existing crops, stage assets + occluded swaps are specifically intended to avoid forcing an over-general procedural generator to reproduce every real morphology.

### Expansion recommendation

If the product grows from six crops toward roughly 8–10 or somewhat above, favor visually distinct low-cost additions first, such as:

- onion;
- garlic / garlic shoot;
- leek / scallion;
- bok choy;
- eggplant;
- pepper;
- radish / beet.

The final roster remains a product choice. This list is sequencing guidance only.

## 6. Asset strategy

Use a hybrid strategy rather than demanding one modeling method for every crop.

### Preferred asset roles

- **multi-stage runtime candidate** — already contains useful growth stages;
- **whole-stage donor** — good S2/S3/S4 silhouette even if not continuously deformable;
- **organ donor** — useful leaf, fruit, bulb, ear, flower, etc.;
- **mature reference** — visually strong but unsuitable for direct runtime use;
- **stage reference** — useful for juvenile/intermediate proportions;
- **visual reference only** — image/model used only to judge form.

A single excellent multi-stage pack can be more valuable than five unrelated static models.

Current recommended reference pool includes Quaternius' Ultimate Crops Pack because it provides a large CC0 crop set with multiple growth stages, but no source is mandatory. Search broadly across game assets, 3D libraries, farm-game references, and real botanical/garden photos.

Reference-only discovery should not be blocked by licensing paperwork. If third-party mesh/texture data is later promoted into a publicly shipped runtime asset, check the promoted asset's actual reuse terms at that point.

## 7. Rendering budget

### Leaves

Default foliage treatment should be inexpensive and readable:

- mostly green;
- quality/health variation only where gameplay needs it;
- correct silhouette, thickness, curvature, and orientation before special optics;
- no default glow or fantasy multicolor treatment.

### Harvest organs

When fruit/harvest organs carry much of the crop identity — tomato, pepper, eggplant, strawberry, pumpkin, etc. — they may receive disproportionate visual budget:

- smoother/cleaner geometry;
- better roughness/specular response;
- maturity color interpolation;
- restrained transmission/subsurface-like response if it still looks like produce.

Onion, garlic, leafy greens, and similar crops do not need an optical effect merely for consistency.

## 8. What not to build first

Do not start by building:

- a universal botanical generator;
- a generic asset framework for every possible crop;
- continuous topology morphing between all four stages;
- a second scene graph / Three.js pipeline merely because downloaded models are convenient;
- fixed performance gates before representative crop geometry exists.

The first goal is a small, reviewable pipeline that can make the **existing six** look right and add a few easy crops later.