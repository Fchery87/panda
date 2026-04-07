# Forge Architecture Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to
> implement this plan task-by-task.

**Goal:** Retrofit Panda's workbench and agentic harness into a Forge-aligned
operating model with one canonical control plane, explicit
Builder/Manager/Executive roles, validated task and phase transitions, and
persistent browser-aware QA.

**Architecture:** Keep Panda's current Next.js + Convex + harness stack, but
make Convex the sole orchestration authority. Existing planning, spec, delivery,
review, and QA systems become inputs to a single Forge project snapshot consumed
by the workbench instead of acting as parallel sources of truth.

**Tech Stack:** Next.js 16, React 19, TypeScript, Convex, Playwright, existing
Panda harness/runtime, existing delivery/spec/planning models.

## Implementation Notes

- Preserve the current `/projects/[projectId]` route and the existing workbench
  shell while moving lifecycle logic out of the page and into a new `forge`
  control plane.
- Keep migrations additive first. Do not delete the existing delivery or
  planning entities until the UI reads exclusively from the new snapshot query.
- Treat Convex as the canonical memory system. Do not add a competing `STATE.md`
  implementation.
- Prefer small, verifiable slices. Every task below should land with tests
  before the next task starts.

---

### Task 1: Define Canonical Forge Domain Contracts

**Files:**

- Create: `apps/web/lib/forge/types.ts`
- Create: `apps/web/lib/forge/status-machine.ts`
- Create: `apps/web/lib/forge/contracts.test.ts`
- Create: `apps/web/lib/forge/status-machine.test.ts`

**Step 1: Write the failing contract tests**

Cover:

- valid phase and task transition rules
- required task fields for non-draft tasks
- gate evaluation preconditions
- worker result validation
- snapshot shape stability

Run:

```bash
bun test apps/web/lib/forge/contracts.test.ts apps/web/lib/forge/status-machine.test.ts
```

Expected:

- FAIL because the `forge` contracts do not exist yet.

**Step 2: Implement canonical Forge types**

Define and export:

- `ForgePhase`
- `ForgeRole`
- `ForgeTaskStatus`
- `ForgeGateType`
- `ForgeGateStatus`
- `ForgeProjectSnapshot`
- `ForgeTaskRecord`
- `WorkerContextPack`
- `WorkerResult`
- `ReviewResult`
- `QaResult`
- `BrowserSessionRecord`
- `DecisionLogEntry`
- `VerificationRecord`
- `OrchestrationWave`

Rules to enforce in code:

- `ready` requires acceptance criteria, test requirements, review requirements,
  and QA requirements.
- `in_review` requires worker evidence and at least one verification reference.
- `qa_pending` requires an implementation review result.
- `done` requires QA pass or an explicit waiver.
- ship readiness is derived from gate state, not hand-authored summaries.

**Step 3: Implement the Forge status machine**

Add:

- task transition validator
- phase transition validator
- gate transition helpers
- `assertTaskReadyForTransition` style helpers

**Step 4: Re-run the tests**

Run:

```bash
bun test apps/web/lib/forge/contracts.test.ts apps/web/lib/forge/status-machine.test.ts
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add apps/web/lib/forge/types.ts apps/web/lib/forge/status-machine.ts apps/web/lib/forge/contracts.test.ts apps/web/lib/forge/status-machine.test.ts
git commit -m "feat: add canonical forge domain contracts"
```

---

### Task 2: Extend Convex Schema for Canonical Forge State

**Files:**

- Modify: `convex/schema.ts`
- Create: `convex/forge.ts`
- Create: `convex/forge.test.ts`

**Step 1: Write the failing schema and snapshot tests**

Cover:

- new entities or fields for decisions, verifications, orchestration waves, and
  browser sessions
- presence of a `forge.getProjectSnapshot` query
- snapshot joins current state, tasks, reviews, QA, ship, decisions, and browser
  session summary

Run:

```bash
bun test convex/forge.test.ts convex/delivery-schema.test.ts
```

Expected:

- FAIL because the new schema surface and snapshot query are missing.

**Step 2: Extend the schema additively**

Add one or both of:

- new tables for `deliveryDecisions`, `deliveryVerifications`,
  `orchestrationWaves`, and `browserSessions`
- additive fields on `deliveryStates` required to support a canonical Forge
  snapshot

Keep `deliveryStates` as the root canonical project state unless a new root
record becomes necessary during implementation.

At minimum the canonical state must expose:

- active phase
- active role
- active wave
- gate statuses
- open risks
- unresolved defects
- active browser session reference
- summary digests

**Step 3: Implement `forge.getProjectSnapshot`**

This query should return a workbench-ready read model with:

- project identity
- current phase and status
- active role
- task board data
- active task data
- review summary
- QA summary
- state summary
- browser session summary
- recent activity summary

**Step 4: Re-run the tests**

Run:

```bash
bun test convex/forge.test.ts convex/delivery-schema.test.ts
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add convex/schema.ts convex/forge.ts convex/forge.test.ts
git commit -m "feat: add forge schema and canonical snapshot query"
```

---

### Task 3: Move Orchestration Authority Into Convex

**Files:**

- Expand: `convex/forge.ts`
- Modify: `convex/deliveryStates.ts`
- Modify: `convex/deliveryTasks.ts`
- Modify: `convex/reviewReports.ts`
- Modify: `convex/qaReports.ts`
- Modify: `convex/shipReports.ts`

**Step 1: Write the failing orchestration tests**

Cover:

- intake creates canonical state
- approved plan creates delivery tasks deterministically
- manager-only mutations own phase and task progression
- invalid transitions throw
- failed QA reopens or blocks work instead of shipping

Run:

```bash
bun test convex/forge.test.ts convex/deliveryStates.test.ts convex/deliveryTasks.test.ts convex/qaReports.test.ts convex/reviewReports.test.ts convex/shipReports.test.ts
```

Expected:

- FAIL because orchestration is still split between page code and helper
  modules.

**Step 2: Add the canonical `forge.*` mutation and action surface**

Implement:

- `startIntake`
- `acceptPlan`
- `createTasksFromPlan`
- `startTaskExecution`
- `submitWorkerResult`
- `recordReview`
- `runQaForTask`
- `recordShipDecision`
- `listActivityTimeline`

**Step 3: Make the server the only lifecycle authority**

Move logic currently spread across:

- `apps/web/lib/agent/delivery/manager.ts`
- `apps/web/lib/agent/delivery/orchestrator.ts`
- `apps/web/lib/agent/delivery/service.ts`
- `apps/web/app/(dashboard)/projects/[projectId]/page.tsx`

into server-owned orchestration code.

Keep existing helper modules only if they become thin pure helpers reused by the
`forge` implementation.

**Step 4: Re-run the tests**

Run:

```bash
bun test convex/forge.test.ts convex/deliveryStates.test.ts convex/deliveryTasks.test.ts convex/qaReports.test.ts convex/reviewReports.test.ts convex/shipReports.test.ts
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add convex/forge.ts convex/deliveryStates.ts convex/deliveryTasks.ts convex/reviewReports.ts convex/qaReports.ts convex/shipReports.ts
git commit -m "feat: centralize delivery orchestration in forge control plane"
```

---

### Task 4: Introduce Explicit Builder, Manager, and Executive Runtime Modes

**Files:**

- Modify: `apps/web/lib/agent/runtime.ts`
- Modify: `apps/web/lib/agent/harness/agents.ts`
- Create: `apps/web/lib/forge/context-pack.ts`
- Create: `apps/web/lib/forge/context-pack.test.ts`
- Create: `apps/web/lib/forge/result-parser.ts`
- Create: `apps/web/lib/forge/result-parser.test.ts`

**Step 1: Write the failing runtime and context-pack tests**

Cover:

- role-specific task scoping
- structured worker result parsing
- manager-only merge behavior
- executive review contract handling
- rejection of malformed worker outputs

Run:

```bash
bun test apps/web/lib/forge/context-pack.test.ts apps/web/lib/forge/result-parser.test.ts apps/web/lib/agent/runtime.harness-adapter.test.ts
```

Expected:

- FAIL because role semantics are still mostly inferred from chat mode and
  helper logic.

**Step 2: Add explicit Forge runtime contracts**

Implement `WorkerContextPack` generation with:

- task objective
- files and routes in scope
- constraints
- acceptance criteria
- required tests
- relevant decisions
- recent changes digest
- excluded context summary

**Step 3: Update runtime role mapping**

Refactor `apps/web/lib/agent/runtime.ts` so that:

- Builder is task-scoped and returns structured results
- Manager owns orchestration and merge operations
- Executive owns architecture review, implementation review, QA review, and ship
  review

Do not let Builder mark a task done or mutate canonical state directly.

**Step 4: Re-run the tests**

Run:

```bash
bun test apps/web/lib/forge/context-pack.test.ts apps/web/lib/forge/result-parser.test.ts apps/web/lib/agent/runtime.harness-adapter.test.ts
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add apps/web/lib/agent/runtime.ts apps/web/lib/agent/harness/agents.ts apps/web/lib/forge/context-pack.ts apps/web/lib/forge/context-pack.test.ts apps/web/lib/forge/result-parser.ts apps/web/lib/forge/result-parser.test.ts
git commit -m "feat: add explicit forge role orchestration to runtime"
```

---

### Task 5: Reconcile Planning and Spec Systems With Forge

**Files:**

- Modify: `convex/planningSessions.ts`
- Modify: `convex/specifications.ts`
- Create: `apps/web/lib/forge/reconciliation.ts`
- Create: `apps/web/lib/forge/reconciliation.test.ts`

**Step 1: Write the failing reconciliation tests**

Cover:

- approved plan creates Forge tasks
- active spec becomes an execution and verification contract
- drift creates canonical follow-up entries instead of silent divergence
- snapshot references current approved plan and current active spec

Run:

```bash
bun test apps/web/lib/forge/reconciliation.test.ts convex/planningSessions.test.ts apps/web/lib/agent/spec/__tests__/integration.test.ts
```

Expected:

- FAIL because planning/spec/delivery still behave as parallel truths.

**Step 2: Implement the reconciliation layer**

Rules:

- planning session output is an input artifact to task creation
- approved plan creates or updates delivery phases and tasks
- specification lifecycle updates canonical verification state
- drift becomes a decision log entry, verification failure, or follow-up task

**Step 3: Re-run the tests**

Run:

```bash
bun test apps/web/lib/forge/reconciliation.test.ts convex/planningSessions.test.ts apps/web/lib/agent/spec/__tests__/integration.test.ts
```

Expected:

- PASS

**Step 4: Commit**

```bash
git add convex/planningSessions.ts convex/specifications.ts apps/web/lib/forge/reconciliation.ts apps/web/lib/forge/reconciliation.test.ts
git commit -m "feat: reconcile planning and spec systems with forge state"
```

---

### Task 6: Build Persistent Browser QA Infrastructure

**Files:**

- Replace or refactor: `apps/web/lib/qa/browser-session.ts`
- Replace or refactor: `apps/web/lib/qa/executor.ts`
- Create: `apps/web/lib/forge/browser-session-supervisor.ts`
- Create: `apps/web/lib/forge/browser-session-supervisor.test.ts`
- Create: `apps/web/lib/forge/route-impact.ts`
- Create: `apps/web/lib/forge/route-impact.test.ts`
- Modify: `apps/web/app/api/qa/run/route.ts`

**Step 1: Write the failing QA infrastructure tests**

Cover:

- persistent browser session reuse
- fresh-session fallback when the session is stale
- route-impact resolution from file and route scope
- normalized QA evidence structure

Run:

```bash
bun test apps/web/lib/forge/browser-session-supervisor.test.ts apps/web/lib/forge/route-impact.test.ts apps/web/lib/qa/executor.test.ts apps/web/lib/qa/browser-session.test.ts
```

Expected:

- FAIL because the current QA executor launches a fresh browser every run.

**Step 2: Implement the browser session supervisor**

Responsibilities:

- create or reuse Playwright browser/context
- manage session key and lease
- persist auth/storage state
- attach screenshots and failure evidence
- expose a stable API to the server route

**Step 3: Refactor the QA route to call the supervisor**

`/api/qa/run` should:

- compute or accept route-impact targets
- resolve or create a browser session
- execute targeted QA
- normalize evidence and defect output

**Step 4: Re-run the tests**

Run:

```bash
bun test apps/web/lib/forge/browser-session-supervisor.test.ts apps/web/lib/forge/route-impact.test.ts apps/web/lib/qa/executor.test.ts apps/web/lib/qa/browser-session.test.ts
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add apps/web/lib/qa/browser-session.ts apps/web/lib/qa/executor.ts apps/web/lib/forge/browser-session-supervisor.ts apps/web/lib/forge/browser-session-supervisor.test.ts apps/web/lib/forge/route-impact.ts apps/web/lib/forge/route-impact.test.ts apps/web/app/api/qa/run/route.ts
git commit -m "feat: add persistent browser qa infrastructure"
```

---

### Task 7: Create a Unified Activity Timeline and Decision Surface

**Files:**

- Create: `apps/web/lib/forge/activity.ts`
- Create: `apps/web/lib/forge/activity.test.ts`
- Modify: `convex/forge.ts`

**Step 1: Write the failing activity tests**

Cover:

- merged ordering of run, orchestration, review, QA, ship, and browser-session
  events
- stable event model for workbench rendering
- decision log visibility in the canonical snapshot

Run:

```bash
bun test apps/web/lib/forge/activity.test.ts convex/forge.test.ts
```

Expected:

- FAIL because there is no unified activity model yet.

**Step 2: Implement activity aggregation**

Aggregate:

- agent run events
- orchestration state changes
- review decisions
- QA decisions
- ship decisions
- browser session events
- decision log entries

**Step 3: Re-run the tests**

Run:

```bash
bun test apps/web/lib/forge/activity.test.ts convex/forge.test.ts
```

Expected:

- PASS

**Step 4: Commit**

```bash
git add apps/web/lib/forge/activity.ts apps/web/lib/forge/activity.test.ts convex/forge.ts
git commit -m "feat: add forge activity timeline and decision aggregation"
```

---

### Task 8: Retrofit the Workbench to Consume Forge Snapshot

**Files:**

- Modify: `apps/web/app/(dashboard)/projects/[projectId]/page.tsx`
- Modify: `apps/web/components/review/ReviewPanel.tsx`
- Modify: `apps/web/components/panels/TaskPanel.tsx`
- Modify: `apps/web/components/panels/StatePanel.tsx`
- Modify: `apps/web/components/panels/QAPanel.tsx`
- Create: `apps/web/components/panels/BrowserSessionPanel.tsx`
- Create: `apps/web/components/panels/ActivityTimelinePanel.tsx`
- Create: `apps/web/components/panels/DecisionPanel.tsx`

**Step 1: Write the failing UI integration tests**

Cover:

- page reads one Forge snapshot query
- page no longer directly coordinates delivery transitions after runs
- task/state/QA/review panels render snapshot data
- browser session panel and activity panel render correctly

Run:

```bash
bun test apps/web/app/'(dashboard)'/projects/'[projectId]'/page.delivery-lifecycle.test.ts apps/web/components/panels/TaskPanel.test.tsx apps/web/components/panels/QAPanel.test.tsx apps/web/components/panels/StatePanel.test.tsx apps/web/components/review/ReviewPanel.test.tsx
```

Expected:

- FAIL because the page still owns orchestration glue.

**Step 2: Refactor the project page**

Replace page-local lifecycle writes with:

- one `forge.getProjectSnapshot` read
- thin calls into `forge.*`

Remove direct orchestration responsibilities from:

- run start completion hooks
- delivery transition logic
- direct review/QA/ship artifact creation

**Step 3: Add the new panels**

Add:

- browser session visibility
- activity timeline visibility
- decisions visibility

Keep the existing brutalist UI language and layout conventions.

**Step 4: Re-run the tests**

Run:

```bash
bun test apps/web/app/'(dashboard)'/projects/'[projectId]'/page.delivery-lifecycle.test.ts apps/web/components/panels/TaskPanel.test.tsx apps/web/components/panels/QAPanel.test.tsx apps/web/components/panels/StatePanel.test.tsx apps/web/components/review/ReviewPanel.test.tsx
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add apps/web/app/'(dashboard)'/projects/'[projectId]'/page.tsx apps/web/components/review/ReviewPanel.tsx apps/web/components/panels/TaskPanel.tsx apps/web/components/panels/StatePanel.tsx apps/web/components/panels/QAPanel.tsx apps/web/components/panels/BrowserSessionPanel.tsx apps/web/components/panels/ActivityTimelinePanel.tsx apps/web/components/panels/DecisionPanel.tsx
git commit -m "feat: retrofit workbench to consume forge snapshot"
```

---

### Task 9: Remove Redundant Lifecycle Glue

**Files:**

- Modify or simplify: `apps/web/lib/agent/delivery/manager.ts`
- Modify or simplify: `apps/web/lib/agent/delivery/orchestrator.ts`
- Modify or simplify: `apps/web/lib/agent/delivery/service.ts`
- Modify related callers as needed

**Step 1: Write the failing cleanup assertions**

Cover:

- no page-level direct orchestration remains
- no duplicate transition logic remains outside the Forge control plane
- helper modules are either removed or reduced to pure helper logic

Run:

```bash
bun test apps/web/lib/agent/delivery/manager.test.ts apps/web/lib/agent/delivery/orchestrator.test.ts apps/web/lib/agent/delivery/service.test.ts
```

Expected:

- FAIL or expose obsolete assumptions.

**Step 2: Remove or reduce duplicate orchestration helpers**

Target outcome:

- server is the only delivery lifecycle authority
- helpers only format or derive data, not mutate lifecycle truth

**Step 3: Re-run the tests**

Run:

```bash
bun test apps/web/lib/agent/delivery/manager.test.ts apps/web/lib/agent/delivery/orchestrator.test.ts apps/web/lib/agent/delivery/service.test.ts
```

Expected:

- PASS with updated expectations.

**Step 4: Commit**

```bash
git add apps/web/lib/agent/delivery/manager.ts apps/web/lib/agent/delivery/orchestrator.ts apps/web/lib/agent/delivery/service.ts
git commit -m "refactor: remove redundant client-side delivery orchestration"
```

---

### Task 10: Verify the Full Forge Retrofit Slice

**Files:**

- Update tests created above as needed
- No new product files required unless final fixes are needed

**Step 1: Run targeted unit and integration coverage**

Run:

```bash
bun test apps/web/lib/forge convex apps/web/lib/agent apps/web/components/panels apps/web/components/review
```

Expected:

- PASS

**Step 2: Run full repo verification**

Run:

```bash
bun run typecheck
bun run lint
bun run format:check
bun test
bun run test:e2e
bun run build
```

Expected:

- PASS with zero warnings and no regressions.

**Step 3: Fix any failures**

If any command fails:

- treat it as blocking
- fix forward before closing the task
- do not claim completion until all checks are green

**Step 4: Commit**

```bash
git add .
git commit -m "chore: verify forge retrofit control plane slice"
```

---

## Acceptance Scenarios

- A non-trivial request creates or resumes canonical Forge delivery state.
- An approved plan creates tracked tasks with explicit acceptance and
  verification requirements.
- A Builder worker receives only task-scoped context and cannot mark canonical
  progress directly.
- A Manager merge step is required before task status advances.
- An Executive review can reject implementation and create follow-up work.
- Browser QA runs against affected routes and reuses an existing session when
  valid.
- QA failure blocks ship readiness and records evidence and defects.
- The workbench shows current phase, active role, task health, gate status,
  browser session health, and timeline data from one canonical snapshot.

## Risks

- The current runtime adapter and harness overlap may hide more coupling than
  visible today.
- Existing project page tests may encode old page-owned orchestration behavior
  and need careful migration.
- Persistent browser session support can become flaky if lease handling is
  underspecified.
- Planning/spec reconciliation may surface implicit assumptions in current
  chat-plan behavior.

## Mitigations

- Keep all migration steps additive until snapshot parity is proven.
- Add tests before each refactor step and preserve the current user route and
  shell.
- Keep browser session supervision minimal in v1: one healthy reusable session
  per project/environment.
- Prefer explicit compatibility adapters over large in-place rewrites.
