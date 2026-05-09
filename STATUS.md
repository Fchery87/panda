# Status: M001 GitHub-Backed Panda Projects Implementation

## Current milestone: S12 Final Live GitHub Smoke Path (blocked)

## Last completed: S11 Explicit Sync From GitHub - 2026-05-08

## Decision log

- Implement slices in `.gsd/milestones/M001/M001-ROADMAP.md` dependency order
  because the user requested an automatic implementation loop.
- Use verification before marking any slice complete because GitHub integration
  is security-sensitive and external-write capable.
- S01 stores user-scoped GitHub App installation metadata in `githubConnections`
  and exposes redacted connection status only.
- S02 stores exactly one linked GitHub repository on a Panda project and exposes
  a bounded authorized repository picker backed by the GitHub connection.
- S03 creates GitHub-backed Panda projects from selected repositories and writes
  an initial bounded Convex working-copy payload.
- S04 adds durable GitHub sync state with base branch, base commit, last synced
  commit, changed files, and remote-changed/conflict detection that does not
  overwrite files.
- S05 makes the source-control panel read GitHub-backed project sync state
  before falling back to local workspace Git state for non-GitHub projects.
- S06 creates a namespaced `panda/...` working branch in project sync state
  without changing the base branch.
- S07 records Panda-authored working-copy commits with bot identity and
  requesting-user attribution, then clears committed changed-file state.
- S08 requires explicit confirmation before marking a Panda branch commit as
  pushed to GitHub.
- S09 creates user-reviewable PR drafts from pushed Panda commits and requires
  confirmation before marking the PR created.
- S10 exposes a bounded GitHub shell summary in the workspace top bar so branch,
  sync, pending-change, and PR state are visible outside the source-control
  pane.
- S11 adds explicit Sync from GitHub and refuses to overwrite dirty Panda
  working copies, setting conflict state instead.

## Known issues

- No GitHub App credentials are known in the environment yet, so final live
  smoke verification may require a documented blocker if credentials are
  unavailable.
- The repo has pre-existing task state files and may have unrelated worktree
  changes; do not revert unrelated user changes.
- Full-repo `bun run format:check` is blocked by pre-existing formatting drift
  across many unrelated files. Touched-file formatting checks pass after each
  completed slice.
- S12 live smoke is blocked in this environment because no `GITHUB_APP_*`,
  `GITHUB_TOKEN`, `GH_TOKEN`, or `GITHUB_REPOSITORY_FIXTURES` credentials are
  present.
- Local verification passed for S01-S11: targeted GitHub slice tests, typecheck,
  lint, and touched-file formatting. Full-repo `format:check` remains blocked by
  unrelated pre-existing formatting drift.

## Future work (out of scope, log here)

- Full GitHub issue management.
- Multi-repository Panda projects.
