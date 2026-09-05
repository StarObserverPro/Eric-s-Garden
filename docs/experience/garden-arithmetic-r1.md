# Garden arithmetic R1 — implementation and verification notes

Date: 2026-09-04 (America/New_York)
Baseline main: `a85627a5c99be39adf84b1045cd2a1ce462e54c8`
Branch / PR: `agent/arithmetic-garden-r1` / #28
Scope: connected P0 core loop and optional P1 equal sharing; not all of P1/P2.

## Keep one quantity owner

`src/game/arithmetic.ts` provides read-only order/care/harvest-token projections. `src/game/model.ts` owns mutations. Each crop is capped against its own order target: surplus carrots cannot replace tomatoes. Completion stars are awarded only on the incomplete-to-complete transition.

Rain operates on up to four eligible growing beds after successful sow/grow transitions. Reloading or requesting blocked growth does not apply it again. Care counts describe actual beds, not nominal task totals.

Saved `sharing.placements` assigns canonical harvest-token indices to baskets; `-1` means unassigned. Crop identities/counts are reconstructed from harvested state. Sharing never subtracts lifetime inventory, awards extra stars or becomes a next-level gate. Legacy saves default the additive field to null; malformed placements normalize safely. Next level/reset clear the task.

The connected UI uses existing mission and completion surfaces. The main button guides care, selects harvest after maturity and reopens the completed basket. Completion displays the actual harvest sum, not an automatic multiple-choice question. Division/multiplication recap appears only after equal groups. Native dialog close preserves already-saved sharing without advancing a level.

## Browser findings that source tests did not reveal

1. A filtered celebration decoration intercepted the visible return button. Give the control an explicit stacking level and make the decoration non-interactive; verify by real clicking, not by reading `disabled=false`.
2. Missing CJK fonts produced misleading square-glyph screenshots. Install language coverage in the test environment before judging text wrapping or HUD occlusion. This is a CI dependency, not a shipped font asset.
3. Once Chinese text rendered, the expanded desktop task card covered a real soil target. Compact duplicated instructions and order-cell spacing; keep the existing camera, picking and 12px sibling gap. Do not move test clicks around the obstruction and call it fixed.
4. Portrait diagnostics intentionally live inside a closed notebook. Wait for the renderer's ready attribute plus the visible active canvas, not for a hidden diagnostic lamp to become visible.
5. Keep token areas bounded and restore button focus across DOM projection updates. Put/take/next must remain reachable with touch and scrolling; arithmetic state must not depend on focus or DOM order.
6. A final-harvest touch ended on the scene, but its trailing click reached the newly opened completion dialog and started sharing without a fresh choice. A completion dialog now accepts pointer clicks only after a press began inside it; keyboard/assistive activation remains available. Reset this boundary on each opening, rather than adding an arbitrary delay or making the test tolerate accidental sharing.

## Tooling and provenance

GitHub is authoritative. Local direct GitHub networking failed; authenticated connector reads/writes worked. A previous temporary Actions export supplied pinned source/dependencies for the local workbench. Its export workflow and generated/dependency artifacts are not in the release diff. Compare local `git hash-object` with returned GitHub blob SHAs after text transfers.

Local Chromium returned `ERR_BLOCKED_BY_ADMINISTRATOR` for the preview. Browser policy was not changed and no local browser pass is claimed. The read-only, path-scoped `Arithmetic Playability` workflow builds the production game and runs bounded Playwright mouse/touch journeys on a hosted runner. No debug/game hooks or fabricated gameplay saves are used; the only initialization write chooses the Canvas renderer. Game-save reads are observations of actual input.

The workflow installs Playwright 1.57.0 in an ephemeral test venv, keeps reports/screenshots on failure, closes its preview process and cancels obsolete same-PR runs. It does not alter existing Verify or production dependencies. Artifacts record both PR head and checked-out merge candidate.

## Acceptance and claim boundaries

The focused 20 arithmetic tests cover order identity, real care, idempotence, sharing conservation, malformed/legacy saves and all five levels. The browser journey exercises all five levels at desktop 1440x900 and emulated touch 390x844/320x568: rain, pests, harvesting, one-missing states, six crops, 2/3/4 baskets, uneven correction, optional skipping, close/reopen, partial/equal reload and reset.

Exact final-head results and run links are on PR #28. Source tests, screenshots and action traces prove different things. Complete journeys use Canvas fallback; existing Verify separately checks WebGPU startup/presentation. Neither is physical-phone or target-GPU performance evidence.

Automatic `plant()` is not spatial multiplication. A future row-sowing worklet needs real placement, reversible correction, explicit group membership and renderer-neutral visible boundaries. Missing row sowing is functional scope, not an artwork debt. Artwork replacements are tracked in `../ARITHMETIC_ART_LEDGER_R1.md`.

No merge, auto-merge or production deployment is included.
