# Panda Forge Workflow Productization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to
> implement this plan task-by-task.

**Goal:** Productize Panda's Forge control plane so it behaves like a durable
workflow system instead of only a runtime plus state snapshot, with structured
context packs, centralized gatekeeping, richer QA/review evidence, smarter task
readiness, and explicit handoff views.

**Architecture:** Keep Panda's existing strengths intact: Convex remains the
canonical control plane, the harness remains the execution engine, and the
project workbench remains the main UI surface. Add a Forge workflow layer around
them by introducing a dedicated ContextEngine, central backend gate enforcement,
derived task-board logic, richer verification artifacts, and generated handoff
summaries derived from canonical Convex state.

**Tech Stack:** Next.js 16, React 19, TypeScript, Bun test runner, Convex,
Playwright, Panda harness runtime, existing Forge delivery schema and snapshot
queries.

## Implementation Notes

- Use a dedicated worktree before executing this plan.
- Keep Convex as the source of truth. Do not introduce filesystem state like
  `.forge/` or markdown-as-state.
- Prefer additive schema and query changes first, then UI wiring.
- Reuse existing Forge tests where possible: `convex/forge.test.ts`,
  `apps/web/lib/forge/status-machine.test.ts`,
  `apps/web/lib/qa/executor.test.ts`, `apps/web/lib/forge/route-impact.test.ts`,
  and
  `apps/web/app/(dashboard)/projects/[projectId]/page.delivery-control-plane.test.ts`.
- Every task below should start with a failing test and end with targeted
  verification before moving on.

---

### Task 1: Build a Forge ContextEngine

**Files:**

- Create: `apps/web/lib/forge/context-engine.ts`
- Create: `apps/web/lib/forge/context-engine.test.ts`
- Modify: `apps/web/lib/forge/types.ts`
- Modify: `convex/forge.ts`
- Modify: `apps/web/lib/agent/harness/runtime.ts`

**Step 1: Write the failing context-pack tests**

Add tests for:

- deterministic task-scoped context pack generation
- inclusion of task objective, files, routes, constraints, acceptance criteria,
  test requirements, review requirements, QA requirements, and decision log
  entries
- recent change digest and next-step brief derivation
- exclusion of unrelated tasks from context

Run:

```bash
bun test apps/web/lib/forge/context-engine.test.ts
```

Expected:

- FAIL because `context-engine.ts` does not exist yet.

**Step 2: Implement the minimal ContextEngine**

Create `apps/web/lib/forge/context-engine.ts` exporting:

- `buildWorkerContextPack(args)`
- `buildRecentChangesDigest(args)`
- `buildNextStepBrief(args)`
- `buildExcludedContext(args)`

The first implementation should only depend on data already present in the Forge
snapshot and should not reach into the filesystem.

**Step 3: Extend Forge types for handoff-ready context**

In `apps/web/lib/forge/types.ts`, add additive types if needed for:

- context pack metadata
- handoff summary fields
- task readiness metadata

Keep the existing `WorkerContextPack` shape stable unless a failing test proves
a necessary addition.

**Step 4: Expose the context pack from the backend**

In `convex/forge.ts`, add a read surface such as:

- `getTaskContextPack`
- or enrich `getProjectSnapshot` with a derived active-task context pack

The query must derive from canonical Convex state, not client-side
reconstruction.

**Step 5: Thread the new context pack into the harness boundary**

Modify `apps/web/lib/agent/harness/runtime.ts` only enough to accept a prebuilt
Forge context pack as structured execution context for builder/manager/executive
runs.

Keep this slice minimal: no prompt redesign yet, just prove that the runtime can
consume the pack.

**Step 6: Re-run the tests**

Run:

```bash
bun test apps/web/lib/forge/context-engine.test.ts convex/forge.test.ts
```

Expected:

- PASS

**Step 7: Commit**

```bash
git add apps/web/lib/forge/context-engine.ts apps/web/lib/forge/context-engine.test.ts apps/web/lib/forge/types.ts convex/forge.ts apps/web/lib/agent/harness/runtime.ts
git commit -m "feat: add forge context engine"
```

---

### Task 2: Centralize Workflow Gate Enforcement in Convex

**Files:**

- Create: `convex/lib/forge-gatekeeper.ts`
- Create: `convex/lib/forge-gatekeeper.test.ts`
- Modify: `convex/forge.ts`
- Modify: `apps/web/lib/forge/status-machine.ts`
- Modify: `apps/web/lib/forge/status-machine.test.ts`

**Step 1: Write the failing backend gatekeeper tests**

Add tests for:

- invalid task transitions rejected centrally
- invalid phase transitions rejected centrally
- `in_review` blocked without worker evidence and verification refs
- `qa_pending` blocked without implementation review
- `done` blocked without QA pass or explicit waiver
- ship decisions blocked when gate state is not satisfied

Run:

```bash
bun test convex/lib/forge-gatekeeper.test.ts apps/web/lib/forge/status-machine.test.ts
```

Expected:

- FAIL because backend gatekeeping is not centralized.

**Step 2: Implement the backend gatekeeper helper**

Create `convex/lib/forge-gatekeeper.ts` with pure helpers such as:

- `assertForgeTaskTransition(args)`
- `assertForgePhaseTransition(args)`
- `assertForgeReviewGate(args)`
- `assertForgeQaGate(args)`
- `assertForgeShipGate(args)`

This module should be the only place that enforces backend lifecycle invariants.

**Step 3: Make `convex/forge.ts` call the gatekeeper for every transition**

Update at minimum:

- `startTaskExecution`
- `submitWorkerResult`
- `recordReview`
- `runQaForTask`
- `recordShipDecision`

Remove any duplicated inline transition logic that now lives in the gatekeeper.

**Step 4: Keep frontend status-machine helpers lightweight**

In `apps/web/lib/forge/status-machine.ts`, keep client helpers for display and
optimistic UX, but make it clear in code and tests that the server is
authoritative.

**Step 5: Re-run the tests**

Run:

```bash
bun test convex/lib/forge-gatekeeper.test.ts apps/web/lib/forge/status-machine.test.ts convex/forge.test.ts
```

Expected:

- PASS

**Step 6: Commit**

```bash
git add convex/lib/forge-gatekeeper.ts convex/lib/forge-gatekeeper.test.ts convex/forge.ts apps/web/lib/forge/status-machine.ts apps/web/lib/forge/status-machine.test.ts
git commit -m "feat: centralize forge gate enforcement"
```

---

### Task 3: Upgrade QA Evidence and Route-Impact Analysis

**Files:**

- Modify: `apps/web/lib/forge/route-impact.ts`
- Modify: `apps/web/lib/forge/route-impact.test.ts`
- Modify: `apps/web/lib/qa/executor.ts`
- Modify: `apps/web/lib/qa/executor.test.ts`
- Modify: `apps/web/app/api/qa/run/route.ts`
- Modify: `convex/schema.ts`
- Modify: `convex/forge.ts`
- Create: `apps/web/lib/qa/scenario-catalog.ts`
- Create: `apps/web/lib/qa/scenario-catalog.test.ts`

**Step 1: Write the failing route-impact and QA evidence tests**

Add tests for:

- route inference from App Router files beyond the hardcoded project page
- component-to-route mapping for shared workbench panels
- derived QA scenarios per route or feature area
- normalized QA results containing multiple evidence artifacts, not only one
  screenshot path
- preservation of console/network/trace/report evidence in a stable structure

Run:

```bash
bun test apps/web/lib/forge/route-impact.test.ts apps/web/lib/qa/executor.test.ts apps/web/lib/qa/scenario-catalog.test.ts
```

Expected:

- FAIL because the route impact and evidence model are too narrow.

**Step 2: Replace the hardcoded route mapper with a real inference helper**

Expand `apps/web/lib/forge/route-impact.ts` to support:

- direct `app/**/page.tsx` matches
- route-group normalization like `(dashboard)`
- dynamic-segment preservation like `[projectId]`
- shared component fan-out to multiple routes via a maintained mapping table

Keep the first version deterministic and table-driven.

**Step 3: Add a scenario catalog for route-aware QA**

Create `apps/web/lib/qa/scenario-catalog.ts` exporting helpers such as:

- `deriveQaScenarioNames(args)`
- `deriveQaAssertions(args)`

This should let QA flows evolve from one hardcoded `task-panel-review-loop` path
to named scenarios.

**Step 4: Upgrade browser QA result normalization**

In `apps/web/lib/qa/executor.ts`, expand the evidence model to capture:

- screenshots
- console error log artifact
- network failure log artifact
- optional trace/report artifact refs
- scenario names actually executed

Keep the runtime Playwright slice minimal; focus on structured evidence first.

**Step 5: Persist richer QA evidence in Forge**

Update `convex/schema.ts` and `convex/forge.ts` so `qaReports` persist the
richer evidence artifact list and scenario metadata.

Update `apps/web/app/api/qa/run/route.ts` only enough to pass the richer payload
through.

**Step 6: Re-run the tests**

Run:

```bash
bun test apps/web/lib/forge/route-impact.test.ts apps/web/lib/qa/scenario-catalog.test.ts apps/web/lib/qa/executor.test.ts convex/forge.test.ts
```

Expected:

- PASS

**Step 7: Commit**

```bash
git add apps/web/lib/forge/route-impact.ts apps/web/lib/forge/route-impact.test.ts apps/web/lib/qa/executor.ts apps/web/lib/qa/executor.test.ts apps/web/lib/qa/scenario-catalog.ts apps/web/lib/qa/scenario-catalog.test.ts apps/web/app/api/qa/run/route.ts convex/schema.ts convex/forge.ts
git commit -m "feat: strengthen forge qa evidence and route analysis"
```

---

### Task 4: Add Task Readiness, Prioritization, and Dependency Logic

**Files:**

- Create: `convex/lib/forge-task-board.ts`
- Create: `convex/lib/forge-task-board.test.ts`
- Modify: `convex/forge.ts`
- Modify: `apps/web/app/(dashboard)/projects/[projectId]/page.tsx`
- Modify:
  `apps/web/app/(dashboard)/projects/[projectId]/page.delivery-control-plane.test.ts`
- Modify: `apps/web/lib/forge/types.ts`

**Step 1: Write the failing task-board tests**

Add tests for:

- dependency-aware readiness calculation
- blocked state when prerequisites are incomplete
- active task selection preferring highest-priority ready work, not first array
  item
- deterministic tie-breaking by status and timestamps
- snapshot includes derived readiness metadata

Run:

```bash
bun test convex/lib/forge-task-board.test.ts convex/forge.test.ts apps/web/app/(dashboard)/projects/[projectId]/page.delivery-control-plane.test.ts
```

Expected:

- FAIL because task selection is still first-task-based.

**Step 2: Implement task-board derivation helpers**

Create `convex/lib/forge-task-board.ts` exporting:

- `deriveTaskReadiness(args)`
- `deriveTaskPriority(args)`
- `selectActiveForgeTask(args)`
- `buildTaskBoardView(args)`

The first version should derive from existing fields before adding new schema
columns.

**Step 3: Use the helper in `convex/forge.ts` snapshot building**

Replace ad hoc active-task selection with the shared helper.

Return enough metadata for the page to avoid re-deriving task readiness
client-side.

**Step 4: Simplify page logic to trust the backend snapshot**

In `apps/web/app/(dashboard)/projects/[projectId]/page.tsx`, remove the fallback
logic that picks the first unfinished task when the snapshot already includes an
active task or readiness ordering.

Update `page.delivery-control-plane.test.ts` to assert that the page consumes
the Forge task-board view instead of reproducing server logic.

**Step 5: Re-run the tests**

Run:

```bash
bun test convex/lib/forge-task-board.test.ts convex/forge.test.ts apps/web/app/(dashboard)/projects/[projectId]/page.delivery-control-plane.test.ts
```

Expected:

- PASS

**Step 6: Commit**

```bash
git add convex/lib/forge-task-board.ts convex/lib/forge-task-board.test.ts convex/forge.ts apps/web/app/(dashboard)/projects/[projectId]/page.tsx apps/web/app/(dashboard)/projects/[projectId]/page.delivery-control-plane.test.ts apps/web/lib/forge/types.ts
git commit -m "feat: add forge task readiness and prioritization"
```

---

### Task 5: Add Richer Review Artifacts and Ship-Decision Criteria

**Files:**

- Modify: `apps/web/lib/forge/types.ts`
- Modify: `convex/schema.ts`
- Modify: `convex/forge.ts`
- Modify: `convex/forge.test.ts`
- Create: `convex/review-artifacts.test.ts`
- Create: `convex/ship-criteria.test.ts`

**Step 1: Write the failing review and ship criteria tests**

Add tests for:

- review artifacts containing checklist results, findings, verdict, blocking
  actions, and evidence refs
- ship decisions requiring explicit evidence summaries and unresolved-risk
  accounting
- rejection or concern paths producing follow-up work instead of silent failure
- verification records linked to review and ship outcomes

Run:

```bash
bun test convex/review-artifacts.test.ts convex/ship-criteria.test.ts convex/forge.test.ts
```

Expected:

- FAIL because review and ship artifacts are too shallow.

**Step 2: Extend the contract and schema additively**

In `apps/web/lib/forge/types.ts` and `convex/schema.ts`, add only the fields
needed for:

- richer review checklist artifacts
- required action items
- ship readiness checklist / criteria outcome
- explicit evidence references on review and ship decisions

**Step 3: Persist the richer artifacts through `convex/forge.ts`**

Update at minimum:

- `recordReview`
- `recordShipDecision`

Also update helper builders in `convex/forge.ts` so the snapshot exposes the
richer review and ship summaries.

**Step 4: Re-run the tests**

Run:

```bash
bun test convex/review-artifacts.test.ts convex/ship-criteria.test.ts convex/forge.test.ts
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add apps/web/lib/forge/types.ts convex/schema.ts convex/forge.ts convex/forge.test.ts convex/review-artifacts.test.ts convex/ship-criteria.test.ts
git commit -m "feat: enrich forge review and ship artifacts"
```

---

### Task 6: Add Snapshot Handoff Summaries and Generated Operator Views

**Files:**

- Create: `apps/web/lib/forge/handoff-summary.ts`
- Create: `apps/web/lib/forge/handoff-summary.test.ts`
- Create: `apps/web/lib/forge/operator-views.ts`
- Create: `apps/web/lib/forge/operator-views.test.ts`
- Modify: `convex/forge.ts`
- Modify: `apps/web/lib/forge/types.ts`
- Modify: `apps/web/app/(dashboard)/projects/[projectId]/page.tsx`

**Step 1: Write the failing handoff and operator-view tests**

Add tests for:

- handoff summary generation from snapshot state
- explicit next-step summary for builder, manager, and executive roles
- generated operator views for status, open tasks, pending reviews, QA blockers,
  and ship blockers
- stable formatting of generated views so UI consumers can render them
  predictably

Run:

```bash
bun test apps/web/lib/forge/handoff-summary.test.ts apps/web/lib/forge/operator-views.test.ts
```

Expected:

- FAIL because handoff summaries and operator views do not exist.

**Step 2: Implement handoff summary builders**

Create `apps/web/lib/forge/handoff-summary.ts` exporting:

- `buildForgeHandoffSummary(args)`
- `buildRoleNextActions(args)`

The first version should derive only from snapshot data already available.

**Step 3: Implement generated operator views**

Create `apps/web/lib/forge/operator-views.ts` exporting:

- `buildForgeStatusView(args)`
- `buildForgeTaskView(args)`
- `buildForgeVerificationView(args)`

These should return structured view models first. String/markdown rendering can
be additive after tests pass.

**Step 4: Expose the generated summaries through the snapshot**

In `convex/forge.ts`, enrich `getProjectSnapshot` with additive derived fields
for:

- handoff summary
- role-specific next actions
- operator view summaries

**Step 5: Wire the project page to display the new summaries**

Modify `apps/web/app/(dashboard)/projects/[projectId]/page.tsx` to consume the
new view data instead of deriving ad hoc summaries like the current
ship/readiness fallback text.

Keep the UI change small. The goal is to prove data flow, not redesign the page.

**Step 6: Re-run the tests**

Run:

```bash
bun test apps/web/lib/forge/handoff-summary.test.ts apps/web/lib/forge/operator-views.test.ts convex/forge.test.ts apps/web/app/(dashboard)/projects/[projectId]/page.delivery-control-plane.test.ts
```

Expected:

- PASS

**Step 7: Run repo verification**

Run:

```bash
bun run typecheck && bun run lint && bun run format:check && bun test
```

Expected:

- PASS with zero TypeScript and lint issues.

**Step 8: Commit**

```bash
git add apps/web/lib/forge/handoff-summary.ts apps/web/lib/forge/handoff-summary.test.ts apps/web/lib/forge/operator-views.ts apps/web/lib/forge/operator-views.test.ts apps/web/lib/forge/types.ts convex/forge.ts apps/web/app/(dashboard)/projects/[projectId]/page.tsx
git commit -m "feat: add forge handoff summaries and operator views"
```

---

## Final Verification

After all tasks are complete, run:

```bash
bun run typecheck && bun run lint && bun run format:check && bun test
```

If browser QA flows or page rendering changed materially, also run:

```bash
bun test apps/web/lib/qa/executor.test.ts apps/web/lib/forge/route-impact.test.ts apps/web/app/(dashboard)/projects/[projectId]/page.delivery-control-plane.test.ts
```

## Expected Outcome

When this plan is complete, Panda will still use its own runtime, permissions,
checkpoints, and event bus, but its Forge layer will gain the workflow
productization it is currently missing:

- structured context packs
- centralized gatekeeping
- task readiness and prioritization
- stronger QA evidence
- richer review and ship artifacts
- explicit handoff summaries and operator views

That is the correct adoption line from `FORGE`: not its runtime, but its
workflow formalization.
