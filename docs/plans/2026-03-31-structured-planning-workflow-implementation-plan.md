# Structured Planning Workflow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Build a typed planning workflow for Panda where the agent asks
structured questions in a right-side popup with suggested answers plus freeform
fallback, then promotes the completed plan into the main workspace as a
first-class tab that the user can accept and build from.

**Architecture:** Introduce a dedicated planning domain model instead of
treating planning as only markdown on the chat. The planning flow will have
three layers: a typed planning session state in Convex, a right-side
guided-intake popup for question collection, and a workspace-level plan artifact
tab rendered through the existing workbench. Build execution will consume an
accepted plan artifact, not a transient popup state.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Convex,
Zustand/context-style UI state, existing Panda harness/runtime, Bun tests,
Playwright E2E

---

## Phase 1: Typed Planning Domain

> Replace the current text-only planning state with explicit planning session
> records and a typed generated plan artifact.

### Task 1: Add planning session and plan artifact types

**Files:**

- Modify: `convex/schema.ts`
- Create: `apps/web/lib/planning/types.ts`
- Create: `apps/web/lib/planning/types.test.ts`
- Modify: `apps/web/lib/chat/planDraft.ts`

**Step 1: Write the failing type tests**

Create `apps/web/lib/planning/types.test.ts` with assertions for:

- `PlanningQuestion`
- `PlanningOption`
- `PlanningAnswer`
- `GeneratedPlanArtifact`
- workspace-facing plan statuses: `intake`, `generating`, `ready_for_review`,
  `accepted`, `executing`, `completed`, `failed`

The test should import these symbols from `apps/web/lib/planning/types.ts` and
fail because the file does not exist yet.

**Step 2: Run test to verify it fails**

Run: `bun test apps/web/lib/planning/types.test.ts` Expected: FAIL with
module-not-found or missing export errors.

**Step 3: Add the minimal type layer**

In `apps/web/lib/planning/types.ts`, define:

- `PlanningQuestion` with `id`, `title`, `prompt`, `suggestions`,
  `allowFreeform`, `order`
- `PlanningOption` with `id`, `label`, `description`, `recommended`
- `PlanningAnswer` with `questionId`, `selectedOptionId`, `freeformValue`,
  `source`
- `GeneratedPlanArtifact` with `chatId`, `sessionId`, `title`, `summary`,
  `markdown`, `sections`, `acceptanceChecks`, `status`
- `WorkspacePlanTabRef` with stable virtual-tab identity

In `convex/schema.ts`, add a `planningSessions` table keyed by `chatId` with:

- `status`
- `questions`
- `answers`
- `generatedPlan`
- `startedAt`
- `completedAt`
- `acceptedAt`
- `updatedAt`

Keep `chats.planDraft` temporarily for compatibility, but mark the new artifact
as canonical in code comments.

**Step 4: Adapt existing plan helpers**

Update `apps/web/lib/chat/planDraft.ts` to:

- accept a `GeneratedPlanArtifact` input where appropriate
- preserve current behavior for legacy markdown-only chats
- expose a helper that converts a generated plan artifact to the existing build
  prompt contract

**Step 5: Run tests to verify they pass**

Run:
`bun test apps/web/lib/planning/types.test.ts apps/web/lib/chat/planDraft.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add convex/schema.ts apps/web/lib/planning/types.ts apps/web/lib/planning/types.test.ts apps/web/lib/chat/planDraft.ts
git commit -m "feat: add typed planning session and plan artifact models"
```

---

### Task 2: Add Convex planning session mutations and queries

**Files:**

- Create: `convex/planningSessions.ts`
- Create: `convex/planningSessions.test.ts`
- Modify: `convex/chats.ts`
- Modify: `convex/_generated/api.d.ts`

**Step 1: Write the failing Convex tests**

Create `convex/planningSessions.test.ts` covering:

- `startIntake(chatId)` creates a session with ordered questions
- `answerQuestion(sessionId, questionId, optionId/freeform)` updates answers
  idempotently
- `completeIntake(sessionId, generatedPlan)` stores the generated plan artifact
- `acceptPlan(sessionId)` marks the artifact accepted and syncs compatibility
  fields on `chats`

**Step 2: Run test to verify it fails**

Run: `bun test convex/planningSessions.test.ts` Expected: FAIL because the
Convex module does not exist yet.

**Step 3: Implement the planning session API**

In `convex/planningSessions.ts`, add:

- `getActiveByChat`
- `startIntake`
- `answerQuestion`
- `clearIntake`
- `completeIntake`
- `acceptPlan`
- `markExecutionState`

In `convex/chats.ts`, update compatibility logic so:

- accepted/generated artifacts still populate `planDraft`, `planStatus`,
  `planLastGeneratedAt`, `planApprovedAt`
- legacy readers continue to work during migration

**Step 4: Run tests to verify they pass**

Run: `bun test convex/planningSessions.test.ts` Expected: PASS

**Step 5: Commit**

```bash
git add convex/planningSessions.ts convex/planningSessions.test.ts convex/chats.ts
git commit -m "feat: add Convex planning session workflow"
```

---

## Phase 2: Guided Intake Popup

> Build the right-side planning popup that asks one question at a time with
> numbered suggested answers and a freeform answer option.

### Task 3: Add a planning question engine

**Files:**

- Create: `apps/web/lib/planning/question-engine.ts`
- Create: `apps/web/lib/planning/question-engine.test.ts`
- Modify: `apps/web/lib/agent/harness/task-tool.ts`

**Step 1: Write the failing tests**

Create `apps/web/lib/planning/question-engine.test.ts` covering:

- one active question at a time
- numbered suggested options are generated in display order
- freeform fallback is always available when enabled
- next question is derived from prior answers without skipping required
  questions

**Step 2: Run test to verify it fails**

Run: `bun test apps/web/lib/planning/question-engine.test.ts` Expected: FAIL
because the engine file does not exist.

**Step 3: Implement the engine**

In `apps/web/lib/planning/question-engine.ts`, implement:

- `buildDefaultPlanningQuestions()`
- `getCurrentPlanningQuestion(session)`
- `formatQuestionChoices(question)` returning numbered display labels
- `resolvePlanningAnswer(input)` that accepts either option selection or
  freeform text

Update `apps/web/lib/agent/harness/task-tool.ts` comments so the internal
`question` tool aligns with the new UI pattern:

- one question at a time
- suggested options
- optional freeform answer

Do not change the generic harness tool behavior yet; only align the model
contract text so build/plan agents can target the new UI correctly.

**Step 4: Run tests to verify they pass**

Run:
`bun test apps/web/lib/planning/question-engine.test.ts apps/web/lib/agent/harness/task-tool.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/lib/planning/question-engine.ts apps/web/lib/planning/question-engine.test.ts apps/web/lib/agent/harness/task-tool.ts
git commit -m "feat: add structured planning question engine"
```

---

### Task 4: Build the right-side planning intake popup

**Files:**

- Create: `apps/web/components/plan/PlanningIntakePopup.tsx`
- Create: `apps/web/components/plan/PlanningIntakePopup.test.tsx`
- Modify: `apps/web/components/projects/ProjectChatInspector.tsx`
- Modify: `apps/web/components/review/ReviewPanel.tsx`
- Modify: `apps/web/hooks/useProjectWorkspaceUi.ts`

**Step 1: Write the failing component tests**

Create `apps/web/components/plan/PlanningIntakePopup.test.tsx` covering:

- popup renders on the right side
- only one question is shown at a time
- suggested answers are shown as numbered buttons
- a freeform input is available
- selecting an option advances the flow
- entering custom text advances the flow

**Step 2: Run test to verify it fails**

Run: `bun test apps/web/components/plan/PlanningIntakePopup.test.tsx` Expected:
FAIL because the component does not exist.

**Step 3: Implement the popup**

In `apps/web/components/plan/PlanningIntakePopup.tsx`, build:

- question header with current step number
- numbered suggestion list using brutalist buttons
- freeform text area with submit action
- back/cancel controls
- non-blocking generating state after the last answer

In `apps/web/hooks/useProjectWorkspaceUi.ts`, add popup state:

- `isPlanningPopupOpen`
- `planningSessionId`
- `setIsPlanningPopupOpen`
- `setPlanningSessionId`

In `apps/web/components/projects/ProjectChatInspector.tsx`, render the popup
inside the right-side review surface so planning intake stays on the right even
on desktop.

**Step 4: Run tests to verify they pass**

Run: `bun test apps/web/components/plan/PlanningIntakePopup.test.tsx` Expected:
PASS

**Step 5: Commit**

```bash
git add apps/web/components/plan/PlanningIntakePopup.tsx apps/web/components/plan/PlanningIntakePopup.test.tsx apps/web/components/projects/ProjectChatInspector.tsx apps/web/components/review/ReviewPanel.tsx apps/web/hooks/useProjectWorkspaceUi.ts
git commit -m "feat: add right-side planning intake popup"
```

---

## Phase 3: Workspace Plan Artifact Tab

> Promote the completed plan into the main workspace as a typed non-file tab.

### Task 5: Add virtual workspace tabs for plan artifacts

**Files:**

- Modify: `apps/web/contexts/WorkspaceContext.tsx`
- Modify: `apps/web/hooks/useProjectWorkspaceUi.ts`
- Modify: `apps/web/components/workbench/FileTabs.tsx`
- Modify: `apps/web/components/workbench/Workbench.tsx`
- Create: `apps/web/components/workbench/PlanArtifactTab.tsx`
- Create: `apps/web/components/workbench/PlanArtifactTab.test.tsx`

**Step 1: Write the failing tests**

Create `apps/web/components/workbench/PlanArtifactTab.test.tsx` covering:

- a generated plan can open as a workspace tab even though it is not a file path
- the tab remains selectable alongside file tabs
- closing the tab does not affect open file tabs
- the tab shows `Accept and Build`

**Step 2: Run test to verify it fails**

Run: `bun test apps/web/components/workbench/PlanArtifactTab.test.tsx` Expected:
FAIL because the virtual tab type and component do not exist.

**Step 3: Introduce typed workspace tabs**

In `apps/web/contexts/WorkspaceContext.tsx`, replace path-only tab typing with a
discriminated union:

- `{ kind: 'file', path, isDirty }`
- `{ kind: 'plan', id, chatId, title, status }`

In `apps/web/hooks/useProjectWorkspaceUi.ts`, migrate `selectedFilePath` /
`openTabs` state to support:

- selected workspace item
- helpers to open/select/close plan tabs

In `apps/web/components/workbench/FileTabs.tsx`, update rendering to:

- show a plan icon/label for plan tabs
- route selection by tab identity, not file path only

In `apps/web/components/workbench/Workbench.tsx`, render `PlanArtifactTab` when
the active tab is a plan tab instead of an editor file.

**Step 4: Run tests to verify they pass**

Run: `bun test apps/web/components/workbench/PlanArtifactTab.test.tsx` Expected:
PASS

**Step 5: Commit**

```bash
git add apps/web/contexts/WorkspaceContext.tsx apps/web/hooks/useProjectWorkspaceUi.ts apps/web/components/workbench/FileTabs.tsx apps/web/components/workbench/Workbench.tsx apps/web/components/workbench/PlanArtifactTab.tsx apps/web/components/workbench/PlanArtifactTab.test.tsx
git commit -m "feat: support generated plan artifacts as workspace tabs"
```

---

### Task 6: Open generated plans in the workspace automatically

**Files:**

- Modify: `apps/web/app/(dashboard)/projects/[projectId]/page.tsx`
- Modify: `apps/web/hooks/useAgent.ts`
- Modify: `apps/web/components/plan/PlanPanel.tsx`
- Create: `apps/web/lib/planning/workspace-plan-sync.ts`
- Create: `apps/web/lib/planning/workspace-plan-sync.test.ts`

**Step 1: Write the failing sync tests**

Create `apps/web/lib/planning/workspace-plan-sync.test.ts` covering:

- completed planning session opens a plan tab automatically
- re-generating a plan reuses the same tab identity for the same session
- accepted plans stay visible during build execution

**Step 2: Run test to verify it fails**

Run: `bun test apps/web/lib/planning/workspace-plan-sync.test.ts` Expected: FAIL
because the sync helper does not exist.

**Step 3: Implement plan-to-workspace sync**

In `apps/web/lib/planning/workspace-plan-sync.ts`, add helpers:

- `toWorkspacePlanTab(session)`
- `shouldOpenGeneratedPlan(session, currentTabs)`
- `upsertPlanTab(currentTabs, nextPlanTab)`

In `apps/web/app/(dashboard)/projects/[projectId]/page.tsx`, wire:

- planning completion -> open workspace plan tab
- plan acceptance -> keep plan tab selected
- build start -> update the tab badge/status to `executing`

Update `apps/web/components/plan/PlanPanel.tsx` so its review controls match the
workspace artifact language:

- `Accept and Build`
- optional `Regenerate Plan`
- read-only review mode when shown as workspace artifact

**Step 4: Run tests to verify they pass**

Run:
`bun test apps/web/lib/planning/workspace-plan-sync.test.ts apps/web/lib/chat/planDraft.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/app/\(dashboard\)/projects/\[projectId\]/page.tsx apps/web/hooks/useAgent.ts apps/web/components/plan/PlanPanel.tsx apps/web/lib/planning/workspace-plan-sync.ts apps/web/lib/planning/workspace-plan-sync.test.ts
git commit -m "feat: open completed plans in workspace and sync execution state"
```

---

## Phase 4: Build Handoff and Inspectability

> Make accepted plans the real execution contract and expose the
> planning/runtime surfaces clearly.

### Task 7: Build from accepted plan artifact only

**Files:**

- Modify: `apps/web/hooks/useProjectMessageWorkflow.ts`
- Modify: `apps/web/lib/agent/session-controller.ts`
- Modify: `apps/web/lib/agent/context/plan-context.ts`
- Modify: `apps/web/lib/agent/plan-progress.ts`
- Create: `apps/web/lib/planning/build-contract.test.ts`

**Step 1: Write the failing contract tests**

Create `apps/web/lib/planning/build-contract.test.ts` covering:

- build runs only consume accepted plans
- the build contract uses the generated plan artifact sections, not stale popup
  answers
- plan step progress metadata derives from the typed accepted plan

**Step 2: Run test to verify it fails**

Run: `bun test apps/web/lib/planning/build-contract.test.ts` Expected: FAIL
because accepted-plan-only enforcement is not fully implemented.

**Step 3: Implement the accepted-plan build contract**

Update the build handoff so:

- unaccepted generated plans cannot start a build
- accepted plans are injected via typed artifact sections
- `plan-progress` prefers typed steps from `GeneratedPlanArtifact.sections`
- legacy markdown parsing remains fallback-only

**Step 4: Run tests to verify they pass**

Run:
`bun test apps/web/lib/planning/build-contract.test.ts apps/web/lib/agent/plan-progress.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/hooks/useProjectMessageWorkflow.ts apps/web/lib/agent/session-controller.ts apps/web/lib/agent/context/plan-context.ts apps/web/lib/agent/plan-progress.ts apps/web/lib/planning/build-contract.test.ts
git commit -m "feat: enforce accepted plan artifacts as build execution contracts"
```

---

### Task 8: Add planning diagnostics and runtime inspectability

**Files:**

- Create: `apps/web/components/plan/PlanningSessionDebugCard.tsx`
- Create: `apps/web/components/plan/PlanningSessionDebugCard.test.tsx`
- Modify: `apps/web/components/projects/ProjectChatInspector.tsx`
- Modify: `apps/web/components/chat/RunProgressPanel.tsx`
- Modify: `docs/AGENTIC_HARNESS.md`

**Step 1: Write the failing diagnostics tests**

Create `apps/web/components/plan/PlanningSessionDebugCard.test.tsx` covering:

- current question, selected answer source, and generated plan status are
  visible
- accepted plan id/session id are visible in debug mode
- build state is visible after acceptance

**Step 2: Run test to verify it fails**

Run: `bun test apps/web/components/plan/PlanningSessionDebugCard.test.tsx`
Expected: FAIL because the diagnostics card does not exist.

**Step 3: Implement diagnostics**

Add a compact diagnostics surface that shows:

- active planning session id
- question count answered / total
- generated plan artifact id and status
- whether the workspace plan tab is open
- whether the accepted plan is currently executing

Place it behind an existing debug flag or inspector section so it aids
operational debugging without cluttering the default UI.

Update `docs/AGENTIC_HARNESS.md` to document:

- planning session state machine
- right-side intake popup behavior
- workspace plan artifact tab behavior
- accepted-plan build contract

**Step 4: Run tests to verify they pass**

Run: `bun test apps/web/components/plan/PlanningSessionDebugCard.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/components/plan/PlanningSessionDebugCard.tsx apps/web/components/plan/PlanningSessionDebugCard.test.tsx apps/web/components/projects/ProjectChatInspector.tsx apps/web/components/chat/RunProgressPanel.tsx docs/AGENTIC_HARNESS.md
git commit -m "feat: add planning diagnostics and document structured planning workflow"
```

---

## Phase 5: End-to-End Verification

> Lock the behavior with integration and acceptance coverage.

### Task 9: Add end-to-end coverage for the full planning workflow

**Files:**

- Modify: `apps/web/e2e/agent-run.e2e-spec.ts`
- Create: `apps/web/e2e/planning-workflow.e2e-spec.ts`
- Modify: `apps/web/e2e/helpers/workbench.ts`

**Step 1: Write the failing E2E spec**

Add a new Playwright spec that verifies:

- user opens planning flow
- popup shows one question at a time
- numbered suggested answers can be selected
- user can type a custom answer
- plan generation completes
- a workspace plan tab opens automatically
- user clicks `Accept and Build`
- run progress reflects accepted-plan execution

**Step 2: Run spec to verify it fails**

Run: `cd apps/web && bunx playwright test e2e/planning-workflow.e2e-spec.ts`
Expected: FAIL until the new flow is fully wired.

**Step 3: Implement helper support**

Extend `apps/web/e2e/helpers/workbench.ts` with helpers for:

- opening planning popup
- selecting numbered answers
- typing freeform answers
- asserting plan tab presence
- clicking `Accept and Build`

**Step 4: Run the targeted E2E suite**

Run:
`cd apps/web && bunx playwright test e2e/planning-workflow.e2e-spec.ts e2e/agent-run.e2e-spec.ts`
Expected: PASS

**Step 5: Run repo verification**

Run: `bun run typecheck` Expected: PASS

Run: `bun run lint` Expected: PASS

Run: `bun run format:check` Expected: PASS

Run: `bun test` Expected: PASS

**Step 6: Commit**

```bash
git add apps/web/e2e/planning-workflow.e2e-spec.ts apps/web/e2e/agent-run.e2e-spec.ts apps/web/e2e/helpers/workbench.ts
git commit -m "test: cover structured planning popup and workspace plan tab workflow"
```

---

## Architectural Notes

- The planning popup is an intake surface, not the canonical plan surface.
- The generated plan artifact is the canonical plan surface.
- The workspace plan tab must be a typed virtual tab, not a fake file path.
- `chats.planDraft` should remain as a compatibility mirror until all consumers
  move to `planningSessions.generatedPlan`.
- The user approval point is a single transition:
  `ready_for_review -> accepted`.
- Build execution must reject unaccepted plans.

## Success Criteria

- Planning questions appear in a right-side popup, one at a time.
- Each question supports suggested numbered answers and freeform text.
- Completing intake generates a typed plan artifact persisted in Convex.
- The generated plan opens automatically in the main workspace as a first-class
  tab.
- The user can review and click `Accept and Build`.
- Accepted plans become the execution contract for the build run.
- Planning and build state are inspectable in the review/debug surfaces.
