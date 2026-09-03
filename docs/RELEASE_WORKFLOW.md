# Eric's Garden source integration and release workflow R1

Source integration and production release are **separate loops**. A merge does not silently authorize deployment, and a deployment target is never the source of truth while GitHub is available.

If the user's instruction explicitly says **“merge and deploy / 合并部署”**, that single instruction authorizes both actions, but the executor still performs them sequentially: merge first, resolve the final `main` SHA, then deploy that exact result.

## A. Source-integration loop

### 1. Start from fresh `main`

Before construction, repair, or merge:

1. fetch current GitHub `main` and record its full SHA;
2. inspect the active work packet and only the relevant open PR/diff surface;
3. treat old branches, PRs, screenshots, plans, and deployments as evidence, not authority;
4. do not inspect the production site merely to reconstruct source state.

Create bounded implementation branches as `agent/<change>` from the intended current `main` base.

### 2. Prove the changed contract

Use [`docs/VERIFICATION.md`](VERIFICATION.md). The default integration command is:

```bash
npm run check
```

Use browser, visual, lifecycle, fallback, or performance evidence only where the changed behavior requires it. Bind hosted Verify and any required review to the exact final PR head.

A green check means only that the stated checks passed; it does not waive unmet product acceptance.

### 3. Present a mergeable head

Before merge, know:

- PR number and exact head SHA;
- user-visible acceptance outcome;
- relevant Verify/evidence result;
- adaptations or known limitations;
- rollback point;
- whether deployment is or is not included in the user's authorization.

Do not push directly to `main` for ordinary work.

### 4. Merge with head identity protected

For a connected GitHub executor, capability discovery is read-only. Prefer the repository's direct merge action and bind it to the expected PR head SHA when the connector supports that guard. If the head moved, refresh the PR and evidence rather than merging an unreviewed commit.

Use squash merge for a bounded single-purpose change unless the repository/user has a reason to preserve multiple commits.

After merge, fetch fresh `main` and record the resulting merge/main SHA.

## B. Multi-PR release trains

When the user names several PRs for one **“merge and deploy”** operation, treat them as one release train unless they explicitly request separate releases:

1. inspect dependency/order conflicts;
2. merge each authorized PR in the required order, refreshing later PRs if necessary;
3. after the last merge, fetch the final `main` SHA;
4. deploy **once**, from that final SHA.

Do not create a production Sites version after every intermediate merge unless the user explicitly asks for separate releases. Source integration and production release remain conceptually separate even when the user authorizes them in one sentence.

If an older PR is already semantically satisfied by current `main`, omit it and record that fact instead of replaying obsolete code.

## C. Production-release loop

Begin only after production release is authorized, either separately or by an explicit combined instruction such as “合并部署”.

### 1. Resolve the exact release source

1. fetch current `main` after all authorized merges;
2. record the exact SHA being released;
3. confirm required integration/Verify evidence corresponds to that source lineage;
4. do not deploy a stale PR head, old saved artifact, or guessed branch.

GitHub `main` remains the source of truth. Sites is a distribution target and runtime evidence source.

### 2. Build the static artifact

Production remains static. The repository contract is:

```bash
npm ci
npm run build
```

The deployable artifact is `dist/`.

A release tool may perform the build itself, but the source identity must still be the exact approved `main` SHA. Do not add a server/backend merely to accommodate deployment tooling.

### 3. Save/deploy through Sites

When Sites is the selected production surface:

1. create/save a version sourced from the exact approved `main` SHA or exact artifact built from it;
2. deploy that version;
3. confirm the live deployment identity/URL reflects the intended version;
4. do not infer source from the live site when GitHub is available.

A successfully saved Sites version is not deployment proof. A successful deployment action is not runtime proof.

### 4. Run the changed production canary

Follow the production-canary section of [`docs/VERIFICATION.md`](VERIFICATION.md): load the changed journey, confirm expected renderer/fallback behavior, check uncaught runtime failure, and capture only the evidence needed for that release.

For a visual change, inspect the visible result. For a renderer change, confirm the active renderer on a representative compatible device/browser when that claim matters. For a documentation-only change, do not invent a runtime canary unless deployment itself was explicitly requested.

## D. Failure and rollback

- **Merge failure or moved head:** stop that PR, refresh the exact head and relevant evidence, then retry only when still authorized.
- **CI failure:** diagnose the failing affected check; do not weaken an unrelated gate or rebuild repository governance around one failure.
- **Deployment failure:** keep GitHub source unchanged; retry the release tool or return to the last known-good production version.
- **Production regression:** roll back production first when appropriate, then create a one-purpose repair from fresh `main`.
- **Unavailable Sites/deployment capability:** report deployment as blocked; do not substitute an unrelated hosting service without authorization.

Do not attach unrelated refactors, art work, dependency upgrades, or governance changes to an emergency release repair.

## E. Closeout record

For source integration, return at least:

- PR and final reviewed/head SHA;
- merge result and resulting `main` SHA if merged;
- relevant Verify/evidence status.

For production release, additionally return:

- exact released `main` SHA;
- Sites/version or deployment identity when available;
- live URL;
- canary result and any evidence limit;
- rollback target if known.

The repository intentionally does not maintain Crystal Garden's `RELEASE_STATE.json` ledger at this scale. GitHub history, PR identity, deployment history, and concise release closeout are sufficient until a real recurring need justifies a persistent release-state file.
