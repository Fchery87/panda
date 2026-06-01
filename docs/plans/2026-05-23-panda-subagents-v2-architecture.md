# Panda Subagents v2 Architecture Implementation Plan

> **Date:** 2026-05-23  
> **Status:** Phase 1–17 foundation implemented and verified  
> **Owner:** Panda Workbench / Agentic Harness  
> **Scope:** Browser-native, Convex-backed Subagents v2 inspired by the best
> orchestration ideas from `pi-subagents`, without replacing Panda's existing
> harness runtime.

---

## 1. Executive Summary

Panda should **not** replace its current subagent system with `pi-subagents`
directly. Instead, Panda should implement **Panda Subagents v2**: a
browser-native, Convex-backed orchestration layer that keeps Panda's current
harness, permissions, checkpoints, planning, receipts, and workbench UI while
adopting the strongest workflow patterns from `pi-subagents`.

The target architecture keeps **Panda Harness Runtime + Convex Control Plane**
as the single execution authority and adds:

- first-class child/subagent runs
- run-tree visibility in the workbench
- dynamic custom subagent registry
- saved chains/workflows
- `fresh` vs `fork` context modes
- background runs with status / interrupt / resume
- explicit concurrency controls
- isolation for mutating parallel subagents
- parent-only orchestration guidance
- child safety filtering
- file/artifact outputs for large results
- doctor/diagnostic tooling

The implementation should be incremental. The first milestone is not flashy
orchestration; it is making Panda's existing custom subagents real, safe,
visible, and durable.

---

## 2. Goals

### 2.1 Product Goals

1. Make subagents understandable and useful without overwhelming the workspace.
2. Let users delegate work to focused agents while keeping the main chat clean.
3. Support supervised long-running work from the browser workbench.
4. Make custom subagents executable, inspectable, and governed.
5. Provide clear proof of what each subagent did.
6. Avoid unsafe multi-agent file conflicts.
7. Preserve Panda's existing Plan / Code / Build / Ask mental model.

### 2.2 Technical Goals

1. Use Convex as the durable source of truth for primary and child runs.
2. Keep the existing Panda harness runtime as the execution engine.
3. Add an orchestration service around the harness rather than a second runtime.
4. Persist child runs, events, artifacts, summaries, permissions, and
   checkpoints.
5. Enforce admin policy ceilings for custom subagents and capability presets.
6. Add concurrency and isolation controls before allowing parallel mutating
   agents.
7. Provide a clean API for chains, background runs, status, interrupt, and
   resume.

### 2.3 Non-Goals

For this implementation plan, do **not** build:

- a direct `pi-subagents` runtime replacement
- a dependency on Pi child processes as Panda's core runtime
- peer-to-peer autonomous agent swarms
- unrestricted nested delegation
- public subagent marketplace
- executable Skill plugins
- project/team registries beyond the schema hooks needed later
- live preview dependency for proving subagent work

---

## 3. Design Principles

1. **One execution authority:** Panda Harness Runtime remains the core runtime.
2. **Convex owns truth:** run state, events, receipts, artifacts, permission
   logs, and checkpoints live in Convex.
3. **Parent orchestrates, children execute:** child agents do bounded work and
   return compact summaries/artifacts.
4. **Fresh by default for review:** reviewers, scouts, and researchers should
   avoid parent context contamination.
5. **Fork when continuity matters:** workers can fork from approved plan/build
   context.
6. **No hidden mutation conflicts:** parallel mutating agents require isolation
   or patch-proposal mode.
7. **Admin ceiling always wins:** user/project/session preferences may restrict
   further, never weaken admin policy.
8. **Visible but calm UI:** show run status and proof without turning the
   workspace into a noisy swarm dashboard.
9. **Summaries over transcripts:** only compact summaries return to parent chat
   by default.
10. **Diagnosable by default:** every orchestration feature needs a status,
    audit, and doctor path.

---

## 4. Current-State Gaps To Fix

### 4.1 Custom Subagents Are Stored But Not Fully Executable

Current Convex CRUD exists for `subagents`, but the runtime task tool still
relies on a mostly static built-in registry and hardcoded task-tool enum.

**Fix:** create a dynamic subagent registry resolver that merges built-ins,
custom subagents, admin policy, and future project policy.

### 4.2 Permission Preset Mismatch

`SubagentEditor` currently uses UI permission names such as `read`, `glob`,
`grep`, `list`, `edit`, `write`, `bash`, while the harness uses
tools/capabilities such as `read_files`, `list_directory`, `write_files`,
`run_command`, `search_code`, and `task`.

**Fix:** expose capability presets to users and map them server/runtime-side to
harness permission rules.

### 4.3 Admin Limits Are Not Fully Enforced

Admin settings include controls such as max custom subagents and allowed
capability presets, but write-path enforcement needs to be completed.

**Fix:** enforce admin ceilings in `add`, `update`, `import`, and `duplicate`
operations.

### 4.4 Child Runs Are Not First-Class Runs

Subagent events and summaries exist, but child agents do not yet have durable
independent run records suitable for status, resume, interrupt, tree rendering,
and artifact inspection.

**Fix:** add child-run support to `agentRuns` or create `subagentRuns`.

### 4.5 Unsafe Parallel Mutation Risk

Current subtask execution uses concurrent execution. Edit-capable subagents can
potentially share one workspace.

**Fix:** block or isolate parallel mutating subagents until
snapshot/worktree/patch-proposal isolation is implemented.

### 4.6 UI Surfaces Are Underwired

`ActiveAgentsPane`, `AgentManagerDrawer`, and `SubagentPanel` are good starts,
but they need to read from a durable run tree rather than mostly local/live
props.

**Fix:** add a Convex-backed run tree query and a unified supervision UI.

---

## 5. Target Architecture

```text
User request
  ↓
Primary Panda Run
  ↓
Subagent Orchestrator
  ├─ resolves available agents
  ├─ resolves custom skills and agent defaults
  ├─ chooses fresh/fork context
  ├─ checks admin/user/session policy
  ├─ creates child run records
  ├─ applies isolation strategy
  ├─ launches child harness runtimes
  ├─ streams child events to Convex
  ├─ persists artifacts and summaries
  └─ returns compact result to parent
```

### 5.1 Core Modules

Add or refactor toward these modules:

```text
apps/web/lib/agent/subagents/
├── registry.ts              # built-in + custom subagent resolution
├── presets.ts               # capability preset to permission/capability mapping
├── orchestrator.ts          # child run orchestration API
├── context.ts               # fresh/fork context construction and filtering
├── isolation.ts             # shared-readonly, snapshot, worktree, patch-proposal modes
├── chains.ts                # saved chain execution model
├── artifacts.ts             # subagent artifact normalization
├── summaries.ts             # output/file/test/risk summary extraction
├── diagnostics.ts           # doctor checks
└── types.ts                 # shared Subagents v2 types
```

Keep existing harness internals in:

```text
apps/web/lib/agent/harness/
```

but make the task tool call into the new orchestration layer rather than
directly embedding all behavior in `task-tool.ts` and `runtime.ts`.

---

## 6. Data Model Plan

### 6.1 Preferred Approach: Extend `agentRuns`

Extend `agentRuns` to support both primary and child runs.

Add optional fields:

```ts
runKind: 'primary' | 'subagent'
parentRunId?: Id<'agentRuns'>
parentSubagentId?: string
rootRunId?: Id<'agentRuns'>
subagentName?: string
subagentDepth?: number
contextMode?: 'fresh' | 'fork'
isolationMode?: 'shared-readonly' | 'snapshot' | 'worktree' | 'patch-proposal'
delegatedTaskSummary?: string
outputMode?: 'inline' | 'file-only'
artifactCount?: number
lastActivityAt?: number
```

Add indexes:

```ts
.index('by_parent_started', ['parentRunId', 'startedAt'])
.index('by_root_started', ['rootRunId', 'startedAt'])
.index('by_project_kind_started', ['projectId', 'runKind', 'startedAt'])
```

### 6.2 Alternative: Dedicated `subagentRuns`

If extending `agentRuns` becomes too disruptive, create:

```ts
subagentRuns: defineTable({
  projectId,
  chatId,
  parentRunId,
  rootRunId,
  userId,
  subagentId,
  subagentName,
  status,
  contextMode,
  isolationMode,
  capabilityPreset,
  effectiveCapabilities,
  delegatedTaskSummary,
  outputSummary,
  error,
  startedAt,
  completedAt,
  lastActivityAt,
})
```

**Recommendation:** extend `agentRuns` unless migration risk is too high. A
unified run table simplifies history, receipts, permissions, and status UI.

### 6.3 Run Artifacts

Add a durable artifact table if the existing artifact model is not sufficient:

```ts
runArtifacts: defineTable({
  projectId: v.id('projects'),
  chatId: v.id('chats'),
  runId: v.id('agentRuns'),
  parentRunId: v.optional(v.id('agentRuns')),
  kind: v.union(
    v.literal('summary'),
    v.literal('diff'),
    v.literal('report'),
    v.literal('log'),
    v.literal('patch'),
    v.literal('proof')
  ),
  title: v.string(),
  path: v.optional(v.string()),
  storageId: v.optional(v.id('_storage')),
  contentPreview: v.optional(v.string()),
  metadata: v.optional(v.any()),
  createdAt: v.number(),
})
  .index('by_run_created', ['runId', 'createdAt'])
  .index('by_chat_created', ['chatId', 'createdAt'])
```

### 6.4 Saved Chains

Add:

```ts
agentChains: defineTable({
  userId: v.id('users'),
  projectId: v.optional(v.id('projects')),
  name: v.string(),
  description: v.optional(v.string()),
  scope: v.union(v.literal('user'), v.literal('project')),
  steps: v.array(v.any()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_user', ['userId'])
  .index('by_project', ['projectId'])
  .index('by_user_name', ['userId', 'name'])
```

Project-scoped chains can remain disabled until Panda has stronger team/project
governance semantics.

---

## 7. Built-In Subagent Set

Simplify the default subagent mental model.

### 7.1 Canonical Built-Ins

| Agent        | Default Context | Capability        | Purpose                                |
| ------------ | --------------- | ----------------- | -------------------------------------- |
| `scout`      | fresh           | read/search       | Local codebase reconnaissance          |
| `researcher` | fresh           | web/docs/read     | External research with sources         |
| `planner`    | fork or fresh   | read/search       | Implementation plan and risks          |
| `worker`     | fork            | edit/exec bounded | Implementation from approved task/plan |
| `reviewer`   | fresh           | read/search       | Independent review and critique        |
| `oracle`     | fork            | read/search       | Second opinion; challenge assumptions  |
| `delegate`   | fresh           | bounded by parent | General-purpose child worker           |

### 7.2 Optional Templates

Hide these under templates, not the default list:

- `security-reviewer`
- `performance-reviewer`
- `test-writer`
- `docs-writer`
- `database-reviewer`
- `ux-copywriter`

### 7.3 Naming Cleanup

Normalize UI/docs/runtime names:

- replace stale references to `@general` and `@review`
- avoid duplicate names like `security-auditor` vs `security-checker`
- align Settings, task tool, docs, and runtime registry

---

## 8. Capability Presets

Use four user-facing presets:

```ts
research
assistant
builder
restricted
```

### 8.1 Preset Mapping

| Preset       | Capabilities               | Default Tool Policy                                              |
| ------------ | -------------------------- | ---------------------------------------------------------------- |
| `research`   | read, search               | allow read/search; deny edit/exec/task                           |
| `assistant`  | read, search, limited task | ask before edit/exec; no nested task unless allowed              |
| `builder`    | read, search, edit, exec   | allow within admin/session policy; high-risk prompts still apply |
| `restricted` | admin/project constrained  | deny by default except explicit allowed capabilities             |

### 8.2 Runtime Invariants

1. A child cannot exceed the parent permission ceiling.
2. Admin deny always wins.
3. Session approval can satisfy admin ask, but persistent user allow cannot
   weaken admin ask/deny.
4. Nested delegation is denied unless the parent child explicitly has `task`
   capability.
5. `maxSubagentDepth` defaults to `2`.
6. Parallel mutating children require isolation.

---

## 9. Context Modes

### 9.1 Fresh Context

Use for:

- reviewers
- scouts
- researchers
- independent second opinions
- parallel review passes

Fresh context includes only the explicit delegated prompt and minimal necessary
project context.

### 9.2 Fork Context

Use for:

- worker continuing an accepted plan
- oracle reviewing current decision path
- planner when parent context materially matters

Fork context inherits selected parent context but must filter:

- parent-only orchestration instructions
- prior subagent tool-call noise
- status/control messages
- old child summaries unless explicitly relevant
- hidden workflow implementation details

### 9.3 Context Filtering

Add:

```ts
buildSubagentContext({
  parentMessages,
  mode: 'fresh' | 'fork',
  delegatedTask,
  agent,
  maxTokens,
})
```

Acceptance criteria:

- child receives no parent-only orchestration skill unless allowed
- child receives no stale status/control artifacts
- child prompt includes objective, boundaries, expected output, relevant files,
  and permission expectations

---

## 10. Orchestration API

### 10.1 Task Tool Schema

Replace the hardcoded enum approach with dynamic validation against registry.

Target schema:

```ts
{
  agent: string,
  task: string,
  description?: string,
  context?: 'fresh' | 'fork',
  async?: boolean,
  isolation?: 'shared-readonly' | 'snapshot' | 'worktree' | 'patch-proposal',
  output?: string,
  outputMode?: 'inline' | 'file-only',
  expectedOutput?: string,
  constraints?: string[],
}
```

### 10.2 Chain Schema

```ts
{
  chain: [
    { agent: 'scout', task: 'Map relevant files for {task}', output: 'context.md' },
    { agent: 'planner', task: 'Plan from {previous}' },
    {
      parallel: [
        { agent: 'reviewer', task: 'Review for correctness' },
        { agent: 'reviewer', task: 'Review for simplicity' },
      ],
      concurrency: 2,
      failFast: false,
    },
  ],
  context?: 'fresh' | 'fork',
  async?: boolean,
}
```

### 10.3 Management Actions

Add Convex-backed equivalents:

```ts
listAgents
getAgent
createAgent
updateAgent
deleteAgent
listChains
getChain
createChain
updateChain
deleteChain
statusRun
interruptRun
resumeRun
doctor
```

UI can expose these as settings/actions; the model can use a safer internal API.

---

## 11. Background Runs, Status, Interrupt, Resume

### 11.1 Background Runs

A background run should:

1. create parent/child run records
2. return control to chat quickly
3. stream status into Convex
4. notify on completion/failure/attention-needed
5. remain visible in Active Agents / Agent Manager

### 11.2 Status

Status should include:

- run status
- child tree
- current step/tool
- last activity
- elapsed time
- files touched
- approvals requested
- errors
- artifacts

### 11.3 Interrupt

Interrupt should:

- abort runtime controller
- mark run `stopped`
- persist final partial receipt
- stop child runs recursively unless configured otherwise

### 11.4 Resume

Resume should:

- load latest runtime checkpoint
- append user follow-up message
- continue with same run or create linked continuation run
- preserve child ancestry

Initial implementation may support resume for primary runs first and child runs
second.

---

## 12. Isolation Strategy

### 12.1 Isolation Modes

| Mode              | Use Case                                 | Behavior                                         |
| ----------------- | ---------------------------------------- | ------------------------------------------------ |
| `shared-readonly` | scout/research/review                    | no writes allowed                                |
| `patch-proposal`  | parallel mutating review/fix suggestions | child outputs patch artifact; parent applies     |
| `snapshot`        | browser/WebContainer mutation isolation  | child works against copied/snapshotted workspace |
| `worktree`        | local/native git repos                   | child gets git worktree                          |

### 12.2 Safety Rules

1. Parallel read-only children are allowed.
2. Parallel mutating children require `patch-proposal`, `snapshot`, or
   `worktree`.
3. If no isolation is available, serialize mutating children.
4. Parent applies final patches/diffs after review.
5. UI must identify which isolation mode was used.

### 12.3 First Implementation

Phase 1 should implement:

```text
shared-readonly
patch-proposal
```

Phase 2 can add:

```text
snapshot for WebContainer
worktree for local/native mode
```

---

## 13. UI Plan

### 13.1 Workbench Run Tree

Create a unified run tree panel:

```text
Current Run
├─ Scout              completed   12s
├─ Planner            completed   18s
├─ Worker             running     2m 14s
└─ Reviewers
   ├─ Correctness     queued
   ├─ Tests           queued
   └─ Simplicity      queued
```

Each row should show:

- agent name
- status
- duration
- last activity
- changed files count
- artifact count
- approval status
- error indicator

### 13.2 Chat Cards

Keep chat compact:

```text
Scout completed — found 7 relevant files.
Worker running — editing 3 files.
Reviewer completed — 2 issues found.
```

No huge child transcript in chat by default.

### 13.3 Proof / Receipt Panel

Add subagent section:

- subagents used
- context mode
- isolation mode
- skills applied
- files touched
- commands run
- tests run
- approvals requested
- artifacts produced
- warnings/risks

### 13.4 Settings UI

Upgrade `SubagentEditor`:

- create
- edit
- duplicate
- delete
- import/export later
- capability preset selector
- attached skills
- model preference where allowed
- admin policy messaging
- runtime slug/name validation
- preview effective permissions

### 13.5 Agent Manager Drawer

Connect it to durable run tree queries instead of mostly local active state.

---

## 14. Diagnostics / Doctor

Add `SubagentsDoctor` checks:

1. Custom subagents enabled by admin?
2. Current user below custom subagent limit?
3. Capability preset allowed by admin?
4. Built-in registry loaded?
5. Convex custom subagents visible to runtime?
6. Permission preset maps to valid harness tools/capabilities?
7. Checkpoint store reachable?
8. Run event persistence working?
9. Background worker/status subscription healthy?
10. Isolation mode available for mutating parallel agents?
11. Child context filtering active?
12. Nested delegation depth cap active?

Expose as:

- Settings diagnostic button
- admin diagnostics
- internal model tool/action later

---

## 15. Implementation Phases

## Phase 0 — Guardrails And Naming Cleanup

**Goal:** stabilize the current system before new orchestration features.

### Tasks

- [ ] Audit all subagent names in docs, UI, runtime, tests.
- [ ] Normalize built-in names or create compatibility aliases.
- [ ] Fix stale empty-state text in `SubagentEditor`.
- [ ] Remove duplicate/confusing default agents from primary UI.
- [ ] Add a single source of truth for built-in subagent metadata.
- [ ] Add tests for name/slug normalization.

### Acceptance Criteria

- UI, docs, task tool, and runtime use the same canonical built-in names.
- No stale references to nonexistent `@general` / `@review` style names.
- Built-in metadata can be rendered in Settings and used by runtime.

---

## Phase 1 — Make Custom Subagents Real

**Goal:** Convex custom subagents become executable runtime agents.

### Tasks

- [ ] Add `apps/web/lib/agent/subagents/registry.ts`.
- [ ] Resolve built-ins + user custom subagents into a runtime registry.
- [ ] Replace static task-tool enum with dynamic runtime validation.
- [ ] Add capability preset mapping in `presets.ts`.
- [ ] Enforce admin allowed presets in `convex/subagents.ts`.
- [ ] Enforce max custom subagents per user.
- [ ] Add duplicate-name checks on update.
- [ ] Guard `dev@example.com` fallback to development/test only or remove.
- [ ] Add unit tests for add/update/list/remove policy enforcement.
- [ ] Add runtime tests proving custom subagent can be selected and invoked.

### Acceptance Criteria

- A user can create a custom subagent in Settings and invoke it in a run.
- Disallowed capability presets are rejected server-side.
- Max custom subagent count is enforced server-side.
- Custom subagent effective permissions match the selected preset.
- Runtime cannot invoke a deleted or unauthorized custom subagent.

---

## Phase 2 — First-Class Child Runs

**Goal:** subagents become durable child runs with tree visibility.

### Tasks

- [ ] Extend `agentRuns` or add `subagentRuns`.
- [ ] Add parent/root run indexes.
- [ ] Create child run when subagent starts.
- [ ] Append child runtime events to Convex.
- [ ] Persist child completion/failure/stop status.
- [ ] Persist subagent summaries to both events and final receipt.
- [ ] Add `listRunTreeByRun` Convex query.
- [ ] Add tests for parent/child ownership and run tree queries.

### Acceptance Criteria

- Each subagent has a durable run ID.
- Parent run can query its full child tree.
- Child events survive page refresh.
- Child run status is accurate after completion/failure/abort.
- Proof panel can read child summaries from Convex, not only local state.

---

## Phase 3 — Concurrency And Mutation Safety

**Goal:** prevent unsafe parallel edits.

### Tasks

- [ ] Add `maxConcurrentSubagents` runtime config.
- [ ] Add `maxConcurrentMutatingSubagents` runtime config.
- [ ] Classify subagents as read-only vs mutating from effective capabilities.
- [ ] Allow parallel read-only children.
- [ ] Serialize mutating children if no isolation is available.
- [ ] Add `patch-proposal` mode for parallel mutating children.
- [ ] Update task tool to choose safe default isolation.
- [ ] Add tests for parallel read-only, blocked parallel mutating, and
      serialized mutating execution.

### Acceptance Criteria

- Two edit-capable children cannot mutate the same workspace concurrently by
  default.
- Parallel reviewers/scouts still run concurrently.
- UI shows when a child was serialized or forced into patch-proposal mode.

---

## Phase 4 — Run Tree UI And Proof Integration

**Goal:** make child runs visible, calm, and useful in the workbench.

### Tasks

- [ ] Create run-tree data hook from Convex query.
- [ ] Rework `ActiveAgentsPane` to render real run tree rows.
- [ ] Rework `AgentManagerDrawer` around current/background run tree.
- [ ] Update `SubagentPanel` to use persisted child summaries where possible.
- [ ] Add run detail drawer for child run output/artifacts/errors.
- [ ] Add subagent section to receipt/proof panel.
- [ ] Add empty/loading/error states.
- [ ] Add responsive layout behavior.

### Acceptance Criteria

- Page refresh does not lose subagent visibility.
- User can inspect a completed child run.
- User can see child files touched, tests run, risks, and artifacts.
- Main chat remains compact.

---

## Phase 5 — Fresh/Fork Context And Child Filtering

**Goal:** implement safe, explicit context modes.

### Tasks

- [ ] Add `contextMode` to task schema and child run records.
- [ ] Implement `buildSubagentContext`.
- [ ] Implement parent-only orchestration instruction filtering.
- [ ] Prevent bundled orchestration guidance from leaking to children by
      default.
- [ ] Set default context modes by built-in agent.
- [ ] Add tests for fresh context minimalism.
- [ ] Add tests for fork filtering of status/control/subagent history.

### Acceptance Criteria

- Reviewers default to fresh context.
- Workers can fork approved plan context.
- Children do not inherit parent-only orchestration instructions unless
  explicitly allowed.
- Context mode is visible in child run details/proof.

---

## Phase 6 — Background Runs, Interrupt, Resume

**Goal:** support long-running supervised work.

### Tasks

- [ ] Add `async` option to subagent orchestration calls.
- [ ] Persist background run state to Convex.
- [ ] Add status query for active/background run trees.
- [ ] Wire interrupt to parent and child abort controllers.
- [ ] Persist partial receipt on stop.
- [ ] Implement primary run resume from checkpoint.
- [ ] Implement child run resume or linked continuation.
- [ ] Add notification/toast on completion/failure/attention-needed.
- [ ] Add e2e tests for stop/status/resume basics.

### Acceptance Criteria

- User can start a background subagent workflow and keep using Panda.
- User can inspect status after navigation/refresh.
- User can stop a run tree.
- Resume works for at least primary runs, with child support either shipped or
  clearly gated.

---

## Phase 7 — Saved Chains / Workflows

**Goal:** productize repeatable orchestration.

### Tasks

- [ ] Add `agentChains` table.
- [ ] Add chain CRUD functions.
- [ ] Add chain execution engine with `{task}`, `{previous}`, and `{chain_dir}`
      equivalents.
- [ ] Support sequential and parallel chain groups.
- [ ] Support fail-fast, output artifacts, and per-step context modes.
- [ ] Add built-in workflow templates:
  - [ ] `parallel-review`
  - [ ] `review-loop`
  - [ ] `parallel-research`
  - [ ] `gather-context-and-clarify`
  - [ ] `implementation-handoff`
  - [ ] `parallel-cleanup`
- [ ] Add Settings UI for saved chains after backend stabilizes.

### Acceptance Criteria

- A saved chain can run from a user request.
- Chain output is visible as a grouped run tree.
- Parallel groups preserve grouped shape in the UI.
- Failed child steps remain visible next to successful ones.

---

## Phase 8 — Isolation Expansion

**Goal:** support true isolated mutation.

### Tasks

- [ ] Implement WebContainer snapshot/copy strategy if feasible.
- [ ] Implement local/native git worktree strategy where local filesystem/git is
      available.
- [ ] Add isolation availability detection.
- [ ] Add isolated diff/artifact merge flow.
- [ ] Add conflict detection.
- [ ] Add parent approval/apply flow for child diffs.

### Acceptance Criteria

- Parallel mutating children can safely produce isolated diffs.
- Parent can inspect and apply/reject each child diff.
- Merge conflicts are surfaced clearly.
- Receipts record isolation mode and merge outcome.

---

## Phase 9 — Diagnostics And Hardening

**Goal:** make the system supportable.

### Tasks

- [ ] Add `SubagentsDoctor` library.
- [ ] Add Settings diagnostics UI.
- [ ] Add admin diagnostics UI.
- [ ] Add structured errors for registry/policy/isolation failures.
- [ ] Add run-tree repair/reconciliation for stale running children.
- [ ] Add load tests for many child events.
- [ ] Add retention cleanup for child artifacts/checkpoints.

### Acceptance Criteria

- Admin/user can diagnose why subagents are unavailable.
- Stale running child runs can be reconciled.
- Error messages identify whether failure is registry, policy, runtime,
  checkpoint, or isolation related.

---

## 16. Testing Strategy

### 16.1 Unit Tests

Add tests for:

- registry merge and precedence
- custom subagent normalization
- capability preset mapping
- admin policy enforcement
- context filtering
- child run summary generation
- concurrency classification
- chain template interpolation
- isolation strategy selection
- doctor checks

### 16.2 Convex Tests

Add tests for:

- subagent CRUD ownership
- max custom subagent limit
- allowed capability presets
- child run tree queries
- parent/root run indexes
- artifact ownership
- status transitions
- interrupt/stop transitions

### 16.3 Runtime Integration Tests

Add tests for:

- built-in subagent invocation
- custom subagent invocation
- parallel read-only subagents
- mutating subagent serialization
- nested depth cap
- child permission narrowing
- child event persistence
- checkpoint save/load for child/parent

### 16.4 E2E Tests

Add Playwright coverage for:

- create custom subagent, invoke it, inspect result
- run parallel reviewers and inspect run tree
- stop an active run
- refresh during running child and verify state remains
- proof panel shows subagents used
- admin disables custom subagents and UI reflects it

---

## 17. Migration Plan

### 17.1 Backwards Compatibility

- Keep existing built-in names as aliases during migration.
- Existing `subagents` rows should remain valid.
- Existing `agentRunEvents.subagentSummary` should continue rendering.
- New child run tree should augment, not break, current proof surfaces.

### 17.2 Data Migration

If extending `agentRuns`:

- default old rows to `runKind = 'primary'` in query normalization if field
  absent.
- avoid mandatory schema fields that break old rows.
- use optional fields first; tighten later only after migration.

### 17.3 UI Migration

- Keep current `SubagentPanel` compact view.
- Introduce run-tree panel behind existing Agent Manager / Active Agents UI.
- Move users gradually from flat recent runs to tree view.

---

## 18. Risk Register

| Risk                                        | Severity | Mitigation                                                                     |
| ------------------------------------------- | -------- | ------------------------------------------------------------------------------ |
| Runtime becomes too complex                 | High     | Keep orchestration as wrapper layer; avoid embedding all logic in `runtime.ts` |
| Parallel agents corrupt files               | High     | Block/serialize mutating children until isolation exists                       |
| Custom subagent permissions do not match UI | High     | Capability preset mapping and tests                                            |
| Run event volume grows too large            | Medium   | Persist summaries, lazy-load details, cap previews                             |
| UI becomes overwhelming                     | Medium   | Compact cards, collapsible run tree, proof details on demand                   |
| Resume semantics are hard                   | Medium   | Ship primary resume first; child continuation later                            |
| Admin policy bypass through custom agents   | High     | Server-side enforcement and runtime policy snapshots                           |
| Stale child runs after browser close        | Medium   | heartbeat/lastActivityAt and stale-run reconciliation                          |

---

## 19. Definition Of Done

Panda Subagents v2 is considered complete when:

1. Custom subagents created in Settings are executable.
2. Admin policy ceilings are enforced server-side and runtime-side.
3. Subagents are first-class child runs with durable status/events/artifacts.
4. The workbench shows a clear parent/child run tree.
5. Parallel read-only agents work safely.
6. Parallel mutating agents are blocked, serialized, or isolated.
7. Fresh/fork context modes are implemented and visible.
8. Background status/interrupt/resume exists for at least primary workflows.
9. Saved chains support at least review/research/handoff workflows.
10. Proof/receipt surfaces show subagents, skills, permissions, files, tests,
    and artifacts.
11. Doctor diagnostics can explain common setup/policy/runtime failures.
12. E2E tests cover create → run → inspect → stop/refresh flows.

---

## 20. Recommended Build Order

The safest order is:

```text
0. Naming and guardrails
1. Custom subagent runtime registry
2. Child run persistence
3. Concurrency/mutation safety
4. Run tree UI
5. Fresh/fork context filtering
6. Background status/interrupt/resume
7. Saved chains
8. Isolation expansion
9. Doctor and hardening
```

Do **not** begin saved chains or advanced background workflows until custom
subagents are real and child runs are durable.

Do **not** allow parallel mutating agents until isolation or serialization is
enforced.

---

## 21. Immediate Next Tasks

Start with these concrete implementation tasks:

1. Create `apps/web/lib/agent/subagents/types.ts`.
2. Create `apps/web/lib/agent/subagents/presets.ts`.
3. Create `apps/web/lib/agent/subagents/registry.ts`.
4. Add Convex tests for `subagents.ts` policy enforcement.
5. Fix `SubagentEditor` preset/tool mismatch.
6. Replace stale built-in labels in `SubagentEditor`.
7. Add a runtime test proving a custom subagent can be resolved.
8. Add a guard preventing parallel mutating subagents without isolation.

These tasks produce immediate safety and product value without committing to the
full advanced orchestration system prematurely.

---

## 22. Implementation Status — 2026-05-23

**Status:** Phase 1–17 foundation implemented and verified.

Panda Subagents v2 is now implemented as a browser-native, Convex-backed
extension of the existing Panda Harness Runtime. `pi-subagents` remains a
blueprint/reference only; Panda continues to use the Harness Runtime + Convex
Control Plane as the execution authority.

### Completed Implementation Slices

1. **Custom Subagents Are Real**
   - Added `apps/web/lib/agent/subagents/*` registry, preset, and type modules.
   - Convex custom subagents are normalized, policy-gated, and
     runtime-registered.
   - Task tool no longer schema-blocks custom subagent runtime names.

2. **Policy-Safe Capability Presets**
   - Subagent UI now uses capability presets instead of raw pseudo-tool names.
   - Server write paths enforce allowed presets, normalized names, duplicates,
     and admin custom-subagent policy.

3. **First-Class Child Runs**
   - Extended `agentRuns` with run-tree metadata: `runKind`, `parentRunId`,
     `rootRunId`, `subagentName`, `subagentDepth`, `contextMode`,
     `isolationMode`, `delegatedTaskSummary`, `artifactCount`, and
     `lastActivityAt`.
   - Added `createChild`, `touchActivity`, and `listRunTree` APIs.

4. **Runtime Child Persistence**
   - Subagent summaries now create/update durable child `agentRuns`.
   - Child runs receive direct `agentRunEvents` entries.
   - Child completion/failure/stop transitions are persisted.
   - Terminal idempotency guards prevent complete/stop races.

5. **Stop Propagation**
   - Parent abort/stop propagates to active non-terminal child runs with
     structured `{ kind: 'user-abort' }` termination reason.

6. **Concurrency And Mutation Safety**
   - Read-only subagents run with bounded concurrency.
   - Mutating subagents are serialized unless effective isolation is
     non-`shared-readonly`.
   - Runtime warns when multiple mutating subagents are serialized.

7. **Fresh/Fork Context Filtering**
   - Agents support `defaultContextMode`.
   - Forked children receive filtered parent context.
   - Control/status/subagent artifacts are removed before child execution.

8. **Isolation Foundation**
   - Added typed isolation modes: `shared-readonly`, `snapshot`, `worktree`,
     `patch-proposal`.
   - Mutating agents prefer `patch-proposal` by default.
   - Runtime only permits mutating parallelism when effective isolation is
     available.
   - Subagent summaries include `isolationMode`.

9. **Patch-Proposal Artifact Flow**
   - Added `HarnessPatchProposalArtifact`.
   - Patch/diff fenced blocks are extracted only for `patch-proposal` children.
   - Patch proposal metadata flows into child summaries/events and UI rows.
   - UI preview is read-only and explicitly says parent review is required.

10. **Run Tree UI Integration**
    - Agent Manager displays persisted child run trees.
    - Active Agents sidebar nests child subagents under parent runs.
    - Project inspector queries `listRunTree` and passes persisted child runs to
      `SubagentPanel`.
    - `SubagentPanel` merges live tool-call entries with persisted child-run
      entries.

11. **Structured Diagnostics**
    - Added subagent error categories: `registry`, `policy`, `isolation`,
      `runtime`, `persistence`, `unknown`.
    - Runtime classifies subagent failures and surfaces categories in UI.

12. **Retention And Durability Hardening**
    - Added append-event batch cap.
    - Centralized run-tree child cap.
    - Added bounded `pruneRunRetention` mutation for run events and checkpoints.

### Verification

Broader subagent-related test slice passed:

```text
71 pass
0 fail
379 expect() calls
```

Full typecheck/codegen passed:

```text
bun run typecheck
EXIT:0
```

### Known Remaining Gaps

The following are intentionally **not** fully implemented yet and should remain
explicit:

1. **Actual worktree isolation**
   - `worktree` is typed and selectable as a future mode, but native/local git
     worktree creation is not implemented.

2. **Actual snapshot isolation**
   - `snapshot` is typed for future WebContainer/workspace copy isolation, but
     runtime sandbox cloning is not implemented.

3. **Patch apply / merge flow**
   - Patch proposals are extracted and previewed as read-only artifacts.
   - Parent-controlled apply/merge UX is not implemented and must remain
     explicit-review-only.

4. **Saved chains/workflows**
   - Chain/workflow orchestration remains future work.

5. **Deep Convex integration/E2E tests**
   - Current coverage is strong at source, runtime, and component-render levels.
   - More end-to-end Convex tests can still be added for
     create-through-settings-to-run and full child run lifecycle.

6. **Background resume/interrupt beyond stop propagation**
   - Runtime checkpoints exist and child stop propagation is implemented.
   - Full independent background child resume/interrupt controls remain future
     work.

### Next Safe Work

Recommended next implementation areas:

1. Build parent-controlled patch review/apply UX.
2. Add deeper Convex integration tests for child run lifecycle.
3. Implement true snapshot/worktree availability detection.
4. Add saved chains only after patch review and isolation semantics are stable.

---

## 23. Front-End Mode Selector Decision — 2026-05-23

**Decision:** The main front-end `AgentSelector` remains a parent-run mode
selector. It must not list built-in or custom subagents.

The selector is responsible for primary run intent and trust posture:

- **Primary modes:** Ask, Plan, Agent Guided
- **Agent autonomy:** Guided (`code`) and Autopilot (`build`)
- **Mode routing:** Auto-switch, Suggest first, Manual only

Subagents are delegated child workers, not top-level modes. They should be
surfaced through:

- Settings → Subagents for creation and configuration
- Agent Manager run-tree views
- Active Agents nested child rows
- Chat Inspector / SubagentPanel persisted child-run views
- future explicit delegation affordances such as a Delegate menu, slash command,
  or `@subagent` mention autocomplete

This preserves the core Subagents v2 model:

```text
Modes = parent-run intent and trust boundary
Subagents = parent-controlled delegated child work
Run tree = execution visibility and proof
Settings = customization and policy-scoped configuration
```

Implementation update:

- `apps/web/components/chat/AgentSelector.tsx` no longer calls
  `agents.listSubagents()`.
- The selector no longer renders a `Subagents (use @mention)` section.
- `apps/web/components/chat/AgentSelector.test.ts` guards this boundary.

Do not add custom subagents to the main mode selector automatically. A user with
many custom subagents should see them in a dedicated delegation picker/search
surface, not as global mode options.
