# Panda Workbench Modernization Brief

> Status: historical; superseded for current workspace behavior by the
> chat-first workspace IA  
> Date: 2026-04-22  
> Scope: theme, shell hierarchy, and layout modernization for the active Panda
> workbench after cleanup/refactor convergence.

The current implemented workspace follows the chat-first IA documented in
`docs/plans/2026-04-26-chat-first-workspace-ia.md`. Keep this brief as product
and visual strategy context, not as the active shell contract.

## Executive Direction

Panda should remain an **AI coding workbench**.

The modernization goal is not to turn Panda into project-management software or
a delivery dashboard. The goal is to make Panda feel like a **premium, focused,
operational workbench** where users can move confidently from request to review
to approval to execution to inspection.

Panda's current internal architecture is cleaner than before, but the visible
product still emphasizes panes and tools before it emphasizes objective, state,
and next action. This brief shifts the shell to an **outcome-first workbench**
while preserving the core single-project browser workflow.

## Product Position

Panda should be understood as:

- a browser-native AI coding workbench
- for technically fluent users working inside one active project context
- with structured planning, explicit approval, resumable execution, and clear
  inspection surfaces

Panda should not read as:

- a generic AI IDE clone
- an enterprise PM dashboard
- a noisy command center full of decorative telemetry

## Users

The design must work for all three core user groups:

1. Solo builders shipping quickly
2. Small teams reviewing and coordinating work
3. Power users managing multiple runs or tasks inside one project

Shared user need:

> Understand the current state of work quickly, then move confidently into the
> next action.

## Tonal Goals

The interface should feel:

- focused and operational
- calm and high-trust
- premium technical

This means:

- no gimmicky AI theatrics
- no bureaucratic workflow chrome
- no visual noise masquerading as sophistication

## Primary UX Goal

At a glance, Panda should answer:

1. What am I working on?
2. What state is it in?
3. What is Panda doing right now?
4. Does Panda need my approval?
5. What changed?
6. What should I do next?

## Modernization Thesis

Panda should evolve from a **tool-first shell** into an **outcome-first
workbench**.

This does not remove the current workbench model. It reframes it.

The editor, chat, terminal, diff, preview, and review surfaces remain. The
change is that the shell should foreground:

- active objective
- current mode and status
- review and approval state
- changed work
- next recommended action

## Target Interaction Loop

The visible user loop should be:

1. Define or confirm the task
2. Review the plan
3. Approve execution
4. Watch progress
5. Inspect results
6. Continue, revise, or finish

The UI should teach this loop implicitly through hierarchy and state
presentation.

## Shell Strategy

### 1. Persistent Objective and State Layer

Panda should show a persistent top-level work-state layer, but only when a plan,
run, or task is active.

Decision:

- Show `Current Objective` only when a plan/run/task is active.
- Keep the shell lighter during casual exploration or freeform chat.

This balances clarity with restraint.

### 2. Session Header

The top shell should communicate:

- project identity
- active objective or task title
- current mode
- run state
- approval state
- primary next action

The header should feel like a structured instrument panel, not a generic app
toolbar.

### 3. Primary Canvas

The center workspace remains the main work surface and can continue to show:

- editor
- plan artifact
- diff
- preview

But it should be framed by the current operational context, not left to stand
alone as a neutral tabbed area.

### 4. Operational Rail

The right-side review/inspection model should be treated as one operational rail
conceptually, even if it still uses tabs internally.

Priority order:

1. Plan
2. Run
3. Review
4. Memory
5. Evals

Its role is to help users validate, approve, and understand consequences.

### 5. Tooling Layer

The file tree, search, history, terminal, and agent-event surfaces remain
important, but they should feel like supporting structure rather than the
headline identity of the app.

## Layout Plan

### Top Bar Modernization

Current issue:

- strong utility affordances
- weak expression of active mission and state

Target:

- foreground project + current objective
- show mode, run status, and approval state in one structured band
- present one clear next action

Suggested information priority:

1. Project name
2. Current objective
3. Status chips for plan/run/approval
4. Primary action
5. Secondary controls

### Workspace Home Modernization

Current issue:

- useful but reads like an internal dashboard
- tool counts outweigh operational narrative

Target:

- transform into a mission-control home for the current project

Primary sections:

1. Current Objective
2. Current State
3. Needs Your Attention
4. Latest Activity
5. What Changed
6. Continue Working

Secondary sections:

- recent files
- preview/runtime availability
- active run summary

### Canvas Context Strip

Add a compact contextual strip above the main canvas when relevant.

Examples:

- `Plan ready for review`
- `Executing step 2 of 5`
- `Awaiting approval`
- `3 files changed`
- `Run can be resumed`

This should be calm and compact, never noisy.

### Right Rail Consolidation

Reduce the feeling that state is scattered across multiple drawers, inspectors,
and tabs.

The user should experience the right side as:

- the place to review state
- inspect progress
- approve work
- inspect consequences

## Theme Direction

Keep:

- sharp corners
- monospace labels and UI discipline
- structural clarity
- explicit borders and layered surfaces

Refine:

- spacing rhythm
- hierarchy contrast
- tone of dark surfaces
- repeated card/grid patterns
- overuse of equal-weight panels

Visual character target:

- serious instrument
- quiet confidence
- premium technical restraint

## Visual Rules

1. Prioritize strips, ledgers, and structured sections over repetitive metric
   cards.
2. Use color for operational meaning, not decoration.
3. Avoid pure black surfaces; use subtly tinted dark neutrals instead.
4. Keep dense information readable through stronger hierarchy, not added
   ornament.
5. Avoid generic AI IDE signifiers like glow, glass, neon gradients, or
   decorative telemetry.

## State Design

### Default Active Work

- user sees objective, current mode, latest activity, and next action

### Empty Workspace

- should feel guided and confident, not sparse or toy-like

### Planning

- clearly review-oriented
- approval and execution implications are obvious

### Running

- live feedback is calm, legible, and not over-animated

### Approval Required

- strong clarity, low panic

### Completed

- changed files, result summary, and next step are immediately visible

### Error / Recovery

- communicate control, recoverability, and what to do next

## Content and Copy Priorities

Recommended persistent labels:

- `Current Objective`
- `Plan Status`
- `Execution Status`
- `Pending Review`
- `Changed Files`
- `Resume Run`
- `Next Step`

Copy style:

- concise
- calm
- precise
- low-hype
- technically literate

Avoid:

- vague dashboard nouns
- theatrical AI language
- copy that repeats visible UI state without adding meaning

## Highest-Impact First Slice

If implementation starts in narrow phases, the best first slice is:

1. Redesign `WorkbenchTopBar`
2. Redesign `WorkspaceHome`
3. Add a persistent objective/status layer to the project shell when
   plan/run/task state is active

This is the fastest path to changing Panda's posture without rewriting the
shell.

## Likely Implementation Areas

- `apps/web/components/projects/ProjectWorkspaceShell.tsx`
- `apps/web/components/projects/ProjectWorkspaceLayout.tsx`
- `apps/web/components/workbench/WorkbenchTopBar.tsx`
- `apps/web/components/workbench/WorkspaceHome.tsx`
- `apps/web/components/workbench/WorkspaceBanner.tsx`
- `apps/web/components/workbench/WorkbenchRightPanel.tsx`
- `apps/web/components/projects/ProjectChatPanel.tsx`
- `apps/web/components/projects/ProjectChatInspector.tsx`
- `apps/web/components/panels/RightPanel.tsx`
- `apps/web/app/page.tsx`
- `apps/web/app/education/page.tsx`

## Rollout Phases

### Phase 1: Shell Framing

- add active objective/state framing
- upgrade header hierarchy
- no deep behavior changes

### Phase 2: Workspace Home

- replace dashboard-like metric emphasis with project mission-control emphasis

### Phase 3: Operational Rail

- simplify and clarify review/run/plan state discoverability

### Phase 4: Theme Refinement

- improve spacing, surface tone, section rhythm, and status styling

### Phase 5: Product Framing Alignment

- update landing/education copy to match the modernized workbench posture

## Success Criteria

The modernization is successful when:

- Panda still clearly reads as an AI coding workbench
- the shell foregrounds objective and state over pane taxonomy
- review and approval feel easier to understand
- the app feels calmer and more premium without becoming sterile
- the UI avoids both generic AI IDE sameness and enterprise workflow bloat

## Final Recommendation

Do not redesign Panda into a new category.

Refine Panda into the strongest version of what it already is:

> a calm, premium, operational AI coding workbench with explicit review and
> execution discipline.
