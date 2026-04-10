# Agent Command Center Phase Completion Plan

Close the remaining gaps from
`~/.gemini/antigravity/brain/74f68929-3e7c-43e0-a19b-22e28f24a615/implementation_plan.md.resolved`
by finishing every item previously classified as `Partial` or `Not started`.

This follow-up plan is intentionally scoped to incomplete work only. Items
already marked `Done` are omitted unless they must be touched to complete an
unfinished dependency.

## Scope Summary

### Incomplete Areas

1. Phase 1

- `SidebarRail.tsx` exact rail semantics are only partially aligned with the
  target architecture
- `SourceControlPane.tsx` exists but is missing the full command-center action
  surface

2. Phase 2

- `page.tsx` top bar is partially restructured but missing the prominent center
  command trigger and stronger real-data wiring
- `WorkspaceHealthIndicator.tsx` does not exist

3. Phase 3

- `Workbench.tsx` still owns sidebar concerns and does not yet match the
  intended pure center-surface role
- `CenterTabBar.tsx` does not exist

4. Phase 4

- `ReviewPanel.tsx` was not converted to the planned focused contextual panel
  model
- `ProjectWorkspaceLayout.tsx` is only partially aligned with the target
  four-zone hierarchy

## Goals

1. Finish all incomplete layout and orchestration work without regressing the
   currently green typecheck, lint, format, and test suite.
2. Preserve existing business logic and backend behavior.
3. Minimize churn by converging current implementations toward the target
   architecture instead of rewriting working flows unnecessarily.

---

## Phase 1A — Left Rail Semantic Completion

### [MODIFY] `apps/web/components/sidebar/SidebarRail.tsx`

Complete the rail so it matches the target architecture more precisely.

#### Tasks

1. Split the current combined `files`/home behavior into clearer rail semantics:

- Keep a `Home` affordance visually distinct from content panes
- Preserve the `Projects` navigation link
- Ensure the remaining rail actions clearly represent `Agents`, `Search`, `Git`,
  `Deploy`, and `Tasks`

2. Decide and implement one of these two approaches explicitly:

- Preferred: keep `SidebarSection` as-is but add a dedicated `Home` action via
  `onHomeClick` that activates the center `home` tab without overloading the
  left pane section model
- Alternative: extend `SidebarSection` to include a true `home` section if that
  results in simpler composition with `SidebarFlyout`

3. Ensure visual hierarchy matches the redesign intent:

- `Home` is clearly the workspace entry point
- `Projects` remains a route-level escape hatch
- `Settings` stays bottom anchored

4. Remove no-longer-needed legacy affordance wording such as `Home & Files`

#### Verification

1. Rail renders with distinct `Home`, `Projects`, `Agents`, `Search`, `Git`,
   `Deploy`, and `Settings` affordances
2. Clicking `Home` opens the workspace home surface without ambiguous flyout
   behavior
3. Existing keyboard and tooltip affordances still work

---

## Phase 1B — Source Control Pane Completion

### [MODIFY] `apps/web/components/sidebar/SourceControlPane.tsx`

Finish the source-control pane so it behaves like an orchestration surface
instead of a thin git status view.

#### Tasks

1. Add the missing primary actions called for by the redesign:

- `Commit`
- `Push`
- `Revert`
- `Create PR`

2. Keep the current staged/unstaged/untracked sections, but improve the header
   to include:

- current branch display
- branch switcher trigger or placeholder affordance
- changed-file summary

3. If underlying git hooks are not yet available for some actions, implement
   disabled affordances with explicit labels instead of omitting them

4. Preserve existing stage/unstage/commit behavior

#### Verification

1. Source control pane exposes all planned primary actions
2. No existing git flows regress
3. Empty, loading, and error states still render correctly

---

## Phase 2A — Top Bar Completion

### [MODIFY] `apps/web/app/(dashboard)/projects/[projectId]/page.tsx`

Finish the unified top bar so it matches the redesign intent rather than the
current partially upgraded state.

#### Tasks

1. Add the planned center-zone global command/search trigger:

- visually prominent
- keyboard hint visible (`⌘K` / `Ctrl+K` depending on platform conventions
  already used in-app)
- routes through the existing command palette/open state rather than introducing
  parallel logic

2. Improve right-zone data wiring:

- feed actual branch info from `useGit` if available in this page layer
- feed actual health status rather than hardcoding `ready`
- keep `New Task` and right-panel chat toggle behavior intact

3. Preserve breadcrumb behavior and sidebar toggle behavior

4. Ensure the top bar still works at compact desktop widths and mobile
   breakpoints

#### Verification

1. Top bar now has left, center, and right zones matching the spec
2. Command trigger opens the existing command palette
3. Branch/model/health display real state where available

### [NEW] `apps/web/components/layout/WorkspaceHealthIndicator.tsx`

Extract the health-dot logic from `TopBarControls.tsx` into the dedicated
component planned in the original redesign.

#### Tasks

1. Create a small, focused health indicator component that accepts structured
   status props
2. Support at minimum:

- ready
- issues
- error

3. Allow optional detail text or tooltip content for:

- dev server status
- agent session status
- repo cleanliness or fallback summary

4. Replace inline health-dot rendering inside `TopBarControls.tsx`

#### Verification

1. No visual regression in the top bar
2. `TopBarControls` becomes simpler and more composable

---

## Phase 3A — Center Surface Ownership Cleanup

### [NEW] `apps/web/components/workbench/CenterTabBar.tsx`

Extract the center tab strip into its own component.

#### Tasks

1. Build a reusable `CenterTabBar` that supports:

- persistent tabs: `Home`, `Editor`
- special tabs: `Diff`, `Preview`, `Logs`, `Tests`
- optional badges, especially for `Diff`
- active tab styling consistent with the brutalist design system

2. Keep API minimal:

- current active tab
- available tabs
- optional counts
- `onTabChange`

3. Ensure dynamic or future tab extensibility without over-configuring the API

#### Verification

1. `Workbench.tsx` no longer contains duplicated inline tab-strip markup
2. Existing tab switching behavior remains unchanged

### [MODIFY] `apps/web/components/workbench/Workbench.tsx`

Converge `Workbench` toward the intended pure center-surface renderer.

#### Tasks

1. Remove ownership of sidebar rail/flyout rendering from desktop `Workbench`

- `ProjectWorkspaceLayout` should own left rail composition
- `Workbench` should render center content only

2. Replace inline center tab UI with `CenterTabBar`

3. Preserve current working behaviors:

- `WorkspaceHome`
- editor rendering
- plan artifact rendering
- diff tab rendering
- pending artifact overlays
- SSR-safe selected-file tab derivation

4. Remove now-unused sidebar imports and workspace-sidebar coupling where
   possible

5. Keep mobile behavior working, but prefer shared center-surface composition
   over duplicated tab logic where feasible

#### Verification

1. `Workbench` renders center content only
2. Desktop sidebar rendering still works via outer layout composition
3. Existing tests for workbench, plan tab, shortcuts, and integration remain
   green

---

## Phase 4A — Context Panel Convergence

### [MODIFY] `apps/web/components/review/ReviewPanel.tsx`

Resolve the mismatch between the old review panel and the new focused
right-context model.

#### Tasks

1. Choose one path and execute it consistently:

- Preferred: deprecate `ReviewPanel.tsx` usage and migrate remaining call sites
  to `RightPanel`
- Alternative: refactor `ReviewPanel.tsx` so it matches the `RightPanel` tab
  model and then consolidate the two components

2. Target focused contextual tabs only:

- `Chat`
- `Plan`
- `Review Notes`
- `Inspect`
- `Run Details`
- `Comments`

3. Remove or relocate legacy tabs that do not belong in the right contextual
   rail:

- `Tasks`
- `Artifacts`
- `Memory`
- `Evals`
- `QA`
- `State`
- `Browser`
- `Activity`
- `Decisions`

4. Ensure no duplicate right-panel paradigms remain in the app after this
   cleanup

#### Verification

1. Only one right-panel mental model remains in the codebase
2. Tabs shown to users are the focused set from the redesign

---

## Phase 4B — Project Workspace Layout Final Alignment

### [MODIFY] `apps/web/components/projects/ProjectWorkspaceLayout.tsx`

Finish the layout hierarchy so it matches the redesign structurally and
semantically.

#### Tasks

1. Move desktop left rail ownership fully into `ProjectWorkspaceLayout`

- render `SidebarRail`
- render `SidebarFlyout`
- render left-pane contents there rather than inside `Workbench`

2. Keep the main area split as:

- center surface
- right contextual panel
- bottom dock

3. Remove remaining legacy compatibility props or dead bridging where safe:

- old `isChatPanelOpen` compatibility path
- unused fallback props related to pre-redesign panel ownership

4. Confirm the right panel stays optional/collapsible and the center remains
   visually dominant

5. Ensure the dock and right panel persistence keys are explicit and intentional

6. Revisit mobile composition and make sure it still presents the best available
   reduced layout without depending on desktop assumptions

#### Verification

1. Left rail is no longer rendered inside `Workbench`
2. The desktop layout matches the intended four-zone ownership model
3. Existing layout persistence and integration tests are updated and passing

---

## Optional Phase 4C — Right Panel Naming Cleanup

### [MODIFY] `apps/web/components/panels/RightPanel.tsx`

This is optional but recommended if Phase 4A results in full adoption of
`RightPanel`.

#### Tasks

1. Audit whether `RightPanel` fully represents the intended contextual panel
2. If yes, update naming/comments/docs to reflect that this is the canonical
   context panel
3. Remove stale references to prior review/chat panel terminology where it
   confuses the ownership model

---

## Implementation Order

Recommended order to minimize churn:

1. Phase 2A
2. Phase 3A
3. Phase 4B
4. Phase 4A
5. Phase 1A
6. Phase 1B

Reasoning:

- Finish top-bar and center-surface ownership first so layout composition is
  stable
- Then converge the outer workspace layout
- Then polish the rail semantics and source-control surface against the final
  layout ownership model

---

## Verification Plan

### Automated

```bash
bun run typecheck
bun run lint
bun run format:check
bun test
```

### Targeted UI Verification

1. Desktop workspace

- Left rail is rendered once and owned by the outer workspace layout
- Home action opens the workspace home center surface
- Projects link navigates correctly

2. Top bar

- Prominent command trigger is visible and opens the command palette
- Health indicator is rendered via `WorkspaceHealthIndicator`
- New Task and chat toggle still work

3. Center surface

- `CenterTabBar` renders and handles `Home`, `Editor`, `Diff`, `Preview`
- Opening a file lands on editor reliably in both SSR and client flows

4. Right contextual panel

- Only the focused contextual tabs remain
- Chat, plan, inspect, and run-detail switching still works

5. Bottom dock

- `Ctrl+J` still toggles it
- Dock remains collapsed by default and opens predictably

6. Source control

- Branch and file state render correctly
- Missing actions are either implemented or clearly disabled with no broken
  handlers

### Manual Acceptance Criteria

1. No duplicate sidebar ownership remains between `Workbench` and
   `ProjectWorkspaceLayout`
2. No duplicate right-panel paradigms remain between `ReviewPanel` and
   `RightPanel`
3. Center surface clearly dominates the page hierarchy
4. The app still feels like the same product, just with the redesign gaps closed

---

## Deliverable Definition

This follow-up plan is complete when:

1. Every item previously marked `Partial` or `Not started` is reclassified to
   `Done`
2. Full repo verification stays green
3. The workspace ownership model is clear:

- `ProjectWorkspaceLayout` owns page composition
- `Workbench` owns center content
- `RightPanel` owns contextual right-rail content
- `BottomDock` owns lower execution surfaces
