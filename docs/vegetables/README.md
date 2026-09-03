# Eric's Garden — Vegetable Modeling Package R1

Status: planning / cold reference. This package does **not** activate vegetable implementation by itself.

This package defines how real vegetables should be sourced, modeled, grown, and reviewed for Eric's Garden. It is deliberately stricter about recognizability than the fantasy-plant work in Crystal Garden, while remaining much lighter than Crystal Garden's governance system.

## Current repository baseline

Fresh `main` currently defines six crops in `src/game/model.ts`:

- carrot / 胡萝卜
- tomato / 番茄
- corn / 玉米
- pumpkin / 南瓜
- lettuce / 生菜
- strawberry / 草莓

The game model currently uses synchronized stages `1..4` (`MAX_STAGE = 4`): one Grow action advances every living, ready plot in the batch together. The vgpu renderer does not yet render real crop geometry; it projects DOM crop markers and uses a seedling glyph for early stages and the crop emoji for later stages.

That means the vegetable project starts from a clean renderer boundary: preserve the existing renderer-neutral crop/stage semantics, then replace the marker presentation with reviewed crop geometry.

## Documents

- [`MODELING_AND_GROWTH_R1.md`](MODELING_AND_GROWTH_R1.md) — normative levels, stage-growth contract, geometry normalization, difficulty sequencing, rendering budget.
- [`REFERENCE_AND_REVIEW_R1.md`](REFERENCE_AND_REVIEW_R1.md) — what references to collect, what makes an asset useful, and the vgpu review/feedback loop.
- [`SPECIES_PACKET_TEMPLATE_R1.md`](SPECIES_PACKET_TEMPLATE_R1.md) — lightweight per-species packet used while researching/modeling one crop.

## Normative language

This package uses three levels. Do not silently promote one level into another.

| Level | Meaning | Deviation |
| --- | --- | --- |
| **HARD** | Observable product/modeling invariant required for a crop to ship. | Requires explicit product/architecture alignment if violated. |
| **SOFT** | Current default chosen for efficiency or consistency. | May change when an alternative preserves HARD outcomes and the reason is recorded. |
| **RECOMMENDED** | Heuristic, source suggestion, sequencing advice, or aesthetic preference. | Adapt freely; it is not a gate. |

The recurring rule is: **make outcomes hard, not incidental mechanisms.** A crop being recognizable can be HARD; using one specific asset website, exactly five references, or one particular transition effect is not.

## Scope boundary

This package does not:

- change `CROPS`, `MAX_STAGE`, save data, levels, or gameplay timing;
- add a second renderer or scene graph;
- import third-party model packs into production;
- choose the final expansion roster permanently;
- define fixed triangle/draw-call budgets before measurement.

When runtime vegetable work is explicitly activated, create one short packet under `docs/work/` following the repository's normal rules.