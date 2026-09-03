# WebGPU surface lifecycle repair R1

Status: executing
Base main SHA: 44739d238f02335a04bee44399b1a34821eea545

## Objective
Restore the vgpu browser renderer by keeping Surface access inside `frame(gpu)` while preserving Canvas fallback and the current scene.

## Acceptance
- A1 — A WebGPU-capable browser can initialize Eric's Garden with `vgpu · WebGPU` active instead of immediately falling back.
- A2 — The present/blit pipeline is precompiled from a target signature rather than by touching the live Surface outside a frame.
- A3 — Architecture-level renderer changes have a browser WebGPU smoke; model/geometry/material work remains responsible only for evidence proportional to that model change.
- A4 — Existing Canvas fallback verification remains separate and playable.

## Non-goals
- No crop, soil, vegetation, hardscape, lighting, UI or gameplay redesign.
- No vgpu dependency upgrade.
- No requirement that future modeling-only PRs run the architecture browser smoke.

## Scene carrier and affected owners
- Carrier: renderer infrastructure; no scene carrier change.
- Paths: `src/render/vgpu/vgpu-renderer.ts`, `.github/workflows/verify.yml`, `docs/VERIFICATION.md`, `docs/experience/webgpu-surface-verification-r1.md`.
- Architecture boundary touched: WebGPU Surface lifecycle / renderer verification.

## Current state
- Completed: A2, A3 implementation.
- Current step: run the existing Verify workflow with the architecture-only browser WebGPU step activated by this renderer diff.
- Next action: inspect exact-head browser evidence and repair any remaining browser-only failure.
- Blocker: none.

## Evidence
- Root cause: vgpu 0.3.1 rejects `effect.compile(surface)` outside `frame(gpu)` with `VGPU-SURFACE-NOT-IN-FRAME`.
- Repair: `garden-blit` now precompiles with `{ colors: [output.format] }`; live Surface presentation remains inside `frame(gpu)`.
- Verification routing: existing Verify classifies changed paths; the WebGPU browser smoke runs for renderer/runtime architecture changes and is skipped for model-only work.
