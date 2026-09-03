# Active work packets

This directory is the **hot construction surface**, not a backlog or archive.

Create a packet only after the user explicitly activates implementation or repair. Planning and discussion alone do not create an active packet. A packet may remain here while work is executing or under immediate review; remove it after merge, cancellation, or replacement.

There is no global one-task limit. Independent packets may coexist, but each must be independently testable and must not silently borrow acceptance criteria from another packet.

Use `YYYY-MM-DD-<short-slug>.md` and keep it brief:

```md
# <Worklet title>

Status: executing | review
Base main SHA: <sha>

## Objective
<One sentence describing the product result.>

## Acceptance
- A1 — <observable result>
- A2 — <observable result>

## Non-goals
- <nearby thing this work must not change>

## Scene carrier and affected owners
- Carrier: central beds | vegetation edge | fence/path | sky/weather | pollinator corner | water corner
- Paths: <small exact list>
- Architecture boundary touched: no | <name the boundary>

## Current state
- Completed: <acceptance IDs or none>
- Current step: <one concrete step>
- Next action: <one concrete action>
- Blocker: <none or smallest conflict>

## Evidence
- <test, screenshot, measurement, or PR pointer>
```

Operating rules:

- One packet has one primary worklet and at most two directly dependent worklets.
- Keep the objective and acceptance stable; record a material adaptation instead of silently rewriting them.
- Re-read the objective, acceptance, current step, and diff before a long test and before review.
- Similar files, similar visuals, or an old PR are not enough to fuse work.
- Fresh `main` and the user's latest instruction outrank a stale packet.
- Git/PR history is the normal cold record. Do not keep completed packets here “just in case.”
