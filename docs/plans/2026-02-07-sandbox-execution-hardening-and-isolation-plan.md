# Panda Command Execution Sandboxing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Safely evolve Panda from best-effort command guardrails to production-grade sandboxed command execution without breaking current workflows.

**Architecture:** Keep the existing `/api/jobs/execute` request/response contract stable, and introduce an internal executor abstraction with three modes: `legacy`, `hardened`, and `sandbox`. Roll out in phases behind feature flags with explicit fallback to prior mode. Enforce auth, command policy, environment filtering, and resource limits before introducing container isolation.

**Tech Stack:** Next.js 16 route handlers, Node child process APIs, Convex Auth, Bun tests, Playwright E2E, optional Docker-based sandbox runtime.

## Why This Plan

Current state in Panda:

1. Command execution currently uses shell invocation (`shell: true`) in `apps/web/app/api/jobs/execute/route.ts`.
2. There are useful guardrails (timeout, output cap, workspace path restriction) but no OS/container isolation.
3. Search execution is safer (`shell: false` + validation), proving Panda already has a pattern for safer command runners.

This plan minimizes breakage risk by adding safety in layers, not as a big-bang rewrite.

## Scope

### In Scope

1. Harden existing command execution path.
2. Add explicit authn/authz checks for command and search API routes.
3. Add command policy enforcement (allowlist + validation).
4. Add executor abstraction and feature-flagged sandbox runtime.
5. Add test coverage and rollout/rollback runbook.

### Out of Scope (for this plan)

1. Multi-tenant Kubernetes scheduler.
2. Cross-region sandbox orchestration.
3. Billing/quota productization.

## Rollout Strategy (Non-Breaking)

### Mode Definitions

1. `legacy`: Existing behavior (temporary fallback only).
2. `hardened`: No-shell local execution + policy checks + env filtering.
3. `sandbox`: Isolated container/VM execution, ephemeral filesystem, strict resource/network controls.

### Feature Flags / Env Vars

1. `PANDA_EXECUTOR_MODE=legacy|hardened|sandbox` (default `hardened` after phase 1).
2. `PANDA_SANDBOX_IMAGE=<image-tag>`
3. `PANDA_SANDBOX_NETWORK=off|restricted|on` (default `off`)
4. `PANDA_ALLOWED_COMMANDS=<comma-separated allowlist>`

## Implementation Plan (Task-by-Task)

### Task 1: Baseline and Contract Freeze

**Files:**
- Create: `docs/plans/sandbox-contract-baseline.md`
- Modify: `apps/web/app/api/jobs/execute/route.ts`
- Test: `apps/web/app/api/jobs/execute/route.test.ts` (create if missing)

**Steps:**

1. Document the current API contract and expected response fields from `/api/jobs/execute`.
2. Add tests that lock this contract (`stdout`, `stderr`, `exitCode`, `durationMs`, `timedOut`).
3. Add regression test cases for timeout and output size cap.
4. Run: `bun test apps/web/app/api/jobs/execute/route.test.ts`
5. Commit: `test: freeze jobs execute API contract`

### Task 2: Authn/Authz Enforcement for Execution Endpoints

**Files:**
- Modify: `apps/web/app/api/jobs/execute/route.ts`
- Modify: `apps/web/app/api/search/route.ts`
- Create: `apps/web/lib/auth/apiGuards.ts`
- Test: `apps/web/app/api/jobs/execute/route.auth.test.ts`
- Test: `apps/web/app/api/search/route.auth.test.ts`

**Steps:**

1. Add shared API auth guard helper for protected endpoints.
2. Require authenticated user for `/api/jobs/execute` and `/api/search`.
3. Ensure request user is authorized for referenced project context when provided.
4. Add tests for unauthenticated/forbidden/success cases.
5. Run: `bun test apps/web/app/api/jobs/execute/route.auth.test.ts apps/web/app/api/search/route.auth.test.ts`
6. Commit: `feat: enforce auth on command and search APIs`

### Task 3: Harden Runner (No Shell + Command Policy)

**Files:**
- Create: `apps/web/lib/sandbox/commandPolicy.ts`
- Create: `apps/web/lib/sandbox/parseCommand.ts`
- Create: `apps/web/lib/sandbox/localRunner.ts`
- Modify: `apps/web/app/api/jobs/execute/route.ts`
- Test: `apps/web/lib/sandbox/commandPolicy.test.ts`
- Test: `apps/web/lib/sandbox/localRunner.test.ts`

**Steps:**

1. Implement parser that converts raw command string to `command + args` (reject malformed).
2. Implement allowlist policy (`bun`, `npm`, `node`, `git`, `rg`, configurable via env).
3. Block shell metacharacters/composition (`|`, `&&`, `;`, `$()`, redirects) in hardened mode.
4. Execute via `spawn(command, args, { shell: false })`.
5. Keep existing timeout/output/path caps and return schema unchanged.
6. Add unit tests for allowed/blocked commands and runner behavior.
7. Run: `bun test apps/web/lib/sandbox/commandPolicy.test.ts apps/web/lib/sandbox/localRunner.test.ts`
8. Commit: `feat: hardened command runner with allowlist and no-shell execution`

### Task 4: Environment and Filesystem Exposure Reduction

**Files:**
- Create: `apps/web/lib/sandbox/envPolicy.ts`
- Modify: `apps/web/app/api/jobs/execute/route.ts`
- Test: `apps/web/lib/sandbox/envPolicy.test.ts`

**Steps:**

1. Replace `env: process.env` with filtered env passthrough.
2. Default to minimal safe env (`PATH`, locale, required runtime vars only).
3. Explicitly exclude secret-like keys by default (`*_KEY`, `*_SECRET`, tokens).
4. Keep workspace cwd confinement and add test coverage for traversal attempts.
5. Run: `bun test apps/web/lib/sandbox/envPolicy.test.ts`
6. Commit: `feat: filter execution environment and tighten exposure`

### Task 5: Executor Abstraction + Mode Flag

**Files:**
- Create: `apps/web/lib/sandbox/types.ts`
- Create: `apps/web/lib/sandbox/executor.ts`
- Modify: `apps/web/app/api/jobs/execute/route.ts`
- Test: `apps/web/lib/sandbox/executor.test.ts`

**Steps:**

1. Add `Executor` interface with stable `execute(request)` contract.
2. Implement mode selector based on `PANDA_EXECUTOR_MODE`.
3. Wire route to selected executor while preserving current response shape.
4. Add tests for mode selection and fallback behavior.
5. Run: `bun test apps/web/lib/sandbox/executor.test.ts`
6. Commit: `refactor: add pluggable executor modes`

### Task 6: Sandbox Runtime (Feature Flagged)

**Files:**
- Create: `apps/web/lib/sandbox/containerRunner.ts`
- Create: `apps/web/lib/sandbox/containerRunner.test.ts`
- Modify: `apps/web/lib/sandbox/executor.ts`
- Modify: `docs/DEPLOYMENT.md`

**Steps:**

1. Implement container-based runner (ephemeral per command) using configured image.
2. Run as non-root with CPU/memory/process limits and timeout kill handling.
3. Mount only project workspace path read/write as required for jobs.
4. Default network to off; allow opt-in restricted mode.
5. Capture stdout/stderr/exitCode and map to existing API shape.
6. Add tests with mocked container adapter for success/failure/timeout paths.
7. Run: `bun test apps/web/lib/sandbox/containerRunner.test.ts`
8. Commit: `feat: add feature-flagged sandbox container runner`

### Task 7: Observability, Rollback, and Ops Runbook

**Files:**
- Create: `docs/plans/sandbox-rollout-runbook.md`
- Modify: `apps/web/app/api/jobs/execute/route.ts`
- Modify: `README.md`

**Steps:**

1. Add structured logs for executor mode, blocked-command reason, timeout, and truncation.
2. Add operational playbook with rollback procedure (`PANDA_EXECUTOR_MODE=hardened|legacy`).
3. Define alert thresholds (timeout rate, command block rate, failure rate).
4. Document on-call diagnostics and known failure signatures.
5. Commit: `docs: add sandbox rollout and rollback runbook`

### Task 8: Verification and Progressive Rollout

**Files:**
- Modify: `.github/workflows` files as needed
- Modify: `VALIDATION_TASKS.md`

**Steps:**

1. Run local validation:
   - `bun run typecheck`
   - `bun run lint`
   - `bun run format:check`
   - `bun test`
2. Add staged environment rollout:
   - Dev: `hardened` for 100%
   - Staging: `sandbox` for selected projects
   - Prod: `sandbox` for canary %, then full cutover
3. Validate E2E command flows still work (`apps/web/e2e/workbench.e2e-spec.ts` and related job flows).
4. Define explicit cutover criteria and abort thresholds.
5. Commit: `chore: complete sandbox rollout validation gates`

## Acceptance Criteria

1. `/api/jobs/execute` preserves response contract for clients.
2. Shell metacharacter command injection is blocked in hardened/sandbox modes.
3. Unauthorized users cannot execute commands or search via API routes.
4. Secrets are not exposed by default to executed commands.
5. Sandbox mode runs commands in isolated runtime with bounded resources.
6. Rollback to `hardened` mode is one env-var change with no code rollback.

## Cost and Difficulty Assessment

1. Phase 1 (`hardened`): Low-to-moderate engineering effort, low infrastructure cost, low break risk.
2. Phase 2 (`sandbox` behind flag): Moderate engineering + moderate infrastructure effort, manageable break risk with canary rollout.
3. Phase 3 (`sandbox` default): Moderate operational effort, highest security benefit.

## Risk Register and Mitigations

1. Risk: legitimate commands blocked by allowlist.
   - Mitigation: audit logs + quick policy update path + canary first.
2. Risk: command behavior changes without shell expansion.
   - Mitigation: compatibility tests for common Panda command patterns.
3. Risk: sandbox runtime startup latency.
   - Mitigation: image pre-pull, warm pool optional, async job status updates.
4. Risk: operational complexity.
   - Mitigation: strict runbook, feature flag rollout, reversible mode switch.

## Recommended Default Timeline

1. Week 1: Tasks 1-4 (`hardened` complete in dev/staging).
2. Week 2: Tasks 5-6 (sandbox runner behind flag).
3. Week 3: Tasks 7-8 (observability + canary + cutover decision).

## Final Recommendation

1. Do not keep `legacy` mode enabled in production after rollout.
2. Ship `hardened` immediately as baseline safety.
3. Move to `sandbox` default before public or broad customer expansion.
