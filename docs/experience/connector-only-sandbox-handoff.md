# Experience note: connector-only sandbox handoff

Use this only when the construction sandbox can build files locally but cannot reach GitHub over the network, while the connected GitHub tool cannot ingest local paths directly.

## Safe transport pattern

1. Confirm that the result belongs in GitHub rather than remaining an external sandbox asset.
2. Work from a fresh base SHA on a dedicated branch.
3. Pack only the intended working tree into a temporary archive; never include credentials, caches, `node_modules`, or unrelated sandbox files.
4. Put the archive and a tiny branch-scoped unpack workflow on the branch through the GitHub connector.
5. In the workflow, unpack with path-traversal checks, install pinned dependencies, run the full verification command, and commit the generated tree only after checks pass.
6. Remove the archive, unpack script, and temporary workflow from the final tree.
7. Rewrite the dedicated branch onto the original base with the verified final tree, or move that tree to a fresh branch, so transport commits are not reachable from the PR history.
8. Review the final compare/PR file list and let the ordinary repository verification run again on the clean head.

## Guardrails

- The bridge is transport, not production architecture; neither transport files nor transport commits may survive in the final PR tree/history.
- It must never write to `main`, merge, or deploy.
- Verification runs before the generated source commit, then runs again on the clean PR head.
- The generated dependency lockfile belongs in the real commit.
- A failed workflow leaves only the temporary branch artifacts, making the failure visible and reversible.
- Record the exact base SHA and final clean head SHA in the work packet or PR.
