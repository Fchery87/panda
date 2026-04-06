# Forge Delivery State Closure Plan Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Finish the remaining partial and missing work from the Forge
delivery-state migration so Panda has a complete, maintainable
delivery-control-plane implementation and a clean verification baseline.

**Architecture:** Keep the new delivery control plane that was already added,
but close the remaining gaps with small additive modules rather than more
page-level wiring. The remaining work falls into three buckets: missing
UI/modules (`StatePanel`, `executive.ts`, `types.ts`, `role-mapping.ts`,
`context-pack.ts`, `route-impact.ts`, `reporting.ts`), partial integration
cleanup (review/QA presentation and orchestration modularity), and repo-wide
verification stabilization (`lint`, `format:check`, `bun test`, Playwright
acceptance).

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Convex, existing
Panda harness runtime, Playwright, Bun test runner.

## Context

This plan assumes the first migration pass already landed the following:

- `deliveryStates`, `deliveryTasks`, `reviewReports`, `qaReports`, `shipReports`
- delivery status strip in `RunProgressPanel`
- `TaskPanel`, `QAPanel`, `ReviewPanel` tab extensions
- Manager helper and workflow activation
- review/QA/ship artifact persistence
- browser QA route and Playwright-backed executor

What is still missing or partial:

1. `StatePanel` is not implemented.
2. `executive.ts` does not exist as a distinct pure helper module.
3. Shared type cleanup files do not exist (`delivery/types.ts`,
   `role-mapping.ts`).
4. Context packaging helper does not exist (`context-pack.ts`).
5. QA modularity files do not exist (`route-impact.ts`, `reporting.ts`).
6. Role surface in `agents.ts` was not updated.
7. Review artifact rendering is partial, not fully structured.
8. Repo verification is not fully green.

## Implementation Strategy

Close the plan in this order:

1. Add missing pure modules first.
2. Add missing workbench `StatePanel` and integrate it.
3. Extract and formalize Executive logic.
4. Extract QA route-impact and reporting helpers from the current page/executor
   wiring.
5. Update role mapping/agent surface only where necessary.
6. Finish repo verification and stabilize failing unrelated tests.

This keeps risk low: small modules, then presentation, then orchestration
cleanup, then verification.

## Task-by-Task Implementation Sequence

### Task 1: Add shared delivery type exports

**Files:**

- Create: `apps/web/lib/delivery/types.ts`
- Test: `apps/web/lib/delivery/types.test.ts`

**Step 1: Write the failing test**

Write tests asserting the module exports the canonical unions and narrow record
shapes used across delivery UI helpers.

Example:

```ts
import { describe, expect, test } from 'bun:test'
import type { DeliveryPhase, DeliveryRole, GateStatus } from './types'

describe('delivery types', () => {
  test('exports delivery role unions', () => {
    const role: DeliveryRole = 'manager'
    expect(role).toBe('manager')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `bun test apps/web/lib/delivery/types.test.ts`

Expected: FAIL because the module does not exist.

**Step 3: Write minimal implementation**

Create `types.ts` and export the canonical unions and small shared interfaces
currently duplicated across selectors/components.

**Step 4: Run test to verify it passes**

Run: `bun test apps/web/lib/delivery/types.test.ts`

Expected: PASS.

### Task 2: Add role mapping helper

**Files:**

- Create: `apps/web/lib/delivery/role-mapping.ts`
- Test: `apps/web/lib/delivery/role-mapping.test.ts`

**Step 1: Write the failing test**

Cover mapping from Panda modes (`ask`, `architect`, `code`, `build`) into
delivery roles (`manager`, `executive`, `builder`).

**Step 2: Run test to verify it fails**

Run: `bun test apps/web/lib/delivery/role-mapping.test.ts`

Expected: FAIL.

**Step 3: Write minimal implementation**

Implement a pure `mapChatModeToDeliveryRole(mode)` helper.

**Step 4: Run test to verify it passes**

Run: `bun test apps/web/lib/delivery/role-mapping.test.ts`

Expected: PASS.

### Task 3: Add Executive helper module

**Files:**

- Create: `apps/web/lib/agent/delivery/executive.ts`
- Test: `apps/web/lib/agent/delivery/executive.test.ts`

**Step 1: Write the failing test**

Cover:

- deriving review decision from execution outcome
- deriving ship decision from QA outcome
- generating concise executive summaries

**Step 2: Run test to verify it fails**

Run: `bun test apps/web/lib/agent/delivery/executive.test.ts`

Expected: FAIL.

**Step 3: Write minimal implementation**

Implement pure helpers only, such as:

- `deriveImplementationReviewDecision(...)`
- `deriveShipDecision(...)`
- `buildExecutiveSummary(...)`

**Step 4: Run test to verify it passes**

Run: `bun test apps/web/lib/agent/delivery/executive.test.ts`

Expected: PASS.

### Task 4: Add context-pack helper

**Files:**

- Create: `apps/web/lib/agent/delivery/context-pack.ts`
- Test: `apps/web/lib/agent/delivery/context-pack.test.ts`

**Step 1: Write the failing test**

Cover building a compact context payload from:

- `deliveryState`
- active task
- latest review
- latest QA
- next step brief

**Step 2: Run test to verify it fails**

Run: `bun test apps/web/lib/agent/delivery/context-pack.test.ts`

Expected: FAIL.

**Step 3: Write minimal implementation**

Implement a pure `buildDeliveryContextPack(...)` helper that returns a small
object/string summary.

**Step 4: Run test to verify it passes**

Run: `bun test apps/web/lib/agent/delivery/context-pack.test.ts`

Expected: PASS.

### Task 5: Add QA route-impact helper

**Files:**

- Create: `apps/web/lib/qa/route-impact.ts`
- Test: `apps/web/lib/qa/route-impact.test.ts`

**Step 1: Write the failing test**

Cover mapping changed file paths into affected workbench/project routes.

Example:

```ts
test('maps project page changes to project route', () => {
  expect(
    deriveAffectedRoutes([
      'apps/web/app/(dashboard)/projects/[projectId]/page.tsx',
    ])
  ).toContain('/projects/[projectId]')
})
```

**Step 2: Run test to verify it fails**

Run: `bun test apps/web/lib/qa/route-impact.test.ts`

Expected: FAIL.

**Step 3: Write minimal implementation**

Implement a deterministic `deriveAffectedRoutes(files)` helper. Keep it simple
and explicit.

**Step 4: Run test to verify it passes**

Run: `bun test apps/web/lib/qa/route-impact.test.ts`

Expected: PASS.

### Task 6: Add QA reporting helper

**Files:**

- Create: `apps/web/lib/qa/reporting.ts`
- Test: `apps/web/lib/qa/reporting.test.ts`

**Step 1: Write the failing test**

Cover formatting normalized QA executor output into UI/report-friendly summary
fields.

**Step 2: Run test to verify it fails**

Run: `bun test apps/web/lib/qa/reporting.test.ts`

Expected: FAIL.

**Step 3: Write minimal implementation**

Implement pure helpers like:

- `buildQaSummary(...)`
- `buildQaDefectSummaries(...)`

**Step 4: Run test to verify it passes**

Run: `bun test apps/web/lib/qa/reporting.test.ts`

Expected: PASS.

### Task 7: Add State panel

**Files:**

- Create: `apps/web/components/panels/StatePanel.tsx`
- Test: `apps/web/components/panels/StatePanel.test.tsx`

**Step 1: Write the failing test**

Verify the panel renders:

- current phase
- open task count
- unresolved risk count
- review gate state
- QA gate state
- ship readiness summary

**Step 2: Run test to verify it fails**

Run: `bun test apps/web/components/panels/StatePanel.test.tsx`

Expected: FAIL.

**Step 3: Write minimal implementation**

Implement the panel using Panda’s brutalist workbench conventions.

**Step 4: Run test to verify it passes**

Run: `bun test apps/web/components/panels/StatePanel.test.tsx`

Expected: PASS.

### Task 8: Integrate State panel into Review/workbench surface

**Files:**

- Modify: `apps/web/components/review/ReviewPanel.tsx`
- Modify: `apps/web/components/review/ReviewPanel.test.tsx`
- Modify: `apps/web/app/(dashboard)/projects/[projectId]/page.tsx`

**Step 1: Write the failing test**

Add a test proving `ReviewPanel` accepts and renders a `stateContent` tab.

**Step 2: Run test to verify it fails**

Run: `bun test apps/web/components/review/ReviewPanel.test.tsx`

Expected: FAIL.

**Step 3: Write minimal implementation**

Add a `State` tab and mount `StatePanel` from the project page using the active
delivery state and latest ship report.

**Step 4: Run test to verify it passes**

Run: `bun test apps/web/components/review/ReviewPanel.test.tsx`

Expected: PASS.

### Task 9: Wire Executive helper into review/ship artifact generation

**Files:**

- Modify: `apps/web/lib/agent/delivery/orchestrator.ts`
- Modify: `apps/web/app/(dashboard)/projects/[projectId]/page.tsx`
- Test: `apps/web/lib/agent/delivery/orchestrator.test.ts`

**Step 1: Write the failing test**

Update orchestrator tests so review/ship decisions must come from Executive
helpers, not inline literals.

**Step 2: Run test to verify it fails**

Run: `bun test apps/web/lib/agent/delivery/orchestrator.test.ts`

Expected: FAIL.

**Step 3: Write minimal implementation**

Replace inline review/ship decisions with Executive helper calls.

**Step 4: Run test to verify it passes**

Run: `bun test apps/web/lib/agent/delivery/orchestrator.test.ts`

Expected: PASS.

### Task 10: Update QA route to use route-impact/reporting helpers

**Files:**

- Modify: `apps/web/app/api/qa/run/route.ts`
- Modify: `apps/web/lib/qa/executor.ts`
- Test: `apps/web/app/api/qa/run/route.test.ts`

**Step 1: Write the failing test**

Add assertions that the route uses `buildQaRunInput`/reporting helpers and
affected routes are explicitly provided.

**Step 2: Run test to verify it fails**

Run: `bun test apps/web/app/api/qa/run/route.test.ts`

Expected: FAIL.

**Step 3: Write minimal implementation**

Use the new route-impact/reporting helpers in the route/executor normalization
path.

**Step 4: Run test to verify it passes**

Run: `bun test apps/web/app/api/qa/run/route.test.ts`

Expected: PASS.

### Task 11: Update role surface in agent config only where needed

**Files:**

- Modify: `apps/web/lib/agent/harness/agents.ts`
- Test: `apps/web/lib/agent/harness/agents.test.ts`

**Step 1: Write the failing test**

Cover a minimal role-surface mapping for Builder/Manager/Executive
labels/metadata without changing the runtime model drastically.

**Step 2: Run test to verify it fails**

Run: `bun test apps/web/lib/agent/harness/agents.test.ts`

Expected: FAIL.

**Step 3: Write minimal implementation**

Add additive metadata only. Do not refactor the harness runtime.

**Step 4: Run test to verify it passes**

Run: `bun test apps/web/lib/agent/harness/agents.test.ts`

Expected: PASS.

### Task 12: Stabilize lint warnings

**Files:**

- Modify: `apps/web/app/s/[shareId]/page.tsx`
- Modify: `apps/web/lib/agent/harness/runtime.test.ts`

**Step 1: Write the failing verification step**

Run: `bun run lint`

Expected: FAIL with the current remaining warnings.

**Step 2: Write minimal implementation**

Fix the two remaining warnings without refactoring unrelated code.

**Step 3: Run verification**

Run: `bun run lint`

Expected: PASS or warning-free output.

### Task 13: Stabilize full unit suite

**Files:**

- Modify: `apps/web/lib/agent/runtime.harness-adapter.test.ts`
- Modify: any exact runtime/harness file only if the failure is a real product
  regression

**Step 1: Reproduce the failure**

Run: `bun test`

Expected: FAIL in `runtime.harness-adapter.test.ts`.

**Step 2: Fix minimally**

Prefer updating stale assertions unless the harness behavior is actually wrong.

**Step 3: Re-run unit suite**

Run: `bun test`

Expected: PASS.

### Task 14: Reconcile formatting drift or narrow formatting scope

**Files:**

- Modify only files required by `bun run format:check`

**Step 1: Reproduce the failure**

Run: `bun run format:check`

Expected: FAIL.

**Step 2: Apply minimal formatting fixes**

Format only the necessary files. Do not do stylistic rewrites.

**Step 3: Re-run verification**

Run: `bun run format:check`

Expected: PASS.

### Task 15: Stabilize targeted Playwright acceptance

**Files:**

- Modify: failing E2E specs and/or minimal supporting app code only if required

**Step 1: Reproduce targeted failure**

Run: `bun run test:e2e:reuse-server --grep "Workbench|Agent Run Acceptance"`

Expected: FAIL or timeout.

**Step 2: Fix minimally**

Use Playwright best practices:

- remove brittle waits
- prefer visible/asserted conditions
- avoid implementation-detail selectors

**Step 3: Re-run targeted Playwright command**

Run: `bun run test:e2e:reuse-server --grep "Workbench|Agent Run Acceptance"`

Expected: PASS.

## Required Verification at End

Run these commands in order:

1. `bun run typecheck`
2. `bun run lint`
3. `bun run format:check`
4. `bun test`
5. `bun run test:e2e:reuse-server --grep "Workbench|Agent Run Acceptance"`

Do not claim the closure plan complete unless the above commands are green or
any remaining failures are explicitly called out as unrelated and documented.

## Notes for the Implementer

1. Prefer extracting from the current page-level orchestration rather than
   adding more inline logic.
2. Do not rewrite the harness runtime for role surfaces.
3. Keep the chat/workbench-led UX intact.
4. Keep browser QA route/executor server-side; do not move Playwright into
   client code.
5. Use TDD strictly for every remaining task.

Plan complete and saved to
`docs/plans/2026-04-05-forge-delivery-state-closure-plan.md`. Two execution
options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task,
review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans,
batch execution with checkpoints

Which approach?
