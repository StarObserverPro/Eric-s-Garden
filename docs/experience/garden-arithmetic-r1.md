# Garden arithmetic R1 — implementation and tooling notes

Date: 2026-09-04
Baseline main: `a85627a5c99be39adf84b1045cd2a1ce462e54c8`
Branch: `agent/arithmetic-garden-r1`
Status: **partial implementation; Draft, not a completed P0/P1 release**.

## What exists in the repository

`src/game/arithmetic.ts` provides read-only order/care projections, exact-division basket selection, harvest-token projection, placement normalization and equal-share detection. `src/game/model.ts` owns all mutations.

- `basketOrder(state)` caps each crop against its own target. Surplus carrots or unrelated crops cannot substitute for missing tomatoes.
- Harvest actions report owned/missing amounts and award the existing completion stars only on the incomplete-to-complete transition.
- Water/spray actions report real remaining beds. Sunshowers water up to four eligible growing beds after successful sow/grow transitions; reloading or repeatedly requesting blocked growth does not grant more rain.
- `startSharing`, `putInBasket`, `takeFromBasket`, `restartSharing` and `sharingProgress` exist at the model layer. There is **no connected sharing button/UI in this draft**.
- Saved `sharing.placements` is only an assignment of harvest-token indices to baskets, with `-1` meaning unassigned. Crop identities and totals come from canonical harvested counts. Sharing never subtracts lifetime harvest or awards extra stars.
- The existing save key stays unchanged. Legacy saves default the additive field to null; invalid placements normalize to unassigned. Next level/reset clear task state.

The 20 arithmetic tests exercise these contracts, including all five levels, repeated actions, malformed placements, unequal-to-equal correction and reload. The original game/snapshot tests provide eight additional focused checks. Their pass does not prove that the missing UI is playable.

## Product boundary worth keeping

Do not call the current automatic `plant()` a spatial multiplication activity. The next row-sowing worklet needs real placement, explicit group membership, reversible correction, clear visible boundaries and renderer-neutral semantic state. Counting automatically arranged plants after the fact is only a recap.

The pending UI should use existing mission/completion surfaces, show crop slots and missing quantities during harvesting, and introduce division/multiplication expressions only after equal placement. Sharing is optional; care and next-level progression cannot depend on an arithmetic answer. Keep the old optional statistics quiz separate from this action-first work.

See `../ARITHMETIC_ART_LEDGER_R1.md` for deferred artwork. Missing interaction wiring is not an art debt.

## Source and verification chain

1. Local direct GitHub access failed, while authenticated GitHub connector reads/writes worked.
2. A temporary branch-only Actions workflow, with read-only contents permission and checkout credentials disabled, exported exact source plus pinned npm dependencies. Export run: `33928642791`; export source: `867462375c36bdaea32bb350c17206b4b9eed127`. The artifact is a temporary workbench, not a release.
3. GitHub remained authoritative. The temporary export workflow was removed before review; dependency archives, generated builds and `WORKBENCH_SOURCE_SHA` do not belong in the final diff.
4. For text round trips, compare `git hash-object <file>` locally with GitHub's returned blob SHA. A local passing test does not prove a retyped/transferred file is identical. This caught and corrected assertion punctuation introduced while transferring the test file.
5. Local Chromium could not navigate to the local preview (`ERR_BLOCKED_BY_ADMINISTRATOR`). Browser policy was not changed. No local interactive/visual pass is claimed.
6. Writing `src/ui/arithmetic.ts` returned `This tool call was blocked by OpenAI because we couldn't determine the safety status of the request.` Normal retries did not succeed. No blocked UI file is presumed committed; normal style/model writes succeeding did not prove the UI write succeeded. The unconnected CSS was removed from the draft rather than leaving a misleading runtime surface.

A local complete UI workbench compiled, but its `src/main.ts`, `index.html`, UI module/CSS and browser-journey work are not the repository's delivered feature. Resume from actual branch contents, not an earlier progress message. Keep the PR Draft until real UI integration and desktop/touch evidence are present.

## Verification needed before completing the feature

- Exact-head hosted `Verify` for the committed foundation.
- Once UI wiring is genuinely committed, a production-build journey through sow, water, pest removal, harvest, order shortfall and optional sharing with real mouse/touch input.
- At least desktop 1440×900, portrait 390×844 and narrow portrait 320×568, including 2/3/4 baskets and six-crop order counters.
- Deliberate uneven placement, take-back correction, partial/equal reload, reset and next-level skipping without losing inventory or stars.
- Inspect actual screenshots for clipping/occlusion. Canvas fallback evidence is not WebGPU visual or target-device performance evidence.

No merge, auto-merge or production deployment was authorized or performed.
