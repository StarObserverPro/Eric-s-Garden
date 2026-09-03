# Non-vegetable Phase 1 & 2 work packet

- **Status:** review
- **Base branch / SHA:** `main` / `6932770a40dff8cec2bd270ecc6ee750cd7c9352`
- **Branch:** `agent/non-vegetable-phase1-2`
- **Primary objective:** complete the non-vegetable garden diorama slice: Phase 1 procedural soil plus all Phase 2 environment/render work.
- **Direct dependencies included:** the minimum Phase 0 renderer/build foundation and the Phase 1 wetness bridge required by soil.
- **Current step:** implementation and automated verification complete; PR review next.
- **Next action:** review the PR evidence, then merge or request a focused correction.
- **Blockers:** none known. Real WebGPU remains capability-dependent and automatically falls back to Canvas.

## Acceptance contract

1. One serializable game model feeds one renderer-neutral scene snapshot.
2. One runtime owns `requestAnimationFrame`; exactly one renderer is active at a time.
3. vgpu is the default-capable renderer and Canvas 2D remains a playable fallback for unsupported browsers, initialization failure, render failure, or device loss.
4. Twelve beds use procedural soil shading. Existing gameplay wetness visibly changes the corresponding soil without introducing a second state owner.
5. The Phase 2 diorama contains a grass ground, stone path, low wooden fence, simple sky/sun/cloud shadow, and weather-driven variation.
6. Grass and sparse wildflowers are one instanced GPU layer with vertex-shader wind and explicit 500 / 1,500 / 4,000 instance tiers.
7. Static ground/path/fence work is recorded in a render bundle; soil and vegetation remain independently addressable layers.
8. DPR is explicitly capped at 1.0 / 1.5 / 2.0 and a collapsed diagnostic panel reports renderer, FPS, CPU frame time, passes, draws, instances, resources, and effective DPR.
9. Production output remains static. The build uses pinned TypeScript, Vite, vgpu and WGSL packages; there is no backend, CDN asset, image model, or second scene graph.
10. The R2 save key and five-level game semantics remain compatible.

## Explicit non-goals

- No vegetable mesh, vegetable shader, crop instancing, growth-curve redesign, pest visual redesign, or crop art pass.
- No new crop species, economy, inventory, backend, account, multiplayer, physics, editor, or generic engine layer.
- No production deployment or merge in this work packet.

## Vegetable-thread seam

The WebGPU renderer temporarily projects the pre-existing crop emoji markers from the same scene snapshot and camera matrix. They are presentation-only, take no pointer events, own no state, and do not enter WGSL or GPU geometry. The vegetable thread should replace that marker layer with crop rendering while keeping the game model, scene snapshot, frame owner, soil, environment, quality controls, and fallback contract intact.

## Touched paths

- `src/game/`
- `src/scene/`
- `src/render/contract.ts`
- `src/render/runtime.ts`
- `src/render/canvas2d/`
- `src/render/vgpu/`
- `src/diagnostics/`
- `tests/`
- `index.html`, `styles.css`, `package.json`, build configuration and verification workflow
- `README.md`, `UPGRADE_NOTES.md`, this work packet, and the experience note

## Evidence

- `npm run shader:check`
- `npm run test` — game compatibility, snapshot contract, vgpu mock shader compile/record, and Dawn-backed Node frame/readback
- `npm run build` — strict TypeScript and static Vite output
- GitHub Actions `Verify` artifact retains the generated lockfile and `dist/` for review
