# Panda Plan Mode Fluent Architecture Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Upgrade Panda's chat panel and mode system so Plan Mode becomes a
guided, structured planning workflow backed by `planningSessions`, with Build
executing approved plan artifacts and Builder remaining the direct expert path.

**Architecture:** Promote `planningSessions` to the canonical planning source of
truth and demote `planDraft` to a compatibility mirror during migration. Replace
prompt-shaped planning with a staged workflow: intake, brainstorm, draft,
review, approve, execute. Keep rollout incremental so the existing chat panel
remains usable while structured planning becomes the default path.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Convex
queries/mutations, Bun test runner, Playwright, Tailwind, Framer Motion.

## Context For The Implementer

Current planning behavior is split across two systems:

- Legacy live path: `chat.planDraft` and `chat.planStatus`
- Newer structured path: `planningSessions.questions`,
  `planningSessions.answers`, `planningSessions.generatedPlan`,
  `planningSessions.status`

The current live flow is centered on these files:

- `apps/web/hooks/useProjectPlanDraft.ts`
- `apps/web/lib/chat/planDraft.ts`
- `apps/web/components/plan/PlanPanel.tsx`
- `apps/web/hooks/useProjectMessageWorkflow.ts`
- `apps/web/lib/agent/prompt-library.ts`

The structured planning backend already exists here:

- `convex/planningSessions.ts`
- `apps/web/lib/planning/types.ts`
- `apps/web/lib/planning/question-engine.ts`

The main page-level orchestrator is:

- `apps/web/app/(dashboard)/projects/[projectId]/page.tsx`

The chat panel surfaces are:

- `apps/web/components/projects/ProjectChatPanel.tsx`
- `apps/web/components/projects/ProjectChatInspector.tsx`
- `apps/web/components/chat/ChatActionBar.tsx`
- `apps/web/components/plan/PlanningIntakePopup.tsx`
- `apps/web/components/plan/PlanPanel.tsx`

The runtime/prompt context seams are:

- `apps/web/lib/agent/prompt-library.ts`
- `apps/web/lib/agent/session-controller.ts`
- `apps/web/hooks/useAgent.ts`
- `apps/web/lib/agent/chat-modes.ts`

## Target Product Semantics

Mode meanings after this refactor:

- `Plan`: clarify, scope, brainstorm, draft, review, approve
- `Build`: execute approved plan with coordination and progress tracking
- `Builder`: direct expert execution with fewer guardrails

Plan Mode defaults to guided intake first:

- always ask 1-3 structured clarification questions for a new planning session
- present suggested answers
- allow freeform override
- only generate the plan after intake is complete

## Migration Rules

1. `planningSessions` becomes the primary planning state immediately.
2. `chat.planDraft` and `chat.planStatus` remain compatibility mirrors until
   Phase 4.
3. New UI should render from structured planning state first, not from raw
   markdown.
4. Do not delete the legacy path until Build can execute from structured
   artifacts.
5. Every phase must ship with tests before moving to the next phase.

---

### Task 1: Lock In The Canonical Planning Contract

**Files:**

- Modify: `apps/web/lib/planning/types.ts`
- Modify: `convex/planningSessions.ts`
- Test: `apps/web/lib/planning/types.test.ts`
- Test: `apps/web/lib/planning/question-engine.test.ts`

**Step 1: Write failing tests for the target structured planning contract**

Add tests covering:

- `GeneratedPlanArtifact` serialization when `markdown` is empty
- stable section ordering by `order`
- acceptance check rendering
- session status transition expectations:
  `intake -> ready_for_review -> accepted -> executing/completed/failed`

Example test shape:

```ts
it('serializes generated plan sections in order', () => {
  const artifact = {
    chatId: 'chat_1',
    sessionId: 'planning_1',
    title: 'Plan title',
    summary: 'Plan summary',
    markdown: '',
    sections: [
      { id: 'b', title: 'Second', content: 'two', order: 20 },
      { id: 'a', title: 'First', content: 'one', order: 10 },
    ],
    acceptanceChecks: ['Run lint'],
    status: 'ready_for_review',
    generatedAt: 1,
  }

  expect(serializeGeneratedPlanArtifact(artifact)).toContain('## First')
  expect(
    serializeGeneratedPlanArtifact(artifact).indexOf('## First')
  ).toBeLessThan(serializeGeneratedPlanArtifact(artifact).indexOf('## Second'))
})
```

**Step 2: Run the focused tests and verify they fail or expose missing
guarantees**

Run:

```bash
bun test apps/web/lib/planning/types.test.ts apps/web/lib/planning/question-engine.test.ts
```

Expected:

- at least one missing assertion or mismatch with the desired contract

**Step 3: Make the contract explicit with minimal type and serializer changes**

Implement only what the tests require:

- ensure `GeneratedPlanArtifact` remains the stable canonical plan object
- ensure serializer behavior is deterministic
- add comments only where transition rules are non-obvious

**Step 4: Re-run tests and verify they pass**

Run:

```bash
bun test apps/web/lib/planning/types.test.ts apps/web/lib/planning/question-engine.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/lib/planning/types.ts convex/planningSessions.ts apps/web/lib/planning/types.test.ts apps/web/lib/planning/question-engine.test.ts
git commit -m "refactor: lock planning artifact contract"
```

---

### Task 2: Create `useProjectPlanningSession` As The New Source Of Truth

**Files:**

- Create: `apps/web/hooks/useProjectPlanningSession.ts`
- Modify: `apps/web/app/(dashboard)/projects/[projectId]/page.tsx`
- Modify: `apps/web/hooks/useProjectPlanDraft.ts`
- Test: `apps/web/hooks/useProjectPlanningSession.test.ts`

**Step 1: Write the failing hook tests**

Cover these behaviors:

- reads active planning session from Convex query data
- exposes current question from session questions/answers
- exposes `canApprove` only when `generatedPlan.status === 'ready_for_review'`
- exposes `canExecute` only when `generatedPlan.status` is
  accepted/executing/failed/partial-compatible
- delegates start/answer/accept/mark execution mutations correctly

Example test shape:

```ts
it('derives the current planning question from unanswered questions', () => {
  const session = {
    status: 'intake',
    questions: [
      {
        id: 'outcome',
        title: 'Outcome',
        prompt: '...',
        suggestions: [],
        allowFreeform: true,
        order: 10,
      },
      {
        id: 'scope',
        title: 'Scope',
        prompt: '...',
        suggestions: [],
        allowFreeform: true,
        order: 20,
      },
    ],
    answers: [
      {
        questionId: 'outcome',
        source: 'freeform',
        freeformValue: 'Ship it',
        answeredAt: 1,
      },
    ],
  }

  expect(getCurrentPlanningQuestion(session)?.id).toBe('scope')
})
```

**Step 2: Run the new hook test file**

Run:

```bash
bun test apps/web/hooks/useProjectPlanningSession.test.ts
```

Expected: FAIL because the hook does not exist

**Step 3: Implement the hook with the smallest useful API**

The hook should expose:

- `session`
- `currentQuestion`
- `generatedPlan`
- `isIntakeActive`
- `isGeneratingPlan`
- `canApprove`
- `canBuild`
- `startIntake(questions)`
- `answerQuestion(...)`
- `acceptPlan()`
- `markExecutionState(...)`
- `clearIntake()`

Do not move all page logic into the hook. Keep orchestration in the page and
move planning-specific state ownership only.

**Step 4: Adapt `useProjectPlanDraft` into a compatibility bridge**

Change it so:

- if there is an active structured plan artifact, that artifact is treated as
  the source for `planDraft`
- architect-message-derived plan extraction is fallback-only
- all new approvals prefer `acceptPlanningSession`

Do not delete this hook yet.

**Step 5: Re-run tests**

Run:

```bash
bun test apps/web/hooks/useProjectPlanningSession.test.ts apps/web/lib/planning/types.test.ts
```

Expected: PASS

**Step 6: Commit**

```bash
git add apps/web/hooks/useProjectPlanningSession.ts apps/web/hooks/useProjectPlanningSession.test.ts apps/web/hooks/useProjectPlanDraft.ts apps/web/app/(dashboard)/projects/[projectId]/page.tsx
git commit -m "refactor: add canonical project planning session hook"
```

---

### Task 3: Wire The Intake UI To Real Planning Sessions

**Files:**

- Modify: `apps/web/components/plan/PlanningIntakePopup.tsx`
- Modify: `apps/web/components/projects/ProjectChatInspector.tsx`
- Modify: `apps/web/app/(dashboard)/projects/[projectId]/page.tsx`
- Test: `apps/web/components/plan/PlanningIntakePopup.test.tsx`

**Step 1: Write failing component tests for session-backed intake**

Cover:

- renders question title/prompt from session data
- submits suggestion answers through callback/mutation adapter
- accepts freeform input
- advances when answers update
- shows generating state when session status is `generating`

Example test shape:

```tsx
it('renders the current session question and suggested answers', () => {
  render(
    <PlanningIntakePopup
      isOpen
      planningSessionId="planning_1"
      session={session}
      onAnswerQuestion={vi.fn()}
      onClose={vi.fn()}
    />
  )

  expect(screen.getByText('Outcome')).toBeInTheDocument()
  expect(
    screen.getByText('1. Ship the smallest viable change')
  ).toBeInTheDocument()
})
```

**Step 2: Run the intake tests**

Run:

```bash
bun test apps/web/components/plan/PlanningIntakePopup.test.tsx
```

Expected: FAIL because the component still uses local-only flow state

**Step 3: Replace local session flow with props backed by Convex state**

Required changes:

- stop generating fake session ids in the component
- remove local `questions` authority
- accept `session`, `currentQuestion`, `onStartIntake`, `onAnswerQuestion`,
  `onClearIntake`
- only keep local UI state for text input, not for the planning model itself

**Step 4: Surface intake directly inside Plan review**

In `ProjectChatInspector.tsx`, keep `PlanningIntakeSurface`, but feed it real
props from `useProjectPlanningSession`.

**Step 5: Re-run tests**

Run:

```bash
bun test apps/web/components/plan/PlanningIntakePopup.test.tsx
```

Expected: PASS

**Step 6: Commit**

```bash
git add apps/web/components/plan/PlanningIntakePopup.tsx apps/web/components/plan/PlanningIntakePopup.test.tsx apps/web/components/projects/ProjectChatInspector.tsx apps/web/app/(dashboard)/projects/[projectId]/page.tsx
git commit -m "feat: back planning intake with live planning sessions"
```

---

### Task 4: Make Guided Intake First-Class In Plan Mode

**Files:**

- Modify: `apps/web/hooks/useProjectMessageWorkflow.ts`
- Modify: `apps/web/app/(dashboard)/projects/[projectId]/page.tsx`
- Modify: `apps/web/components/projects/ProjectChatPanel.tsx`
- Test: `apps/web/hooks/useProjectMessageWorkflow.test.ts`

**Step 1: Write failing workflow tests for Plan Mode intake-first behavior**

Cover:

- sending a new message in `architect` mode starts intake instead of immediately
  generating a draft
- Build and Builder modes still send directly
- repeated architect messages during an active intake append context instead of
  bypassing intake

Example test shape:

```ts
it('starts planning intake before architect draft generation', async () => {
  const startIntake = vi.fn()
  const sendAgentMessage = vi.fn()

  await handleSendMessage('Plan the new dashboard flow', 'architect')

  expect(startIntake).toHaveBeenCalled()
  expect(sendAgentMessage).not.toHaveBeenCalled()
})
```

**Step 2: Run the tests**

Run:

```bash
bun test apps/web/hooks/useProjectMessageWorkflow.test.ts
```

Expected: FAIL because architect mode still behaves like a normal send path

**Step 3: Add architect-mode intake gating**

Minimal behavior:

- on first architect request with no active session, call `startIntake`
- use `buildDefaultPlanningQuestions({ taskSummary: trimmed })` as the initial
  fallback generator
- do not call `sendAgentMessage` until intake is complete and the planner
  transitions to generation

Keep Build and Builder behavior unchanged.

**Step 4: Re-run tests**

Run:

```bash
bun test apps/web/hooks/useProjectMessageWorkflow.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/hooks/useProjectMessageWorkflow.ts apps/web/hooks/useProjectMessageWorkflow.test.ts apps/web/app/(dashboard)/projects/[projectId]/page.tsx apps/web/components/projects/ProjectChatPanel.tsx
git commit -m "feat: gate plan mode behind structured intake"
```

---

### Task 5: Replace Architect Markdown Contract With Structured Planner Output

**Files:**

- Modify: `apps/web/lib/agent/prompt-library.ts`
- Modify: `apps/web/lib/agent/session-controller.ts`
- Modify: `apps/web/hooks/useAgent.ts`
- Test: `apps/web/lib/agent/runtime.plan-mode.test.ts`

**Step 1: Write failing runtime tests for artifact-first planner behavior**

Add or update tests so Plan Mode expects:

- no implementation code output
- planner behavior focused on clarifying, scoping, and drafting
- final plan content can be rendered from structured sections without relying on
  exact static markdown headings

Add a test that allows plan output without exact `## Relevant Files` if the
artifact is still structurally valid.

**Step 2: Run the runtime tests**

Run:

```bash
bun test apps/web/lib/agent/runtime.plan-mode.test.ts
```

Expected: FAIL because tests and prompt still assume the fixed markdown artifact

**Step 3: Simplify the planner persona and add planning phase context**

In `prompt-library.ts`:

- remove the strongest “output exactly these sections” constraints
- replace them with planner-role instructions:
  - gather missing constraints
  - propose trade-offs when relevant
  - avoid implementation
  - return execution-ready planning content

In `session-controller.ts`:

- add planning session context to `PromptContext`
- pass intake answers and current phase into custom instructions or structured
  prompt context

**Step 4: Keep compatibility while shifting authority**

The runtime can still emit markdown, but generation should conceptually target
`GeneratedPlanArtifact` fields.

Do not try to fully convert the runtime to JSON generation in this phase unless
already supported. Keep the prompt simplification minimal and safe.

**Step 5: Re-run tests**

Run:

```bash
bun test apps/web/lib/agent/runtime.plan-mode.test.ts
```

Expected: PASS

**Step 6: Commit**

```bash
git add apps/web/lib/agent/prompt-library.ts apps/web/lib/agent/session-controller.ts apps/web/hooks/useAgent.ts apps/web/lib/agent/runtime.plan-mode.test.ts
git commit -m "refactor: adopt artifact-first planning persona"
```

---

### Task 6: Make Brainstorming A Visible Plan Phase

**Files:**

- Modify: `apps/web/components/projects/ProjectChatPanel.tsx`
- Modify: `apps/web/components/chat/ChatInput.tsx`
- Modify: `apps/web/hooks/useProjectChatSession.ts`
- Modify: `apps/web/lib/chat/brainstorming.ts`
- Test: `apps/web/components/chat/ChatInput.test.tsx`

**Step 1: Write failing UI tests for visible brainstorming controls**

Cover:

- Plan Mode shows a visible brainstorm phase control or status
- Build and Builder do not show it
- changing the brainstorm setting affects planner state sent to runtime

**Step 2: Run the UI tests**

Run:

```bash
bun test apps/web/components/chat/ChatInput.test.tsx
```

Expected: FAIL because the control is not exposed clearly today

**Step 3: Implement the smallest visible phase control**

Recommended UI:

- a Plan-only phase badge or segmented control near the input/header
- label: `Explore options first`
- default enabled in Plan Mode

Do not add a large new settings panel. Keep it local to the chat experience.

**Step 4: Re-run tests**

Run:

```bash
bun test apps/web/components/chat/ChatInput.test.tsx
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/components/projects/ProjectChatPanel.tsx apps/web/components/chat/ChatInput.tsx apps/web/hooks/useProjectChatSession.ts apps/web/lib/chat/brainstorming.ts apps/web/components/chat/ChatInput.test.tsx
git commit -m "feat: expose brainstorming as plan phase control"
```

---

### Task 7: Redesign `PlanPanel` Around Structured Review

**Files:**

- Modify: `apps/web/components/plan/PlanPanel.tsx`
- Modify: `apps/web/components/projects/ProjectChatInspector.tsx`
- Test: `apps/web/components/plan/PlanPanel.test.tsx`

**Step 1: Write failing tests for artifact-first plan review**

Cover:

- renders title, summary, ordered sections, acceptance checks
- supports a structured tab as the default
- keeps markdown preview as secondary/fallback
- shows approval/build state from structured plan status

Example test shape:

```tsx
it('renders ordered plan sections before markdown fallback', () => {
  render(<PlanPanel generatedPlan={artifact} planDraft="" planStatus="awaiting_review" ... />)

  expect(screen.getByText('Goal')).toBeInTheDocument()
  expect(screen.getByText('Acceptance Checks')).toBeInTheDocument()
})
```

**Step 2: Run the test file**

Run:

```bash
bun test apps/web/components/plan/PlanPanel.test.tsx
```

Expected: FAIL because the panel is editor-first and string-first

**Step 3: Implement artifact-first rendering**

Required behavior:

- default tab is `structured`
- `markdown` becomes secondary
- raw text editing is hidden behind an explicit fallback affordance
- use generated sections and checks when `generatedPlan` exists

Do not remove markdown compatibility yet.

**Step 4: Re-run tests**

Run:

```bash
bun test apps/web/components/plan/PlanPanel.test.tsx
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/components/plan/PlanPanel.tsx apps/web/components/plan/PlanPanel.test.tsx apps/web/components/projects/ProjectChatInspector.tsx
git commit -m "feat: render plan review from structured artifacts"
```

---

### Task 8: Unify Mode Semantics Across Labels, Workflow, And Handoff

**Files:**

- Modify: `apps/web/lib/agent/chat-modes.ts`
- Modify: `apps/web/lib/chat/chat-mode-surface.ts`
- Modify: `apps/web/components/chat/ChatActionBar.tsx`
- Modify: `apps/web/components/projects/ProjectChatPanel.tsx`
- Test: `apps/web/lib/chat/chat-mode-surface.test.ts`

**Step 1: Write failing tests for mode presentation and semantics**

Cover:

- Plan is described as clarify/scope/review
- Build is described as coordinated execution
- Builder is described as direct expert execution
- `ask` is no longer mislabeled as Build in surface presentation

**Step 2: Run the tests**

Run:

```bash
bun test apps/web/lib/chat/chat-mode-surface.test.ts
```

Expected: FAIL if current labels/descriptions remain

**Step 3: Fix the mode config and review copy**

In `chat-modes.ts`:

- make `ask` clearly read-only Q&A
- keep `architect` mapped to Plan
- keep `code` mapped to Build
- keep `build` mapped to Builder

In `ChatActionBar.tsx` and `ProjectChatPanel.tsx`:

- align labels and helper text to the new semantics
- avoid ambiguous “Build” wording for unrelated modes

**Step 4: Re-run tests**

Run:

```bash
bun test apps/web/lib/chat/chat-mode-surface.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/lib/agent/chat-modes.ts apps/web/lib/chat/chat-mode-surface.ts apps/web/lib/chat/chat-mode-surface.test.ts apps/web/components/chat/ChatActionBar.tsx apps/web/components/projects/ProjectChatPanel.tsx
git commit -m "refactor: unify chat mode semantics"
```

---

### Task 9: Remove String-Wrapped Build Handoff And Execute From Structured Plans

**Files:**

- Modify: `apps/web/hooks/useProjectMessageWorkflow.ts`
- Modify: `apps/web/lib/chat/planDraft.ts`
- Modify: `apps/web/hooks/useAgent.ts`
- Test: `apps/web/hooks/useProjectMessageWorkflow.test.ts`
- Test: `apps/web/hooks/useAgent.test.ts`

**Step 1: Write failing tests for structured execution handoff**

Cover:

- Build from plan uses `sessionId` / generated artifact context
- `buildApprovedPlanExecutionMessage()` is no longer required for the primary
  path
- `useAgent` receives plan execution context without relying on prose injection

**Step 2: Run the focused tests**

Run:

```bash
bun test apps/web/hooks/useProjectMessageWorkflow.test.ts apps/web/hooks/useAgent.test.ts
```

Expected: FAIL because the current build handoff still wraps the plan in text

**Step 3: Implement a structured handoff path**

Add a typed execution context, for example:

```ts
type ApprovedPlanExecutionContext = {
  sessionId: string
  artifact: GeneratedPlanArtifact
}
```

Use it in:

- `useProjectMessageWorkflow`
- `useAgent`

Keep a fallback compatibility path for legacy plan strings until Phase 4 is
complete.

**Step 4: Re-run tests**

Run:

```bash
bun test apps/web/hooks/useProjectMessageWorkflow.test.ts apps/web/hooks/useAgent.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/hooks/useProjectMessageWorkflow.ts apps/web/lib/chat/planDraft.ts apps/web/hooks/useAgent.ts apps/web/hooks/useProjectMessageWorkflow.test.ts apps/web/hooks/useAgent.test.ts
git commit -m "refactor: execute builds from structured plan context"
```

---

### Task 10: Retire The Legacy Draft-Derivation Path

**Files:**

- Modify: `apps/web/hooks/useProjectPlanDraft.ts`
- Modify: `apps/web/lib/chat/planDraft.ts`
- Modify: `apps/web/app/(dashboard)/projects/[projectId]/page.tsx`
- Test: `apps/web/hooks/useProjectPlanDraft.test.ts`

**Step 1: Write failing tests for compatibility-only draft behavior**

Cover:

- when a structured generated plan exists, `planDraft` mirrors it and does not
  derive from the latest architect assistant message
- architect message extraction is fallback-only when no planning session exists

**Step 2: Run the tests**

Run:

```bash
bun test apps/web/hooks/useProjectPlanDraft.test.ts
```

Expected: FAIL until fallback precedence is corrected

**Step 3: Reduce the hook to a mirror adapter**

Behavior after this step:

- structured planning session is authoritative
- `planDraft` becomes a rendered compatibility string for older surfaces
- architect message parsing is emergency fallback only

Do not delete compatibility fields from Convex schema in this phase.

**Step 4: Re-run tests**

Run:

```bash
bun test apps/web/hooks/useProjectPlanDraft.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/hooks/useProjectPlanDraft.ts apps/web/hooks/useProjectPlanDraft.test.ts apps/web/lib/chat/planDraft.ts apps/web/app/(dashboard)/projects/[projectId]/page.tsx
git commit -m "refactor: demote legacy plan draft path to compatibility layer"
```

---

## Final Verification

After all tasks are complete, run the full repo checks required by `AGENTS.md`.

Run:

```bash
bun run typecheck && bun run lint && bun run format:check && bun test
```

Then, if relevant plan/build UI behavior changed materially, run browser
coverage:

```bash
cd apps/web && bun run test:e2e
```

Expected:

- zero TypeScript errors
- zero lint warnings
- formatting passes
- unit tests pass
- E2E passes for changed chat/planning behavior

## Suggested Feature Flags

If rollout risk is high, add a temporary flag:

- `NEXT_PUBLIC_PLAN_MODE_STRUCTURED_V2=true`

Use it to gate:

- intake-first behavior
- structured review panel default
- structured build handoff

Remove the flag once the legacy plan path is retired.

## Out Of Scope

Do not include these in the first implementation pass unless they become
necessary:

- dynamic LLM-generated intake questions
- cross-chat reusable planning templates
- multi-plan branching history UI
- full schema deletion of `chat.planDraft` compatibility fields
- planner-specific analytics dashboards

## Completion Criteria

This implementation is complete when all of the following are true:

- Plan Mode starts with guided intake
- intake is backed by `planningSessions`, not local component state
- approved plans are represented by `GeneratedPlanArtifact`
- Build executes from structured plan context
- Builder remains the direct expert path
- `planDraft` is no longer the planning source of truth
- the chat panel labels and workflow semantics match the real behavior
