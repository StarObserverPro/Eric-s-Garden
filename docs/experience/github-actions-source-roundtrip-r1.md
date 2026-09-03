# GitHub Actions source roundtrip R1

Use this only when a large generated/procedural source file must be visually iterated through the GitHub connector and there is no normal local repository checkout.

## Useful loop
1. Keep the authoritative source in GitHub; the sandbox is only a temporary workbench.
2. Add deterministic render evidence to Verify first.
3. If exact large-source editing is needed, temporarily include the relevant source file in the Actions evidence artifact.
4. Download the artifact, inspect the exact rendered evidence and source locally, make the smallest geometry/shader edit, and run local numeric/static checks where useful.
5. Write the complete file back with the current GitHub blob SHA, then run the normal Verify path again.
6. Remove temporary source files from the artifact before review/merge. Keep only durable product evidence.

## Guardrails
- CI green is necessary but is not visual acceptance; compare the same fixed view between rounds.
- Never treat artifact/sandbox copies as a second source of truth.
- Sequential whole-file updates must use the newest blob SHA; do not update the same path in parallel.
- Evidence thresholds should test render presence or real product contracts. Do not turn crop size, screen coverage, or another art parameter into a fake quality score.
- Prefer a production-integrated evidence scene when the issue is contact/baseline rather than judging that relationship against an empty background.