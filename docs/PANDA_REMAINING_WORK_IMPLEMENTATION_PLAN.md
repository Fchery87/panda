# Panda Remaining Workflow Orchestration Implementation Plan

> - **Date:** 2026-05-25
> - **Status:** Remaining implementation plan after rpiv-inspired
>   workflow/advisor/chain foundation
> - **Scope:** Complete the remaining Panda-native orchestration work without
>   replacing Panda Harness Runtime or Convex Control Plane.
> - **Primary rule:** Panda Harness Runtime + Convex remain the only execution
>   authority. Do not embed `rpiv-pi` as a second runtime.

## 2026-05-25 Implementation Update

Completed implementation slices in recommended order:

1. **True `ask_user` live pause/resume** — active runs now await a structured
   user decision, persist pending/answered question records in Convex, render
   live question cards from tool-call args, and resolve the active tool call
   from the selected answer.
2. **Direct runtime advisor enforcement** — `write_files`, `run_command`, and
   `apply_patch` now run advisor preflight before execution and create advisor
   requests instead of executing high-risk work immediately.
3. **Autopilot checkpoint integration** — Agent Autopilot transitions are
   blocked behind an `autopilot_checkpoint` advisor request before unattended
   continuation.
4. **Workflow chain runtime linkage** — chain steps can link to `agentRuns` via
   `runId`; useAgent marks linked steps running/completed/failed.
5. **Browser proof coverage** — added Playwright coverage for file artifact
   apply → file tree/editor visibility and advisor-gated artifact requirement
   surfacing.
6. **Advisor reviewer polish** — added prompt view/copy, request cancel, running
   state, disabled empty manual completion, and success/error toasts.
7. **Workflow artifact materialization** — added `.panda/artifacts/...` markdown
   path/content draft helpers and UI copy affordances while keeping Convex
   canonical.

Known follow-up hardening:

- `ask_user` survives live same-run pauses, but browser reload recovery of an
  in-flight resolver still needs deeper checkpoint rehydration.
- Direct tool advisor blocks are persisted and safe, but automatic replay of the
  exact blocked tool after approval remains a future hardening step.
- New Playwright specs are added and discoverable; full browser execution should
  be run in an environment with the Convex/Next webServer budget available.

## 0. Current Baseline

The following foundation is already implemented and should be treated as the
starting point:

- Workflow stages under existing Ask / Plan / Code / Build modes.
- Convex-backed workflow artifacts.
- Workflow artifact panel.
- Workflow chains, templates, persistence, launcher, active progress, and
  artifact-driven step advancement.
- `ask_user` tool, card rendering, and suggested-action continuation.
- Claim verifier and final assistant claim guard.
- File artifact apply verification against Convex file-tree source of truth.
- Specialist subagent registry including `advisor-reviewer`.
- Advisor gate detection and preflight.
- Advisor-gated artifact execution.
- Advisor review requests and advisor review decisions.
- Request → reviewer run → review decision lifecycle.
- First-class advisor-reviewer `agentRuns` records.
- Advisor-reviewer start/complete run events.
- Named `advisor-reviewer` read-only runtime/eval execution context.

## Implementation Strategy

Complete the remaining work in dependency order:

1. Stabilize interactive runtime continuation (`ask_user` true pause/resume).
2. Enforce advisor gates in the actual runtime tool path, not only artifact
   apply.
3. Integrate Autopilot checkpoints into real Autopilot transitions.
4. Harden workflow chain runtime linkage.
5. Add browser E2E coverage around the file tree and advisor proof chain.
6. Polish UI, docs, and final regression coverage.

Do **not** start with broad UI polish. The remaining reliability-critical gaps
are runtime continuation, direct tool-call enforcement, and browser proof tests.

---

# Phase 1 — True `ask_user` Pause / Resume

## Goal

Turn `ask_user` from a follow-up-message UX into a real same-run pause/resume
primitive.

## Current State

- `ask_user` tool exists.
- Question cards render in chat.
- Option clicks send a structured follow-up message through the existing
  suggested-action path.
- The original run does not truly pause and resume.

## Work Items

### 1.1 Add pending questionnaire state

Add Convex state for pending runtime questions.

Suggested table:

```ts
agentRunQuestions: defineTable({
  projectId: v.id('projects'),
  chatId: v.id('chats'),
  runId: v.id('agentRuns'),
  toolCallId: v.optional(v.string()),
  question: v.string(),
  options: v.array(...),
  allowMultiple: v.optional(v.boolean()),
  allowOther: v.optional(v.boolean()),
  status: v.union(
    v.literal('pending'),
    v.literal('answered'),
    v.literal('cancelled'),
    v.literal('expired')
  ),
  answer: v.optional(v.any()),
  createdAt: v.number(),
  answeredAt: v.optional(v.number()),
})
```

### 1.2 Pause runtime on `ask_user`

When the runtime emits `ask_user`:

- persist pending question,
- persist run event,
- mark run status as paused or equivalent checkpoint state,
- stop executing further tool calls until answer arrives.

If `agentRuns.status` should not gain `paused`, store paused state in a separate
checkpoint/session table instead.

### 1.3 Resume same run with answer

On answer:

- validate selected option/freeform answer,
- persist answer,
- resume the same session/checkpoint,
- inject answer into runtime tool result stream,
- continue execution under same logical run.

### 1.4 UI changes

- Show pending question state.
- Disable answered options after submission.
- Show selected answer.
- Add cancel/timeout affordance.

## Acceptance Criteria

- A run that emits `ask_user` does not complete prematurely.
- Selecting an answer resumes the same logical run.
- The run tree and events show question pending → answered → resumed.
- No duplicate run is created just to answer a question.

## Tests

- Unit: questionnaire validation.
- Convex: pending question lifecycle.
- Runtime: pauses on `ask_user` and resumes with answer.
- UI: answer button disables after submit.
- Integration: same run ID/session resumes.

---

# Phase 2 — Advisor Enforcement in Direct Runtime Tool Calls

## Goal

Extend advisor gating beyond artifact application into direct runtime tools such
as file writes, patches, commands, dependency changes, and destructive
operations.

## Current State

- Artifact execution is advisor-gated.
- Advisor requests/reviews exist.
- Direct runtime tool calls are not fully blocked before execution.

## Work Items

### 2.1 Identify tool execution interception points

Audit and wire enforcement around:

- `write_files`
- `apply_patch`
- `run_command`
- dependency install commands
- destructive shell commands
- schema/security/auth file writes

Likely areas:

- `apps/web/lib/agent/tools.ts`
- `apps/web/lib/agent/runtime.ts`
- `apps/web/lib/agent/harness/runtime.ts`
- harness permission/admin rule path

### 2.2 Add advisor preflight before risky tools

Before execution:

1. infer changed files and/or commands,
2. call `buildAdvisorPreflight`,
3. if clear, continue,
4. if review required, create `advisorReviewRequests` row,
5. pause/block tool execution,
6. resume only after approved matching review.

### 2.3 Add blocked-tool event

Persist an event such as:

```ts
type: 'advisor_tool_blocked'
status: 'needs_advisor'
progressCategory: 'analysis'
```

### 2.4 Resume after approval

When matching review is approved:

- retry/continue the original tool call,
- record review ID in event metadata,
- prevent stale review reuse for high-risk gates.

## Acceptance Criteria

- `rm -rf`, dependency file edits, Convex schema changes, and auth/security
  edits cannot execute directly without advisor approval when policy requires
  it.
- Approved reviews unblock execution.
- `needs_changes` and `blocked` reviews keep execution blocked.
- Assistant cannot claim execution success for blocked tools.

## Tests

- Unit: tool preflight classification.
- Runtime: command blocked before executor call.
- Runtime: approved review allows execution.
- Runtime: blocked review prevents execution.
- UI: pending advisor request appears after blocked tool call.

---

# Phase 3 — Autopilot Checkpoint Integration

## Goal

Integrate the existing Autopilot checkpoint helper into actual Autopilot
transitions.

## Current State

- `evaluateAutopilotCheckpoint` exists.
- `autopilot_checkpoint` advisor gate exists.
- The helper is not yet wired into real Autopilot phase transitions.

## Work Items

### 3.1 Locate Autopilot transitions

Audit actual Agent Autopilot paths:

- chat mode resolver,
- Build mode runtime,
- routing decisions,
- approval/automation policy,
- long-running execution transitions.

Likely areas:

- `apps/web/lib/agent/chat-modes.ts`
- `apps/web/lib/agent/routing/*`
- `apps/web/hooks/useAgent.ts`
- `apps/web/lib/agent/runtime.ts`
- `apps/web/lib/agent/harness/runtime.ts`

### 3.2 Add checkpoint before risky Autopilot continuation

Before Autopilot continues after major milestones:

- evaluate checkpoint,
- if clear, continue,
- if advisor needed, create request,
- pause/hold Autopilot,
- resume only after approved review.

### 3.3 Persist checkpoint event

Persist events:

- `autopilot_checkpoint_clear`
- `autopilot_checkpoint_blocked`
- `autopilot_checkpoint_resumed`

### 3.4 UI state

Show Autopilot blocked state in Workbench/Proof panel with:

- gates,
- pending advisor request,
- reviewer run status,
- approval decision.

## Acceptance Criteria

- Autopilot cannot cross policy-gated checkpoints without advisor approval.
- Guided mode is not unnecessarily blocked by Autopilot-only gates.
- Approved advisor decision resumes Autopilot.
- Needs-changes/blocked advisor decision prevents continuation.

## Tests

- Autopilot checkpoint clear.
- Autopilot checkpoint blocked.
- Approved review resumes.
- Needs-changes/blocked review prevents transition.
- UI shows blocked state.

---

# Phase 4 — Workflow Chain Runtime Linkage

## Goal

Make workflow chains track actual run execution, not only artifact progression.

## Current State

- Chains persist.
- Chain launcher creates rows.
- Chain progress displays.
- Chain steps advance when workflow artifacts are created.

## Work Items

### 4.1 Link chain step to run ID

When launching a chain step:

- pass `workflowChainId` and `workflowChainStepId` into outgoing agent run
  context,
- persist on `agentRuns` or a join table.

### 4.2 Mark step running on run start

When the step prompt starts:

- update chain step to `running`,
- store `runId`,
- set `startedAt`.

### 4.3 Mark step failed on run failure

If run fails/stops:

- mark corresponding chain step `failed`,
- store failure summary.

### 4.4 Mark step completed from run success

Completion sources:

- workflow artifact created,
- successful run receipt,
- explicit user approval.

### 4.5 Add chain controls

Add UI and mutations for:

- pause chain,
- resume chain,
- cancel chain,
- skip step,
- retry step,
- start next step,
- continue from current step.

## Acceptance Criteria

- A chain step has a visible run link.
- Run failure marks step failed.
- Retrying a step creates a new run link.
- Chain completion is deterministic.

## Tests

- Start chain → step running.
- Run success → step completed.
- Run failure → step failed.
- Retry step → new run ID.
- Skip step → next pending step active.

---

# Phase 5 — Browser E2E: File Tree and Advisor Proof Chain

## Goal

Add Playwright coverage for the highest-risk user-visible reliability paths.

## Work Items

### 5.1 File artifact apply → file tree visibility

E2E scenario:

1. create or seed project/chat,
2. create file artifact,
3. open Workbench changes panel,
4. apply artifact,
5. assert artifact status completed,
6. assert file appears in visible file tree,
7. open file,
8. assert contents.

### 5.2 Negative file-tree verification path

Simulate file write that cannot be verified:

- artifact should fail,
- error should mention file-tree verification,
- assistant should not show unverified success claim.

### 5.3 Advisor-gated command artifact

E2E scenario:

1. create destructive command artifact,
2. attempt apply,
3. verify advisor required,
4. request advisor review,
5. run/complete reviewer approved,
6. apply succeeds.

### 5.4 Advisor blocked path

Same as above, but reviewer returns `blocked` or `needs_changes`.

## Acceptance Criteria

- Browser-visible file tree matches Convex state after apply.
- Failed verification is visible to user.
- Advisor approval path works in UI.
- Advisor blocked path prevents apply.

---

# Phase 6 — Advisor Reviewer Polish

## Goal

Improve the already-functional advisor-reviewer path into a polished product
experience.

## Work Items

### 6.1 Better reviewer run details

Persist more events:

- raw reviewer output preview,
- parse success/failure,
- matched review ID,
- request completion status.

### 6.2 Retry/cancel actions

Add UI + mutations:

- retry reviewer run,
- cancel request,
- copy reviewer prompt,
- view full prompt,
- view raw output.

### 6.3 Loading and disabled states

- Disable `Run Advisor Reviewer` while running.
- Disable `Complete Review` on empty output.
- Show spinner/progress.
- Toast success/error.

### 6.4 Stronger matching safety

Add:

- review/action hash,
- stale review detection,
- no latest fallback for destructive commands,
- exact gate match requirement for high-risk gates.

## Acceptance Criteria

- User can see exactly which review approved which artifact/tool/checkpoint.
- Stale or unrelated approvals cannot authorize dangerous execution.

---

# Phase 7 — Workflow Artifact Materialization

## Goal

Optionally materialize Convex workflow artifacts into workspace files for
portability and auditability.

## Work Items

### 7.1 Add materialization option

Write artifacts under:

```txt
.panda/artifacts/<chatId>/<artifactKind>/<timestamp-slug>.md
```

### 7.2 Add export/download

- Download artifact.
- Copy artifact markdown.
- Open artifact in editor.

### 7.3 Add supersession UI

- Show superseded artifacts.
- Compare revisions.
- Restore old artifact if useful.

## Acceptance Criteria

- Convex remains canonical.
- Workspace materialization never becomes required for runtime correctness.

---

# Phase 8 — Documentation and Plan Updates

## Goal

Document the completed architecture and remaining operational rules.

## Work Items

1. Update `docs/PANDA_RPIV_INSPIRED_WORKFLOW_ORCHESTRATION_PLAN.md` with
   completed status.
2. Add architecture doc for workflow stages/artifacts/chains.
3. Add architecture doc for advisor requests/reviews.
4. Add architecture doc for claim verification/file-tree proof.
5. Update `PLAN.md` / `STATUS.md` if those are the current project-level
   trackers.
6. Add developer notes for true `ask_user` pause/resume.
7. Add user-facing notes for advisor review flow.

## Acceptance Criteria

- A new developer can understand the orchestration layer without reading the
  full conversation history.
- Docs explain what is implemented versus planned.

---

# Phase 9 — Final Regression and Cleanup

## Goal

Stabilize before considering the rpiv-inspired orchestration work complete.

## Work Items

1. Run focused workflow/advisor tests.
2. Run artifact/file-tree tests.
3. Run chat/workbench component tests.
4. Run Convex codegen.
5. Run TypeScript check.
6. Run lint if configured.
7. Run full repo test suite if practical.
8. Inspect git status for accidental generated files:
   - `.next`
   - `.next-e2e*`
   - test artifacts
   - temp files
9. Review all modified files top-to-bottom.
10. Do final architecture pass.

## Acceptance Criteria

- Focused tests pass.
- TypeScript passes.
- No accidental generated artifacts are committed.
- Remaining known limitations are documented.

---

# Recommended Execution Order

## Milestone 1 — Runtime correctness

1. True `ask_user` pause/resume.
2. Direct runtime tool advisor enforcement.
3. Autopilot checkpoint integration.

## Milestone 2 — Chain correctness

4. Workflow chain run linkage.
5. Chain controls: pause/resume/cancel/skip/retry.

## Milestone 3 — Browser proof

6. Playwright file artifact → file tree visibility E2E.
7. Playwright advisor approval/blocked E2E.

## Milestone 4 — Product polish

8. Advisor reviewer UX polish.
9. Workflow artifact materialization/export.
10. Documentation and final regression.

---

# Risk Register

| Risk                                                      | Impact | Mitigation                                                                     |
| --------------------------------------------------------- | -----: | ------------------------------------------------------------------------------ |
| True runtime pause/resume requires deeper harness changes |   High | Implement with explicit checkpoint/session state and focused tests first.      |
| Advisor enforcement blocks legitimate work too often      | Medium | Keep policy-driven gates configurable.                                         |
| Stale advisor review approves wrong action                |   High | Add artifact/action hash and strict matching for destructive gates.            |
| Autopilot checkpoint integration creates deadlocks        |   High | Add clear blocked/resume state machine and tests.                              |
| Browser E2E is flaky                                      | Medium | Seed data directly through Convex where possible and assert stable DOM labels. |
| Chain state diverges from run state                       | Medium | Make run ID linkage explicit and update chain from run lifecycle events.       |

---

# Definition of Done for Remaining Orchestration Work

The remaining orchestration work should be considered complete when:

1. `ask_user` can pause/resume the same active run.
2. Risky direct runtime tools are advisor-gated before execution.
3. Autopilot checkpoints block/resume through advisor review.
4. Workflow chains are linked to actual run IDs and handle failure/retry.
5. Browser E2E proves file artifact apply appears in file tree/workbench.
6. Browser E2E proves advisor approved/blocked paths.
7. Advisor reviewer UX supports run, retry, cancel, copy prompt, view result.
8. Documentation is updated.
9. Full focused regression and TypeScript checks pass.
