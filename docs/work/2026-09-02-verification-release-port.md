# Verification and release migration

Status: review
Base main SHA: 118a889c3dd6dfcc78fe9a74c710b081299c58f5

## Objective
Bring the reusable verification, visual-QA, merge, and deployment guidance from Crystal Garden into Eric's Garden without importing Crystal Garden's heavy governance machinery or WebGL-only tooling.

## Acceptance
- A1 — `docs/VERIFICATION.md` describes proportional evidence using Eric's Garden's actual `npm run check`, current CI, WebGPU/vgpu path, and Canvas fallback.
- A2 — `docs/RELEASE_WORKFLOW.md` keeps source integration and production deployment separate, including exact-main-SHA and multi-PR release-train handling.
- A3 — a local rendering/visual-QA skill is available for vgpu/WebGPU and Canvas diagnosis without requiring Spector/WebGL-specific infrastructure.
- A4 — repository boot paths point future construction/release work to the new guidance only when relevant.
- A5 — a short experience note records what was migrated, adapted, and intentionally left behind.

## Non-goals
- Do not change application code, package dependencies, CI workflow behavior, or deployment infrastructure.
- Do not import Crystal Garden's `GATE_MAP`, CI budget policy, `current.json` routing, release-state ledger, or WebGL/Spector plugin bundle.
- Do not merge or deploy this change as part of the documentation migration.

## Scene carrier and affected owners
- Carrier: repository operations only
- Paths: `AGENTS.md`, `README.md`, `docs/VERIFICATION.md`, `docs/RELEASE_WORKFLOW.md`, `docs/skills/render-visual-qa/SKILL.md`, `docs/experience/verification-release-port.md`
- Architecture boundary touched: no; this documents the existing static deployment and evidence boundaries.

## Current state
- Completed: A1, A2, A3, A4, A5
- Current step: exact-diff and PR review
- Next action: merge only if separately authorized; deployment is not part of this worklet
- Blocker: none

## Evidence
- Source references: Crystal Garden `docs/VERIFICATION.md`, `docs/RELEASE_WORKFLOW.md`, `docs/WEBGL_BROWSER_SMOKE.md`, and `plugins/webgl-visual-qa/skills/webgl-visual-qa/SKILL.md`.
- Target facts: current `package.json`, `.github/workflows/verify.yml`, `AGENTS.md`, `README.md`, and `docs/PROJECT_SCOPE_R1.md` on base SHA above.
- Adaptation review: Crystal-specific gate maps, control ledgers, CI-budget machinery, release ledger, and WebGL/Spector plugin runtime were intentionally excluded.
- Link/path review: new guidance links resolve within `docs/`; root boot paths point to the new files conditionally rather than loading them for every task.
