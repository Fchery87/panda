# GitHub Writeback Integration Plan (Commit, Push, PR, Sync)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Implement a secure GitHub integration in Panda so users can connect
repositories, commit and push changes, create pull requests, and sync branch
state back into Panda.

**Architecture:** Use a GitHub App with installation-scoped access and
short-lived tokens minted server-side in Convex actions. Keep Panda’s source of
truth in Convex `files`, then generate Git commits via GitHub Git Data APIs
(blobs/trees/commits/refs) instead of local persistent worktrees. Expose a
dedicated GitHub panel in the workbench and require explicit user confirmation
for all write actions.

**Tech Stack:** Next.js 16, Convex (queries/mutations/actions/httpAction),
Convex Auth, GitHub App APIs, Tailwind/shadcn UI, Bun test + Playwright.

## Summary

Implement a secure GitHub App based integration so Panda users can connect
selected repositories, commit and push changes from Convex-managed files, create
pull requests, and sync branch state back into Panda.

Chosen defaults:

1. Auth model: GitHub App.
2. Write model: GitHub API-based commits (no local Git worktree).
3. MVP scope: Commit + Push + PR + Sync.
4. Safety model: Explicit user confirmation for all write actions.
5. Access scope: Only selected repos.
6. Branch model: Auto feature branch per PR.
7. UX surface: Dedicated GitHub panel + agent tools.

## Public API / Interface Changes

### Convex schema changes

Modify `convex/schema.ts`:

- Add `githubConnections` table:
  - `userId: Id<'users'>`
  - `installationId: v.number()`
  - `accountLogin: v.string()` (user/org)
  - `accountType: v.union(v.literal('User'), v.literal('Organization'))`
  - `createdAt: v.number()`
  - `updatedAt: v.number()`
  - Indexes: `by_user`, `by_installation`.
- Extend `projects` table with GitHub binding metadata:
  - `github: v.optional(v.object({ installationId: v.number(), owner: v.string(), repo: v.string(), defaultBranch: v.string(), linkedAt: v.number(), linkedBy: v.id('users'), lastSyncedHeadSha: v.optional(v.string()) }))`

### New/updated Convex functions

Refactor `convex/github.ts` into modular actions/mutations/queries with strict
auth checks:

- `createInstallIntent` (mutation): returns signed `state` and GitHub App
  install URL.
- `completeInstall` (action): validates signed state + installation ID and saves
  `githubConnections`.
- `listInstallRepos` (action): lists selectable repos for user installations.
- `linkProjectRepo` (mutation): binds project to
  `{installationId, owner, repo, defaultBranch}`.
- `getProjectGitStatus` (action): compares Panda files vs GitHub branch tree.
- `commitAndPush` (action): creates blobs/tree/commit and updates feature branch
  ref.
- `createPullRequest` (action): opens PR from Panda branch to target branch.
- `syncFromBranch` (action): pulls branch files into Panda `files` table and
  updates `lastSyncedHeadSha`.
- `unlinkProjectRepo` (mutation).
- Keep existing `importRepo` but require auth + ownership.

Add strict ownership/auth checks in all GitHub functions:

- `requireAuth(ctx)` and project ownership verification before any repo action.

### HTTP endpoints

Update `convex/http.ts`:

- Add GitHub webhook endpoint:
  - `POST /api/github/webhook`
  - Verify `X-Hub-Signature-256` using `GITHUB_WEBHOOK_SECRET`.
  - Handle `installation`, `installation_repositories`, `installation.deleted`
    to keep connection/repo linkage valid.

### Frontend UI

- Add `apps/web/components/github/GitHubPanel.tsx`:
  - Connect GitHub App CTA.
  - Repo selector (from installed repos).
  - Branch display.
  - Commit message input.
  - Actions: `Commit & Push`, `Create PR`, `Sync`.
  - Confirmation modal for each write action.
- Integrate panel into `apps/web/components/workbench/Workbench.tsx` (or project
  page side panel).
- Add `apps/web/hooks/useGitHub.ts`:
  - Wrap Convex queries/actions and normalize loading/error states.
- Keep `GitHubImportDialog` but gate with auth and linked repo metadata.

### Agent tool surface

Extend `apps/web/lib/agent/tools.ts` and related tool definitions:

- Add `github_commit_push`, `github_create_pr`, `github_sync`.
- All write tools return a pending approval artifact instead of executing
  immediately.

Extend artifact handling to include GitHub operation artifacts (explicit apply
required).

## Implementation Details

### 1. GitHub App auth and token flow

- Use env vars:
  - `GITHUB_APP_ID`
  - `GITHUB_APP_PRIVATE_KEY`
  - `GITHUB_WEBHOOK_SECRET`
  - `GITHUB_APP_SLUG`
  - `GITHUB_STATE_SECRET`
- Build short-lived App JWT server-side for installation token exchange.
- Never persist installation access tokens; mint per operation.
- Persist only installation metadata + project binding.

### 2. Commit/push algorithm (API-based)

1. Resolve project GitHub binding and target branch.
2. Fetch remote HEAD commit + recursive tree.
3. Build local file map from `files` table (text files only).
4. Compute changed/added/deleted paths.
5. Create blobs for changed/added files.
6. Create tree with `base_tree` and updates/deletions.
7. Create commit with parent = current branch HEAD.
8. Update feature branch ref.
9. Handle non-fast-forward by returning actionable error (`REMOTE_HEAD_MOVED`).

### 3. PR flow

1. Ensure feature branch exists (create on first push if needed).
2. Create PR `head=<owner>:<feature-branch>` to
   `base=<defaultBranch or user-selected>`.
3. Store latest PR URL in project GitHub metadata for quick reopen.

### 4. Sync flow

1. Fetch remote branch tree and file contents.
2. Apply allowlist/size rules consistent with current import logic.
3. Upsert changed files; remove files deleted upstream.
4. Snapshot overwritten files through existing snapshot flow.
5. Update `lastSyncedHeadSha`.

### 5. Security hardening

1. Add auth/ownership checks to existing GitHub actions and related project
   operations.
2. Validate all repo/branch inputs.
3. Restrict operations to linked repository only.
4. Log audit events (user, project, op type, repo, branch, timestamp, result).

## Tests and Scenarios

### Unit tests

- `convex/github.test.ts` (or split modules):
  - state signing/verification.
  - installation token generation logic.
  - commit tree diff builder.
  - branch naming utility.
  - webhook signature verification.
- `apps/web/lib/agent/tools.*.test.ts`:
  - GitHub tools create approval artifacts (not direct execution).

### Integration tests

- Convex action tests with mocked GitHub API responses:
  - link repo succeeds.
  - commit/push success.
  - non-fast-forward conflict path.
  - PR creation success/failure.
  - sync applies add/modify/delete correctly.
- Permission tests:
  - user cannot access another user’s project repo binding.

### E2E tests (`apps/web/e2e/`)

1. Connect flow (mocked callback): repo shows linked status.
2. Commit & Push:
   - changed files visible.
   - confirmation required.
   - success toast and commit SHA shown.
3. Create PR:
   - PR URL appears and opens.
4. Sync:
   - remote changes reflected in editor/tree.
   - destructive sync confirmation shown when needed.
5. Agent-triggered GitHub action:
   - artifact created and requires explicit apply.

### Acceptance criteria

1. User can connect GitHub App and link selected repo to a Panda project.
2. User can commit and push to an auto-created feature branch from Panda.
3. User can open PR to target branch from Panda.
4. User can sync branch changes back into Panda files.
5. No GitHub write operation executes without explicit user confirmation.
6. Unauthorized users cannot read/write GitHub state for projects they do not
   own.
7. Existing public-repo import continues to work.

## Assumptions and Defaults

1. One Panda project maps to exactly one linked GitHub repository.
2. GitHub App is installed on selected repos only.
3. First version supports text-file workflows (binary files remain skipped).
4. Sync is branch-to-Panda overwrite with confirmation for destructive changes.
5. Merge/rebase conflict resolution UI is out of scope for v1 (returns
   actionable errors).
6. Existing terminal remains generic; GitHub v1 is panel + agent-tool driven.
