# Arithmetic art ledger R1

Date: 2026-09-04 (America/New_York)
Owner: Eric's Garden arithmetic gameplay, PR #28
Status: gameplay UI connected; art source delivered in #29; runtime art integration belongs to #30.
Source: user-activated GARDEN_ARITHMETIC_GAMEPLAY_PLAN_R1.md.

The complete #29 style, palette, shape grammar, asset inventory and external handoff are preserved in [Arithmetic Art Direction R1](ARITHMETIC_ART_DIRECTION_R1.md). This ledger retains the #28 gameplay-slot contracts. Both PRs originally added this path independently; neither account is discarded by integration.

Order slots, the portrait quantity strip, harvest recap and optional sharing controls are now in the repository. The #28 crop emoji and bounded CSS cards are working placeholders, not final art. Genuine row sowing remains separate functional work; it is not covered by this cosmetic ledger.

## Asset account

| ID | Asset / state | Carrier | Replacement contract | Priority |
| --- | --- | --- | --- | --- |
| ARITH-CROP-01 | Consistent carrot, tomato, corn, pumpkin, lettuce and strawberry icons | Order slots, portrait strip, sharing tokens, recap | Fit existing 15–24 CSS px slots; preserve crop identity and transparent padding; no baked-in text | First batch |
| ARITH-BASKET-01 | Empty, receiving and equal/filled basket | Optional sharing inside the existing completion dialog | Object-contain inside the fixed card; produce/counts remain separate DOM; do not bake in an answer | First batch |
| ARITH-SLOT-01 | Empty and occupied crop slots | Desktop mission chips and notebook detail | Empty/occupied distinction survives grayscale; no larger chips or layout shifts | First batch |
| ARITH-FEEDBACK-01 | Local harvest arrival and equal-baskets accent | Source pool / destination basket | Bounded, interruptible, reduced-motion aware; no permanent animation or extra scene pass | Later polish |
| ARITH-GROUP-01 | Row/group markers | Future actual row sowing | Follow real plot membership and projection in both renderers; not a substitute for placement gameplay | After row-sowing design |

## Hard constraints

Game state owns all quantities. Art cannot supply, hide or alter counts. Scale inside the reserved box: never push the HUD, controls or garden out of position. The same crop must remain recognizable across order and sharing uses.

Put/take/next/return controls remain real buttons, with at least 44 CSS px touch targets independent of asset size. Decorations are not hit targets and must not intercept the controls. Token regions remain bounded so placing produce does not move the next tap target.

Keep this batch independent of 3D crop geometry, renderer ownership, NPCs, economy, water penalties and multiplayer. Replace asset surfaces only after checking desktop, 320px portrait, 2/3/4 baskets and all six crop counters. Preserve the live missing counts and visible empty slots.

No art was generated, purchased or uploaded externally in the #28 worklet. The subsequent #29 pack uses the project archive workflow documented in [the Drive round-trip record](experience/arithmetic-art-pack-drive-roundtrip-r1.md), not an untracked sandbox dependency.
