# Panda Plan Mode Productization Implementation Plan

> **Status:** Implemented on 2026-03-10

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Turn Panda's current Architect/Plan mode into a first-class,
artifact-driven planning workflow that feels closer to Cursor's Plan Mode while
preserving Panda's existing Spec and Build capabilities.

**Architecture:** Reuse Panda's existing `planDraft` and `PlanPanel` as the
canonical planning artifact instead of treating the plan as a derived copy of
assistant chat. Keep `Spec` as the formal requirements and acceptance layer,
make `Plan` the editable implementation-strategy layer, and make `Build` consume
the approved plan explicitly during execution. Avoid introducing a brand-new
plans table in the first rollout; extend chat-scoped metadata first, then add
richer versioning only if usage proves the need.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Convex, Panda agent
harness, existing `Spec` engine, existing `PlanPanel`, existing `useAgent`
orchestration.

## Product Contract

Panda should expose three distinct but connected layers:

1. **Spec** Formal intent, constraints, and acceptance criteria.

2. **Plan** Editable implementation strategy with file references, ordered work,
   open questions, and validation steps.

3. **Build** Execution mode that consumes the approved plan and reports progress
   against it.

User-facing workflow:

1. User enters Architect/Plan mode.
2. Panda researches the repo and asks clarifying questions when needed.
3. Panda writes or updates the plan artifact directly.
4. User edits and approves the plan.
5. User clicks Build from Plan.
6. Build mode receives the approved plan and active spec as execution inputs.
7. Run progress shows both plan progress and execution progress.

Out of scope for this rollout:

- Multi-version historical plan diffs
- Cross-chat reusable plan templates
- Team collaboration on plans
- Background autonomous plan regeneration

## Success Criteria

- Architect mode produces a plan artifact by default for multi-step requests.
- The plan artifact is no longer derived from freeform assistant chat after the
  run.
- Plan content is structured, editable, and grounded in file paths and code
  references.
- Build mode can execute from an approved plan without relying on implicit
  conversation memory.
- Existing Spec flows continue to work and remain distinct from Plan.
- Existing Ask, Code, and Build workflows do not regress.

## Completion Summary

- Task 1 completed: chat-scoped plan workflow state and metadata were added.
- Task 2 completed: Architect mode now targets an artifact-style plan contract.
- Task 3 completed: Spec and Plan surfaces are distinct in the main chat UI.
- Task 4 completed: `PlanPanel` is mounted as a primary planning surface with
  approval and build actions.
- Task 5 completed: Build-from-plan now uses an explicit approved-plan execution
  contract and persists run linkage.
- Task 6 completed: Architect mode receives targeted planning context in
  addition to the generic repo overview.
- Task 7 completed: run progress stores explicit plan-step metadata and surfaces
  plan progress during execution.
- Task 8 completed: regression coverage was expanded with targeted unit and E2E
  coverage for the plan workflow.
- Task 9 completed: harness documentation now reflects the Spec vs Plan vs Build
  contract and rollout behavior.

## Task 1: Formalize Plan Ownership and Workflow States

**Files:**

- Modify: `convex/schema.ts`
- Modify: `convex/chats.ts`
- Modify: `apps/web/app/(dashboard)/projects/[projectId]/page.tsx`
- Test: `apps/web/lib/chat/planDraft.test.ts`

**Step 1: Extend chat-scoped plan metadata**

Add plan workflow fields to `chats`:

- `planStatus`:
  `'idle' | 'drafting' | 'awaiting_review' | 'approved' | 'stale' | 'executing'`
- `planSourceMessageId`: optional message reference string
- `planApprovedAt`: optional number
- `planLastGeneratedAt`: optional number
- `planBuildRunId`: optional `agentRuns` id

Keep existing `planDraft` and `planUpdatedAt`.

**Step 2: Update chat mutations**

Extend `convex/chats.ts:update` to patch the new plan metadata without
overwriting unrelated fields.

**Step 3: Add plan state helpers**

In `page.tsx`, introduce a local helper layer for:

- determining whether the current plan is draft/reviewable/approved/stale
- resetting approval when the plan text changes
- marking plan execution start when build begins from plan

**Step 4: Write tests**

Add/expand unit tests for draft derivation and approval invalidation in:

- `apps/web/lib/chat/planDraft.test.ts`

**Step 5: Verify**

Run:

```bash
bun test apps/web/lib/chat/planDraft.test.ts
```

Expected:

- PASS
- New state transitions covered for draft vs approved vs stale

## Task 2: Make Plan Artifact the Canonical Output of Architect Mode

**Files:**

- Modify: `apps/web/lib/agent/prompt-library.ts`
- Modify: `apps/web/lib/agent/harness/agents.ts`
- Modify: `apps/web/lib/chat/planDraft.ts`
- Modify: `apps/web/hooks/useAgent.ts`
- Test: `apps/web/lib/agent/prompt-library.test.ts`
- Test: `apps/web/lib/agent/runtime.plan-mode.test.ts`

**Step 1: Change the Architect prompt contract**

Update `ARCHITECT_SYSTEM_PROMPT` in `prompt-library.ts` so explicit planning
requests produce a plan artifact with these required sections:

- `Goal`
- `Clarifications`
- `Relevant Files`
- `Implementation Plan`
- `Risks`
- `Validation`
- `Open Questions`

Requirements:

- Must cite file paths when likely impacted
- Must avoid long code blocks
- Must write directly for artifact quality, not conversational flourish

**Step 2: Align harness plan agent prompt**

Update the harness `plan` agent prompt in `agents.ts` to match the same
artifact-first contract so the UI mode and harness mode cannot drift.

**Step 3: Stop treating chat prose as the source of truth**

Refactor `planDraft.ts`:

- Keep support for extracting a plan from assistant output as a temporary
  fallback
- Introduce an explicit path for storing direct plan artifact content
- Make derivation fallback-only and clearly isolated

**Step 4: Update useAgent orchestration**

In `useAgent.ts`, add explicit handling for architect completions that are
intended to update the plan artifact directly.

Do not rely solely on:

- last assistant architect message
- brainstorm phase stripping

Instead:

- capture the final artifact payload
- update the chat plan state to `awaiting_review`
- only use message derivation as a compatibility path

**Step 5: Add regression tests**

Ensure plan mode:

- does not stream fenced code blocks
- emits structured plan content
- preserves direct answers for non-planning questions

**Step 6: Verify**

Run:

```bash
bun test apps/web/lib/agent/prompt-library.test.ts
bun test apps/web/lib/agent/runtime.plan-mode.test.ts
```

Expected:

- PASS
- Plan mode remains read-only
- Planning requests yield structured artifact-quality output

## Task 3: Separate Spec from Plan in the UX

**Files:**

- Modify: `apps/web/components/chat/ChatInput.tsx`
- Modify: `apps/web/components/chat/SpecDrawer.tsx`
- Modify: `apps/web/components/chat/RunProgressPanel.tsx`
- Modify: `apps/web/app/(dashboard)/projects/[projectId]/page.tsx`

**Step 1: Clarify labels**

Audit visible labels so users understand:

- `Specification` = requirements/acceptance
- `Plan Draft` = implementation strategy

Avoid language where both appear to be “the plan.”

**Step 2: Add plan review state near chat input**

Near the existing spec approval UI in `ChatInput.tsx`, add a plan review state
block that can show:

- plan status
- last updated time
- whether approval is required
- buttons for `Review Plan`, `Approve Plan`, `Build from Plan`

**Step 3: Keep Spec drawer focused**

Do not overload `SpecDrawer` with plan editing.

Keep it focused on:

- goal
- constraints
- acceptance criteria
- formal execution steps if generated by the spec engine

Plan review belongs in the plan surface, not the spec drawer.

**Step 4: Extend run progress metadata**

In `RunProgressPanel.tsx`, add badges for:

- `Plan Approved`
- `Executing Plan`
- `Spec Active`

This makes the plan/build handoff legible during execution.

**Step 5: Verify manually**

Manual checks:

- Open Architect mode and create a plan
- Confirm Spec and Plan are visibly distinct
- Confirm user can review plan without opening Spec drawer

Expected:

- No ambiguity about which UI owns requirements vs strategy

## Task 4: Upgrade the Plan Panel into the Primary Planning Surface

**Files:**

- Modify: `apps/web/components/plan/PlanPanel.tsx`
- Modify: `apps/web/app/(dashboard)/projects/[projectId]/page.tsx`
- Possibly create: `apps/web/components/plan/PlanStatusBar.tsx`
- Possibly create: `apps/web/components/plan/PlanChecklist.tsx`

**Step 1: Add plan status controls**

Enhance `PlanPanel` header to show:

- status badge
- last generated time
- approved/stale state
- build button when approval is valid

**Step 2: Add a lightweight checklist view**

Parse the `Implementation Plan` section into a presentational checklist for
easier scanning.

Do not make this editable separately in phase 1.

Keep markdown as the source of truth.

**Step 3: Add “Build from Plan” action**

Wire a primary CTA from the plan surface that:

- switches to `build` mode
- injects the approved `planDraft`
- marks chat plan state as `executing`

**Step 4: Add stale-plan handling**

When the user edits the plan after approval:

- automatically mark `planStatus = stale`
- require re-approval before `Build from Plan` is enabled

**Step 5: Verify manually**

Manual checks:

- Edit plan and confirm approval clears
- Re-approve and confirm build CTA enables
- Build launches with current plan, not an old assistant response

## Task 5: Make Build Mode Consume the Approved Plan Explicitly

**Files:**

- Modify: `apps/web/lib/chat/planDraft.ts`
- Modify: `apps/web/app/(dashboard)/projects/[projectId]/page.tsx`
- Modify: `apps/web/hooks/useAgent.ts`
- Modify: `apps/web/lib/agent/prompt-library.ts`
- Test: `apps/web/lib/agent/runtime.build-mode.test.ts`

**Step 1: Define build handoff contract**

When Build is launched from an approved plan, the prompt context should include:

- approved `planDraft`
- current spec summary if available
- explicit instruction that the plan is the primary execution contract

**Step 2: Distinguish “advisory” vs “approved” plan injection**

Do not blindly prepend `Plan draft:` to every architect/build message forever.

Refactor so Build receives plan text only when:

- a plan exists
- the user explicitly chose `Build from Plan`, or
- the mode is build and the chat is still tied to an approved plan execution

**Step 3: Track build linkage**

When `agentRuns.create` is called for a build-from-plan run, persist linkage
from the chat plan state to the run id.

**Step 4: Add regression tests**

Cover:

- build run with no approved plan
- build run with approved plan
- edited stale plan cannot auto-execute

**Step 5: Verify**

Run:

```bash
bun test apps/web/lib/agent/runtime.build-mode.test.ts
```

Expected:

- PASS
- Build mode prompt differs when launched from approved plan

## Task 6: Improve Repo Grounding for Planning Quality

**Files:**

- Modify: `apps/web/hooks/useAgent.ts`
- Modify: `apps/web/lib/agent/context/repo-overview.ts`
- Possibly create: `apps/web/lib/agent/context/plan-context.ts`
- Test: `apps/web/lib/agent/context/repo-overview.test.ts`

**Step 1: Add plan-specific context preparation**

Create a plan-context helper that prioritizes:

- routes
- schema files
- API boundaries
- adjacent tests
- existing UI patterns
- likely touched files from search results

**Step 2: Avoid sending only generic repo overview**

Architect mode should receive a more targeted context bundle than the general
project overview.

**Step 3: Bias relevant file surfacing**

When a planning request is detected:

- gather likely impacted files
- inject them into context
- encourage the model to cite them in the plan

**Step 4: Verify**

Manual check:

- Use a planning prompt for a medium-sized feature
- Confirm output contains concrete file references more often than generic
  architecture prose

## Task 7: Introduce Plan Execution Progress Mapping

**Files:**

- Modify: `convex/agentRuns.ts`
- Modify: `convex/schema.ts`
- Modify: `apps/web/components/chat/live-run-utils.ts`
- Modify: `apps/web/components/chat/RunProgressPanel.tsx`
- Possibly create: `apps/web/lib/agent/plan-progress.ts`

**Step 1: Persist plan progress metadata**

Extend run events or run metadata to carry:

- current plan step id/title
- total planned steps
- completed plan steps

**Step 2: Map execution events back to the plan**

Use a lightweight matcher between run events and plan checklist entries.

Phase 1 is best-effort matching, not perfect semantic understanding.

**Step 3: Show dual progress**

In `RunProgressPanel.tsx`, show:

- plan step progress
- tool/execution progress

This closes the loop between reviewed plan and actual execution.

**Step 4: Verify manually**

Manual checks:

- Build from plan
- Confirm UI shows which part of the plan is being executed

## Task 8: Preserve Existing Features and Prevent Regressions

**Files:**

- Modify: `apps/web/lib/agent/runtime.plan-mode.test.ts`
- Modify: `apps/web/lib/agent/runtime.build-mode.test.ts`
- Modify: `apps/web/lib/agent/prompt-library.test.ts`
- Modify: `apps/web/components/chat/live-run-utils.test.ts`
- Possibly add: `apps/web/e2e/plan-mode.spec.ts`

**Step 1: Protect Ask mode**

Ensure Ask mode does not accidentally emit plan artifact structure.

**Step 2: Protect Code mode**

Ensure Code mode still performs direct implementation without requiring plan
approval.

**Step 3: Protect Spec flows**

Ensure pending spec approval still works and remains distinct from plan
approval.

**Step 4: Add E2E**

Cover:

- create plan
- edit plan
- approve plan
- build from plan
- inspect progress

**Step 5: Verify**

Run:

```bash
bun test
cd apps/web && bun run test:e2e
```

Expected:

- PASS
- No regression in existing agent mode flows

## Task 9: Final Verification and Release Readiness

**Files:**

- Modify: `docs/AGENTIC_HARNESS.md`
- Possibly modify: `AGENTS.md`
- Possibly create: `docs/plans/plan-mode-ux-notes.md`

**Step 1: Update docs**

Document the new contract:

- Spec vs Plan vs Build
- plan approval flow
- build-from-plan behavior

**Step 2: Run full verification**

Run:

```bash
bun run typecheck
bun run lint
bun run format:check
bun test
bun run build
cd apps/web && bun run test:e2e
```

Expected:

- Zero TypeScript errors
- Zero lint warnings
- Formatting clean
- Tests and build pass

**Step 3: Manual product QA**

Check:

- simple architect question still gets a direct answer
- explicit planning request writes a usable plan artifact
- plan edits invalidate approval
- build consumes approved plan
- spec drawer remains separate and understandable

## Recommended Implementation Order

1. Task 1
2. Task 2
3. Task 3
4. Task 4
5. Task 5
6. Task 8
7. Task 6
8. Task 7
9. Task 9

Rationale:

- Tasks 1-5 establish the product contract.
- Task 8 protects existing behavior before deeper quality improvements.
- Tasks 6-7 improve fidelity after the workflow is correct.

## Risks and Mitigations

**Risk:** Spec and Plan become more confusing during rollout  
**Mitigation:** Ship label and state changes in the same PR as plan-first
workflow.

**Risk:** Build mode overfits to stale plan text  
**Mitigation:** stale-plan invalidation must be enforced before build handoff.

**Risk:** Architect mode becomes too rigid for casual architecture discussion  
**Mitigation:** retain intent detection in `prompt-library.ts` so only explicit
planning requests create artifact-first output.

**Risk:** Plan artifact quality is still weak without enough repo grounding  
**Mitigation:** add targeted plan context after the core workflow lands.

**Risk:** Regression in direct Build mode flow for users who do not want
planning  
**Mitigation:** keep Build mode fully available without approved plan unless the
user explicitly enters build-from-plan flow.

## Definition of Done

- Panda has a clear three-layer contract: Spec, Plan, Build.
- Architect mode generates a high-quality plan artifact as the default output
  for planning requests.
- Plan approval and build handoff are explicit.
- Existing planning primitives are reused rather than duplicated.
- Existing non-plan workflows remain intact.

Plan complete and saved to `docs/plans/2026-03-10-plan-mode-productization.md`.
Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task,
review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans,
batch execution with checkpoints

Which approach?
