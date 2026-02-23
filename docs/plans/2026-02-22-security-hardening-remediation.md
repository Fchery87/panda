# Security Hardening Remediation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Eliminate critical unauthenticated code execution and broken access
control issues, then harden exposed HTTP routes and platform security defaults.

**Architecture:** First lock down externally reachable Next.js and Convex HTTP
endpoints, then introduce shared Convex authorization helpers and apply them
consistently to project/chat/file/run resources. Finish with platform hardening
(headers, CI scanning, dependency audit, OAuth callback safety) and
verification.

**Tech Stack:** Next.js App Router, Convex queries/mutations/actions/httpAction,
TypeScript, Bun, Playwright/Bun tests.

## Scope Notes

- This plan prioritizes exploitability and blast radius over completeness of
  cleanup/refactors.
- Use small PRs / commits in the order below.
- Do not refactor unrelated code while applying auth checks.

## Shared Constraints

- Use `requireAuth(ctx)` for authenticated access.
- Add ownership checks via project ownership (`project.createdBy === userId`)
  before returning/mutating project-scoped data.
- Prefer reusable authz helpers over copy-paste checks.
- Keep error messages generic for clients; log details server-side where needed.

## Task 1: Lock Down `/api/jobs/execute` (Critical RCE)

**Files:**

- Modify: `apps/web/app/api/jobs/execute/route.ts`
- Create/Modify test: `apps/web/app/api/jobs/execute/route.test.ts` (if route
  tests exist; otherwise add minimal coverage in `apps/web/app/api/`)

**Step 1: Add auth gate**

- Require authenticated user before executing any command (via existing Convex
  auth/session integration used by app routes).
- Return `401` on unauthenticated requests.

Patch target:

- `apps/web/app/api/jobs/execute/route.ts:38`

Implementation shape:

```ts
// Pseudocode - use repo's existing server auth helper
const identity = await authGuard(req)
if (!identity) {
  return Response.json({ error: 'Unauthorized' }, { status: 401 })
}
```

**Step 2: Remove shell execution**

- Replace `spawn(command, { shell: true })` with parsed command + args and
  `shell: false`.
- Reject empty command and unsupported binaries.

Patch target:

- `apps/web/app/api/jobs/execute/route.ts:64-69`

Implementation shape:

```ts
const [bin, ...args] = parseCommand(command)
if (!ALLOWED_BINARIES.has(bin)) {
  return Response.json({ error: 'Command not allowed' }, { status: 403 })
}

const child = spawn(bin, args, {
  cwd,
  shell: false,
  env: buildSafeChildEnv(),
})
```

**Step 3: Restrict environment variables**

- Replace `env: process.env` with explicit allowlist (`PATH`, `HOME`, `TMPDIR`,
  maybe `CI` if needed).

Patch target:

- `apps/web/app/api/jobs/execute/route.ts:68`

**Step 4: Add tests**

Test cases:

- Unauthenticated request returns `401`
- Disallowed command returns `403`
- Allowed command executes with `shell: false` path (unit-level mocking is fine)

**Step 5: Verify**

Run:

- `bun test apps/web/app/api/jobs/execute/route.test.ts`
- `bun run typecheck`

Expected:

- Tests pass, no TS errors.

## Task 2: Prevent E2E Auth Bypass in Production

**Files:**

- Modify: `apps/web/middleware.ts`
- Modify: `convex/lib/auth.ts`
- Test: add unit tests around bypass helper if a suitable test location exists
  (optional but recommended)

**Step 1: Centralize env guard**

- Add a single helper that only enables bypass when `NODE_ENV !== 'production'`.

Patch targets:

- `apps/web/middleware.ts:12-14`
- `convex/lib/auth.ts:33-35`

Implementation shape:

```ts
function isE2EAuthBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV !== 'production' &&
    process.env.E2E_AUTH_BYPASS === 'true'
  )
}
```

**Step 2: Verify**

Run:

- `bun run typecheck`

## Task 3: Add Shared Convex Authorization Helpers (Project/Chat/File/Run)

**Files:**

- Create: `convex/lib/authz.ts`
- Modify: `convex/lib/auth.ts` (only if helper reuse is beneficial)
- Test: `convex/lib/authz.test.ts` (if test harness exists for Convex helpers)

**Step 1: Add `requireProjectOwner`**

```ts
export async function requireProjectOwner(ctx: any, projectId: Id<'projects'>) {
  const userId = await requireAuth(ctx)
  const project = await ctx.db.get(projectId)
  if (!project || project.createdBy !== userId) throw new Error('Access denied')
  return { userId, project }
}
```

**Step 2: Add `requireChatOwner`**

- Load chat, then project, validate owner.

**Step 3: Add helper(s) for record ownership resolution**

- `requireMessageOwner`, `requireArtifactOwner`, `requireJobOwner`,
  `requireCheckpointOwner`, or a generic “resolve via parent relation” helper.

**Step 4: Verify**

Run:

- `bun run typecheck`

## Task 4: Apply Authz to Core Convex Project Data Modules (Critical)

**Files:**

- Modify: `convex/messages.ts`
- Modify: `convex/artifacts.ts`
- Modify: `convex/chats.ts`
- Modify: `convex/files.ts`
- Modify: `convex/jobs.ts`
- Modify: `convex/checkpoints.ts`
- Modify: `convex/memoryBank.ts`

**Step 1: Patch `convex/messages.ts`**

Protect:

- `list`, `get`, `add`, `update`, `remove`

Rules:

- `list/add` authorize via `chatId`
- `get/update/remove` authorize via fetched message -> `chatId`

**Step 2: Patch `convex/artifacts.ts`**

Protect:

- `list`, `get`, `create`, `updateStatus`

Rules:

- `list/create` via `chatId`
- `get/updateStatus` via fetched artifact -> `chatId`

**Step 3: Patch `convex/chats.ts`**

Protect all exported handlers:

- `list`, `get`, `create`, `update`, `remove`, `fork`, `revert`

Rules:

- project-scoped ops via `projectId`
- chat-scoped ops via `chatId`

**Step 4: Patch `convex/files.ts`**

Protect all exported handlers:

- `list`, `get`, `getByPath`, `batchGet`, `upsert`, `remove`, `createSnapshot`,
  `listSnapshots`, `downloadProject`

Rules:

- file-scoped ops resolve file -> project
- snapshot-scoped ops resolve snapshot -> file -> project

**Step 5: Patch `convex/jobs.ts` and `convex/checkpoints.ts`**

Protect all exported handlers similarly.

**Step 6: Patch `convex/memoryBank.ts`**

Protect `get` and `update` via `projectId`.

**Step 7: Add tests**

Add or extend tests to assert unauthorized access is rejected for at least one
handler in each module.

**Step 8: Verify**

Run:

- `bun run typecheck`
- `bun test`

## Task 5: Apply Authz to Remaining Sensitive Convex Modules (High)

**Files:**

- Modify: `convex/agentRuns.ts`
- Modify: `convex/github.ts`
- Modify: `convex/users.ts`
- Modify: `convex/sharing.ts`

**Step 1: Patch `convex/agentRuns.ts`**

Protect:

- `create`, `appendEvents`, `complete`, `fail`, `stop`, `listByChat`,
  `usageByChatMode`, `listEventsByChat`

Rules:

- Ignore client-supplied `userId` or validate it equals authenticated user.
- Authorize via `projectId`/`chatId` ownership.

**Step 2: Patch `convex/github.ts`**

Protect:

- `importRepo`, `updateProjectRepoUrl`, `createFile`, `getBranches`,
  `getImportProgress`

Rules:

- Require project ownership for project-scoped mutations/actions.
- Validate `repoUrl` strictly to GitHub only (already partially parsed, keep it
  strict).

**Step 3: Patch `convex/users.ts:listByIds`**

- Require auth and limit fields returned (no `tokenIdentifier`, admin metadata
  unless explicitly admin-only).

**Step 4: Patch `convex/sharing.ts`**

- Keep `getSharedChat` public.
- Require ownership for `getChatShareStatus`.
- Replace weak share ID generator (see Task 8 if not done here).
- Retry on collision before insert.

**Step 5: Verify**

Run:

- `bun run typecheck`
- `bun test`

## Task 6: Harden Convex HTTP LLM Endpoints (High)

**Files:**

- Modify: `convex/http.ts`

**Step 1: Add auth to `/api/llm/streamChat` and `/api/llm/listModels`**

- Require authenticated identity (Convex HTTP auth-compatible check) before
  invoking provider calls.
- Return `401` for unauthenticated requests.

**Step 2: Replace permissive CORS**

- Implement origin allowlist from env.
- Reflect only allowed origin.
- Add `Vary: Origin`.

**Step 3: Validate provider against allowlist**

- Reject unknown providers instead of silently defaulting to OpenAI.

**Step 4: Remove API key from query string**

- For `listModels`, read from `Authorization: Bearer ...`.
- Optionally continue supporting `apiKey` query temporarily behind explicit
  deprecation and disabled in production.

**Step 5: Sanitize error responses**

- Log upstream body internally (trimmed) and return generic client message.

**Step 6: Handle client disconnect / abort**

- Wire request abort signal to upstream fetch (where supported) and stream
  reader cleanup.

**Step 7: Verify**

Run:

- `bun run typecheck`
- Add/update endpoint tests if present; otherwise smoke test manually against
  local Convex dev.

## Task 7: Secure Additional Next.js API Routes (High)

**Files:**

- Modify: `apps/web/app/api/search/route.ts`
- Modify: `apps/web/app/api/providers/chutes/test/route.ts`
- Modify: `apps/web/app/api/auth/chutes/callback/route.ts`

**Step 1: Add auth to `/api/search`**

- Require authenticated user before server-side workspace search.
- Return `401` on unauthenticated requests.

**Step 2: Add auth + SSRF controls to Chutes test route**

- Require authenticated user.
- Remove arbitrary `baseUrl` input or restrict to approved Chutes domains.

Implementation shape:

```ts
const allowedHosts = new Set(['llm.chutes.ai'])
const url = new URL(normalizeBaseUrl(body.baseUrl))
if (!allowedHosts.has(url.hostname)) {
  return NextResponse.json({ error: 'Unsupported base URL' }, { status: 400 })
}
```

**Step 3: Fix OAuth callback**

- Validate `state` parameter against server-side/session-stored value.
- Do not place tokens in URL query.
- Preferred: store tokens server-side immediately (authenticated session
  required) and redirect with success flag only.
- Minimum fallback: use URL fragment, not query string.

**Step 4: Verify**

Run:

- `bun run typecheck`
- Route tests (add if missing)

## Task 8: Share Link and Secret Handling Improvements (Medium/High)

**Files:**

- Modify: `convex/sharing.ts`
- Modify: `convex/schema.ts` (only if changing data shape/indexes)
- Modify: `convex/providers.ts`
- Modify: `convex/settings.ts` (if provider configs can contain secrets)

**Step 1: Use cryptographic share IDs**

- Replace `Math.random()` generator with
  `crypto.getRandomValues`/`crypto.randomUUID()`-derived ID.
- Ensure collision retry loop before insert.

**Step 2: Minimize secret exposure in responses**

- `convex/providers.ts:getProviderTokens` should avoid returning raw refresh
  tokens unless absolutely required.
- Return capability/status metadata by default; gate full token read to explicit
  internal/admin flow.

**Step 3: Document/enforce secret storage policy**

- If provider secrets are stored in `settings.providerConfigs`, document risk
  and encrypt or move to dedicated secret storage.

**Step 4: Verify**

Run:

- `bun run typecheck`

## Task 9: Platform Security Hardening (Medium)

**Files:**

- Modify: `apps/web/next.config.ts`
- Modify/Create: `.github/workflows/security.yml`
- Modify: `.github/workflows/ci.yml` (optional if integrating into existing CI)
- Modify: `package.json` / `apps/web/package.json` (scripts)

**Step 1: Add security headers**

- Add `headers()` in Next config with at least:
  - `X-Frame-Options`
  - `X-Content-Type-Options`
  - `Referrer-Policy`
  - `Permissions-Policy`
  - CSP (start report-only or conservative)
- Add HSTS only when production HTTPS assumptions are confirmed.

**Step 2: Add security CI job**

- Run `bun audit` (fail on moderate+ or at least report).
- Add SAST/secret scanning (Semgrep/Gitleaks or GH Advanced Security if
  available).

**Step 3: Add package scripts**

- `security:audit`
- `security:scan`
- `security:secrets`

**Step 4: Verify**

Run:

- `bun run build`
- CI workflow lint if available

## Task 10: Full Verification and Regression Pass

**Files:**

- No code changes expected (verification only)

**Step 1: Run targeted tests after each PR**

- Route tests and module tests touched in each task

**Step 2: Run full quality suite**

Run:

- `bun run typecheck`
- `bun run lint`
- `bun run format:check`
- `bun test`

**Step 3: Run E2E smoke**

Run:

- `bun run test:e2e` (or targeted smoke if full suite is expensive)

**Step 4: Manual security regression checks**

- Confirm unauthenticated calls to:
  - `/api/jobs/execute`
  - `/api/search`
  - `/api/providers/chutes/test`
  - Convex `/api/llm/*` return `401`/`403`.

## Suggested PR / Commit Sequence

1. `security: lock down jobs execute route`
2. `security: disable prod e2e auth bypass`
3. `security: add convex authz helpers`
4. `security: enforce authz on core project data modules`
5. `security: enforce authz on agent/github/sharing/users modules`
6. `security: harden convex llm http endpoints`
7. `security: secure next api search/chutes routes`
8. `security: strengthen share links and secret handling`
9. `security: add headers and security CI`

Plan complete and saved to
`docs/plans/2026-02-22-security-hardening-remediation.md`. Two execution
options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task,
review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans,
batch execution with checkpoints

Which approach?
