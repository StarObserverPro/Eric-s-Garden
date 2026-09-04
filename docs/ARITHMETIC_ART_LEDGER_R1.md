# Arithmetic art ledger R1

Date: 2026-09-04
Owner: Eric's Garden arithmetic gameplay
Status: deferred artwork; **not a claim that the arithmetic UI is connected**.
Source: user-provided GARDEN_ARITHMETIC_GAMEPLAY_PLAN_R1.md, activated on 2026-09-04.

The current draft has model logic and tests. Writing the arithmetic UI module through the connector was blocked; no production order-slot/sharing UI is delivered yet. Finish and verify interaction wiring before treating the items below as a cosmetic-only backlog.

## Asset account

| ID | Asset / state | Proposed carrier | Replacement contract | Priority |
| --- | --- | --- | --- | --- |
| ARITH-CROP-01 | One consistent 2D icon for each of carrot, tomato, corn, pumpkin, lettuce and strawberry | Order slots, compact phone order strip, harvest tokens, recap | Replace the existing crop emoji at 17–24 CSS px; preserve crop identity and transparent padding; no text baked into art | First batch |
| ARITH-BASKET-01 | Empty basket, basket receiving produce, filled/equal basket | Optional equal-sharing surface inside the existing completion dialog | Object-contain inside a fixed card; visible produce and editable counts stay separate DOM; do not bake a number or answer into the basket | First batch |
| ARITH-SLOT-01 | Empty crop slot and occupied crop slot | Existing desktop mission target chips and notebook detail | Empty/occupied distinction must survive grayscale; art must not increase target-chip size or introduce layout shifts | First batch |
| ARITH-FEEDBACK-01 | Small harvest arrival / equal-baskets success accent | Local basket or source-pool feedback | Bounded, interruptible and reduced-motion aware; no full-screen celebration, no permanent animation or extra render pass | Later polish |
| ARITH-GROUP-01 | Group border / row marker | Future genuine row-sowing worklet | Not active in this draft. Group boundaries must follow actual plot membership and camera projection in both renderers; not a decorative substitute for placement gameplay | After row-sowing design |

## Hard constraints

- The game state owns all counts. A graphic cannot supply, alter or conceal quantities.
- Artwork may scale within its reserved box; it may not push the surrounding HUD, controls or garden out of position.
- Put/take/next controls remain real buttons with at least 44 CSS px touch targets. Asset dimensions must not define hit-target size.
- All six crops retain their recognizable silhouette; order and sharing uses must show the same crop identity.
- Do not add NPCs, an economy, paid water, multiplayer or penalties to justify an art asset.
- Keep this batch independent from 3D crop geometry and current renderer ownership.

## Acceptance still needed

Desktop: live per-crop slots plus the total shortfall; no increase in main HUD occlusion beyond the active layout budget.
Phone: missing quantities remain visible without opening the notebook; five/six-crop orders fit a 320 CSS px portrait width.
Sharing: 2/3/4 baskets, deliberately unequal placement, taking one back, equal distribution, partial/equal reload and skipping to the next level are usable with touch and no keyboard.

No assets were generated, purchased, uploaded to an external asset library or deployed by this worklet. Future art should be archived through the project's normal asset workflow, not embedded as an untracked sandbox dependency.
