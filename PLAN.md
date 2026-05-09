# Plan: M001 GitHub-Backed Panda Projects Implementation

## Milestone 1: S01 GitHub Connection Skeleton

What: Add user-scoped GitHub connection metadata, redacted status APIs, and a
visible connection entry point. Acceptance criteria: a signed-in user can see
GitHub connection state and start the GitHub App connection flow; raw
credentials are never returned. Validation: targeted tests for GitHub connection
state plus
`bun run typecheck && bun run lint && bun run format:check && bun test` when
feasible. Status: [x] complete

## Milestone 2: S02 Authorized Repository Picker

What: Add paginated authorized repository listing and project repository
selection. Acceptance criteria: connected users can select exactly one
authorized repo for a Panda project. Validation: targeted Convex/API/UI tests
plus gate. Status: [x] complete

## Milestone 3: S03 Open Repo As Panda Project

What: Create/open Panda project from selected GitHub repository and import
bounded working copy. Acceptance criteria: selected repo metadata and initial
files populate Convex. Validation: import tests plus gate. Status: [x] complete

## Milestone 4: S04 Durable Sync State And Conflict Baseline

What: Track base branch, commit SHAs, changed-file state, and remote-change
detection. Acceptance criteria: Panda can detect remote changed since sync
without overwriting files. Validation: conflict-state tests plus gate. Status: [
] complete

## Milestone 5: S05 Project-Aware Source Control Read Model

What: Replace production source-control state with project-aware GitHub-backed
status. Acceptance criteria: source-control panel shows repo, base branch, Panda
branch, pending changes, and sync status. Validation: UI/read-model tests plus
gate. Status: [x] complete

## Milestone 6: S06 Task Branch Creation Flow

What: Create/select per-task/session branch by default. Acceptance criteria:
delivery work targets Panda branch, not base branch. Validation: branch flow
tests plus gate. Status: [x] complete

## Milestone 7: S07 Commit Working-Copy Changes

What: Commit Panda working-copy changes to task branch with bot/user
attribution. Acceptance criteria: commit is created from changed Convex files
and attribution is present. Validation: commit tests plus gate. Status: [x]
complete

## Milestone 8: S08 Confirmed Push To GitHub

What: Add explicit push confirmation and push execution. Acceptance criteria:
branch push only occurs after confirmation. Validation: push confirmation/API
tests plus gate. Status: [x] complete

## Milestone 9: S09 PR Draft And Create Flow

What: Generate PR draft from execution context and create PR after user
confirmation. Acceptance criteria: PR title/body are reviewable and confirmed
before GitHub creation. Validation: PR draft/create tests plus gate. Status: [ ]
complete

## Milestone 10: S10 Project Shell GitHub Status

What: Surface branch, changes, sync/conflict, and PR state in Execution Session
shell. Acceptance criteria: delivery state visible outside source-control panel.
Validation: shell UI tests plus gate. Status: [x] complete

## Milestone 11: S11 Explicit Sync From GitHub

What: Add user-triggered sync and conflict-safe update behavior. Acceptance
criteria: safe remote changes apply; conflicts become explicit states.
Validation: sync/conflict tests plus gate. Status: [x] complete

## Milestone 12: S12 Final Live GitHub Smoke Path

What: Verify assembled GitHub-backed workflow against a GitHub App test
installation where credentials are available. Acceptance criteria: connect, repo
select, open, edit, branch, commit, push, PR create, and sync complete in a test
repo or are documented as blocked by missing external credentials. Validation:
live smoke or documented blocker plus full gate. Status: [ ] blocked - missing
GitHub App/test repository credentials in this environment
