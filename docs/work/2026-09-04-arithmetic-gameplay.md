# Garden arithmetic gameplay R1

Status: executing
Base main SHA: a85627a5c99be39adf84b1045cd2a1ce462e54c8

## Objective
Implement the user-activated GARDEN_ARITHMETIC_GAMEPLAY_PLAN_R1.md as real garden actions, starting with the P0 basket-order loop; extend into hands-on sharing only where the existing game supports it without a second economy or model.

## Acceptance
- A1 — The existing harvest fills visible crop slots; owned/target/missing counts come from the authoritative game state. Wrong crops or surplus cannot finish an order.
- A2 — Weather assistance actually waters eligible beds once per transition; water/pest feedback counts real affected/remaining beds and retains the non-punitive care loop.
- A3 — Completion presents a brief arithmetic recap after the action, never gates care or progression behind a quiz.
- A4 — A bounded P1 sharing slice distributes the actual completed harvest into equal baskets, supports correction without losses, and recaps multiplication/division only after success. It is optional, requires no keyboard, and does not duplicate harvest inventory.
- A5 — Desktop and touch layouts remain usable; saved legacy gardens, reload/reset, renderer-neutral semantics, and completion/reward idempotence receive focused tests.
- A6 — Record deferred art assets, remaining P1 row-planting work, and new implementation/verification lessons in durable documents.

## Non-goals
- P2 resources, fertilizer, remainder problems, NPCs, networking, backend, penalties, new currency, deployment, dependency upgrades, unrelated rendering/geometry changes.
- Do not call automatic sowing a completed spatial multiplication activity. A real row-planting slice requires explicit placement and group-boundary evidence; otherwise report it deferred.

## Scene carrier and affected owners
- Carrier: existing central beds, harvest/order HUD, completion basket surface, weather/care states.
- Expected paths: src/game/model.ts, src/game/arithmetic.ts, src/ui/arithmetic.ts, src/main.ts, styles.css, tests/arithmetic*.test.ts, scripts/arithmetic-browser-evidence.mjs, docs/experience/garden-arithmetic-r1.md, docs/ARITHMETIC_ART_LEDGER_R1.md, docs/GARDEN_ARITHMETIC_GAMEPLAY_PLAN_R1.md.
- Architecture boundary touched: the user explicitly activated lightweight serializable gameplay task state from plan section 9. Keep SAVE_KEY and existing crop counters; additive fields must normalize old saves. No renderer/frame/WebGPU ownership changes.
- Temporary local workbench export workflow may be used because local GitHub network access fails; remove it before final review. GitHub is authoritative, not the sandbox. No external art assets produced in this slice.

## Current state
- Completed: repository/main/open-PR inspection and feasibility assessment; no overlapping open PR at activation.
- Current step: implement order/care state and a bounded optional sharing action.
- Next action: focused state tests, then real desktop/touch browser evidence and final-head Verify.
- Blocker: direct sandbox GitHub network is unavailable; GitHub connector is available.

## Evidence
- Baseline main and model read through GitHub connector.
- Pending: exact-head state/save checks and production-build affected browser journeys. Missing evidence is not a pass.
