# Panda Runtime & Plan Integrity Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Fix the incorrect terminal run state, make plan completion
authoritative enough for user-facing status, surface hidden runtime signals, and
add enough cross-mode continuity to reduce implementation blind spots.

**Architecture:** Keep the harness runtime as the source of truth for terminal
execution outcome and low-level events. Tighten the adapter/UI contract so
terminal events are mutually exclusive, runtime recovery remains session-based,
and plan status becomes a separate concern derived from plan coverage rather
than raw run completion.

**Tech Stack:** Next.js 16, React 19, TypeScript, Bun test runner, Convex,
existing Panda harness runtime.

### Task 1: Lock down terminal event semantics in the harness runtime

**Files:**

- Modify: `apps/web/lib/agent/harness/runtime.ts`
- Test: `apps/web/lib/agent/harness/runtime.test.ts`

**Step 1: Write the failing runtime test**

In `apps/web/lib/agent/harness/runtime.test.ts`, add a test that forces a
non-completing run by using a provider that repeatedly returns a non-terminal
finish reason such as `tool_calls`, with `maxSteps: 1` or `maxSteps: 2`.

Required assertions:

- the emitted events include exactly one terminal failure path
- the emitted events include `error`
- the emitted events do **not** include `complete` after max-step exhaustion

**Step 2: Run the focused test to verify it fails**

Run:

```bash
bun test apps/web/lib/agent/harness/runtime.test.ts
```

Expected:

- FAIL because the current runtime emits `error` and then `complete`

**Step 3: Implement the minimal runtime fix**

In `apps/web/lib/agent/harness/runtime.ts`, change the run loop terminal
handling so:

- max-step exhaustion yields a terminal error and exits without yielding
  `complete`
- successful completion still yields `complete`
- caught exceptions still yield `error`
- there is no code path where a failed run also emits `complete`

Keep checkpoint saving behavior intact, but ensure the terminal event contract
is mutually exclusive.

**Step 4: Re-run the focused runtime test**

Run:

```bash
bun test apps/web/lib/agent/harness/runtime.test.ts
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add apps/web/lib/agent/harness/runtime.ts apps/web/lib/agent/harness/runtime.test.ts
git commit -m "fix: make harness terminal events mutually exclusive"
```

### Task 2: Prevent UI terminal-state overwrite after failure

**Files:**

- Modify: `apps/web/hooks/useAgent.ts`
- Test: add or extend `apps/web/hooks/useAgent.test.ts` if a hook test harness
  exists; otherwise add a focused regression test near the current
  event-consumption layer

**Step 1: Write the failing regression test**

Create a focused test that simulates sequential `error` then `complete` delivery
to the `useAgent` event consumer and asserts:

- failed runs stay in an error/failure terminal UI state
- terminal run finalization executes once
- the later `complete` event does not overwrite UI state for an
  already-finalized run

If a dedicated `useAgent` test harness is missing, extract the terminal event
handling into a small pure helper and test that helper instead.

**Step 2: Run the focused regression test**

Run the smallest possible test target for the new regression.

Expected:

- FAIL because `setStatus('complete')` currently runs even after the run is
  finalized as failed

**Step 3: Implement the guard**

In `apps/web/hooks/useAgent.ts`, guard terminal event handling so that once
`runFinalized` is true:

- later `complete` events do not mutate UI state
- later `error` events do not mutate UI state
- terminal state remains consistent with the first terminal outcome

Do not weaken the existing persistence protections.

**Step 4: Re-run the regression test**

Expected:

- PASS

**Step 5: Commit**

```bash
git add apps/web/hooks/useAgent.ts
git commit -m "fix: preserve first terminal ui state for agent runs"
```

### Task 3: Make plan completion stricter than run completion

**Files:**

- Modify: `apps/web/app/(dashboard)/projects/[projectId]/page.tsx`
- Modify: `apps/web/hooks/useAgent.ts`
- Modify: `apps/web/components/chat/RunProgressPanel.tsx`
- Modify: `apps/web/lib/agent/plan-progress.ts`
- Test: `apps/web/lib/agent/plan-progress.test.ts`
- Test: `apps/web/components/chat/live-run-utils.test.ts`

**Step 1: Write failing plan-progress tests**

Add tests covering:

- a run can complete with only partial `completedPlanStepIndexes`
- plan coverage reporting distinguishes `partial` from `completed`
- plan progress still works when no explicit match exists for some steps

**Step 2: Run the focused plan tests**

Run:

```bash
bun test apps/web/lib/agent/plan-progress.test.ts apps/web/components/chat/live-run-utils.test.ts
```

Expected:

- FAIL because current logic maps run completion directly to chat
  `planStatus = completed`

**Step 3: Extend the plan status contract**

Introduce a `partial` plan state in the relevant UI type path and update display
logic in:

- the project page plan-status update path
- the progress badge rendering in `RunProgressPanel`

Rules:

- `completed` requires full plan-step coverage
- `partial` means the run finished or stopped without full coverage
- `failed` remains reserved for terminal execution failure

**Step 4: Implement plan coverage check on run completion**

In the plan completion path, compare:

- parsed plan step count
- latest completed plan step indexes

Then set:

- `completed` when all steps are covered
- `partial` when execution ends without full coverage
- `failed` when the run itself fails

Keep this logic explicit and local to plan-aware flows instead of burying it in
generic run completion.

**Step 5: Re-run focused plan tests**

Expected:

- PASS

**Step 6: Commit**

```bash
git add apps/web/app/\(dashboard\)/projects/\[projectId\]/page.tsx apps/web/hooks/useAgent.ts apps/web/components/chat/RunProgressPanel.tsx apps/web/lib/agent/plan-progress.ts apps/web/lib/agent/plan-progress.test.ts apps/web/components/chat/live-run-utils.test.ts
git commit -m "feat: distinguish partial and completed plan execution"
```

### Task 4: Surface compaction in the adapter and progress UI

**Files:**

- Modify: `apps/web/lib/agent/runtime.ts`
- Modify: `apps/web/hooks/useAgent.ts`
- Modify: `apps/web/components/chat/RunProgressPanel.tsx`
- Test: `apps/web/lib/agent/harness/runtime.test.ts`
- Test: `apps/web/components/chat/live-run-utils.test.ts`

**Step 1: Write failing adapter/progress tests**

Add coverage that verifies:

- harness `compaction` events are converted into UI-visible progress events
- the progress UI can display compaction activity without breaking existing
  grouping

**Step 2: Run focused tests**

Run:

```bash
bun test apps/web/lib/agent/harness/runtime.test.ts apps/web/components/chat/live-run-utils.test.ts
```

Expected:

- FAIL because the adapter currently has no `compaction` mapping

**Step 3: Add adapter mapping**

In `apps/web/lib/agent/runtime.ts`, add a `compaction` event mapping that
becomes a `progress_step` with a distinct category such as `analysis` or
`system`.

Include:

- user-readable content
- a stable category
- enough metadata for future badges if needed

**Step 4: Make the progress panel show compaction activity**

In `apps/web/hooks/useAgent.ts` and
`apps/web/components/chat/RunProgressPanel.tsx`:

- ensure compaction progress steps are persisted into local progress state
- show them in the grouped progress UI
- optionally add a lightweight summary badge only if it stays visually
  restrained

**Step 5: Re-run focused tests**

Expected:

- PASS

**Step 6: Commit**

```bash
git add apps/web/lib/agent/runtime.ts apps/web/hooks/useAgent.ts apps/web/components/chat/RunProgressPanel.tsx apps/web/lib/agent/harness/runtime.test.ts apps/web/components/chat/live-run-utils.test.ts
git commit -m "feat: surface runtime compaction in run progress"
```

### Task 5: Inject cross-mode context summary instead of pure isolation

**Files:**

- Modify: `apps/web/hooks/useAgent.ts`
- Modify: `apps/web/lib/agent/context/session-summary.ts` if reuse helps
- Test: add focused tests for prompt construction logic

**Step 1: Write the failing prompt-context test**

Add a focused test for prompt building that covers:

- architect-mode messages are excluded from raw transcript when building in
  build mode
- a summary of relevant non-current-mode decisions is still injected
- same-mode transcript remains unchanged

**Step 2: Run the focused test**

Expected:

- FAIL because current prompt building hard-filters by mode and injects nothing
  else

**Step 3: Implement minimal cross-mode summary injection**

In `apps/web/hooks/useAgent.ts`, keep same-mode transcript filtering, but
prepend a compact summary block derived from non-current-mode messages.

Constraints:

- summarize only user/assistant messages
- keep the summary short and deterministic
- prioritize architect decisions and explicit constraints over casual chat
- do not inject tool chatter

Prefer a simple deterministic summarizer first. Do not introduce another LLM
call for this feature.

**Step 4: Re-run the focused test**

Expected:

- PASS

**Step 5: Commit**

```bash
git add apps/web/hooks/useAgent.ts apps/web/lib/agent/context/session-summary.ts
git commit -m "feat: inject cross-mode context summaries into prompts"
```

### Task 6: Document and verify the risk-interrupt path

**Files:**

- Modify: project memory or relevant docs that still claim
  `harnessEnableRiskInterrupts: false`
- Modify: `docs/plans/2026-03-16-panda-runtime-plan-integrity-plan.md` only if
  handoff notes need updating
- Test: existing permission-path coverage if available

**Step 1: Locate stale documentation**

Search for stale references to disabled harness risk interrupts.

Run:

```bash
rg -n "harnessEnableRiskInterrupts|risk interrupt" .
```

**Step 2: Update stale documentation**

Correct docs/memory so they state:

- harness risk interrupts are implemented
- they flow through the shared permission manager / `PermissionDialog`
- the currently relevant gap is UX clarity, not missing wiring

**Step 3: Run focused checks**

Run the smallest test surface that covers permission event flow, if one already
exists. If not, run typecheck after the doc update only if code changed
elsewhere in this task batch.

**Step 4: Commit**

```bash
git add .
git commit -m "docs: correct harness risk interrupt behavior notes"
```

### Task 7: Run verification for the stabilization batch

**Files:**

- Modify: none unless fixes are required

**Step 1: Run targeted tests for this plan**

Run:

```bash
bun test apps/web/lib/agent/harness/runtime.test.ts apps/web/lib/agent/plan-progress.test.ts apps/web/components/chat/live-run-utils.test.ts
```

Expected:

- PASS

**Step 2: Run project quality gates**

Run:

```bash
bun run typecheck
bun run lint
bun run format:check
bun test
```

Expected:

- all commands pass

**Step 3: Run the app build**

Run:

```bash
bun run build
```

Expected:

- PASS

**Step 4: Commit final stabilization batch if needed**

```bash
git add apps/web docs/plans
git commit -m "fix: stabilize runtime terminal state and plan execution signals"
```

### Follow-On Work (separate plan, not part of this stabilization pass)

- Split `apps/web/hooks/useAgent.ts` into smaller hooks after the behavior fixes
  land.
- Add richer nested subagent progress and per-subagent timeout handling.
- Design a safe rollback UX for snapshots instead of exposing raw restore
  operations.
- Add structured memory bank templates once runtime correctness issues are
  addressed.
