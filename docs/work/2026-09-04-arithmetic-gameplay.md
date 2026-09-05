# Garden arithmetic gameplay R1

Status: UI integrated; final-head playability evidence is tracked on PR #28.
Base main: `a85627a5c99be39adf84b1045cd2a1ce462e54c8`
Branch: `agent/arithmetic-garden-r1`
Source: user-activated GARDEN_ARITHMETIC_GAMEPLAY_PLAN_R1.md.

## Delivered scope

P0 basket-order/care/harvest loop plus the optional equal-sharing part of P1. This is not a claim that row sowing or all of P1/P2 is complete.

The player sows, waters, removes pests, grows and harvests through the original controls. Orders show real per-crop slots and remaining counts; a compact portrait strip keeps quantities visible without opening the notebook. The main action identifies the next needed care step, switches to harvesting when mature and reopens a completed basket.

The existing completion dialog presents the actual harvest addition, then offers optional sharing. Put one, take one, restart, close/resume and next-level actions are connected to model mutations and the normal save/update flow. Division/multiplication expressions appear only after equal groups. Sharing never consumes harvested inventory, changes stars or gates level progression. The old table question remains optional in Statistics, not in the completion path.

## Acceptance coverage

| Contract | Verification |
| --- | --- |
| Each crop must reach its own target | 20 focused arithmetic model tests; all-five-level browser journeys |
| Rain and care counters reflect real beds | Real water/pest clicks; first-level sunshower waters four actual beds |
| Orders, shortfalls and completion are connected | One-missing screenshots; dialog opens after real final harvest |
| Sharing is reversible and optional | Deliberate uneven distribution, take-back correction, equal groups, skip level two |
| Saves and rewards remain stable | Partial/equal reload, close/reopen, no changed inventory/stars, all-five-level reset |
| Desktop and touch controls are usable | Mouse at 1440x900; emulated touch at 390x844 and 320x568; 2/3/4 baskets and all six crops |

Run `npm run check` for integration and the path-scoped `Arithmetic Playability` workflow for production-browser action/geometry evidence. Reports identify the PR head and checked-out merge candidate. Exact run links and outcomes are on PR #28; coverage above is not a substitute for a passing run and does not imply that a newer head passed.

## Changed owners and boundaries

Game state remains the only truth. `src/game/arithmetic.ts` is a projection; `src/game/model.ts` owns mutations. `src/ui/arithmetic.ts`/`.css`, `src/main.ts` and `index.html` connect existing surfaces. No renderer, picking, camera, shader, resource owner, production dependency, save key, backend or deployment changes.

The new browser workflow is test-only, read-only, bounded and retains screenshots/reports after failure. It does not replace or weaken `Verify`. Its complete journeys use Canvas fallback; the existing Verify WebGPU architecture smoke is a separate startup/presentation check, not a full WebGPU playthrough or target-device performance measurement.

## Deferred work

Genuine row sowing must add reversible placement and explicit visible group membership. Automatic planting plus an equation is not that activity. P2 water capacity, recipes, remainders, free planning and multiplayer remain outside this worklet.

Artwork is tracked in `docs/ARITHMETIC_ART_LEDGER_R1.md`; current emoji/card/slot placeholders occupy bounded boxes. New implementation and verification lessons are in `docs/experience/garden-arithmetic-r1.md`.

No merge, auto-merge or production deployment is included. The next release action requires separate authorization and the verified current head.
