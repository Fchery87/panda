# Forge Delivery State Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Add a canonical delivery state/task model to Panda so chat/workbench
remains the user-facing interface while structured execution, review, QA, and
ship readiness become the real source of truth.

**Architecture:** Keep Panda's existing harness runtime, subagent delegation,
events, checkpoints, planning sessions, specifications, and evals. Add a new
Manager-owned control plane in Convex with `deliveryStates`, `deliveryTasks`,
`reviewReports`, `qaReports`, and `shipReports`, then incrementally rewire
workbench panels to read from that control plane. Chat remains the front door;
the delivery model becomes the authoritative state layer underneath it.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Convex, existing
Panda harness runtime, existing workbench/chat panels, Playwright for browser QA
evidence.

## Current System Facts

Before changing code, read these files to understand the existing system:

- `convex/schema.ts`
- `convex/agentRuns.ts`
- `convex/planningSessions.ts`
- `convex/specifications.ts`
- `convex/evals.ts`
- `apps/web/lib/agent/harness/runtime.ts`
- `apps/web/lib/agent/harness/agents.ts`
- `apps/web/components/chat/RunProgressPanel.tsx`
- `apps/web/components/review/ReviewPanel.tsx`

Current Panda strengths to preserve:

- Harness runtime and execution loop already exist.
- Subagent delegation already exists.
- Context compaction and checkpoints already exist.
- Run events and audit logs already exist.
- Chat/workbench UX should remain the primary interaction model.

Current problem to solve:

- Canonical progress and completion truth is fragmented across `chats`,
  `planningSessions`, `agentRuns`, `specifications`, `sessionSummaries`,
  `artifacts`, and `jobs`.
- There is no first-class task lifecycle with explicit review/QA/ship gates.

## Target Architecture

Add a Manager-owned delivery control plane with one `deliveryState` per
initiative and one or more `deliveryTasks` beneath it.

### Core Rules

1. Chat is the interaction surface, not the source of truth.
2. `deliveryStates` are initiative-scoped, not chat-scoped and not run-scoped.
3. `deliveryTasks` are the execution units.
4. Only Manager logic can advance canonical task/state status.
5. Builder can produce evidence and implementation results but cannot mark work
   complete by itself.
6. Executive produces review, QA, and ship decisions as explicit artifacts.

### New Canonical Objects

1. `deliveryStates`
2. `deliveryTasks`
3. `reviewReports`
4. `qaReports`
5. `shipReports`

### Existing Objects Become Supporting Artifacts

1. `planningSessions` remain plan history.
2. `specifications` remain formal spec artifacts.
3. `agentRuns` and `agentRunEvents` remain execution evidence.
4. `evalRuns` and `evalRunResults` remain verification evidence.
5. `jobs` remain execution/log infrastructure.

## Canonical Schemas

### `deliveryStates`

Purpose: the initiative-level source of truth.

Suggested schema shape in `convex/schema.ts`:

```ts
const DeliveryPhase = v.union(
  v.literal('intake'),
  v.literal('plan'),
  v.literal('execute'),
  v.literal('review'),
  v.literal('qa'),
  v.literal('ship')
)

const DeliveryStatus = v.union(
  v.literal('draft'),
  v.literal('active'),
  v.literal('blocked'),
  v.literal('completed'),
  v.literal('cancelled'),
  v.literal('failed')
)

const DeliveryRole = v.union(
  v.literal('builder'),
  v.literal('manager'),
  v.literal('executive')
)

const GateStatus = v.union(
  v.literal('not_required'),
  v.literal('pending'),
  v.literal('passed'),
  v.literal('failed'),
  v.literal('waived')
)

const DeliveryStateSummary = v.object({
  projectName: v.optional(v.string()),
  goal: v.string(),
  summary: v.optional(v.string()),
  currentPhaseSummary: v.optional(v.string()),
  nextStepBrief: v.optional(v.string()),
  recentChangesDigest: v.optional(v.string()),
  openRisksDigest: v.optional(v.string()),
  decisionDigest: v.optional(v.string()),
})

deliveryStates: defineTable({
  projectId: v.id('projects'),
  chatId: v.id('chats'),
  title: v.string(),
  description: v.optional(v.string()),
  goal: v.string(),
  constraints: v.array(v.string()),
  currentPhase: DeliveryPhase,
  status: DeliveryStatus,
  activeRole: DeliveryRole,
  summary: DeliveryStateSummary,
  activeTaskIds: v.array(v.id('deliveryTasks')),
  pendingReviewIds: v.array(v.id('reviewReports')),
  pendingQaIds: v.array(v.id('qaReports')),
  latestShipReportId: v.optional(v.id('shipReports')),
  affectedFiles: v.array(v.string()),
  affectedRoutes: v.array(v.string()),
  openRiskCount: v.number(),
  unresolvedDefectCount: v.number(),
  evidenceMissing: v.boolean(),
  advisoryGateMode: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
  lastUpdatedByRole: DeliveryRole,
})
  .index('by_project_updated', ['projectId', 'updatedAt'])
  .index('by_chat_updated', ['chatId', 'updatedAt'])
  .index('by_project_status', ['projectId', 'status'])
```

### `deliveryTasks`

Purpose: the authoritative task execution model.

```ts
const DeliveryTaskStatus = v.union(
  v.literal('draft'),
  v.literal('planned'),
  v.literal('ready'),
  v.literal('in_progress'),
  v.literal('blocked'),
  v.literal('in_review'),
  v.literal('qa_pending'),
  v.literal('done'),
  v.literal('rejected')
)

const AcceptanceCriterion = v.object({
  id: v.string(),
  text: v.string(),
  status: v.union(
    v.literal('pending'),
    v.literal('passed'),
    v.literal('failed'),
    v.literal('waived')
  ),
  verificationMethod: v.union(
    v.literal('unit'),
    v.literal('integration'),
    v.literal('e2e'),
    v.literal('manual'),
    v.literal('review')
  ),
})

const TaskEvidenceLink = v.object({
  type: v.union(
    v.literal('agent_run'),
    v.literal('run_event'),
    v.literal('job'),
    v.literal('review_report'),
    v.literal('qa_report'),
    v.literal('ship_report'),
    v.literal('specification'),
    v.literal('eval_run'),
    v.literal('artifact'),
    v.literal('external')
  ),
  id: v.optional(v.string()),
  label: v.string(),
  href: v.optional(v.string()),
})

deliveryTasks: defineTable({
  deliveryStateId: v.id('deliveryStates'),
  taskKey: v.string(),
  title: v.string(),
  description: v.string(),
  rationale: v.string(),
  ownerRole: DeliveryRole,
  dependencies: v.array(v.id('deliveryTasks')),
  filesInScope: v.array(v.string()),
  routesInScope: v.array(v.string()),
  constraints: v.array(v.string()),
  acceptanceCriteria: v.array(AcceptanceCriterion),
  testRequirements: v.array(v.string()),
  reviewRequirements: v.array(v.string()),
  qaRequirements: v.array(v.string()),
  blockers: v.array(v.string()),
  status: DeliveryTaskStatus,
  evidence: v.array(TaskEvidenceLink),
  latestRunId: v.optional(v.id('agentRuns')),
  latestReviewReportId: v.optional(v.id('reviewReports')),
  latestQaReportId: v.optional(v.id('qaReports')),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_delivery_updated', ['deliveryStateId', 'updatedAt'])
  .index('by_delivery_status', ['deliveryStateId', 'status'])
  .index('by_delivery_taskKey', ['deliveryStateId', 'taskKey'])
```

### `reviewReports`

Purpose: explicit architecture/implementation review outcomes.

```ts
const ReviewType = v.union(
  v.literal('architecture'),
  v.literal('implementation')
)

const ReviewDecision = v.union(
  v.literal('pass'),
  v.literal('concerns'),
  v.literal('reject')
)

reviewReports: defineTable({
  deliveryStateId: v.id('deliveryStates'),
  taskId: v.id('deliveryTasks'),
  type: ReviewType,
  decision: ReviewDecision,
  summary: v.string(),
  findings: v.array(
    v.object({
      severity: v.union(
        v.literal('high'),
        v.literal('medium'),
        v.literal('low')
      ),
      title: v.string(),
      detail: v.string(),
      filePath: v.optional(v.string()),
      lineRef: v.optional(v.string()),
    })
  ),
  followUpTaskIds: v.array(v.id('deliveryTasks')),
  reviewerRole: v.literal('executive'),
  createdAt: v.number(),
})
  .index('by_delivery_created', ['deliveryStateId', 'createdAt'])
  .index('by_task_created', ['taskId', 'createdAt'])
```

### `qaReports`

Purpose: explicit QA evidence and decisions.

```ts
const QaDecision = v.union(
  v.literal('pass'),
  v.literal('concerns'),
  v.literal('fail')
)

const QaAssertion = v.object({
  label: v.string(),
  status: v.union(
    v.literal('passed'),
    v.literal('failed'),
    v.literal('skipped')
  ),
  detail: v.optional(v.string()),
})

const QaEvidence = v.object({
  screenshotPath: v.optional(v.string()),
  consoleErrors: v.array(v.string()),
  networkFailures: v.array(v.string()),
  urlsTested: v.array(v.string()),
  flowNames: v.array(v.string()),
})

qaReports: defineTable({
  deliveryStateId: v.id('deliveryStates'),
  taskId: v.id('deliveryTasks'),
  browserSessionKey: v.optional(v.string()),
  decision: QaDecision,
  summary: v.string(),
  assertions: v.array(QaAssertion),
  evidence: QaEvidence,
  defects: v.array(
    v.object({
      severity: v.union(
        v.literal('high'),
        v.literal('medium'),
        v.literal('low')
      ),
      title: v.string(),
      detail: v.string(),
      route: v.optional(v.string()),
    })
  ),
  createdAt: v.number(),
})
  .index('by_delivery_created', ['deliveryStateId', 'createdAt'])
  .index('by_task_created', ['taskId', 'createdAt'])
```

### `shipReports`

Purpose: final readiness assessment for an initiative.

```ts
const ShipDecision = v.union(
  v.literal('ready'),
  v.literal('ready_with_risk'),
  v.literal('not_ready')
)

shipReports: defineTable({
  deliveryStateId: v.id('deliveryStates'),
  decision: ShipDecision,
  summary: v.string(),
  openRisks: v.array(v.string()),
  unresolvedDefects: v.array(v.string()),
  evidenceSummary: v.string(),
  createdAt: v.number(),
}).index('by_delivery_created', ['deliveryStateId', 'createdAt'])
```

## State Transition Rules

Implement state transitions as explicit server-side mutations. Do not allow
arbitrary patching of status values from the client.

### `deliveryTask` transitions

Allowed transitions:

- `draft -> planned`
- `planned -> ready`
- `ready -> in_progress`
- `in_progress -> blocked`
- `blocked -> ready`
- `in_progress -> in_review`
- `in_review -> qa_pending`
- `in_review -> rejected`
- `qa_pending -> done`
- `qa_pending -> rejected`
- `rejected -> ready`

Hard rules:

1. Only Manager mutations change task status.
2. `in_progress -> in_review` requires at least one evidence link and one
   acceptance criterion update.
3. `in_review -> qa_pending` requires a passing or concern-only implementation
   review.
4. `qa_pending -> done` requires QA pass or waived/advisory override recorded.
5. `rejected -> ready` must record follow-up rationale.

### `deliveryState` phase transitions

Allowed transitions:

- `intake -> plan`
- `plan -> execute`
- `execute -> review`
- `review -> qa`
- `qa -> ship`
- `ship -> execute` (if defects or follow-up tasks reopen work)

Hard rules:

1. `plan -> execute` requires at least one `ready` task.
2. `execute -> review` requires no active `in_progress` tasks for the target
   slice.
3. `review -> qa` requires all target tasks to have review outcomes.
4. `qa -> ship` requires no unresolved high-severity QA defects unless
   explicitly waived.
5. `ship -> completed` status requires a ship report.

## File and Module Plan

### Backend schema and lifecycle

**Files:**

- Modify: `convex/schema.ts`
- Create: `convex/deliveryStates.ts`
- Create: `convex/deliveryTasks.ts`
- Create: `convex/reviewReports.ts`
- Create: `convex/qaReports.ts`
- Create: `convex/shipReports.ts`
- Modify: `convex/_generated/*` via Convex generation

### Shared frontend types and selectors

**Files:**

- Create: `apps/web/lib/delivery/types.ts`
- Create: `apps/web/lib/delivery/status-machine.ts`
- Create: `apps/web/lib/delivery/selectors.ts`
- Create: `apps/web/lib/delivery/role-mapping.ts`

### Workbench UI integration

**Files:**

- Modify: `apps/web/components/chat/RunProgressPanel.tsx`
- Modify: `apps/web/components/review/ReviewPanel.tsx`
- Create: `apps/web/components/panels/TaskPanel.tsx`
- Create: `apps/web/components/panels/QAPanel.tsx`
- Create: `apps/web/components/panels/StatePanel.tsx`
- Create: `apps/web/components/chat/DeliveryStatusStrip.tsx`

### Orchestration glue

**Files:**

- Modify: `apps/web/lib/agent/harness/agents.ts`
- Create: `apps/web/lib/agent/delivery/manager.ts`
- Create: `apps/web/lib/agent/delivery/executive.ts`
- Create: `apps/web/lib/agent/delivery/context-pack.ts`

### Browser QA integration

**Files:**

- Create: `apps/web/lib/qa/browser-session.ts`
- Create: `apps/web/lib/qa/route-impact.ts`
- Create: `apps/web/lib/qa/reporting.ts`

## Task-by-Task Implementation Sequence

### Task 1: Add failing schema tests for canonical delivery objects

**Files:**

- Test: `convex/delivery-schema.test.ts`
- Modify: `convex/schema.ts`

**Step 1: Write the failing test**

Write tests asserting the new validators and table definitions exist and accept
valid objects for:

- `deliveryStates`
- `deliveryTasks`
- `reviewReports`
- `qaReports`
- `shipReports`

Example assertion shape:

```ts
import { describe, expect, test } from 'bun:test'
import schema from './schema'

describe('delivery schema', () => {
  test('includes delivery state tables', () => {
    expect(schema.tables).toHaveProperty('deliveryStates')
    expect(schema.tables).toHaveProperty('deliveryTasks')
    expect(schema.tables).toHaveProperty('reviewReports')
    expect(schema.tables).toHaveProperty('qaReports')
    expect(schema.tables).toHaveProperty('shipReports')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `bun test convex/delivery-schema.test.ts`

Expected: FAIL because the tables do not exist.

**Step 3: Write minimal implementation**

Add the new validators and tables to `convex/schema.ts`.

**Step 4: Run test to verify it passes**

Run: `bun test convex/delivery-schema.test.ts`

Expected: PASS.

### Task 2: Add a pure transition-state module with failing tests first

**Files:**

- Create: `apps/web/lib/delivery/status-machine.ts`
- Test: `apps/web/lib/delivery/status-machine.test.ts`

**Step 1: Write the failing test**

Write tests for:

- allowed task transitions
- forbidden task transitions
- allowed delivery phase transitions
- forbidden delivery phase transitions

Example:

```ts
test('task cannot move from ready to done directly', () => {
  expect(canTransitionTask('ready', 'done')).toBe(false)
})
```

**Step 2: Run test to verify it fails**

Run: `bun test apps/web/lib/delivery/status-machine.test.ts`

Expected: FAIL because the module does not exist.

**Step 3: Write minimal implementation**

Implement pure functions:

- `canTransitionTask(from, to)`
- `canTransitionDeliveryPhase(from, to)`

**Step 4: Run test to verify it passes**

Run: `bun test apps/web/lib/delivery/status-machine.test.ts`

Expected: PASS.

### Task 3: Add backend mutations that enforce state transitions

**Files:**

- Create: `convex/deliveryTasks.ts`
- Test: `convex/deliveryTasks.test.ts`

**Step 1: Write the failing test**

Write tests asserting:

- invalid task transitions throw
- valid transitions patch the task
- evidence requirements are enforced for review handoff

**Step 2: Run test to verify it fails**

Run: `bun test convex/deliveryTasks.test.ts`

Expected: FAIL because the functions do not exist.

**Step 3: Write minimal implementation**

Implement mutations like:

- `create`
- `transitionStatus`
- `attachEvidence`
- `setBlockers`

**Step 4: Run test to verify it passes**

Run: `bun test convex/deliveryTasks.test.ts`

Expected: PASS.

### Task 4: Add delivery state lifecycle queries/mutations

**Files:**

- Create: `convex/deliveryStates.ts`
- Test: `convex/deliveryStates.test.ts`

**Step 1: Write the failing test**

Cover:

- create initiative-scoped delivery state
- move delivery phase legally
- reject illegal phase transitions
- update active role and summaries

**Step 2: Run test to verify it fails**

Run: `bun test convex/deliveryStates.test.ts`

Expected: FAIL.

**Step 3: Write minimal implementation**

Implement:

- `create`
- `getActiveByChat`
- `transitionPhase`
- `updateSummary`
- `syncDerivedCounts`

**Step 4: Run test to verify it passes**

Run: `bun test convex/deliveryStates.test.ts`

Expected: PASS.

### Task 5: Add explicit review report persistence

**Files:**

- Create: `convex/reviewReports.ts`
- Test: `convex/reviewReports.test.ts`

**Step 1: Write the failing test**

Cover:

- architecture review creation
- implementation review creation
- concern/reject decisions
- follow-up task linkage

**Step 2: Run test to verify it fails**

Run: `bun test convex/reviewReports.test.ts`

Expected: FAIL.

**Step 3: Write minimal implementation**

Implement create/list functions.

**Step 4: Run test to verify it passes**

Run: `bun test convex/reviewReports.test.ts`

Expected: PASS.

### Task 6: Add explicit QA report persistence

**Files:**

- Create: `convex/qaReports.ts`
- Test: `convex/qaReports.test.ts`

**Step 1: Write the failing test**

Cover:

- QA report creation with routes tested
- assertion result persistence
- defects persistence

**Step 2: Run test to verify it fails**

Run: `bun test convex/qaReports.test.ts`

Expected: FAIL.

**Step 3: Write minimal implementation**

Implement create/list functions.

**Step 4: Run test to verify it passes**

Run: `bun test convex/qaReports.test.ts`

Expected: PASS.

### Task 7: Add ship report persistence

**Files:**

- Create: `convex/shipReports.ts`
- Test: `convex/shipReports.test.ts`

**Step 1: Write the failing test**

Cover creation of ship report and linkage to `deliveryState`.

**Step 2: Run test to verify it fails**

Run: `bun test convex/shipReports.test.ts`

Expected: FAIL.

**Step 3: Write minimal implementation**

Implement create/list functions.

**Step 4: Run test to verify it passes**

Run: `bun test convex/shipReports.test.ts`

Expected: PASS.

### Task 8: Add shared frontend types/selectors

**Files:**

- Create: `apps/web/lib/delivery/types.ts`
- Create: `apps/web/lib/delivery/selectors.ts`
- Test: `apps/web/lib/delivery/selectors.test.ts`

**Step 1: Write the failing test**

Cover summary selectors for current phase, gate badges, evidence missing state,
and active task counts.

**Step 2: Run test to verify it fails**

Run: `bun test apps/web/lib/delivery/selectors.test.ts`

Expected: FAIL.

**Step 3: Write minimal implementation**

Implement selectors only.

**Step 4: Run test to verify it passes**

Run: `bun test apps/web/lib/delivery/selectors.test.ts`

Expected: PASS.

### Task 9: Add compact status strip to chat/workbench

**Files:**

- Create: `apps/web/components/chat/DeliveryStatusStrip.tsx`
- Test: `apps/web/components/chat/DeliveryStatusStrip.test.tsx`
- Modify: `apps/web/components/chat/RunProgressPanel.tsx`

**Step 1: Write the failing test**

Verify the strip renders:

- current phase
- active role
- current task title
- review/QA badges
- evidence warning badge

**Step 2: Run test to verify it fails**

Run: `bun test apps/web/components/chat/DeliveryStatusStrip.test.tsx`

Expected: FAIL.

**Step 3: Write minimal implementation**

Render a small, monospace brutalist strip and mount it in `RunProgressPanel`
when structured delivery is active.

**Step 4: Run test to verify it passes**

Run: `bun test apps/web/components/chat/DeliveryStatusStrip.test.tsx`

Expected: PASS.

### Task 10: Add Task panel

**Files:**

- Create: `apps/web/components/panels/TaskPanel.tsx`
- Test: `apps/web/components/panels/TaskPanel.test.tsx`

**Step 1: Write the failing test**

Verify task panel shows acceptance criteria, scope, blockers, and evidence
links.

**Step 2: Run test to verify it fails**

Run: `bun test apps/web/components/panels/TaskPanel.test.tsx`

Expected: FAIL.

**Step 3: Write minimal implementation**

Implement the panel with current Panda brutalist conventions.

**Step 4: Run test to verify it passes**

Run: `bun test apps/web/components/panels/TaskPanel.test.tsx`

Expected: PASS.

### Task 11: Refactor Review panel into report viewer

**Files:**

- Modify: `apps/web/components/review/ReviewPanel.tsx`
- Test: `apps/web/components/review/ReviewPanel.test.tsx`

**Step 1: Write the failing test**

Cover explicit report rendering for architecture and implementation findings.

**Step 2: Run test to verify it fails**

Run: `bun test apps/web/components/review/ReviewPanel.test.tsx`

Expected: FAIL.

**Step 3: Write minimal implementation**

Refactor ReviewPanel to consume `reviewReports` data.

**Step 4: Run test to verify it passes**

Run: `bun test apps/web/components/review/ReviewPanel.test.tsx`

Expected: PASS.

### Task 12: Add QA panel

**Files:**

- Create: `apps/web/components/panels/QAPanel.tsx`
- Test: `apps/web/components/panels/QAPanel.test.tsx`

**Step 1: Write the failing test**

Verify rendering of routes tested, assertions, console/network issues, and
screenshots.

**Step 2: Run test to verify it fails**

Run: `bun test apps/web/components/panels/QAPanel.test.tsx`

Expected: FAIL.

**Step 3: Write minimal implementation**

Implement the panel.

**Step 4: Run test to verify it passes**

Run: `bun test apps/web/components/panels/QAPanel.test.tsx`

Expected: PASS.

### Task 13: Add State panel

**Files:**

- Create: `apps/web/components/panels/StatePanel.tsx`
- Test: `apps/web/components/panels/StatePanel.test.tsx`

**Step 1: Write the failing test**

Verify current phase, open task counts, unresolved risks, and pending gates are
shown.

**Step 2: Run test to verify it fails**

Run: `bun test apps/web/components/panels/StatePanel.test.tsx`

Expected: FAIL.

**Step 3: Write minimal implementation**

Implement the panel.

**Step 4: Run test to verify it passes**

Run: `bun test apps/web/components/panels/StatePanel.test.tsx`

Expected: PASS.

### Task 14: Add Manager orchestration glue

**Files:**

- Create: `apps/web/lib/agent/delivery/manager.ts`
- Test: `apps/web/lib/agent/delivery/manager.test.ts`

**Step 1: Write the failing test**

Cover:

- activation of structured delivery for non-trivial work
- creation of initiative-scoped delivery state
- creation of first delivery task
- gating handoff to review/QA

**Step 2: Run test to verify it fails**

Run: `bun test apps/web/lib/agent/delivery/manager.test.ts`

Expected: FAIL.

**Step 3: Write minimal implementation**

Implement a small orchestration helper that maps existing Panda events/intent
into delivery-state actions.

**Step 4: Run test to verify it passes**

Run: `bun test apps/web/lib/agent/delivery/manager.test.ts`

Expected: PASS.

### Task 15: Add Executive review/ship helper

**Files:**

- Create: `apps/web/lib/agent/delivery/executive.ts`
- Test: `apps/web/lib/agent/delivery/executive.test.ts`

**Step 1: Write the failing test**

Cover review recommendation and ship recommendation generation.

**Step 2: Run test to verify it fails**

Run: `bun test apps/web/lib/agent/delivery/executive.test.ts`

Expected: FAIL.

**Step 3: Write minimal implementation**

Implement pure helper logic first, no large runtime rewrites.

**Step 4: Run test to verify it passes**

Run: `bun test apps/web/lib/agent/delivery/executive.test.ts`

Expected: PASS.

### Task 16: Add browser QA session abstraction

**Files:**

- Create: `apps/web/lib/qa/browser-session.ts`
- Create: `apps/web/lib/qa/route-impact.ts`
- Create: `apps/web/lib/qa/reporting.ts`
- Test: `apps/web/lib/qa/browser-session.test.ts`

**Step 1: Write the failing test**

Cover:

- creation/reuse of a persistent browser session key
- route impact mapping from changed files
- normalized QA report payload creation

**Step 2: Run test to verify it fails**

Run: `bun test apps/web/lib/qa/browser-session.test.ts`

Expected: FAIL.

**Step 3: Write minimal implementation**

Implement small abstractions only. Do not overbuild the runtime integration yet.

**Step 4: Run test to verify it passes**

Run: `bun test apps/web/lib/qa/browser-session.test.ts`

Expected: PASS.

### Task 17: Integrate delivery activation into existing chat flow

**Files:**

- Modify: relevant chat/workbench controller files after reading actual call
  sites
- Test: targeted component/integration tests around structured activation

**Step 1: Write the failing test**

Add a test proving that non-trivial work creates delivery state while trivial
Q&A does not.

**Step 2: Run test to verify it fails**

Run: targeted `bun test` command for the affected integration test.

Expected: FAIL.

**Step 3: Write minimal implementation**

Hook the Manager helper into the existing chat initiation path.

**Step 4: Run test to verify it passes**

Run: targeted `bun test` command.

Expected: PASS.

## Mapping Existing Panda Concepts to New Delivery Model

Use this mapping during implementation:

- `planningSessions` -> plan artifact input/history
- `specifications` -> structured execution contract
- `agentRuns` -> implementation evidence and timeline source
- `agentRunEvents` -> detailed execution trace
- `jobs` -> command/test execution evidence
- `evalRuns` -> verification evidence
- `artifacts` -> file/command output evidence

Do not duplicate these records into the new tables. Store references and
summaries.

## Testing Strategy

Required verification during implementation:

1. `bun run typecheck`
2. `bun run lint`
3. `bun run format:check`
4. `bun test`

Before claiming completion, also run relevant UI and integration tests added for
delivery panels and orchestration.

If browser QA integration lands in the same branch, also run relevant Playwright
coverage for the workbench route.

## Design Constraints

1. Preserve chat/workbench-led UX.
2. Avoid rewriting `apps/web/lib/agent/harness/runtime.ts` unless proven
   necessary.
3. Keep Manager/Executive logic additive and modular.
4. Prefer small pure helper modules for transition logic and selectors.
5. Avoid duplicating existing evidence data; reference it.
6. Default review/QA gates to advisory mode, not hard blocking.

## Notes for the Implementer

1. Do not let the client patch statuses directly.
2. Do not make the UI depend on replaying chat text to infer truth.
3. Do not introduce a second orchestration runtime.
4. Do not make simple Q&A require delivery state creation.
5. Keep the UI brutally minimal and inspectable, not dashboard-bloated.

Plan complete and saved to
`docs/plans/2026-04-05-forge-delivery-state-migration.md`. Two execution
options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task,
review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans,
batch execution with checkpoints

Which approach?
