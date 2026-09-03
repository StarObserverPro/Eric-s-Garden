# Eric's Garden repository operating rules R1

GitHub `main` is the source of truth. Deployed sites are runtime evidence and distribution targets, not authoring or recovery sources while GitHub is available.

This file is a **small bootloader** for future construction. It tells the现场 what to read, what owns the current decision, and where the architectural boundaries are. It is not a miniature copy of Crystal Garden governance.

## 1. Attention-aware boot sequence

For every request:

1. Classify it as **analysis**, **planning**, **construction/repair**, or **release**.
2. Read this file.
3. Read only the relevant section of [`docs/PROJECT_SCOPE_R1.md`](docs/PROJECT_SCOPE_R1.md).
4. For construction or repair, read exactly one activated work packet under `docs/work/` and the source files it names.
5. Inspect fresh `main` before treating an old plan, branch, PR, comment, or screenshot as current.

Do **not** scan all documentation or reconstruct intent from repository history before starting ordinary work. History is cold evidence: load one exact item only when the current packet points to it or when current code cannot explain the behavior.

A plan, old branch, open PR, or old work packet does not activate itself. User activation creates current work. If a packet contradicts fresh `main` or a later user instruction, reconcile the packet as stale; never use stale paperwork as a lock.

## 2. Work packets: the entire hot attention layer

This repository has no `current.json`, global hot-route lock, context shards, risk database, or mandatory backlog loader.

When implementation is explicitly activated, create one short packet using [`docs/work/README.md`](docs/work/README.md). A packet contains:

- one-sentence objective;
- stable acceptance items;
- explicit non-goals;
- the scene carrier and affected owners/paths;
- exact starting `main` SHA;
- current step, next action, blockers, and evidence.

Load one primary worklet and at most two directly dependent worklets. Similar subject matter, nearby files, or shared aesthetics are not enough to fuse work.

Multiple independent packets may exist. There is no repository-wide “only one active task” rule. Each packet must remain independently testable and closable.

When work lands or is abandoned, remove the packet from the hot directory. Git commits and PRs are the normal historical record; do not keep completed packets in the boot path merely because they once mattered.

## 3. Authority order

When sources disagree, use this order:

1. the user's latest explicit product or architecture instruction;
2. fresh behavior and ownership on `main`;
3. the activated work packet for current acceptance and non-goals;
4. `PROJECT_SCOPE_R1.md` for long-term direction;
5. old plans, PRs, screenshots, and discussions as historical evidence only.

A green test proves the tested contract. It does not silently replace an unmet visual, interaction, or product criterion.

## 4. Product and scene boundaries

Eric's Garden is a child-facing game first and a vgpu proving ground second.

Every new GPU technique must have:

- a reasonable garden carrier;
- a child-visible purpose or a clear maintenance/performance payoff;
- a bounded experiment question and a stop condition.

The initial scene carriers are central beds, a grass/wildflower edge, a low fence/path, and simple sky/weather. Pollinators, a water corner, or a fuller tool shed require a later phase choice; they are not ambient permission to expand scope.

Do not introduce multi-map travel, NPCs, an economy, inventory, backend accounts, punitive crop death, or Crystal Garden systems unless a new scope explicitly authorizes them.

## 5. Rendering invariants

These are the few hard technical boundaries:

- **One game model.** Sowing, watering, growth, pests, harvest, levels, statistics, and saves are renderer-neutral.
- **One frame owner.** Exactly one runtime module schedules rendering and owns pause/resume/disposal.
- **One active renderer.** Canvas 2D fallback and vgpu/WebGPU may coexist in the codebase, but only one renders the scene at a time.
- **One WebGPU context.** The WebGPU path owns one vgpu `Gpu` context/device and one coordinated resource lifecycle.
- **vgpu first.** Scene code uses vgpu's public API by default. Missing capability may use one adapter under `render/vgpu/raw/`; direct raw WebGPU must not spread through feature modules.
- **No second scene graph.** Do not add Three.js or another renderer beside vgpu without a separate architecture decision.
- **Serializable saves only.** GPU buffers, textures, handles, material instances, animation clocks, and transient scene objects never enter persisted state.
- **Static deployment remains possible.** Build-time tools are allowed; production remains static files with no server requirement.
- **Fallback remains real.** Until explicitly retired, failed WebGPU initialization, unsupported devices, and device loss must lead to a playable Canvas path rather than a blank canvas.

Changes to game-state meaning, save identity/schema, renderer ownership, frame ownership, fallback retirement, raw-WebGPU boundary, or build/deployment semantics are architecture-boundary changes. Stop and align them explicitly rather than hiding them inside visual work.

## 6. Preferred construction shape

Use the smallest vertical slice that answers the active question.

Examples:

- soil experiment: one bed, one material, one wetness input, one comparison;
- instancing experiment: one vegetation family and the three agreed load tiers;
- wind experiment: one shared field applied to grass and one crop with different stiffness;
- weather experiment: one state change that affects sky, light, wind, and ground coherently.

Do not build a generic engine, asset framework, ECS, shader graph, or compute abstraction in advance. Extract a shared layer only after at least two real consumers expose the same need.

Preserve newer unrelated behavior on `main`. Physical overlap in a file is not automatically a product or architecture conflict.

## 7. Proportional verification

Run evidence proportional to the changed seam:

| Change | Minimum evidence |
| --- | --- |
| Documentation only | links and internal consistency |
| Pure game logic | deterministic unit checks for the affected action/state |
| DOM/UI | affected interaction flow on desktop and touch-sized viewport |
| WGSL/material | shader validation plus a bounded visual reference |
| Renderer/pass/resource | browser smoke, disposal/re-entry check, and relevant Node/mock check |
| Performance/instancing | fixed scene seed, fixed viewport/DPR, instance tier, frame/draw/pass/resource measurements |
| Fallback/capability | WebGPU success path and forced failure/no-WebGPU path |
| Save behavior | old save load, round trip, reset, and renderer switch without semantic change |

Before declaring completion, map every acceptance item to the diff and evidence. Record material visual compromises or vgpu/raw adaptations rather than silently changing the target.

## 8. Repository and release procedure

Before runtime writes, inspect fresh `main` and relevant open work. Use a bounded branch such as `agent/<change>` and a PR for implementation. Bootstrap documentation may be committed directly only when explicitly requested.

Keep each PR focused on one packet or a small compatible fusion. Do not attach deployment, unrelated refactoring, new scene carriers, or dependency upgrades to a visual fix unless the packet includes them.

Merge and deployment are separate actions. Never publish or alter hosting unless the user explicitly requests it for the exact merged revision.

Pin vgpu and other rendering dependencies to reviewed versions. Upgrade them in a named maintenance change with shader/build/browser evidence; do not float production work on `latest`.

## 9. Known traps to avoid

- **Big-bang renderer replacement:** preserve the current playable path while the vgpu path earns parity.
- **Two worlds drifting apart:** Canvas and vgpu must consume one game model and one scene snapshot.
- **GPU state becoming game truth:** visual fields may derive from game state; they do not own saves or rules.
- **Raw WebGPU leakage:** an escape hatch is one adapter, not permission for mixed styles everywhere.
- **Compute before need:** use a simpler render or instancing solution until compute produces a measured benefit.
- **Technology without scenery:** do not add an effect until a garden carrier makes it meaningful.
- **Historical gates:** old plans and failed routes explain history; they do not block a different current solution.
- **Over-reading:** do not import Crystal Garden's full architecture, governance, or failure history into an ordinary Eric's Garden task.
- **Visual checks replacing play checks:** a beautiful frame that obscures targets, touch input, growth state, or feedback is a regression.

## 10. Default decision when uncertain

Choose the option that preserves:

1. the child's simple play loop;
2. one source of game truth;
3. one active renderer/frame owner;
4. a small reversible experiment;
5. a clear path back to the Canvas baseline.

If uncertainty affects none of those boundaries, proceed with the smallest reasonable implementation instead of inventing a new rule.
