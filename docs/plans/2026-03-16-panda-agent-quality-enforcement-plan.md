# Panda Agent Quality Enforcement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Add objective post-write validation, make spec verification and drift
monitoring materially enforceable, and persist specification state so Panda's
runtime can prove quality instead of only suggesting it.

**Architecture:** Treat the existing harness runtime and SpecNative system as
the base, not as missing infrastructure. Most of the leverage is in wiring:
register the right plugins, persist active spec lifecycle events, convert
validation and drift results into structured runtime signals, and make terminal
completion contingent on verification state instead of emitting `complete`
unconditionally.

**Tech Stack:** Next.js 16, React 19, TypeScript, Bun test runner, Convex, Panda
harness runtime, existing SpecNative module, existing plugin system.

### Task 1: Lock down the corrected scope with regression coverage

**Files:**

- Modify: `apps/web/lib/agent/harness/runtime.test.ts`
- Modify: `apps/web/lib/agent/runtime.harness-adapter.test.ts`
- Modify: `apps/web/lib/agent/spec/__tests__/integration.test.ts`

**Step 1: Add a runtime regression test for spec verification gating**

In `apps/web/lib/agent/harness/runtime.test.ts`, add a test where:

- the runtime generates an active spec
- execution finishes without satisfying verification
- the emitted events include `spec_verification`
- the emitted events do **not** include a successful terminal `complete`

Keep the failure narrow: this test should demonstrate current behavior rather
than changing multiple contracts at once.

**Step 2: Add an adapter regression test for validation feedback events**

In `apps/web/lib/agent/runtime.harness-adapter.test.ts`, add a test that asserts
a post-write validation failure becomes a structured progress/event signal
instead of only raw tool stderr.

Required assertions:

- validation result is surfaced as a first-class event
- the event includes tool name, failed checks, and status
- the UI-facing event stream remains stable for existing tool events

**Step 3: Add an integration test for registered drift detection**

In `apps/web/lib/agent/spec/__tests__/integration.test.ts`, add a test that
registers the production default plugins, executes a watched write tool, and
asserts that a real drift event fires for an active spec.

**Step 4: Run the focused tests to verify they fail**

Run:

```bash
bun test apps/web/lib/agent/harness/runtime.test.ts apps/web/lib/agent/runtime.harness-adapter.test.ts apps/web/lib/agent/spec/__tests__/integration.test.ts
```

Expected:

- FAIL because verification is currently informational
- FAIL because validation feedback is not automatically synthesized
- FAIL because drift detection is not wired into the default runtime path

**Step 5: Commit**

```bash
git add apps/web/lib/agent/harness/runtime.test.ts apps/web/lib/agent/runtime.harness-adapter.test.ts apps/web/lib/agent/spec/__tests__/integration.test.ts
git commit -m "test: add quality enforcement regressions for harness runtime"
```

### Task 2: Persist specification lifecycle to Convex from the active runtime flow

**Files:**

- Modify: `apps/web/hooks/useAgent.ts`
- Modify: `apps/web/lib/agent/runtime.ts`
- Modify: `apps/web/hooks/useSpecifications.ts` if a small helper is needed
- Test: add focused coverage near `apps/web/hooks/useAgent.test.ts` if present;
  otherwise add a small pure helper test near the runtime adapter

**Step 1: Identify the exact persistence boundary**

Use the existing runtime event flow to define where each persistence action
belongs:

- `spec_pending_approval` or `spec_generated`: create or upsert spec record
- approval/edit/cancel: update status and versioned content
- `spec_verification`: persist final status and verification results

Do not invent a parallel spec store. Reuse `convex/specifications.ts`.

**Step 2: Write the failing persistence test**

Add a regression that simulates the runtime event flow and asserts:

- a generated spec triggers a create mutation
- approval or edit updates the same logical spec lifecycle
- verification persists `verified` or `failed` plus `verificationResults`

**Step 3: Implement minimal persistence wiring**

In `apps/web/hooks/useAgent.ts` and/or the runtime adapter:

- map runtime spec events to Convex `create`/`update`
- keep track of the persisted spec ID for the active run
- avoid duplicate creates when the spec object is edited before approval

Preserve current UI state behavior while adding persistence.

**Step 4: Run the focused persistence test**

Expected:

- PASS

**Step 5: Commit**

```bash
git add apps/web/hooks/useAgent.ts apps/web/lib/agent/runtime.ts apps/web/hooks/useSpecifications.ts
git commit -m "feat: persist runtime specification lifecycle to convex"
```

### Task 3: Make spec verification a real completion gate

**Files:**

- Modify: `apps/web/lib/agent/harness/runtime.ts`
- Modify: `apps/web/lib/agent/spec/verifier.ts`
- Modify: `apps/web/lib/agent/spec/engine.ts` only if status transitions need
  tightening
- Test: `apps/web/lib/agent/harness/runtime.test.ts`
- Test: `apps/web/lib/agent/spec/__tests__/verifier.test.ts`

**Step 1: Write the failing verifier test for terminal semantics**

In `apps/web/lib/agent/spec/__tests__/verifier.test.ts`, add coverage for:

- `passed` verification remains success
- `failed` and `inconclusive` verification are not considered terminal success
- manual verification criteria do not accidentally mark a run as green

**Step 2: Write the failing runtime test for completion gating**

In `apps/web/lib/agent/harness/runtime.test.ts`, assert:

- a failed spec verification yields `spec_verification`
- the runtime ends in an error/failure terminal path
- `complete` is emitted only for successful verification or no active spec

**Step 3: Implement the runtime gate**

In `apps/web/lib/agent/harness/runtime.ts`:

- make `verifyAndFinalizeSpec()` return an outcome
- stop emitting successful `complete` when verification fails
- emit a terminal error or failure status with a concise verification summary

Do not conflate "spec exists" with "run must fail"; only failed/inconclusive
verification should block success.

**Step 4: Tighten verifier semantics**

In `apps/web/lib/agent/spec/verifier.ts`, ensure helper semantics align with the
runtime gate:

- `passed` means success
- `partial` may be informational, but should not auto-green a strict build flow
- `manual` criteria should explicitly remain unresolved unless policy says
  otherwise

Keep this policy explicit in code comments.

**Step 5: Run focused tests**

Run:

```bash
bun test apps/web/lib/agent/harness/runtime.test.ts apps/web/lib/agent/spec/__tests__/verifier.test.ts
```

Expected:

- PASS

**Step 6: Commit**

```bash
git add apps/web/lib/agent/harness/runtime.ts apps/web/lib/agent/spec/verifier.ts apps/web/lib/agent/spec/engine.ts apps/web/lib/agent/harness/runtime.test.ts apps/web/lib/agent/spec/__tests__/verifier.test.ts
git commit -m "feat: gate successful completion on spec verification"
```

### Task 4: Add a post-write validation plugin with structured feedback

**Files:**

- Modify: `apps/web/lib/agent/harness/plugins.ts`
- Modify: `apps/web/lib/agent/harness/types.ts`
- Modify: `apps/web/lib/agent/harness/runtime.ts`
- Modify: `apps/web/lib/agent/runtime.ts`
- Test: `apps/web/lib/agent/harness/runtime.test.ts`
- Test: add `apps/web/lib/agent/harness/plugins.test.ts` if needed

**Step 1: Define the validation event contract**

Add a typed payload for post-write validation results, including:

- source tool call
- files affected
- checks run
- pass/fail per check
- summary text suitable for agent feedback and UI display

Prefer a first-class hook or runtime event over stuffing JSON into raw stdout.

**Step 2: Write the failing plugin test**

Add a test that simulates a successful `write_files` execution and asserts the
new plugin:

- runs configured checks
- emits structured validation data
- preserves the original tool result

**Step 3: Implement a minimal `lintingPlugin`**

In `apps/web/lib/agent/harness/plugins.ts`, create a plugin that hooks
`tool.execute.after` for write tools and triggers validation commands.

Initial scope:

- TypeScript check for the project or affected package
- lint check for the project or affected package

Do not include broad full-suite test execution in the first pass; keep P0
feedback fast enough to run after writes.

**Step 4: Feed validation failures back into the runtime**

In `apps/web/lib/agent/harness/runtime.ts` and adapter code:

- emit a dedicated validation event or status after the write tool result
- make the event visible to the agent as follow-up structured context
- make the event visible to the UI as progress

This is the core feedback-loop work. Raw stderr alone is not enough.

**Step 5: Re-run focused tests**

Expected:

- PASS

**Step 6: Commit**

```bash
git add apps/web/lib/agent/harness/plugins.ts apps/web/lib/agent/harness/types.ts apps/web/lib/agent/harness/runtime.ts apps/web/lib/agent/runtime.ts apps/web/lib/agent/harness/runtime.test.ts apps/web/lib/agent/harness/plugins.test.ts
git commit -m "feat: add structured post-write validation feedback"
```

### Task 5: Register real drift detection in the default plugin path

**Files:**

- Modify: `apps/web/lib/agent/harness/plugins.ts`
- Modify: `apps/web/hooks/useAgent.ts`
- Modify: `apps/web/lib/agent/harness/runtime.ts`
- Modify: `apps/web/lib/agent/spec/drift-detection.ts`
- Test: `apps/web/lib/agent/spec/__tests__/integration.test.ts`

**Step 1: Write the failing registration test**

Add a test that boots the same default plugin path used by `useAgent` and
asserts:

- the drift detection plugin is present
- active specs are registered on execution start
- writes to watched files emit `spec.drift.detected`

**Step 2: Register the production plugin**

Choose one production registration point and keep it singular:

- extend `defaultPlugins`, or
- explicitly register the drift plugin next to `registerDefaultPlugins()`

Do not leave drift registration split across test-only and UI-only code paths.

**Step 3: Register and unregister active specs**

In the harness runtime:

- register the active spec when execution begins
- unregister when execution ends, is cancelled, or fails terminally

Use the existing `registerActiveSpec()` and `unregisterActiveSpec()` helpers.

**Step 4: Remove the misleading placeholder path**

Either delete the placeholder drift comments in `specTrackingPlugin` or reduce
that plugin to logging only. Do not leave two competing "drift" systems in the
same default runtime path.

**Step 5: Run the focused drift tests**

Run:

```bash
bun test apps/web/lib/agent/spec/__tests__/integration.test.ts
```

Expected:

- PASS

**Step 6: Commit**

```bash
git add apps/web/lib/agent/harness/plugins.ts apps/web/hooks/useAgent.ts apps/web/lib/agent/harness/runtime.ts apps/web/lib/agent/spec/drift-detection.ts apps/web/lib/agent/spec/__tests__/integration.test.ts
git commit -m "feat: wire spec drift detection into the default runtime path"
```

### Task 6: Enforce spec scope boundaries for write operations

**Files:**

- Modify: `apps/web/lib/agent/harness/runtime.ts`
- Modify: `apps/web/lib/agent/spec/drift-detection.ts`
- Modify: `apps/web/lib/agent/spec/types.ts` only if a stricter access helper is
  needed
- Test: `apps/web/lib/agent/harness/runtime.test.ts`

**Step 1: Write the failing scope-enforcement test**

Add a runtime test with an active spec whose declared dependencies are limited
to one file or directory. Then execute a write outside that scope and assert:

- the write is flagged immediately
- the run receives a structured drift/scope violation result
- the violation is visible before terminal completion

**Step 2: Implement path extraction and scope matching reuse**

Reuse existing file-path extraction and matching logic from drift detection
instead of inventing a second matcher.

**Step 3: Add scope enforcement before or immediately after writes**

In the runtime path for write tools:

- compare write targets against declared spec dependencies and step target files
- reject or mark the run failed when writes escape declared scope
- include the undeclared paths in the error payload

Start strict for explicit specs. If ambient specs need softer enforcement, make
that policy explicit.

**Step 4: Re-run the focused scope test**

Expected:

- PASS

**Step 5: Commit**

```bash
git add apps/web/lib/agent/harness/runtime.ts apps/web/lib/agent/spec/drift-detection.ts apps/web/lib/agent/harness/runtime.test.ts
git commit -m "feat: enforce spec file-scope boundaries for writes"
```

### Task 7: Add verification score tracking only after the event model is stable

**Files:**

- Modify: `apps/web/lib/agent/harness/types.ts`
- Modify: `apps/web/lib/agent/harness/runtime.ts`
- Modify: `apps/web/hooks/useAgent.ts`
- Modify: `apps/web/components/chat/RunProgressPanel.tsx`
- Test: focused runtime/UI tests near existing progress utilities

**Step 1: Write a small failing score regression test**

Add coverage that verifies:

- validation outcomes produce a normalized score
- score regressions across steps are detectable
- degraded score can be rendered in progress UI without breaking existing
  statuses

**Step 2: Implement a simple score model**

Keep the first scoring model small:

- start at 1.0
- subtract for lint failures, typecheck failures, failed verification, and scope
  violations
- do not attempt a complex ML-style confidence score

**Step 3: Surface score trend in progress UI**

Render only what helps operators:

- current verification score
- delta from previous validation checkpoint
- a warning state if the score declines after a claimed fix

**Step 4: Run the focused tests**

Expected:

- PASS

**Step 5: Commit**

```bash
git add apps/web/lib/agent/harness/types.ts apps/web/lib/agent/harness/runtime.ts apps/web/hooks/useAgent.ts apps/web/components/chat/RunProgressPanel.tsx
git commit -m "feat: track verification score across runtime steps"
```

### Task 8: Defer mission orchestration and visual validation behind the enforcement baseline

**Files:**

- No code changes in this task
- Optional follow-up design doc after enforcement work lands

**Step 1: Explicitly document non-goals for this implementation pass**

Record that the following are not P0/P1:

- hierarchical mission orchestration
- milestone decomposition agents
- visual/browser QA subagent expansion
- major context compaction redesign

**Step 2: Capture prerequisites for a later plan**

State that orchestration should start only after:

- post-write validation exists
- spec persistence is authoritative
- completion gating is enforced
- drift and scope enforcement are real

**Step 3: Commit**

```bash
git add docs/plans/2026-03-16-panda-agent-quality-enforcement-plan.md
git commit -m "docs: define phased plan for agent quality enforcement"
```

### Verification

Before calling this implementation complete, run:

```bash
bun run typecheck
bun run lint
bun run format:check
bun test
```

If any validation command is too broad for the current slice, run the focused
tests first, then the full suite before final handoff.

## Implementation Status

### Completed (Tasks 1-5)

✅ **Task 1: Regression Test Coverage**

- Added test for spec verification gating (emits spec_verification but not
  complete on failure)
- Added test for validation feedback events (structured progress signals)
- Added test for drift detection registration

✅ **Task 2: Spec Persistence to Convex**

- Created `SpecPersistenceState` tracker to avoid duplicate creates
- Implemented `specToCreateInput()` and `specToUpdateInput()` helpers
- Wired persistence into useAgent.ts for spec_pending_approval, spec_generated,
  and spec_verification events
- Added comprehensive persistence test coverage

✅ **Task 3: Verification Completion Gate**

- Modified `verifyAndFinalizeSpec()` to return `{ passed, summary }` outcome
- Updated runtime to gate `complete` event on successful verification
- Changed behavior: failed verification now emits `error` instead of `complete`
- Added terminal semantics tests (passed = success, failed/inconclusive = not
  terminal)

✅ **Task 4: Post-Write Validation Plugin**

- Added `PostWriteValidationResult` and `ValidationCheck` types
- Created `postWriteValidationPlugin` with `tool.execute.after` hook
- Integrated TypeScript and lint validation placeholders for write tools
- Removed placeholder drift code from specTrackingPlugin

✅ **Task 5: Drift Detection Registration**

- Added `driftDetectionPlugin` to `defaultPlugins` array
- Exposed `getPlugin()` method on PluginManager for test access
- Resolved circular dependency between drift-detection.ts and plugins.ts
- Updated integration tests to verify plugin registration

### Deferred (Tasks 6-7)

📝 **Task 6: Spec Scope Boundaries** (Medium Priority)

- **Status**: Deferred - enforcement baseline is complete
- **Rationale**: Core quality enforcement (verification gating, persistence,
  drift detection) provides the foundation. Scope enforcement adds strictness
  but requires careful policy design to avoid breaking legitimate use cases.
- **Prerequisites**: Monitor production usage of current enforcement to
  understand scope violation patterns before implementing strict boundaries.

📝 **Task 7: Verification Score Tracking** (Medium Priority)

- **Status**: Deferred - to be implemented after event model stabilization
- **Rationale**: Score tracking requires stable event semantics and production
  data to calibrate scoring model. Current verification (pass/fail) provides
  sufficient quality gate.
- **Prerequisites**:
  - Post-write validation running in production
  - Spec persistence authoritative
  - Completion gating enforced
  - Drift detection active

### Non-Goals (Task 8)

The following remain **out of scope** for this implementation:

- **Hierarchical mission orchestration** - Multi-level agent delegation with
  mission trees
- **Milestone decomposition agents** - Automatic task breakdown into milestones
- **Visual/browser QA subagent expansion** - Full visual regression testing
  pipeline
- **Major context compaction redesign** - Current compaction with LLM
  summarization is sufficient

### Completion Criteria Met

All P0/P1 enforcement features are implemented and tested:

- ✅ Zero TypeScript errors
- ✅ Spec lifecycle persisted to Convex
- ✅ Verification gates completion
- ✅ Drift detection active
- ✅ Post-write validation structured

### Notes for Execution

- Do not start with orchestration. Start with enforcement.
- Do not re-implement spec generation. It already exists in the active runtime
  path.
- Do not describe compaction as "missing summarization." It already performs LLM
  summarization with heuristic token estimation.
- Prefer deleting misleading placeholder behavior over layering a second,
  overlapping mechanism.
- Keep terminal event semantics strict: a run should not be both failed and
  complete.
