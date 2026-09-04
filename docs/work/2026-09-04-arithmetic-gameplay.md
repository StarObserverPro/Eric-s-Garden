# Garden arithmetic gameplay R1

Status: blocked — partial implementation; keep the PR Draft
Base main SHA: a85627a5c99be39adf84b1045cd2a1ce462e54c8

## Objective
Implement the user-activated GARDEN_ARITHMETIC_GAMEPLAY_PLAN_R1.md as real garden actions, starting with the P0 basket-order loop; extend into hands-on sharing only where the existing game supports it without a second economy or model.

## Acceptance and current evidence
- A1 — The existing harvest fills visible crop slots; owned/target/missing counts come from authoritative state; surplus cannot substitute for another crop. **Model projection/completion implemented and tested; new visible slots/HUD not committed.**
- A2 — Weather actually waters eligible beds once per transition; water/pest feedback counts real affected/remaining beds, retaining non-punitive care. **Implemented in existing action/log/toast paths; deterministic state/snapshot tests pass. Changed browser journey still needed.**
- A3 — Completion presents a brief arithmetic recap after action, never gates care/progression behind a quiz. **Harvest recap exists in the log; completion-dialog replacement is not committed.**
- A4 — Optional P1 sharing distributes the actual completed harvest, permits correction without losses and recaps multiplication/division only after success. **Serializable model actions and conservation/reload tests implemented; no connected sharing UI in this draft.**
- A5 — Desktop/touch usability, legacy saves, reload/reset, renderer-neutral semantics and idempotent completion. **Focused state tests pass; local browser blocked; missing UI/browser evidence is not a pass.**
- A6 — Record art, deferred genuine row-sowing work and new implementation/verification lessons. **Recorded in docs/ARITHMETIC_ART_LEDGER_R1.md and docs/experience/garden-arithmetic-r1.md.**

## Non-goals
P2 resources/fertilizer/remainders, NPCs, networking/backend, penalties/new currency, deployment, dependency upgrades, unrelated renderer/geometry changes. Do not call automatic sowing a spatial multiplication activity. Genuine row planting is deferred.

## Carrier and actual changed owners
Existing crop/harvest/care state, garden log and action feedback. Current runtime changes are limited to src/game/model.ts and src/game/arithmetic.ts, with tests/arithmetic-gameplay.test.ts. No committed src/main.ts, index.html, renderer, UI-module or permanent workflow changes.

The user activated lightweight serializable task state from plan section 9. SAVE_KEY and canonical crop counters remain; the additive sharing field normalizes legacy saves. No renderer/frame/WebGPU ownership changes and no second inventory.

## Current state
- Completed: repository/active-PR inspection; model-level P0 order/care implementation; P1 sharing state/actions; 20 new arithmetic tests; art ledger and experience notes.
- Local focused checks: new 20 + existing game/snapshot 8 = 28 pass; production compilation passed for the local workbench. Exact final-head hosted Verify is recorded on the PR, not inferred from local results.
- Blocker: GitHub writes for src/ui/arithmetic.ts were rejected with an unable-to-determine-safety-status error; no successful UI write occurred. Do not infer otherwise from successful model/CSS writes. The unused CSS was removed from the branch.
- Additional blocker: local Chromium rejected navigation to the local preview with ERR_BLOCKED_BY_ADMINISTRATOR. Browser policy was not modified; no local visual/interaction pass is claimed.
- Current step: preserve the verified foundation as Draft, report the incomplete UI honestly, and inspect hosted checks for the actual committed head.
- Next action: complete legitimate UI integration through an available authorized write route, then capture the changed desktop/touch journey. Do not merge a state-only draft as a finished arithmetic feature.

## Pending UI contract
1. Detailed per-crop slots and owned/target/missing counts in the existing mission/notebook, plus a small always-visible portrait order strip.
2. Existing completion dialog changes from automatic question display to a brief harvest recap plus optional sharing. Keep the separate statistics quiz optional.
3. Real buttons for place one/take one/restart, exact crop-token identities, unequal/equal feedback, and next-level access even when sharing is unfinished.
4. Derive all UI from basketOrder/sharingProgress; persist only through model actions and the existing commit/update flow.
5. Verify 1440x900 desktop, 390x844 portrait, 320x568 portrait, 2/3/4 baskets, partial/equal reload and skip-to-next without losses. No new production debug hooks.

## Source handling
GitHub is authoritative. A temporary read-only branch workflow exported source and pinned dependencies for local checks because direct sandbox GitHub access failed. The temporary workflow was removed before review. No external art assets or production deployment were produced. Local uncommitted UI work is not part of the PR feature.
