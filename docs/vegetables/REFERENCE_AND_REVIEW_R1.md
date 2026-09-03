# Vegetable Reference & Review Loop R1

Status: planning / review contract.

## 1. Goal

The review system exists to answer a simple question repeatedly and cheaply:

> Does this crop, at this stage, look enough like the intended real vegetable to ship in Eric's Garden?

The loop must catch geometry/pivot/normal mistakes early, before they become embedded in multiple stages or species.

## 2. Reference pack

### HARD outcomes

For each crop, retain enough evidence to judge:

- mature whole-plant silhouette;
- height/spread and major proportions;
- leaf shape and attachment pattern;
- branch/node structure where relevant;
- harvest-organ shape, count, size, and attachment where relevant;
- at least one juvenile/intermediate cue when the mature plant cannot safely be treated as a scaled-down seedling.

### SOFT target

Aim for roughly **3–5 primary references per crop**. Good mixtures include:

- 1–2 3D/game asset references;
- 1–2 real mature-plant photos;
- 1 juvenile/intermediate photo or stage model;
- one detail reference for a difficult feature if necessary.

One high-quality multi-stage model may substitute for several weaker references. Hard crops may need more references. Do not optimize for hitting the number.

### RECOMMENDED sources

Search broadly rather than binding to a fixed provider. Useful source classes include:

- multi-stage crop/game asset packs;
- Quaternius Ultimate Crops Pack;
- Poly Pizza / Sketchfab / BlendSwap and similar model libraries;
- farming/children's game crop models as stylization references;
- real garden/agricultural photographs;
- botanical extension or seed-company imagery when growth-stage form is useful.

A model does not need to be directly reusable to be valuable as a reference.

## 3. Candidate asset classification

Every retained model/reference should receive one intended-use label:

- `visual-reference-only`
- `stage-reference`
- `geometry-donor`
- `organ-donor`
- `runtime-candidate`

Also record:

- source URL / pack identifier;
- author/source when available;
- file format;
- whether stages are separate objects/files;
- whether leaves/fruits/stems are separable;
- pivot quality;
- normal quality;
- approximate polygon density;
- style fit;
- important caveats.

Reference-only material can be retained privately regardless of whether it becomes a runtime asset. A runtime candidate gets a separate reuse/provenance check before shipping.

## 4. What makes a model useful

### Prefer

- recognizable full-plant silhouette;
- coherent scale across stages;
- clean root/soil contact;
- sensible topology or naturally separable organs;
- multiple stages or variants;
- clean normals;
- modest enough geometry to iterate quickly;
- a style that can be simplified or polished without rebuilding the whole plant.

### Do not reject automatically

A model can still be valuable if:

- it is only a mature plant;
- it has a bad pivot but good geometry;
- it is too detailed for runtime but excellent as a shape reference;
- only the fruit/bulb/leaf is useful;
- its style is not final but its proportions/topology are instructive.

### Reject as runtime candidate when

- silhouette is fundamentally wrong for the crop;
- stage replacement cannot be normalized to stable soil contact;
- normals/topology are so broken that repair costs more than rebuilding;
- the model only looks correct from one camera angle;
- excessive hidden/duplicate geometry creates needless runtime cost;
- the asset requires a second scene-graph/runtime architecture just to use it.

## 5. vgpu Vegetable Review Lab

The preferred current review carrier is a **dev/review scene using the same vgpu rendering path and model/material code that production will use**. It is an engineering inspection tool, not a second game world or second scene graph.

### HARD review capabilities

The lab must provide repeatable evidence for:

- crop selector;
- stage selector / stage-progress control;
- fixed camera/FOV presets;
- fixed lighting and neutral soil reference;
- front, side, top, and 3/4 views;
- bounds / scale display;
- soil plane and root location;
- pivot/local axes;
- normal and wireframe inspection;
- modular attachment frames when applicable;
- transition preview for visible stage swaps;
- saved screenshots/review result for comparison between revisions.

Exact UI controls and helper APIs are SOFT. The observable inspection capability is HARD.

## 6. Standard review sequence

Run reviews in this order so polish does not hide structural errors.

### Gate A — species read

Ask:

- Would a child identify the crop without the label?
- Could it be confused with another crop in the garden?
- Is the stage still recognizably on the path toward the mature species?

Failure here blocks material polishing.

### Gate B — proportions

Compare:

- plant height/spread;
- leaf-to-plant proportion;
- stem thickness;
- harvest-organ size/count;
- soil exposure/depth;
- density of leaves/branches.

### Gate C — topology / attachment

Inspect:

- where leaves emerge;
- branch hierarchy;
- fruit/ear/bulb attachment;
- root/soil contact;
- modular pivot and frame behavior;
- mirror/normal errors.

### Gate D — stage progression

Review the four current game stages together:

- S1 should look juvenile, not merely a tiny mature plant when that would be visibly wrong;
- each stage should progress in the correct direction;
- within-stage controls should be continuous;
- stage-to-stage jumps may be large but must remain plausible after the transition;
- the camera-cover transition must hide the actual swap.

### Gate E — finish

Only after A–D pass, tune:

- greens and maturity colors;
- roughness/specular response;
- fruit optical polish;
- wind amplitude / stiffness;
- small asymmetry and variation.

## 7. Agent-assisted feedback loop

Use vgpu's fast interactive render path to make review iterative rather than a one-time beauty check.

Recommended loop:

1. load one crop packet and its current reference set;
2. render standardized stage/contact-sheet views;
3. render debug views (axes, bounds, normals, wireframe, attachments);
4. compare current render with references;
5. produce a short structured critique;
6. change the smallest high-priority parameters/geometry;
7. rerender the same views;
8. repeat until blockers are gone;
9. save the accepted contact sheet and measurements in the crop packet/evidence location.

### Structured critique fields

Use a compact record such as:

- `species_readability`: pass / revise
- `silhouette`: pass / revise
- `proportion`: pass / revise
- `leaf_structure`: pass / revise / n/a
- `branch_structure`: pass / revise / n/a
- `harvest_organ`: pass / revise / n/a
- `soil_contact`: pass / revise
- `frame_normals`: pass / revise
- `stage_progression`: pass / revise
- `transition_cover`: pass / revise
- `performance_note`: informational until budgets are measured
- `blocking_issues`: short list

The Agent should not compensate for a failed silhouette by proposing shader polish. Fix the earliest failed category first.

## 8. Human acceptance

Automated/Agent review is a filter, not final product authority. Final acceptance should be very quick:

- Does it look like the crop?
- Does the growth read naturally enough across the four game stages?
- Is anything visually distracting or obviously wrong at normal garden scale?

The system is successful when this final human review is easy because structural mistakes were already removed upstream.

## 9. Evidence size

Keep evidence lightweight:

- one accepted contact sheet per crop/version;
- one compact measurements/review record;
- a few exact references, not a scraped image dump;
- model source/provenance identifiers;
- performance numbers only when measured in a defined viewport/instance scenario.

Raw third-party packs and large reference collections should stay outside the code repository by default; GitHub stores the compact decisions and normalized runtime assets that actually belong to the project.