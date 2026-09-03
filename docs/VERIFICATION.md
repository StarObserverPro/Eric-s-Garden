# Eric's Garden verification R1

Verification is **proportional evidence**, not a ritual. Run the smallest checks that prove the changed contract, then use the hosted final-head check as integration evidence. A broad green build cannot replace a missing visual, interaction, lifecycle, or performance observation.

No test result by itself authorizes merge or production deployment.

## 1. Current repository baseline

The repository-owned local integration entry is:

```bash
npm run check
```

It currently composes:

1. `npm run shader:check` — validates the tracked WGSL modules with vgpu;
2. `npm run test` — Vitest coverage for game, scene-snapshot, render-mock and render-node contracts;
3. `npm run build` — strict TypeScript plus the production Vite build.

The hosted `.github/workflows/verify.yml` additionally installs vgpu's portable CPU renderer, runs `vgpu doctor`, executes `npm run check`, starts the production preview, and captures a headless **Canvas fallback** screenshot/DOM packet.

That same workflow contains an additional browser-WebGPU architecture smoke, but it is changed-path scoped to renderer/runtime ownership, vgpu lifecycle integration and related build wiring. When activated, it proves that the production build remains on `vgpu · WebGPU` in a WebGPU-enabled browser. It is deliberately **not** a generic visual/modeling gate: crop, soil, vegetation, hardscape or material modeling work should validate the changed model/material itself unless that work also changes renderer/resource architecture.

That distinction matters:

- the portable CPU renderer and Node tests prove bounded shader/render compatibility;
- the hosted `--disable-gpu` screenshot proves the playable Canvas fallback and production wiring;
- the architecture-scoped browser step proves the WebGPU/vgpu startup/presentation seam when that seam changes;
- model/material evidence does not become architecture evidence merely because it uses vgpu;
- a screenshot existing does not prove aesthetic acceptance.

## 2. Evidence layers

Use only the layers affected by the change.

1. **Worklet evidence** — the smallest direct checks for the active packet's acceptance items.
2. **Integration evidence** — `npm run check` and the hosted Verify result on the exact final PR head when broad integration is part of the changed seam.
3. **Browser evidence** — a representative production-build journey when browser/runtime behavior can fail independently of source tests.
4. **Visual evidence** — exact-state screenshots or recordings for visible rendering/layout changes.
5. **Performance evidence** — fixed conditions and identified hardware when the claim is about frame cost, GPU behavior, or resource pressure.
6. **Production canary** — a separate, changed-journey check after an explicitly authorized deployment.

Do not repeatedly run every layer after every edit. Run focused checks early; use broader integration or browser evidence only when the changed contract actually crosses those seams.

## 3. Minimum evidence by change

| Change | Minimum evidence | Usually not required |
| --- | --- | --- |
| Documentation/repository notes | exact diff and link/path review | application build, browser smoke |
| Game logic/save semantics | focused deterministic tests; round trip/reset when affected | renderer visual matrix |
| UI/input | affected interaction at relevant desktop/touch size; focused tests if present | unrelated GPU tests |
| WGSL/material/geometry/modeling | focused shader/model validation; representative mock/Node or visual evidence for the changed model as applicable | WebGPU architecture browser smoke unless renderer/resource ownership also changed |
| Renderer/resource lifecycle | focused tests plus architecture-scoped WebGPU browser load/re-entry/disposal or forced failure when the seam changes | every level, every viewport, unrelated model acceptance |
| Canvas fallback | forced unsupported/init/render/device-loss path as applicable; playable interaction | WebGPU performance claim |
| WebGPU/vgpu browser behavior | production build on a browser/device with WebGPU active; confirm the active renderer and representative frame | treating Canvas CI as equivalent |
| Performance/LOD/DPR | fixed seed/state, viewport, DPR, instance tier and identified hardware; record frame/draw/pass/resource metrics | software-renderer FPS claims |
| Cross-owner architecture seam | affected tests, residual-reference review, browser journey and rollback evidence proportional to the seam | unrelated feature acceptance |

When an acceptance item is visible to Eric, map it to visible evidence; a source-shape assertion is not a substitute.

## 4. Browser and visual evidence

For a representative browser capture, record enough state to reproduce the claim:

- exact commit/build or PR head;
- browser/device class;
- viewport and DPR;
- active renderer (`vgpu` or Canvas fallback);
- level/weather/garden state and any fixed seed/time/camera controls available;
- screenshot or recording;
- console/runtime/network failures relevant to the journey;
- render diagnostics when relevant: FPS, CPU frame time, passes, draws, instances, resources and effective DPR.

For a visual regression, compare the same state before and after. Do not change camera, viewport, weather, seed, time, or quality tier between captures unless that variable is the subject of the test.

Use [`docs/skills/render-visual-qa/SKILL.md`](skills/render-visual-qa/SKILL.md) for interactive rendering diagnosis.

### WebGPU claim boundary

Before calling a browser result “WebGPU evidence,” confirm both:

1. the browser exposes usable WebGPU; and
2. Eric's Garden reports the vgpu renderer as active for the captured state.

A software/CPU backend can be excellent deterministic correctness evidence, but it is not target-GPU performance evidence. A fallback Canvas capture can prove resilience, but not WebGPU rendering.

The architecture browser smoke is a regression check for the renderer lifecycle seam, not a standing requirement for every vgpu-authored model. A model-only change should not acquire architecture verification obligations unless it also changes initialization, Surface/frame usage, renderer ownership, resource lifecycle, fallback switching, build integration or another browser-only renderer contract.

## 5. Result language

Keep claims bounded. Prefer statements such as:

- `shader validation: pass`;
- `game/save contract: pass`;
- `production build: pass`;
- `Canvas fallback browser smoke: pass`;
- `WebGPU architecture browser smoke: pass`;
- `WebGPU browser visual: not checked`;
- `target-device performance: blocked — no representative GPU available`.

For a required claim, use:

- `pass` — exact-target evidence exists and satisfies the stated contract;
- `fail` — the product or test assertion ran and failed;
- `blocked` — required evidence could not be executed or trusted;
- `not_checked` — intentionally not run yet;
- `not_applicable` — outside the changed seam.

Do not turn missing required evidence into a pass.

## 6. Performance evidence

Performance comparisons require controlled conditions. At minimum record:

- base SHA and head SHA;
- browser/device/GPU class;
- viewport and DPR;
- quality/instance tier (for example 500 / 1,500 / 4,000 vegetation instances);
- representative garden state and camera;
- warm-up method and sample duration;
- FPS/frame time plus draws, passes, instances and resource counts when available.

Compare base and head under the same conditions. Software rendering is useful for determinism and compatibility, not for declaring integrated-GPU, mobile, thermal, or frame-pacing performance.

## 7. Production canary

After deployment authorization and deployment of an exact merged `main` SHA:

1. confirm the live site corresponds to that approved source/build;
2. load the changed production journey;
3. confirm the expected renderer/fallback behavior for that journey;
4. check for uncaught runtime errors and obvious interaction failure;
5. capture only the evidence needed for the changed surface.

A successful deploy action is not runtime proof. A canary is not a request to replay the whole game after every release.

## 8. What this repository intentionally does not inherit

Eric's Garden does not adopt Crystal Garden's global gate map, risk database, current-route ledger, test-inventory bureaucracy, or large browser-scenario matrix. Those mechanisms addressed a much larger repository and should not be recreated here unless this project's real complexity later justifies them.

The durable parts we keep are simpler: proportional evidence, exact-head provenance, separate claim boundaries, representative browser evidence for browser-only risks, and a separate post-deploy canary.
