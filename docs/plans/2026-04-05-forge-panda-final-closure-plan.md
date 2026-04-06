# Forge Panda Final Closure Plan Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Finish the remaining partial architecture and repo stabilization work
so Panda’s Forge-aligned delivery system is not only implemented, but also
cleanly structured, verifiable, and production-ready.

**Architecture:** Treat the remaining work as two tracks. Track A finishes
structural architecture debt: move orchestration out of the project page, make
Manager/Executive more explicit, formalize browser QA infrastructure, and clean
up remaining helper seams. Track B finishes stabilization: repo-wide
unit/E2E/format verification until Panda’s baseline is green again. Do not add
new product surface area beyond what is needed to complete these two tracks.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Convex, Panda agent
harness, Playwright, Bun test runner, Prettier, ESLint.

## Current Truth

These Forge-aligned pieces are already in place:

1. Canonical delivery schema and persistence.
2. Task/review/QA/ship artifacts.
3. Delivery status strip.
4. Task, QA, and State workbench panels.
5. Manager helper, Executive helper, context pack, shared delivery types.
6. Browser QA route and Playwright-backed executor.
7. Lifecycle progression through review, QA, and ship.

What is still partial or structurally weak:

1. Project-page orchestration is still carrying too much lifecycle logic.
2. Manager/Executive exist as helpers, not as clean orchestration services.
3. Browser QA is real but still minimal: no true session pool/reuse, no artifact
   index, narrow assertions.
4. The repo is not fully green: full unit suite, full formatting, and targeted
   Playwright workbench/agent-run flows still need stabilization.

## Final Remaining Work

### Architectural debt still remaining

1. Move delivery closure logic out of
   `app/(dashboard)/projects/[projectId]/page.tsx` into a dedicated
   orchestrator/service.
2. Reduce page-level branching around review/QA/ship mutation sequencing.
3. Make browser QA route/executor/session/reporting modules the source of truth
   rather than mixed helper/page logic.
4. Ensure State/Task/Review/QA panels read from stable, minimal view-models
   rather than ad hoc object assembly.

### Verification debt still remaining

1. Full `bun test` suite still has older harness/runtime instability.
2. `bun run format:check` still fails due to broad formatting drift.
3. Targeted Playwright workbench/agent-run suite still fails or times out.

## Execution Order

1. Finish orchestration extraction first.
2. Harden browser QA infrastructure second.
3. Stabilize unit tests third.
4. Run Prettier sweep fourth.
5. Stabilize Playwright last.

This order minimizes churn: architecture first, then executor, then
verification.

## Task-by-Task Implementation Sequence

### Task 1: Extract project-page delivery closure logic into a dedicated service

**Files:**

- Create: `apps/web/lib/agent/delivery/service.ts`
- Test: `apps/web/lib/agent/delivery/service.test.ts`
- Modify: `apps/web/app/(dashboard)/projects/[projectId]/page.tsx`

**Step 1: Write the failing test**

Write tests proving the service can:

- attach evidence
- create review report
- create QA report
- transition task to `qa_pending`
- derive final lifecycle updates
- create ship report

without the project page assembling those calls inline.

**Step 2: Run test to verify it fails**

Run: `bun test apps/web/lib/agent/delivery/service.test.ts`

Expected: FAIL because the service does not exist.

**Step 3: Write minimal implementation**

Create a small orchestrator/service that accepts the active task/state IDs, run
ID, and project context and returns/executes the closure plan.

**Step 4: Rewire the project page**

Replace the current inline closure block in `page.tsx` with calls into the new
service.

**Step 5: Run tests to verify green**

Run:

- `bun test apps/web/lib/agent/delivery/service.test.ts`
- existing page delivery tests

Expected: PASS.

### Task 2: Harden browser QA executor contract

**Files:**

- Modify: `apps/web/lib/qa/executor.ts`
- Modify: `apps/web/lib/qa/executor.test.ts`
- Modify: `apps/web/app/api/qa/run/route.ts`
- Modify: `apps/web/app/api/qa/run/route.test.ts`

**Step 1: Write the failing test**

Add tests for:

- explicit assertion failure mapping
- non-empty console/network issue handling
- screenshot path propagation
- base URL override behavior

**Step 2: Run test to verify it fails**

Run:

- `bun test apps/web/lib/qa/executor.test.ts`
- `bun test apps/web/app/api/qa/run/route.test.ts`

Expected: FAIL.

**Step 3: Write minimal implementation**

Improve the real Playwright executor to:

- mark assertion failures clearly
- populate defects when console/network issues exist
- keep normalization deterministic

**Step 4: Run tests to verify green**

Run the two tests again.

Expected: PASS.

### Task 3: Add browser artifact indexing helper

**Files:**

- Create: `apps/web/lib/qa/artifacts.ts`
- Test: `apps/web/lib/qa/artifacts.test.ts`

**Step 1: Write the failing test**

Cover generation of a stable artifact record from:

- browser session key
- screenshot path
- URLs tested
- run ID / task ID

**Step 2: Run test to verify it fails**

Run: `bun test apps/web/lib/qa/artifacts.test.ts`

Expected: FAIL.

**Step 3: Write minimal implementation**

Implement a pure helper that turns browser QA outputs into stable artifact
metadata for later indexing/storage work.

**Step 4: Run test to verify green**

Run: `bun test apps/web/lib/qa/artifacts.test.ts`

Expected: PASS.

### Task 4: Add delivery view-model helper for panels

**Files:**

- Create: `apps/web/lib/delivery/view-models.ts`
- Test: `apps/web/lib/delivery/view-models.test.ts`
- Modify: `apps/web/app/(dashboard)/projects/[projectId]/page.tsx`

**Step 1: Write the failing test**

Cover view-model builders for:

- `TaskPanel`
- `QAPanel`
- `StatePanel`

**Step 2: Run test to verify it fails**

Run: `bun test apps/web/lib/delivery/view-models.test.ts`

Expected: FAIL.

**Step 3: Write minimal implementation**

Move the current panel object assembly out of `page.tsx` into pure helpers.

**Step 4: Rewire page**

Use the new view-model helper in `page.tsx`.

**Step 5: Re-run tests**

Run the new view-model test and the existing panel/page wiring tests.

Expected: PASS.

### Task 5: Fix remaining full unit-suite failures

**Files:**

- Modify: failing files identified by `bun test`

**Step 1: Reproduce failures**

Run: `bun test`

Expected: FAIL.

**Step 2: Isolate one failure at a time**

Re-run individual failing test files or name patterns.

**Step 3: Fix minimally**

Rules:

- Prefer fixing stale assertions over changing runtime behavior
- Only change runtime code if behavior is clearly wrong
- No unrelated refactors

**Step 4: Re-run full unit suite**

Run: `bun test`

Expected: PASS.

### Task 6: Resolve formatting drift

**Files:**

- Modify only files flagged by Prettier

**Step 1: Reproduce drift**

Run: `bun run format:check`

Expected: FAIL.

**Step 2: Apply formatting fixes**

Run: `bun run format`

or format only the affected files if the repo requires narrower scope.

**Step 3: Re-run verification**

Run: `bun run format:check`

Expected: PASS.

### Task 7: Stabilize workbench Playwright bootstrap

**Files:**

- Modify: `apps/web/e2e/helpers/workbench.ts`
- Test: targeted Playwright suite

**Step 1: Reproduce failures**

Run: `bun run test:e2e:reuse-server --grep "Workbench|Agent Run Acceptance"`

Expected: FAIL.

**Step 2: Fix minimal bootstrap assumptions**

Focus on:

- shell readiness waits
- breadcrumb/workspace readiness
- composer/review action availability
- avoid brittle first-textbox assumptions

**Step 3: Re-run targeted suite**

Run the same command.

Expected: fewer failures or PASS.

### Task 8: Stabilize agent-run Playwright flows

**Files:**

- Modify: `apps/web/e2e/agent-run.e2e-spec.ts`
- Modify: related helper(s) only if needed

**Step 1: Reproduce the specific failures**

Run the targeted command or isolate the single failing test names.

**Step 2: Fix minimally**

Use Playwright best practices:

- avoid exact timing assumptions
- assert on user-visible controls and state
- wait for tab/panel visibility instead of generic timeouts

**Step 3: Re-run targeted suite**

Run: `bun run test:e2e:reuse-server --grep "Workbench|Agent Run Acceptance"`

Expected: PASS.

## Required Final Verification

Run these commands in order:

1. `bun run typecheck`
2. `bun run lint`
3. `bun run format:check`
4. `bun test`
5. `bun run test:e2e:reuse-server --grep "Workbench|Agent Run Acceptance"`

Do not consider the Panda/Forge integration fully closed until these commands
are green.

## Notes for the Implementer

1. No new architecture should be introduced beyond extraction and cleanup.
2. Treat failing unit/E2E tests as first-class work, not as optional polish.
3. Prefer changing stale tests over runtime code when the current behavior is
   acceptable.
4. Keep the chat/workbench-led UX intact.
5. Do not re-expand the project page with more orchestration logic; extract
   instead.

Plan complete and saved to
`docs/plans/2026-04-05-forge-panda-final-closure-plan.md`. Two execution
options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task,
review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans,
batch execution with checkpoints

Which approach?
