# Dynamic render governor R1

Status: executing
Base main SHA: `e48792114e7d191e023f89ffd95771e71d94f7ae`

## Objective
Add one runtime-owned, hysteretic render-budget governor that can reduce non-core WebGPU workload without changing game truth or rebuilding the renderer.

## Acceptance
- A1 — `RenderRuntime` remains the only RAF owner and pauses scheduling while the page is hidden, resuming without treating the return hitch as sustained pressure.
- A2 — A pure/tested governor derives a runtime quality profile from frame-time windows and never exceeds the user's configured vegetation ceiling.
- A3 — Existing vegetation workload can switch between 500 / 1,500 / 4,000 instances without recreating the vgpu renderer or geometry; bundle variants are prepared once per generation.
- A4 — Render diagnostics expose the active runtime vegetation tier and quality pressure while gameplay/core world layers remain unaffected.
- A5 — Tests cover degradation, hysteretic recovery, ceiling enforcement, hidden/resume sampling reset, and vgpu bundle-tier behavior.

## Non-goals
- No game/save/schema changes.
- No new renderer, RAF, WebGPU device/context, scene graph, compute culling, occlusion system, or generic ECS/asset engine.
- No hardscape, soil/wetting, sky/meadow aesthetic, crop modeling, or PR #7 work.
- No automatic full-frame DPR/render-target scaling in R1; vegetation is the first measured workload lever.

## Scene carrier and affected owners
- Carrier: vegetation edge + renderer runtime.
- Paths: `src/render/runtime.ts`, `src/render/contract.ts`, `src/render/governor.ts`, narrow vegetation integration in `src/render/vgpu/vgpu-renderer.ts`, focused tests, one experience note.
- Architecture boundary touched: frame ownership policy only to add hidden-page pause/resume under the existing owner; no ownership transfer.

## Current state
- Completed: none.
- Current step: implement pure governor contract and tests.
- Next action: wire vegetation bundle variants into the current vgpu generation.
- Blocker: PR #7 also edits `vgpu-renderer.ts`; keep this branch's renderer diff vegetation-only and replay after #7 if needed.

## Evidence
- `npm run check` on final branch.
- PR diff demonstrates one RAF owner, one GPU context and no renderer recreation on governor tier changes.
