# Eric's Garden repository operating rules R1

GitHub `main` is the source of truth. Deployed sites are distribution targets and runtime evidence, not authoring or recovery sources while GitHub is available.

This file is a **lightweight bootloader**. It routes the施工现场 to the smallest useful context and protects a few real architecture boundaries; it does not copy Crystal Garden's full governance system.

## 1. Read only the current task

For every request:

1. Classify it as **analysis**, **planning**, **construction/repair**, or **release**.
2. Read this file.
3. Read only the relevant section of [`docs/PROJECT_SCOPE_R1.md`](docs/PROJECT_SCOPE_R1.md).
4. For construction or repair, read one explicitly activated packet under [`docs/work/`](docs/work/) and the source files it names.
5. Inspect fresh `main` before treating an old plan, branch, PR, comment, screenshot, or deployment as current.

Do not scan all documentation or reconstruct ordinary work from repository history. History is cold evidence: load one exact item only when current code or the active packet points to it.

A plan, branch, PR, or old packet does not activate itself. If paperwork contradicts fresh `main` or a later user instruction, reconcile it as stale; never use it as a lock.

## 2. The hot attention layer is one short work packet

This repository has no `current.json`, global hot-route lock, context shards, risk database, or mandatory backlog loader.

Create a packet only after implementation is explicitly activated. Use the short template in [`docs/work/README.md`](docs/work/README.md): objective, acceptance, non-goals, scene carrier, affected paths, base SHA, current step, next action, blockers, and evidence.

One packet contains one primary worklet and at most two direct dependencies. Multiple independent packets may coexist; there is no repository-wide one-task limit. Similar files or similar aesthetics are not enough to fuse work.

Remove a packet after merge, cancellation, or replacement. Git and PR history are the normal cold record; completed work must not remain in the boot path “just in case.”

## 3. Decision authority

When sources disagree, use this order:

1. the user's latest explicit product or architecture instruction;
2. fresh behavior and ownership on `main`;
3. the active packet's acceptance and non-goals;
4. `PROJECT_SCOPE_R1.md` for long-term direction;
5. old plans, PRs, screenshots, and discussions as historical evidence.

A green test proves only the tested contract. It does not replace an unmet visual, interaction, or product criterion.

Eric's Garden is a child-facing game first and a vgpu proving ground second. Every GPU experiment needs a reasonable garden carrier, a child-visible purpose or measured engineering payoff, and a stop condition. New scene carriers do not enter scope merely because the technology can render them.

## 4. Hard architecture boundaries

- **One game model.** Sowing, watering, growth, pests, harvest, levels, statistics, and saves are renderer-neutral.
- **One frame owner.** One runtime module schedules rendering and owns pause, resume, and disposal.
- **One active renderer.** Canvas 2D and vgpu/WebGPU may coexist in source, but only one renders the scene at a time.
- **One WebGPU context.** The WebGPU path owns one vgpu `Gpu` context/device and one coordinated resource lifecycle.
- **vgpu first.** Scene code uses vgpu's public API. Missing capability may use one adapter under `render/vgpu/raw/`; raw WebGPU must not spread through feature modules.
- **No second scene graph.** Three.js or another renderer needs a separate architecture decision.
- **Serializable saves only.** GPU buffers, textures, handles, clocks, and transient scene objects never enter persisted state.
- **Static deployment remains possible.** Build-time tools are allowed; production remains static files with no server requirement.
- **Fallback remains playable.** Until explicitly retired, unsupported WebGPU, initialization failure, or device loss must lead to Canvas rather than a blank canvas.

Changing game-state meaning, save identity/schema, frame or renderer ownership, fallback retirement, the raw-WebGPU boundary, or build/deployment semantics is an architecture change. Align it explicitly instead of hiding it inside visual work.

## 5. Construction and evidence

Use the smallest vertical slice that answers the active question: one bed/material for soil, one vegetation family for instancing, one shared field for wind, or one weather state affecting the scene coherently. Do not prebuild a generic engine, ECS, shader graph, asset framework, or compute abstraction. Extract shared machinery only after real consumers repeat the need.

Before runtime writes, inspect fresh `main` and relevant open work. Use a bounded `agent/<change>` branch and PR. Keep deployment, unrelated refactors, new carriers, and dependency upgrades outside the change unless the packet names them.

Evidence is proportional:

- game logic: deterministic affected-state checks;
- UI: the affected desktop and touch flow;
- WGSL/material: shader validation and a bounded visual reference;
- renderer/resource work: browser smoke, disposal/re-entry, and relevant Node/mock evidence;
- performance: fixed seed, viewport/DPR and instance tier, with frame/draw/pass/resource measurements;
- fallback/save seams: success, forced failure, round trip, reset, and renderer-switch behavior as applicable.

Map each acceptance item to the final diff and evidence. Pin vgpu and rendering dependencies to reviewed versions; upgrade them only in a named maintenance change. Merge and deployment are separate explicit actions.

## 6. Traps worth remembering

- Do not replace Canvas in one big rewrite; let the vgpu path earn parity.
- Do not maintain two game states or two scene graphs.
- Do not let GPU state become save or gameplay truth.
- Do not turn one raw escape hatch into mixed API usage everywhere.
- Do not use compute before a simpler render/instancing solution has been tested.
- Do not add effects without a garden carrier or add scenery only to justify an effect.
- Do not let old plans or failed routes block a different current solution.
- Do not import Crystal Garden's full governance or failure history into ordinary work here.
- A beautiful frame that obscures touch targets, growth state, or feedback is a regression.

When uncertain, preserve the child's simple loop, one source of game truth, one active renderer/frame owner, a reversible experiment, and a clear path back to the Canvas baseline. If none of those boundaries is affected, proceed with the smallest reasonable implementation instead of inventing a new rule.
