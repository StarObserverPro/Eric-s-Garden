# Verification and release port from Crystal Garden

Date: 2026-09-02

## What was worth keeping

The Crystal Garden repository had four mature operational ideas that transfer cleanly to Eric's Garden:

1. **Proportional evidence.** Verify the changed contract instead of making every small change inherit the whole application's test matrix.
2. **Claim boundaries.** Build, browser runtime, visual acceptance, fallback behavior, real-GPU performance, and production canary are different claims.
3. **Exact-head provenance.** Final PR evidence belongs to an exact head; production belongs to an exact merged `main` SHA.
4. **Source integration and production release are separate loops.** A combined user instruction may authorize both, but the executor still resolves the final merged source before deploying.

These ideas became `docs/VERIFICATION.md` and `docs/RELEASE_WORKFLOW.md`.

## What was adapted

Crystal Garden's reusable `webgl-visual-qa` skill assumed WebGL/Three.js and a shared Chromium/Spector.js diagnostic stack. Eric's Garden is vgpu/WebGPU-first with a Canvas fallback, so only the reproduce → classify → capture → fix → replay → compare method was retained.

The Eric skill lives at `docs/skills/render-visual-qa/SKILL.md` and treats these as separate evidence:

- vgpu/WGSL validation and Node/mock rendering;
- browser WebGPU with the vgpu renderer actually active;
- Canvas fallback;
- real-device performance;
- aesthetic acceptance.

Spector.js was intentionally not copied because it is a WebGL frame inspector and would add infrastructure without proving the current WebGPU path.

## What was intentionally left behind

Do not re-import these Crystal Garden mechanisms by default:

- `docs/GATE_MAP.md` and the large test-inventory taxonomy;
- CI budget/governance machinery;
- `docs/control/current.json`, context shards, global routing state, or release ledgers;
- the full `plugins/webgl-visual-qa` bundle and its patched Spector runtime;
- large scenario matrices tied to Crystal Garden's scene graph and persistence history.

They solved repository-scale problems that Eric's Garden does not currently have. Importing them now would increase attention cost and create false blocking rules.

## Eric-specific release simplification

Eric's Garden already has one repository-owned integration command (`npm run check`) and one hosted Verify workflow. The hosted browser capture deliberately exercises the Canvas fallback, so future agents must not misread that artifact as proof of browser WebGPU rendering.

For multiple approved PRs described as one “merge and deploy” operation, treat them as a single release train: merge in dependency order, resolve the final `main` SHA, then deploy once. This avoids producing transient production versions for intermediate source states.

No persistent `RELEASE_STATE.json` was introduced. At the current scale, GitHub/PR identity plus deployment history and a concise closeout record are sufficient. Add a release ledger only if repeated operational ambiguity becomes a real problem.

## When to revisit

Reconsider stronger infrastructure only when evidence shows a recurring need, for example:

- several independent browser journeys become mandatory on most changes;
- deployment identity repeatedly becomes ambiguous;
- test ownership grows enough that broad checks become expensive or misleading;
- WebGPU frame-level inspection gains a mature tool that materially improves diagnosis;
- parallel release trains become common enough to require persistent release state.

Until then, keep the chain short: fresh `main` → active packet → focused evidence → final-head Verify → explicit merge → exact final `main` → explicit deployment → changed-journey canary.
