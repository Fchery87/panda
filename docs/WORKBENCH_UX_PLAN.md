# Workbench UI/UX Restructure — Implementation Plan

> **Status:** Complete **Created:** 2026-04-15 **Completed:** 2026-04-16
> **Scope:** `/projects/[id]` workbench page and all dependent components
> **Target:** Reduce god component from 1749→~300 lines, consolidate 21 tabs to
> ~12, establish cross-page design continuity, enforce surface elevation tiers

This is a historical restructure plan. The current workspace contract is the
chat-first IA: chat is the primary session timeline, proof is consolidated into
`Run`, `Changes`, `Context`, and `Preview`, and mobile uses `Work`, `Chat`,
`Proof`, and `Preview` destinations.

---

## Architecture Context

### Current State

```
page.tsx (1749 lines)
  ├── 7 custom hooks (30+ state values from useProjectWorkspaceUi alone)
  ├── 15+ React hooks (useEffect, useState, useMemo, useRef, useCallback)
  ├── 5+ Convex mutations, 6+ queries
  ├── Delivery orchestration (intake → plan → execute → QA → ship)
  ├── Artifact lifecycle (preview, apply, reject, auto-navigate)
  ├── Plan draft lifecycle (edit, save, approve, build)
  ├── Mobile keyboard detection
  └── Manual prop threading to 5+ child components

Panel regions: 4 (left sidebar, center workspace, right panel, bottom dock)
Total tabs: 21 across all regions
```

### Dependency Coupling (Critical Paths)

```
page.tsx
  ├─→ useProjectWorkspaceUi    (30+ state values — files, tabs, panels, mobile)
  ├─→ useProjectChatSession    (12 values — chat, mode, model, provider)
  ├─→ useAgent                 (20+ return values — messages, streaming, spec)
  ├─→ useProjectMessageWorkflow(14 args wired, 4 handlers consumed)
  ├─→ useProjectPlanDraft      (8 args wired, 5 values consumed)
  ├─→ useProjectPlanningSession(1 arg wired, state+actions consumed)
  ├─→ useProjectWorkbenchFiles (8 args — all from useProjectWorkspaceUi)
  └─→ WorkspaceProvider        (context wrapping entire page)
```

The hooks are reasonably self-contained. The coupling is concentrated in
page.tsx acting as a manual state router.

---

## Phase 0 — Foundation (No visual changes)

**Goal:** Extract the god component without changing any pixels.

### 0.1 Extract `useWorkbenchOrchestration`

**File:** `hooks/useWorkbenchOrchestration.ts` (new)

Extract from page.tsx:

- Delivery orchestration (intake → tasks → execution → QA → ship decisions)
  (lines ~382–561, 663–761)
- Plan artifact sync effects (lines ~782–807)
- Pending artifact navigation effects (lines ~988–1030)
- Artifact apply/reject handlers (lines ~1032–1083)

```ts
// hooks/useWorkbenchOrchestration.ts
interface UseWorkbenchOrchestrationArgs {
  projectId: Id<'projects'>
  activeChat: Chat | null
  agent: UseAgentReturn
  planningSession: PlanningSessionReturn
  // delivery mutations
  startDeliveryIntake: Mutation
  createDeliveryTasksFromPlan: Mutation
  acceptDeliveryPlan: Mutation
  // ... etc
}

interface UseWorkbenchOrchestrationReturn {
  // Delivery state
  deliveryProjectSnapshot: DeliverySnapshot | null
  activeDeliveryTask: Task | null
  taskPanelViewModel: TaskViewModel | null
  qaPanelViewModel: QAPanelViewModel | null
  // ... etc
  // Artifact state
  pendingArtifactPreview: WorkspaceArtifactPreview | null
  pendingDiffEntries: DiffFileEntry[]
  pendingChangedFilesCount: number
  // Handlers
  handleApplyPendingArtifact: (id: string) => Promise<void>
  handleRejectPendingArtifact: (id: string) => Promise<void>
}
```

**Acceptance:** All existing behavior preserved. Tests pass. page.tsx drops by
~300 lines.

### 0.2 Extract `useWorkbenchChatState`

**File:** `hooks/useWorkbenchChatState.ts` (new)

Extract from page.tsx:

- Message mapping/merging logic (agent messages ↔ Convex messages) (lines
  ~865–921)
- Run events, progress steps, replay steps (lines ~923–930)
- Chat message derivation (latestUserPrompt, latestAssistantReply,
  inlineRateLimitError) (lines ~934–961)
- Chat inspector state coordination (lines ~1172–1232)
- Mobile unread count tracking (lines ~1103–1118)

```ts
// hooks/useWorkbenchChatState.ts
interface UseWorkbenchChatStateArgs {
  activeChat: Chat | null
  agent: UseAgentReturn
  runEvents: AgentRunEvent[] | undefined
  chatMode: ChatMode
  isMobileLayout: boolean
  mobilePrimaryPanel: string
  // ... refs for bridging
}

interface UseWorkbenchChatStateReturn {
  chatMessages: Message[]
  liveRunSteps: LiveProgressStep[]
  latestUserPrompt: string | null
  latestAssistantReply: string | null
  inlineRateLimitError: InlineRateLimitError | null
  // Inspector
  chatInspectorSurfaceTab: InspectorTab
  openChatInspectorSurface: (tab: InspectorTab) => void
  // Mobile
  mobileUnreadCount: number
  setMobileUnreadCount: (fn: (n: number) => number) => void
}
```

**Acceptance:** Tests pass. Chat behavior unchanged. page.tsx drops by another
~200 lines.

### 0.3 Extract `useWorkbenchPanelState`

**File:** `hooks/useWorkbenchPanelState.ts` (new)

Extract from page.tsx:

- Right panel tab management (openRightPanelTab, chat/plan/review/inspect
  switching) (lines ~1085–1095, 1186–1204)
- Planning intake orchestration (handleStartPlanningIntake) (lines ~1206–1232)
- Chat panel props assembly (lines ~1234–1341) → move to the component that uses
  it
- Right panel content assembly (lines ~1351–1435) → move to the component that
  uses it
- Mobile keyboard detection (lines ~1120–1169)

```ts
// hooks/useWorkbenchPanelState.ts
interface UseWorkbenchPanelStateArgs {
  isMobileLayout: boolean
  isRightPanelOpen: boolean
  setIsRightPanelOpen: (v: boolean | ((p: boolean) => boolean)) => void
  setRightPanelTab: (tab: RightPanelTabId) => void
  setMobilePrimaryPanel: (panel: string) => void
  // ... inspector state
}

interface UseWorkbenchPanelStateReturn {
  openRightPanelTab: (tab: RightPanelTabId) => void
  openChatInspectorSurface: (tab: InspectorTab) => void
  // ... panel coordination
}
```

**Acceptance:** Tests pass. page.tsx should now be ~400–500 lines.

### 0.4 Extract `WorkbenchTopBar` component

**File:** `components/workbench/WorkbenchTopBar.tsx` (new)

Extract the top bar JSX (lines ~1520–1633) into its own component:

```tsx
// components/workbench/WorkbenchTopBar.tsx
interface WorkbenchTopBarProps {
  projectName: string
  projectId: Id<'projects'>
  selectedFilePath: string | null
  files: FileRecord[]
  gitStatus: GitStatus | null
  selectedModel: string
  isAgentRunning: boolean
  healthStatus: HealthStatus
  healthDetail: string
  isRightPanelOpen: boolean
  isFlyoutOpen: boolean
  onToggleFlyout: () => void
  onToggleRightPanel: () => void
  onNewTask: () => void
  onResetWorkspace: () => void
  onOpenShareDialog: () => void
  onRevealInExplorer: (folder: string) => void
  onOpenCommandPalette: () => void
}
```

**Acceptance:** WorkbenchTopBar renders identically. Keyboard shortcuts still
work.

### 0.5 Extract `WorkbenchRightPanel` component

**File:** `components/workbench/WorkbenchRightPanel.tsx` (new)

Extract the right panel composition (lines ~1351–1435) and the chat panel props
assembly:

```tsx
// components/workbench/WorkbenchRightPanel.tsx
interface WorkbenchRightPanelProps {
  projectId: Id<'projects'>
  activeTab: RightPanelTabId
  onTabChange: (tab: RightPanelTabId) => void
  // Chat sub-component props (passed through)
  chatState: WorkbenchChatState
  // Plan/Review/Inspect/Run/Notes sub-component props
  planState: WorkbenchPlanState
  reviewState: WorkbenchReviewState
  // ... etc
}
```

This component internally renders `<RightPanel>` with all tab content.

**Acceptance:** Right panel renders identically. All tab switching works.

### Phase 0 — Completion Gate

- [ ] `page.tsx` is under 400 lines
- [ ] All extracted hooks have TypeScript interfaces
- [ ] `bun run typecheck && bun run lint && bun test` all pass
- [ ] No visual changes — screenshots before/after match
- [ ] All E2E tests pass

---

## Phase 1 — Surface Elevation & Tab Standardization

**Goal:** Establish visual hierarchy and consistency. No structural changes.

### 1.1 Define elevation token map

**File:** `app/globals.css`

Add a comment-enforced elevation contract:

```css
/* ═══ ELEVATION CONTRACT ═══
   surface-1: Chrome (top bar, tab bars, status bar, dock headers, panel headers)
   surface-0: Primary content (editor, chat messages, file tree body)
   surface-2: Hover/selected states, active tab bg
   ═════════════════════════ */
```

No CSS changes needed — tokens already exist. This is documentation +
enforcement.

### 1.2 Fix surface violations

| Component         | Current                | Target               | File                                 |
| ----------------- | ---------------------- | -------------------- | ------------------------------------ |
| FileTabs bar      | `surface-0` (implicit) | `surface-1`          | `components/workbench/FileTabs.tsx`  |
| StatusBar         | No elevation class     | `surface-1 border-t` | `components/workbench/StatusBar.tsx` |
| RightPanel header | `surface-1` (correct)  | Keep                 | —                                    |
| CenterTabBar      | `surface-1` (correct)  | Keep                 | —                                    |
| WorkbenchTopBar   | `surface-1` (correct)  | Keep                 | —                                    |

**Files changed:**

- `components/workbench/FileTabs.tsx` — add `surface-1` to tab bar container
- `components/workbench/StatusBar.tsx` — add `surface-1 border-t border-border`
  to outer div

**Acceptance:** Tab bars, status bar, and top bar all share `surface-1`. Editor
area is `surface-0`. Visual hierarchy is clear.

### 1.3 Standardize tab bar pattern

Create a shared `TabBar` primitive:

**File:** `components/ui/tab-bar.tsx` (new)

```tsx
// Reusable tab bar using the dock-tab pattern from globals.css
interface TabBarProps {
  tabs: Array<{
    id: string
    label: string
    badge?: number
    badgeSeverity?: string
  }>
  activeTab: string
  onTabChange: (id: string) => void
  trailingContent?: ReactNode
  className?: string
}
```

Uses the existing `dock-tab` CSS class. All three tab bar locations
(CenterTabBar, RightPanel, BottomDock) delegate to this.

**Files changed:**

- `components/ui/tab-bar.tsx` — new shared component
- `components/workbench/CenterTabBar.tsx` — delegate to `TabBar`
- `components/panels/RightPanel.tsx` — delegate to `TabBar`
- `components/layout/BottomDock.tsx` — delegate to `TabBar`

**Acceptance:** All three tab bars render identically using shared component.
Active indicator is consistent (bottom border via `dock-tab[data-active]`).

### 1.4 Standardize badge sizing

**File:** `app/globals.css`

Replace `dock-tab-badge`, `status-badge`, and `task-chip` with two shared
utilities:

```css
.badge-sm {
  @apply border-border inline-flex min-w-[16px] items-center justify-center border px-1 py-px font-mono text-[9px] leading-none tabular-nums;
}
.badge-md {
  @apply border-border inline-flex items-center gap-1 border px-1.5 py-0.5 font-mono text-[10px] leading-none tracking-[0.14em] uppercase;
}
```

Update all consumers to use `badge-sm` (inline counts) or `badge-md` (status
pills).

### Phase 1 — Completion Gate

- [ ] Surface elevation contract is documented in globals.css
- [ ] All chrome uses `surface-1`, all content uses `surface-0`
- [ ] Single `TabBar` component used everywhere
- [ ] Badge sizing standardized to 2 sizes
- [ ] `bun run typecheck && bun run lint && bun test` pass
- [ ] Visual regression: no unintended changes

---

## Phase 2 — Dead Tab Removal & Panel Simplification

**Goal:** Remove placeholder tabs, reduce from 21→~14 tabs.

### 2.1 Remove bottom dock placeholder tabs

**Current bottom dock tabs:** Terminal, Problems, Agent Events, Logs, Build

**Remove:** Problems, Logs, Build — all show hardcoded "No X" empty states.

**Files changed:**

- `components/projects/ProjectWorkspaceLayout.tsx` — update `dockTabs` useMemo
  to only include `terminal` and `agent-events`
- `hooks/useProjectWorkspaceUi.ts` — update `BottomDockTab` type if needed

**Remaining bottom dock:** Terminal, Agent Events (2 tabs)

### 2.2 Make right panel "Inspect" tab conditional

The Inspect tab only has content when browser QA is active
(`browserSessionViewModel` is non-null).

**Files changed:**

- `components/panels/RightPanel.tsx` — accept `visibleTabs?: RightPanelTabId[]`
  prop
- `components/workbench/WorkbenchRightPanel.tsx` (from Phase 0) — pass
  `visibleTabs` based on data

**Rule:** Only show a tab if its content is non-empty or if the user has
previously interacted with it.

### 2.3 Remove "Home" center tab

"Home" is shown when no file is selected. But it duplicates the welcome state
already shown in the editor area when no file is open.

**Files changed:**

- `components/workbench/Workbench.tsx` — remove `home` from CENTER_TABS
- `components/workbench/Workbench.tsx` — show `WorkspaceHome` content when
  `effectiveTab === 'editor' && !selectedFile`
- `components/projects/ProjectWorkspaceLayout.tsx` — remove Home from center tab
  handling
- `hooks/useProjectWorkspaceUi.ts` — remove `'home'` from `CenterTabId` union if
  it exists

**Remaining center tabs:** Editor, Diff, Preview (3 tabs)

### 2.4 Tab count after Phase 2

| Region         | Before     | After                                            |
| -------------- | ---------- | ------------------------------------------------ |
| Left sidebar   | 6 sections | 6 sections (unchanged — these are nav, not tabs) |
| Center         | 4 tabs     | 3 tabs (Home removed)                            |
| Right panel    | 6 tabs     | 5 tabs (Inspect conditional)                     |
| Bottom dock    | 5 tabs     | 2 tabs (Problems, Logs, Build removed)           |
| **Total tabs** | **21**     | **~10**                                          |

### Phase 2 — Completion Gate

- [ ] Bottom dock has only Terminal + Agent Events
- [ ] Right panel Inspect tab only shows when browser QA is active
- [ ] Center "Home" tab removed — welcome state shown inline in editor
- [ ] All removed functionality still accessible via other means
- [ ] `bun run typecheck && bun run lint && bun test` pass

---

## Phase 3 — Right Panel Chat-First Restructure

**Goal:** Make chat the primary right-panel surface. Inspector tabs become a
drawer.

### 3.1 Redesign RightPanel layout

**Current:** 6 equal tabs in a horizontal strip.

**Target:**

```
┌─────────────────────────────┐
│ Chat (persistent, top 70%)  │
│ ┌─────────────────────────┐ │
│ │ Messages + input        │ │
│ └─────────────────────────┘ │
├─ Inspector Drawer ──────────┤
│ [Plan][Review][Run][Notes]  │ ← collapsible sub-tabs
│ Inspector content here      │
└─────────────────────────────┘
```

**File:** `components/panels/RightPanel.tsx` (rewrite)

```tsx
interface RightPanelProps {
  chatContent: ReactNode // Always visible
  inspectorContent?: ReactNode // Optional drawer
  inspectorTabs?: InspectorTabDef[]
  activeInspectorTab?: string
  onInspectorTabChange?: (tab: string) => void
  isInspectorOpen?: boolean
  onInspectorToggle?: () => void
}
```

The right panel becomes:

1. **Top section** (flex-1): Chat content — always visible
2. **Divider** with a toggle chevron
3. **Bottom section** (collapsible, default closed): Inspector with sub-tabs
   (Plan, Review, Run, Notes)

### 3.2 Update WorkbenchRightPanel to use new layout

**File:** `components/workbench/WorkbenchRightPanel.tsx` (from Phase 0)

Wire the inspector drawer:

- Chat stays in the top section
- Plan, Review, Run, Notes become inspector sub-tabs
- Inspector opens/closes with a toggle button at the divider

### 3.3 Update all inspector open calls

Anywhere that calls `openRightPanelTab('plan')` etc. should now:

1. Open the right panel (if not open)
2. Open the inspector drawer
3. Switch to the correct inspector sub-tab

**Files changed:**

- `hooks/useWorkbenchPanelState.ts` (from Phase 0)
- `components/chat/ChatActionBar.tsx` — update inspector toggle
- All places that call `openChatInspectorSurface()`

### Phase 3 — Completion Gate

- [ ] Chat is always visible when right panel is open — no tab switch needed
- [ ] Inspector drawer opens/closes cleanly with animation
- [ ] All inspector surfaces (Plan, Review, Run, Notes) accessible from drawer
- [ ] Chat input stays accessible even when inspector is open
- [ ] `bun run typecheck && bun run lint && bun test` pass

---

## Phase 4 — Cross-Page Navigation Continuity

**Goal:** The workbench no longer feels like a different app.

### 4.1 Add theme toggle to workbench top bar

**File:** `components/workbench/WorkbenchTopBar.tsx` (from Phase 0)

Add `<ThemeToggle />` in the right-side controls area (before the user menu).

**File to import:** `components/settings/ThemeToggle.tsx`

### 4.2 Add user menu to workbench top bar

**File:** `components/workbench/WorkbenchTopBar.tsx`

Add `<UserMenu />` in the right-side controls area (last item, matching
DashboardHeader).

**File to import:** `components/auth/UserMenu.tsx`

### 4.3 Strengthen breadcrumb navigation

The existing breadcrumb is functional but tiny. Enhance it:

**File:** `components/workbench/Breadcrumb.tsx`

- Make the project name link (`/projects`) more prominent — add a subtle
  back-arrow icon
- Add `hover:bg-surface-2` on the project link for hover feedback
- Consider adding "Projects" as a prefix label before the project name

### 4.4 Smooth page transition (stretch goal)

**File:** `app/(dashboard)/projects/page.tsx` +
`app/(dashboard)/projects/[projectId]/page.tsx`

Add a `viewTransition` when navigating from project list to workbench:

- Use Next.js `router.push` with View Transitions API
- The project card animates to the top bar breadcrumb
- The dashboard header fades out while the workbench header fades in

This is optional and can be deferred — items 4.1–4.3 are higher impact.

### Phase 4 — Completion Gate

- [ ] Theme toggle visible in workbench top bar
- [ ] User menu (avatar + dropdown) visible in workbench top bar
- [ ] Breadcrumb "Back to Projects" link is prominent with hover state
- [ ] All DashboardHeader features are accessible from workbench
- [ ] `bun run typecheck && bun run lint && bun test` pass

---

## Phase 5 — Banner Consolidation & Top Bar Cleanup

**Goal:** Merge competing banners. Deduplicate top bar and status bar info.

### 5.1 Merge ReviewChangesBanner and AgentCompletionBanner

**Current:** Two separate banners stack between FileTabs and editor.

**Target:** Single `WorkspaceBanner` with state-aware rendering:

```tsx
// components/workbench/WorkspaceBanner.tsx
type BannerState =
  | 'idle'
  | 'agent-running'
  | 'review-pending'
  | 'agent-complete'

interface WorkspaceBannerProps {
  state: BannerState
  changedFilesCount: number
  onReviewChanges: () => void
  onDismiss: () => void
}
```

States:

- `idle`: Hidden
- `agent-running`: "Agent is working... X files changed so far" (subtle, no
  action buttons)
- `review-pending`: "X files with pending changes — Review" (warning color,
  review button)
- `agent-complete`: "Task complete — X files changed — Review Diff | Preview"
  (success color, actions)

**Files changed:**

- `components/workbench/WorkspaceBanner.tsx` — new unified component
- `components/workbench/Workbench.tsx` — replace both banners with single
  `WorkspaceBanner`
- Remove or keep `ReviewChangesBanner.tsx` and `AgentCompletionBanner.tsx` for
  backwards compat

### 5.2 Deduplicate top bar and status bar

**Top bar shows:** health, git branch, model badge, run mode **Status bar
shows:** filename, cursor, language, streaming, agent status, spec, git branch

**Overlap:** git branch and agent/streaming status appear in both.

**Fix:**

- Remove git branch from top bar — StatusBar already shows it
- Remove model badge from top bar — it's shown in ChatInput area
- Top bar focuses on: health indicator, notifications, chat toggle, new task,
  user menu

**Files changed:**

- `components/layout/TopBarControls.tsx` — remove branch chip and model badge
- `components/workbench/WorkbenchTopBar.tsx` — update props accordingly
- `hooks/useWorkbenchOrchestration.ts` or `page.tsx` — stop passing branch/model
  to top bar

### Phase 5 — Completion Gate

- [ ] Single banner replaces two competing banners
- [ ] Banner states render correctly for all 4 states
- [ ] Top bar no longer shows git branch or model
- [ ] StatusBar is the single source for branch + agent status
- [ ] `bun run typecheck && bun run lint && bun test` pass

---

## Phase 6 — Mobile & Onboarding Polish

**Goal:** Fix mobile sidebar access, improve first-run experience.

### 6.1 Mobile sidebar access

**Current:** Mobile hides the sidebar completely. Users see Work/Chat/Review
buttons only.

**Fix:** Add a hamburger menu to the mobile top bar that opens a bottom-sheet
with the sidebar sections (Files, Agents, Search, Git, Deploy, Tasks).

**Files:**

- `components/workbench/WorkbenchTopBar.tsx` — add hamburger button (mobile
  only)
- `components/sidebar/MobileSidebarSheet.tsx` — new bottom-sheet component
- Use `@/components/ui/sheet` (shadcn) as the sheet primitive

### 6.2 Workbench first-run experience

**File:** `components/workbench/WorkspaceHome.tsx`

Enhance the empty workspace state:

- Add a "Get started" card with 3 suggested actions (create file, start chat,
  import project)
- Use dot-grid background for visual interest
- Add subtle animation on mount

### 6.3 Loading state personality

**File:** `app/(dashboard)/projects/[projectId]/page.tsx` (loading section
~lines 1466–1478)

Replace basic spinner with:

- Dot-grid background
- Panda logo animation
- Contextual loading message ("Loading files...", "Connecting to agent...")

### Phase 6 — Completion Gate

- [ ] Mobile hamburger opens sidebar bottom-sheet
- [ ] All sidebar sections accessible on mobile
- [ ] WorkspaceHome has guided first-run card
- [ ] Loading state has dot-grid + logo animation
- [ ] `bun run typecheck && bun run lint && bun test` pass

---

## Execution Order & Risk Matrix

```
Phase 0 ──→ Phase 1 ──→ Phase 2 ──→ Phase 3 ──→ Phase 4 ──→ Phase 5 ──→ Phase 6
(Foundation) (Tokens)    (Tabs)      (Right     (Nav       (Banners)   (Polish)
                                      Panel)     Continuity)
  ~3-4 days   ~1 day      ~1 day      ~2 days    ~1 day     ~1 day      ~1-2 days
```

| Phase | Risk                                | Revert Complexity              | Dependencies                            |
| ----- | ----------------------------------- | ------------------------------ | --------------------------------------- |
| 0     | Medium — must preserve all behavior | High — many files changed      | None                                    |
| 1     | Low — CSS/class changes only        | Low — revert CSS classes       | Phase 0 (for TabBar refactor)           |
| 2     | Low — removing dead code            | Low — restore tab definitions  | None (can run in parallel with Phase 1) |
| 3     | Medium — UI restructure             | Medium — revert RightPanel     | Phase 0 (for WorkbenchRightPanel)       |
| 4     | Low — additive changes              | Low — remove added components  | Phase 0 (for WorkbenchTopBar)           |
| 5     | Low — banner merge                  | Low — restore two banners      | Phase 0, Phase 1                        |
| 6     | Low — mobile/polish                 | Low — mobile sheet is additive | Phase 0 (for WorkbenchTopBar)           |

**Phases 1 and 2 can run in parallel.** **Phases 4, 5, 6 can run in parallel
after Phase 0.** **Phase 3 should be sequential after Phase 2 (depends on
reduced tab count).**

---

## Testing Strategy

### After Every Phase

```bash
bun run typecheck && bun run lint && bun run format:check && bun test
```

### Phase 0 Specific

- Compare screenshot of workbench before/after extraction — must be
  pixel-identical
- Run all E2E tests in `apps/web/e2e/`
- Manual test: all keyboard shortcuts still work (Ctrl+K, Ctrl+I, Ctrl+J,
  Ctrl+L, Ctrl+/)

### Phase 1 Specific

- Visual regression: tab bars render consistently
- Accessibility: tab bars have correct `aria-pressed` attributes

### Phase 2 Specific

- Verify Terminal still works after removing other bottom dock tabs
- Verify Agent Events panel still accessible
- Verify WorkspaceHome renders correctly when no file selected (replaces Home
  tab)

### Phase 3 Specific

- Chat input is always accessible when right panel is open
- Inspector drawer opens/closes without layout shift
- All existing inspector surfaces render correctly

### Phase 4 Specific

- Theme toggle works from workbench top bar
- User menu shows same options as DashboardHeader
- Breadcrumb back-navigation works

---

## File Creation Summary

| New Files                                      | Phase | Purpose                        |
| ---------------------------------------------- | ----- | ------------------------------ |
| `hooks/useWorkbenchOrchestration.ts`           | 0     | Delivery + artifact lifecycle  |
| `hooks/useWorkbenchChatState.ts`               | 0     | Chat message + inspector state |
| `hooks/useWorkbenchPanelState.ts`              | 0     | Panel coordination             |
| `components/workbench/WorkbenchTopBar.tsx`     | 0     | Top bar extraction             |
| `components/workbench/WorkbenchRightPanel.tsx` | 0     | Right panel composition        |
| `components/ui/tab-bar.tsx`                    | 1     | Shared tab bar primitive       |
| `components/workbench/WorkspaceBanner.tsx`     | 5     | Unified status banner          |
| `components/sidebar/MobileSidebarSheet.tsx`    | 6     | Mobile sidebar access          |

| Modified Files               | Phase | Change                                 |
| ---------------------------- | ----- | -------------------------------------- |
| `page.tsx`                   | 0     | Decompose from 1749→~300 lines         |
| `globals.css`                | 1     | Badge standardization                  |
| `FileTabs.tsx`               | 1     | Surface elevation fix                  |
| `StatusBar.tsx`              | 1     | Surface elevation fix                  |
| `CenterTabBar.tsx`           | 1     | Delegate to shared TabBar              |
| `RightPanel.tsx`             | 1+3   | Shared TabBar → chat-first restructure |
| `BottomDock.tsx`             | 1     | Delegate to shared TabBar              |
| `ProjectWorkspaceLayout.tsx` | 2     | Remove dead dock tabs                  |
| `Workbench.tsx`              | 2     | Remove Home center tab                 |
| `WorkspaceHome.tsx`          | 2+6   | Inline in editor, enhance onboarding   |
| `TopBarControls.tsx`         | 5     | Remove duplicated info                 |
| `Breadcrumb.tsx`             | 4     | Strengthen back-navigation             |

---

## Success Metrics

| Metric                             | Current                                              | Target          |
| ---------------------------------- | ---------------------------------------------------- | --------------- |
| `page.tsx` line count              | 1749                                                 | < 400           |
| Total tab count                    | 21                                                   | ~10             |
| Tab bar implementations            | 3 (different patterns)                               | 1 (shared)      |
| Surface elevation violations       | 3+                                                   | 0               |
| Dashboard→Workbench nav continuity | Missing theme toggle, user menu, prominent back link | Full continuity |
| Competing banners                  | 2 simultaneous                                       | 1 state-aware   |
| Dead placeholder tabs              | 4 (Problems, Logs, Build, Inspect)                   | 0               |
| Mobile sidebar access              | None                                                 | Bottom-sheet    |
