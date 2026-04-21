# Workspace Architecture Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Transform Panda from a feature-fragmented project into a cohesive AI
oversight workbench by (A) replacing the 889-line god page with a Zustand store
graph, (B) unifying the parallel Plan + Spec approval systems into one pipeline,
and (C) bridging the chat panel to the workbench so the agent automatically sees
what the user is looking at.

**Architecture:**

- **State graph:** Domain-sliced Zustand stores (`workspaceUi`, `editorContext`,
  `chatSession`, `agentRuntime`, `planApproval`) replace prop-drilling. The
  project page mounts one `WorkspaceStoresProvider` then renders
  `ProjectWorkspaceShell` — no prop builders, no 65-prop components.
- **Unified plan pipeline:** `planningSessions` becomes the single approval
  surface. `specifications` is demoted to a verification-only artifact attached
  to a planning session (no separate UI/approval gate). One status lifecycle,
  one set of approval buttons, one persistence path.
- **Editor context bridge:** New `editorContextStore` exposes `activeFile`,
  `selection`, `openTabs`. `useAgent.sendMessage` reads from the store and
  prepends an "Editor Context" block to every prompt automatically (still
  strippable per-message via a flag).

**Tech Stack:** Next.js 15 (App Router), Convex 1.19, Zustand (already a dep),
TypeScript, Bun test, React Testing Library, Playwright.

**Out of scope (deferred to follow-up plans):**

- Diff/review tab redesign (Phase 2)
- Server-side agent execution via Convex actions (Phase 2)
- Runtime adapter consolidation (`runtime.ts` → harness directly) (Phase 3)
- Schema cleanup / table consolidation (Phase 3)

---

## Phase 0: Preflight

### Task 0.1: Capture baseline metrics

**Files:**

- Read-only: `apps/web/app/(dashboard)/projects/[projectId]/page.tsx` (currently
  889 lines)
- Read-only: `apps/web/hooks/useProjectWorkspaceUi.ts`
- Read-only: `apps/web/components/projects/ProjectChatPanel.tsx`
- Read-only: `apps/web/components/workbench/WorkbenchRightPanel.tsx`

**Step 1: Record baseline numbers**

Run these and paste the output into a new file
`docs/plans/2026-04-19-baseline.md`:

```bash
wc -l "apps/web/app/(dashboard)/projects/[projectId]/page.tsx"
wc -l apps/web/hooks/useProjectWorkspaceUi.ts
wc -l apps/web/components/projects/ProjectChatPanel.tsx
wc -l apps/web/components/workbench/WorkbenchRightPanel.tsx
grep -c "^  " apps/web/app/\(dashboard\)/projects/\[projectId\]/page.tsx | head -1
```

Expected: page.tsx ≈ 889 lines. We'll use these numbers to verify the refactor
actually reduced complexity (target: page.tsx ≤ 100 lines).

**Step 2: Run the existing test suite to confirm green baseline**

Run: `cd apps/web && bun test hooks lib components` Expected: PASS (all existing
tests). If anything is red on `master`, stop and surface it before refactoring.

**Step 3: Commit baseline doc**

```bash
git add docs/plans/2026-04-19-baseline.md docs/plans/2026-04-19-workspace-architecture-overhaul.md
git commit -m "docs: baseline metrics for workspace architecture overhaul"
```

---

## Phase 1A — Workspace State Machine

**Strategy:** Build the new stores alongside the existing hooks. Do not delete
the old hooks until each consumer has been migrated and tests pass. Final task
in this phase deletes the dead code.

### Task 1A.1: Create `workspaceUiStore` (panels, tabs, layout — non-persistent UI)

**Files:**

- Create: `apps/web/stores/workspaceUiStore.ts`
- Create: `apps/web/stores/workspaceUiStore.test.ts`

**Step 1: Write the failing test**

```ts
// apps/web/stores/workspaceUiStore.test.ts
import { describe, expect, test, beforeEach } from 'bun:test'
import { useWorkspaceUiStore } from './workspaceUiStore'

describe('workspaceUiStore', () => {
  beforeEach(() => {
    useWorkspaceUiStore.getState().reset()
  })

  test('opens and closes the right panel', () => {
    const s = useWorkspaceUiStore.getState()
    expect(s.isRightPanelOpen).toBe(false)
    s.setRightPanelOpen(true)
    expect(useWorkspaceUiStore.getState().isRightPanelOpen).toBe(true)
  })

  test('right panel tab change implicitly opens the panel', () => {
    const s = useWorkspaceUiStore.getState()
    s.openRightPanelTab('plan')
    const next = useWorkspaceUiStore.getState()
    expect(next.isRightPanelOpen).toBe(true)
    expect(next.rightPanelTab).toBe('plan')
  })

  test('bottom dock toggle is independent of right panel', () => {
    const s = useWorkspaceUiStore.getState()
    s.setBottomDockOpen(true)
    expect(useWorkspaceUiStore.getState().isBottomDockOpen).toBe(true)
    expect(useWorkspaceUiStore.getState().isRightPanelOpen).toBe(false)
  })

  test('reset returns all state to defaults', () => {
    const s = useWorkspaceUiStore.getState()
    s.setRightPanelOpen(true)
    s.setBottomDockOpen(true)
    s.setActiveCenterTab('diff')
    s.reset()
    const r = useWorkspaceUiStore.getState()
    expect(r.isRightPanelOpen).toBe(false)
    expect(r.isBottomDockOpen).toBe(false)
    expect(r.activeCenterTab).toBe('editor')
  })
})
```

Run: `cd apps/web && bun test stores/workspaceUiStore.test.ts` Expected: FAIL —
module not found.

**Step 2: Implement the store**

```ts
// apps/web/stores/workspaceUiStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BottomDockTab } from '@/components/layout/BottomDock'

export type RightPanelTab =
  | 'chat'
  | 'plan'
  | 'review'
  | 'inspect'
  | 'run'
  | 'comments'
export type CenterTab = 'editor' | 'diff' | 'preview' | 'logs' | 'tests'
export type MobilePrimaryPanel = 'workspace' | 'chat' | 'review'

export interface WorkspaceUiState {
  // Right panel
  isRightPanelOpen: boolean
  rightPanelTab: RightPanelTab
  setRightPanelOpen: (open: boolean) => void
  setRightPanelTab: (tab: RightPanelTab) => void
  openRightPanelTab: (tab: RightPanelTab) => void

  // Bottom dock
  isBottomDockOpen: boolean
  activeBottomDockTab: BottomDockTab
  setBottomDockOpen: (open: boolean) => void
  setActiveBottomDockTab: (tab: BottomDockTab) => void

  // Center tabs
  activeCenterTab: CenterTab
  setActiveCenterTab: (tab: CenterTab) => void

  // Mobile / responsive
  mobilePrimaryPanel: MobilePrimaryPanel
  setMobilePrimaryPanel: (panel: MobilePrimaryPanel) => void
  mobileUnreadCount: number
  setMobileUnreadCount: (n: number) => void
  isMobileKeyboardOpen: boolean
  setIsMobileKeyboardOpen: (open: boolean) => void

  // Inspector
  isChatInspectorOpen: boolean
  chatInspectorTab: ChatInspectorTab
  setChatInspectorOpen: (open: boolean) => void
  setChatInspectorTab: (tab: ChatInspectorTab) => void

  // Spec surface (kept temporarily; collapsed in Phase 1B)
  specSurfaceMode: 'closed' | 'approval' | 'inspect'
  setSpecSurfaceMode: (mode: 'closed' | 'approval' | 'inspect') => void

  // Misc
  isShareDialogOpen: boolean
  setShareDialogOpen: (open: boolean) => void
  taskHeaderVisible: boolean
  setTaskHeaderVisible: (visible: boolean) => void

  reset: () => void
}

export type ChatInspectorTab =
  | 'run'
  | 'plan'
  | 'artifacts'
  | 'memory'
  | 'evals'
  | 'tasks'
  | 'qa'
  | 'state'
  | 'browser'
  | 'activity'
  | 'decisions'

const DEFAULTS = {
  isRightPanelOpen: false,
  rightPanelTab: 'chat' as RightPanelTab,
  isBottomDockOpen: false,
  activeBottomDockTab: 'terminal' as BottomDockTab,
  activeCenterTab: 'editor' as CenterTab,
  mobilePrimaryPanel: 'workspace' as MobilePrimaryPanel,
  mobileUnreadCount: 0,
  isMobileKeyboardOpen: false,
  isChatInspectorOpen: false,
  chatInspectorTab: 'run' as ChatInspectorTab,
  specSurfaceMode: 'closed' as const,
  isShareDialogOpen: false,
  taskHeaderVisible: false,
}

export const useWorkspaceUiStore = create<WorkspaceUiState>()(
  persist(
    (set) => ({
      ...DEFAULTS,

      setRightPanelOpen: (open) => set({ isRightPanelOpen: open }),
      setRightPanelTab: (tab) => set({ rightPanelTab: tab }),
      openRightPanelTab: (tab) =>
        set({ rightPanelTab: tab, isRightPanelOpen: true }),

      setBottomDockOpen: (open) => set({ isBottomDockOpen: open }),
      setActiveBottomDockTab: (tab) => set({ activeBottomDockTab: tab }),

      setActiveCenterTab: (tab) => set({ activeCenterTab: tab }),

      setMobilePrimaryPanel: (panel) => set({ mobilePrimaryPanel: panel }),
      setMobileUnreadCount: (n) => set({ mobileUnreadCount: n }),
      setIsMobileKeyboardOpen: (open) => set({ isMobileKeyboardOpen: open }),

      setChatInspectorOpen: (open) => set({ isChatInspectorOpen: open }),
      setChatInspectorTab: (tab) => set({ chatInspectorTab: tab }),

      setSpecSurfaceMode: (mode) => set({ specSurfaceMode: mode }),

      setShareDialogOpen: (open) => set({ isShareDialogOpen: open }),
      setTaskHeaderVisible: (visible) => set({ taskHeaderVisible: visible }),

      reset: () => set(DEFAULTS),
    }),
    {
      name: 'panda:workspaceUi',
      // Only persist shell layout, not transient state like inspector/share dialog
      partialize: (state) => ({
        isRightPanelOpen: state.isRightPanelOpen,
        rightPanelTab: state.rightPanelTab,
        isBottomDockOpen: state.isBottomDockOpen,
        activeBottomDockTab: state.activeBottomDockTab,
      }),
    }
  )
)
```

**Step 3: Run tests**

Run: `cd apps/web && bun test stores/workspaceUiStore.test.ts` Expected: PASS.

**Step 4: Commit**

```bash
git add apps/web/stores/workspaceUiStore.ts apps/web/stores/workspaceUiStore.test.ts
git commit -m "feat(stores): add workspaceUiStore for panel/tab/layout state"
```

---

### Task 1A.2: Create `editorContextStore` (file selection, tabs, cursor, selection)

**Files:**

- Create: `apps/web/stores/editorContextStore.ts`
- Create: `apps/web/stores/editorContextStore.test.ts`

**Step 1: Write the failing test**

```ts
// apps/web/stores/editorContextStore.test.ts
import { describe, expect, test, beforeEach } from 'bun:test'
import { useEditorContextStore } from './editorContextStore'

describe('editorContextStore', () => {
  beforeEach(() => {
    useEditorContextStore.getState().reset()
  })

  test('opens a tab and sets it as active', () => {
    useEditorContextStore.getState().openTab({ kind: 'file', path: 'src/a.ts' })
    const s = useEditorContextStore.getState()
    expect(s.openTabs).toEqual([{ kind: 'file', path: 'src/a.ts' }])
    expect(s.selectedFilePath).toBe('src/a.ts')
  })

  test('opening an already-open tab does not duplicate it', () => {
    const s = useEditorContextStore.getState()
    s.openTab({ kind: 'file', path: 'src/a.ts' })
    s.openTab({ kind: 'file', path: 'src/a.ts' })
    expect(useEditorContextStore.getState().openTabs).toHaveLength(1)
  })

  test('closing the active tab selects the previous tab', () => {
    const s = useEditorContextStore.getState()
    s.openTab({ kind: 'file', path: 'src/a.ts' })
    s.openTab({ kind: 'file', path: 'src/b.ts' })
    s.closeTab('src/b.ts')
    const r = useEditorContextStore.getState()
    expect(r.openTabs.map((t) => t.path)).toEqual(['src/a.ts'])
    expect(r.selectedFilePath).toBe('src/a.ts')
  })

  test('selection updates and persists across cursor moves', () => {
    const s = useEditorContextStore.getState()
    s.setSelection({ filePath: 'src/a.ts', startLine: 10, endLine: 20 })
    s.setCursorPosition({ line: 15, column: 4 })
    const r = useEditorContextStore.getState()
    expect(r.selection?.startLine).toBe(10)
    expect(r.cursorPosition?.line).toBe(15)
  })

  test('clearing the active file clears selection but keeps tabs', () => {
    const s = useEditorContextStore.getState()
    s.openTab({ kind: 'file', path: 'src/a.ts' })
    s.setSelection({ filePath: 'src/a.ts', startLine: 1, endLine: 5 })
    s.setSelectedFilePath(null)
    const r = useEditorContextStore.getState()
    expect(r.selection).toBeNull()
    expect(r.openTabs).toHaveLength(1)
  })
})
```

Run: `cd apps/web && bun test stores/editorContextStore.test.ts` Expected: FAIL
— module not found.

**Step 2: Implement the store**

```ts
// apps/web/stores/editorContextStore.ts
import { create } from 'zustand'
import type { WorkspaceOpenTab } from '@/contexts/WorkspaceContext'

export interface EditorSelection {
  filePath: string
  startLine: number
  endLine: number
  text?: string
}

export interface EditorCursor {
  line: number
  column: number
}

export interface EditorFileLocation {
  line: number
  column: number
  nonce: number
}

export interface EditorContextState {
  selectedFilePath: string | null
  selectedFileLocation: EditorFileLocation | null
  openTabs: WorkspaceOpenTab[]
  cursorPosition: EditorCursor | null
  selection: EditorSelection | null

  setSelectedFilePath: (path: string | null) => void
  setSelectedFileLocation: (loc: EditorFileLocation | null) => void
  setOpenTabs: (
    tabs:
      | WorkspaceOpenTab[]
      | ((prev: WorkspaceOpenTab[]) => WorkspaceOpenTab[])
  ) => void
  setCursorPosition: (pos: EditorCursor | null) => void
  setSelection: (sel: EditorSelection | null) => void

  openTab: (tab: WorkspaceOpenTab) => void
  closeTab: (path: string) => void

  reset: () => void
}

const DEFAULTS = {
  selectedFilePath: null,
  selectedFileLocation: null,
  openTabs: [] as WorkspaceOpenTab[],
  cursorPosition: null,
  selection: null,
}

export const useEditorContextStore = create<EditorContextState>((set, get) => ({
  ...DEFAULTS,

  setSelectedFilePath: (path) =>
    set((state) => ({
      selectedFilePath: path,
      selection: path === null ? null : state.selection,
    })),
  setSelectedFileLocation: (loc) => set({ selectedFileLocation: loc }),
  setOpenTabs: (tabs) =>
    set((state) => ({
      openTabs: typeof tabs === 'function' ? tabs(state.openTabs) : tabs,
    })),
  setCursorPosition: (pos) => set({ cursorPosition: pos }),
  setSelection: (sel) => set({ selection: sel }),

  openTab: (tab) =>
    set((state) => {
      const exists = state.openTabs.some((t) => t.path === tab.path)
      return {
        openTabs: exists ? state.openTabs : [...state.openTabs, tab],
        selectedFilePath: tab.path,
      }
    }),

  closeTab: (path) =>
    set((state) => {
      const idx = state.openTabs.findIndex((t) => t.path === path)
      if (idx === -1) return state
      const nextTabs = state.openTabs.filter((t) => t.path !== path)
      const wasActive = state.selectedFilePath === path
      const nextActive = wasActive
        ? (nextTabs[idx - 1]?.path ?? nextTabs[0]?.path ?? null)
        : state.selectedFilePath
      return { openTabs: nextTabs, selectedFilePath: nextActive }
    }),

  reset: () => set(DEFAULTS),
}))
```

**Step 3: Run tests**

Run: `cd apps/web && bun test stores/editorContextStore.test.ts` Expected: PASS.

**Step 4: Commit**

```bash
git add apps/web/stores/editorContextStore.ts apps/web/stores/editorContextStore.test.ts
git commit -m "feat(stores): add editorContextStore for file selection and tabs"
```

---

### Task 1A.3: Create `chatSessionStore`

**Files:**

- Create: `apps/web/stores/chatSessionStore.ts`
- Create: `apps/web/stores/chatSessionStore.test.ts`

**Step 1: Write the failing test**

```ts
// apps/web/stores/chatSessionStore.test.ts
import { describe, expect, test, beforeEach } from 'bun:test'
import { useChatSessionStore } from './chatSessionStore'

describe('chatSessionStore', () => {
  beforeEach(() => {
    useChatSessionStore.getState().reset()
  })

  test('default mode is build', () => {
    expect(useChatSessionStore.getState().chatMode).toBe('build')
  })

  test('changing chat clears the active model selection', () => {
    const s = useChatSessionStore.getState()
    s.setUiSelectedModel({
      providerId: 'anthropic',
      modelId: 'claude-opus-4-7',
    })
    s.setActiveChatId('chat_abc' as any)
    expect(useChatSessionStore.getState().uiSelectedModel).toBeNull()
  })

  test('oversight level toggles between review and autopilot', () => {
    const s = useChatSessionStore.getState()
    expect(s.oversightLevel).toBe('review')
    s.setOversightLevel('autopilot')
    expect(useChatSessionStore.getState().oversightLevel).toBe('autopilot')
  })
})
```

Run: `cd apps/web && bun test stores/chatSessionStore.test.ts` Expected: FAIL.

**Step 2: Implement**

```ts
// apps/web/stores/chatSessionStore.ts
import { create } from 'zustand'
import type { Id } from '@convex/_generated/dataModel'
import type { ChatMode } from '@/lib/agent/prompt-library'

export type OversightLevel = 'review' | 'autopilot'

export interface UiModelSelection {
  providerId: string
  modelId: string
}

export interface ChatSessionState {
  activeChatId: Id<'chats'> | null
  chatMode: ChatMode
  architectBrainstormEnabled: boolean
  uiSelectedModel: UiModelSelection | null
  reasoningVariant: string | null
  oversightLevel: OversightLevel
  contextualPrompt: string | null

  setActiveChatId: (id: Id<'chats'> | null) => void
  setChatMode: (mode: ChatMode) => void
  setArchitectBrainstormEnabled: (enabled: boolean) => void
  setUiSelectedModel: (model: UiModelSelection | null) => void
  setReasoningVariant: (v: string | null) => void
  setOversightLevel: (level: OversightLevel) => void
  setContextualPrompt: (prompt: string | null) => void

  reset: () => void
}

const DEFAULTS = {
  activeChatId: null,
  chatMode: 'build' as ChatMode,
  architectBrainstormEnabled: false,
  uiSelectedModel: null,
  reasoningVariant: null,
  oversightLevel: 'review' as OversightLevel,
  contextualPrompt: null,
}

export const useChatSessionStore = create<ChatSessionState>((set) => ({
  ...DEFAULTS,

  setActiveChatId: (id) =>
    set((state) => ({
      activeChatId: id,
      // Active chat changing invalidates the per-chat UI model override
      uiSelectedModel: id !== state.activeChatId ? null : state.uiSelectedModel,
    })),
  setChatMode: (mode) => set({ chatMode: mode }),
  setArchitectBrainstormEnabled: (enabled) =>
    set({ architectBrainstormEnabled: enabled }),
  setUiSelectedModel: (model) => set({ uiSelectedModel: model }),
  setReasoningVariant: (v) => set({ reasoningVariant: v }),
  setOversightLevel: (level) => set({ oversightLevel: level }),
  setContextualPrompt: (prompt) => set({ contextualPrompt: prompt }),

  reset: () => set(DEFAULTS),
}))
```

**Step 3: Run tests**

Run: `cd apps/web && bun test stores/chatSessionStore.test.ts` Expected: PASS.

**Step 4: Commit**

```bash
git add apps/web/stores/chatSessionStore.ts apps/web/stores/chatSessionStore.test.ts
git commit -m "feat(stores): add chatSessionStore for chat mode/model/oversight"
```

---

### Task 1A.4: Create `WorkspaceStoresProvider` and selector hooks

**Files:**

- Create: `apps/web/stores/WorkspaceStoresProvider.tsx`
- Create: `apps/web/stores/selectors.ts`
- Create: `apps/web/stores/WorkspaceStoresProvider.test.tsx`

**Step 1: Write the failing test**

```tsx
// apps/web/stores/WorkspaceStoresProvider.test.tsx
import { describe, expect, test } from 'bun:test'
import { render, act } from '@testing-library/react'
import { WorkspaceStoresProvider } from './WorkspaceStoresProvider'
import { useEditorContextStore } from './editorContextStore'
import { useChatSessionStore } from './chatSessionStore'
import { useWorkspaceUiStore } from './workspaceUiStore'

describe('WorkspaceStoresProvider', () => {
  test('resets all stores on projectId change', () => {
    const { rerender } = render(
      <WorkspaceStoresProvider projectId={'p1' as any}>
        x
      </WorkspaceStoresProvider>
    )
    act(() => {
      useEditorContextStore.getState().openTab({ kind: 'file', path: 'a.ts' })
      useWorkspaceUiStore.getState().setRightPanelOpen(true)
      useChatSessionStore.getState().setChatMode('plan')
    })
    expect(useEditorContextStore.getState().openTabs).toHaveLength(1)

    rerender(
      <WorkspaceStoresProvider projectId={'p2' as any}>
        x
      </WorkspaceStoresProvider>
    )
    expect(useEditorContextStore.getState().openTabs).toHaveLength(0)
    expect(useChatSessionStore.getState().chatMode).toBe('build')
    // workspaceUi shell layout (right panel) is intentionally persisted across projects
    expect(useWorkspaceUiStore.getState().isRightPanelOpen).toBe(true)
  })
})
```

Run: `cd apps/web && bun test stores/WorkspaceStoresProvider.test.tsx` Expected:
FAIL.

**Step 2: Implement provider**

```tsx
// apps/web/stores/WorkspaceStoresProvider.tsx
'use client'

import { useEffect, type ReactNode } from 'react'
import type { Id } from '@convex/_generated/dataModel'
import { useEditorContextStore } from './editorContextStore'
import { useChatSessionStore } from './chatSessionStore'

interface WorkspaceStoresProviderProps {
  projectId: Id<'projects'>
  children: ReactNode
}

export function WorkspaceStoresProvider({
  projectId,
  children,
}: WorkspaceStoresProviderProps) {
  useEffect(() => {
    // Reset per-project transient state on project switch.
    // workspaceUiStore is persisted (panel layout) and intentionally NOT reset.
    useEditorContextStore.getState().reset()
    useChatSessionStore.getState().reset()
  }, [projectId])

  return <>{children}</>
}
```

```ts
// apps/web/stores/selectors.ts
// Stable selector helpers — components should use these to avoid re-renders.
import { useChatSessionStore } from './chatSessionStore'
import { useEditorContextStore } from './editorContextStore'
import { useWorkspaceUiStore } from './workspaceUiStore'

export const useActiveFilePath = () =>
  useEditorContextStore((s) => s.selectedFilePath)
export const useOpenTabs = () => useEditorContextStore((s) => s.openTabs)
export const useEditorSelection = () =>
  useEditorContextStore((s) => s.selection)
export const useChatMode = () => useChatSessionStore((s) => s.chatMode)
export const useActiveChatId = () => useChatSessionStore((s) => s.activeChatId)
export const useOversightLevel = () =>
  useChatSessionStore((s) => s.oversightLevel)
export const useRightPanelOpen = () =>
  useWorkspaceUiStore((s) => s.isRightPanelOpen)
export const useRightPanelTab = () =>
  useWorkspaceUiStore((s) => s.rightPanelTab)
```

**Step 3: Run tests**

Run: `cd apps/web && bun test stores/` Expected: PASS (all four files).

**Step 4: Commit**

```bash
git add apps/web/stores/WorkspaceStoresProvider.tsx apps/web/stores/selectors.ts apps/web/stores/WorkspaceStoresProvider.test.tsx
git commit -m "feat(stores): add WorkspaceStoresProvider and selector hooks"
```

---

### Task 1A.5: Migrate `ProjectChatPanel` to read from stores

**Files:**

- Modify: `apps/web/components/projects/ProjectChatPanel.tsx`

**Step 1: Identify props that come from stores**

Read `apps/web/components/projects/ProjectChatPanel.tsx` end-to-end. List each
prop that is fed from `useProjectWorkspaceUi` or could be replaced by
`useChatSessionStore` / `useEditorContextStore` / `useWorkspaceUiStore`. The
list must include at minimum:

- `chatMode`, `onModeChange`, `architectBrainstormEnabled`,
  `onArchitectBrainstormEnabledChange`
- `oversightLevel`, `onOversightLevelChange`
- `isMobileLayout` (from a media-query subscription, see Task 1A.7)
- `isInspectorOpen`, `inspectorTab`, `onInspectorOpenChange`,
  `onInspectorTabChange`
- `contextualPrompt`, `onContextualPromptHandled`

**Step 2: Replace those props with store reads inside the component**

For each prop in the list, delete the prop from the interface and replace its
usage with the corresponding selector or `getState()` call. Example:

```tsx
// Before
<ProjectChatPanel chatMode={chatMode} onModeChange={handleModeChange} ... />

// After (inside the component)
import { useChatSessionStore } from '@/stores/chatSessionStore'
const chatMode = useChatSessionStore((s) => s.chatMode)
const setChatMode = useChatSessionStore((s) => s.setChatMode)
```

`onModeChange` should still be configurable via prop because
`useProjectMessageWorkflow` wraps mode changes with side effects. Keep the
_callback_ prop, drop the _value_ prop.

**Step 3: Run typecheck and tests**

Run: `cd apps/web && bun run typecheck` Expected: PASS.

Run: `cd apps/web && bun test components/projects/` Expected: PASS.

**Step 4: Commit**

```bash
git add apps/web/components/projects/ProjectChatPanel.tsx
git commit -m "refactor(chat): read UI/session state from stores in ProjectChatPanel"
```

---

### Task 1A.6: Migrate `WorkbenchRightPanel` to read from stores

**Files:**

- Modify: `apps/web/components/workbench/WorkbenchRightPanel.tsx`

**Step 1: Same procedure as Task 1A.5**

Identify all props duplicated from `ProjectChatPanel` (oversight, mode,
inspector, file paths, etc.) and replace them with store reads. Keep callback
props that have side effects.

**Step 2: Re-run tests**

Run: `cd apps/web && bun test components/workbench/ && bun run typecheck`
Expected: PASS.

**Step 3: Commit**

```bash
git add apps/web/components/workbench/WorkbenchRightPanel.tsx
git commit -m "refactor(workbench): read UI state from stores in WorkbenchRightPanel"
```

---

### Task 1A.7: Move `useMediaQuery` layout detection into the store

**Files:**

- Create: `apps/web/stores/useResponsiveLayoutSync.ts`
- Modify: `apps/web/stores/workspaceUiStore.ts` (add `isMobileLayout`,
  `isCompactDesktopLayout`)

**Step 1: Add fields to the store**

Add to `WorkspaceUiState`:

```ts
isMobileLayout: boolean
isCompactDesktopLayout: boolean
setLayoutBreakpoints: (b: { isMobileLayout: boolean; isCompactDesktopLayout: boolean }) => void
```

Defaults: both `false`. Implement `setLayoutBreakpoints: (b) => set(b)`.

**Step 2: Create the sync hook**

```ts
// apps/web/stores/useResponsiveLayoutSync.ts
'use client'

import { useEffect } from 'react'
import { useWorkspaceUiStore } from './workspaceUiStore'

export function useResponsiveLayoutSync() {
  useEffect(() => {
    const mobileMedia = window.matchMedia('(max-width: 1023px)')
    const compactMedia = window.matchMedia(
      '(min-width: 1024px) and (max-width: 1279px)'
    )
    const update = () => {
      useWorkspaceUiStore.getState().setLayoutBreakpoints({
        isMobileLayout: mobileMedia.matches,
        isCompactDesktopLayout: compactMedia.matches,
      })
    }
    update()
    mobileMedia.addEventListener('change', update)
    compactMedia.addEventListener('change', update)
    return () => {
      mobileMedia.removeEventListener('change', update)
      compactMedia.removeEventListener('change', update)
    }
  }, [])
}
```

**Step 3: Mount the sync hook in `WorkspaceStoresProvider`**

Modify `apps/web/stores/WorkspaceStoresProvider.tsx` to call
`useResponsiveLayoutSync()` near the top of the component body.

**Step 4: Run tests + typecheck**

Run: `cd apps/web && bun run typecheck && bun test stores/` Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/stores/workspaceUiStore.ts apps/web/stores/useResponsiveLayoutSync.ts apps/web/stores/WorkspaceStoresProvider.tsx
git commit -m "refactor(stores): move responsive layout detection into workspaceUi store"
```

---

### Task 1A.8: Reduce the page to a shell mount + delete dead hooks

**Files:**

- Modify: `apps/web/app/(dashboard)/projects/[projectId]/page.tsx` (target: ≤
  100 lines)
- Delete: `apps/web/hooks/useProjectWorkspaceUi.ts` (replaced by stores)
- Delete: `apps/web/hooks/buildWorkspaceContextValue.ts` (replaced by stores)
- Delete: `apps/web/hooks/buildProjectChatPanelProps.ts` (no longer needed —
  passthrough)
- Delete: `apps/web/hooks/buildWorkbenchRightPanelProps.ts` (no longer needed —
  passthrough)
- Delete: `apps/web/hooks/buildProjectWorkspaceLayoutProps.ts` (no longer
  needed)
- Delete: `apps/web/hooks/buildProjectWorkspaceDerivedState.ts` (inline into
  page or move to selector)
- Delete: `apps/web/hooks/useProjectWorkspaceShellProps.ts` (no longer needed)

**Step 1: Rewrite the page to mount the provider and a single shell**

```tsx
// apps/web/app/(dashboard)/projects/[projectId]/page.tsx
'use client'

import { useParams } from 'next/navigation'
import type { Id } from '@convex/_generated/dataModel'
import { WorkspaceStoresProvider } from '@/stores/WorkspaceStoresProvider'
import { ProjectWorkspaceShell } from '@/components/projects/ProjectWorkspaceShell'
import { ProjectShellDataLoader } from '@/components/projects/ProjectShellDataLoader'

export default function ProjectPage() {
  const params = useParams()
  const projectId = params.projectId as Id<'projects'>

  return (
    <WorkspaceStoresProvider projectId={projectId}>
      <ProjectShellDataLoader projectId={projectId}>
        <ProjectWorkspaceShell />
      </ProjectShellDataLoader>
    </WorkspaceStoresProvider>
  )
}
```

`ProjectShellDataLoader` (new component, Task 1A.9) is responsible for the data
fetches (`api.projects.get`, `api.files.list`, `api.chats.list`) and rendering
loading/error guards.

**Step 2: Wait — finish Task 1A.9 first before deleting old code**

Skip this commit. Move to 1A.9 and return here after.

---

### Task 1A.9: Create `ProjectShellDataLoader` and migrate the agent + workflow hooks into it

**Files:**

- Create: `apps/web/components/projects/ProjectShellDataLoader.tsx`
- Create: `apps/web/components/projects/ProjectShellDataLoader.test.tsx`

**Step 1: Write the failing test**

```tsx
// apps/web/components/projects/ProjectShellDataLoader.test.tsx
import { describe, expect, test } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { ProjectShellDataLoader } from './ProjectShellDataLoader'

// Mock convex hooks
import * as convexReact from 'convex/react'
import { spyOn } from 'bun:test'

describe('ProjectShellDataLoader', () => {
  test('shows loading guard while project is undefined', () => {
    spyOn(convexReact, 'useQuery').mockReturnValue(undefined)
    render(
      <ProjectShellDataLoader projectId={'p1' as any}>
        <div>shell</div>
      </ProjectShellDataLoader>
    )
    expect(screen.getByText(/loading/i)).toBeTruthy()
  })

  test('shows not-found guard when project is null', () => {
    spyOn(convexReact, 'useQuery').mockReturnValue(null)
    render(
      <ProjectShellDataLoader projectId={'p1' as any}>
        <div>shell</div>
      </ProjectShellDataLoader>
    )
    expect(screen.getByText(/not found/i)).toBeTruthy()
  })

  test('renders children when project + files are ready', () => {
    spyOn(convexReact, 'useQuery').mockImplementation((q) =>
      String(q).includes('projects') ? { _id: 'p1', name: 'test' } : []
    )
    render(
      <ProjectShellDataLoader projectId={'p1' as any}>
        <div>shell</div>
      </ProjectShellDataLoader>
    )
    expect(screen.getByText('shell')).toBeTruthy()
  })
})
```

Run:
`cd apps/web && bun test components/projects/ProjectShellDataLoader.test.tsx`
Expected: FAIL.

**Step 2: Implement the loader**

This is the new home for project-scoped data fetches and the agent runtime
hookup. Move from `page.tsx`:

- `useQuery(api.projects.get)` → here
- `useQuery(api.files.list)` → here, push results into `useEditorContextStore`
  via a sync effect (and into a small `useProjectFilesStore` if needed for
  performance)
- `useQuery(api.chats.list)` → here
- `useProjectChatSession` → here, sync results into `useChatSessionStore`
- `useAgent` → here, expose via a new `AgentRuntimeContext` (keep as React
  context — it's behavior-rich, not pure state)
- `useProjectMessageWorkflow` → here
- All keyboard hotkeys (`useHotkeys`) → here

```tsx
// apps/web/components/projects/ProjectShellDataLoader.tsx
'use client'

import { type ReactNode } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { ProjectLoadingGuard, ProjectNotFoundGuard } from './ProjectPageGuards'
import { AgentRuntimeProvider } from '@/contexts/AgentRuntimeContext'
import { useProjectShellWiring } from '@/hooks/useProjectShellWiring'

interface ProjectShellDataLoaderProps {
  projectId: Id<'projects'>
  children: ReactNode
}

export function ProjectShellDataLoader({
  projectId,
  children,
}: ProjectShellDataLoaderProps) {
  const project = useQuery(api.projects.get, { id: projectId })
  const files = useQuery(api.files.list, { projectId })
  const chats = useQuery(api.chats.list, { projectId })

  if (project === null) return <ProjectNotFoundGuard />
  if (project === undefined || !files) {
    return <ProjectLoadingGuard projectLoaded={project !== undefined} />
  }

  return (
    <AgentRuntimeProvider
      projectId={projectId}
      project={project}
      files={files}
      chats={chats ?? []}
    >
      <ShellWiring projectId={projectId} files={files}>
        {children}
      </ShellWiring>
    </AgentRuntimeProvider>
  )
}

function ShellWiring({
  projectId,
  files,
  children,
}: {
  projectId: Id<'projects'>
  files: Array<{ _id: Id<'files'>; path: string }>
  children: ReactNode
}) {
  useProjectShellWiring({ projectId, files })
  return <>{children}</>
}
```

`useProjectShellWiring` consolidates: hotkeys, file→store sync, planning session
subscriptions, drift detection, etc. It is a hook with NO RETURN — pure side
effects.

**Step 3: Implement `AgentRuntimeProvider`**

```tsx
// apps/web/contexts/AgentRuntimeContext.tsx
'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { Id } from '@convex/_generated/dataModel'
import { useAgent } from '@/hooks/useAgent'
import { useProjectChatSession } from '@/hooks/useProjectChatSession'
// ...

type AgentRuntime = ReturnType<typeof useAgent>

const AgentRuntimeContext = createContext<AgentRuntime | null>(null)

export function AgentRuntimeProvider({
  projectId,
  project,
  files,
  chats,
  children,
}: {
  projectId: Id<'projects'>
  project: any
  files: any[]
  chats: any[]
  children: ReactNode
}) {
  // (Move all the wiring currently in page.tsx here, but read mode/oversight from stores)
  // ...
  const agent = useAgent({
    /* ... */
  })
  return (
    <AgentRuntimeContext.Provider value={agent}>
      {children}
    </AgentRuntimeContext.Provider>
  )
}

export function useAgentRuntime() {
  const ctx = useContext(AgentRuntimeContext)
  if (!ctx)
    throw new Error('useAgentRuntime must be used within AgentRuntimeProvider')
  return ctx
}
```

**Step 4: Run tests + typecheck**

Run: `cd apps/web && bun run typecheck && bun test components/projects/`
Expected: PASS.

**Step 5: Commit (do not delete old hooks yet)**

```bash
git add apps/web/components/projects/ProjectShellDataLoader.tsx apps/web/components/projects/ProjectShellDataLoader.test.tsx apps/web/contexts/AgentRuntimeContext.tsx apps/web/hooks/useProjectShellWiring.ts
git commit -m "feat(workspace): add ProjectShellDataLoader and AgentRuntimeProvider"
```

---

### Task 1A.10: Migrate `ProjectWorkspaceShell` and inner components to use `useAgentRuntime()` + store selectors

**Files:**

- Modify: `apps/web/components/projects/ProjectWorkspaceShell.tsx`
- Modify: `apps/web/components/projects/ProjectWorkspaceLayout.tsx`
- Modify: `apps/web/components/workbench/Workbench.tsx`

**Step 1: Replace prop reads with hook calls**

For each component currently receiving agent state via props, replace with:

- `const agent = useAgentRuntime()` for behavior
- store selector hooks for state values

Drop props that the component no longer needs from the interface. Update tests
accordingly.

**Step 2: Verify test suite**

Run: `cd apps/web && bun test components/ && bun run typecheck` Expected: PASS.

**Step 3: Commit**

```bash
git add apps/web/components/projects apps/web/components/workbench
git commit -m "refactor(workspace): read agent runtime + UI state from context/stores"
```

---

### Task 1A.11: Activate the slim page and delete dead code

**Files:**

- Modify: `apps/web/app/(dashboard)/projects/[projectId]/page.tsx` (apply Task
  1A.8 Step 1)
- Delete: `apps/web/hooks/useProjectWorkspaceUi.ts`
- Delete: `apps/web/hooks/useProjectWorkspaceUi.mobile.test.ts` (replaced by
  store tests)
- Delete: `apps/web/hooks/buildWorkspaceContextValue.ts`
- Delete: `apps/web/hooks/buildProjectChatPanelProps.ts`
- Delete: `apps/web/hooks/buildWorkbenchRightPanelProps.ts`
- Delete: `apps/web/hooks/buildProjectWorkspaceLayoutProps.ts`
- Delete: `apps/web/hooks/buildProjectWorkspaceDerivedState.ts`
- Delete: `apps/web/hooks/useProjectWorkspaceShellProps.ts`
- Modify: `apps/web/contexts/WorkspaceContext.tsx` — keep only the type exports
  (`WorkspaceOpenTab` etc.); delete the React context machinery (now redundant
  with the store).

**Step 1: Replace the page with the slim version (from Task 1A.8 Step 1)**

**Step 2: Delete old hooks one at a time**

For each file to delete, run:

```bash
git grep -l "from '@/hooks/useProjectWorkspaceUi'"
```

to find any remaining importers. Update them to use stores. Then `git rm` the
file.

Repeat for each hook in the delete list. Do NOT batch — delete one, run
typecheck, fix imports, delete next.

**Step 3: Trim `WorkspaceContext.tsx`**

Keep type exports only. Remove `WorkspaceProvider`, `useWorkspace`, and the
React context object. Anything that imported `useWorkspace` should now use store
selectors.

**Step 4: Verify everything**

```bash
cd apps/web && bun run typecheck
cd apps/web && bun test
cd apps/web && bun run lint
```

Expected: all PASS.

**Step 5: Verify the page is small**

```bash
wc -l "apps/web/app/(dashboard)/projects/[projectId]/page.tsx"
```

Expected: ≤ 100 lines.

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor(workspace): replace god page with store-backed shell, delete prop builders"
```

---

### Task 1A.12: E2E smoke test for the migrated workspace

**Files:**

- Modify: `apps/web/e2e/workbench.e2e-spec.ts` (add a smoke step) OR create a
  new spec.

**Step 1: Add a smoke test**

```ts
// add to apps/web/e2e/workbench.e2e-spec.ts
test('store-backed workspace mounts and persists right panel state across navigation', async ({
  page,
}) => {
  await page.goto('/projects/[seeded-project-id]')
  await expect(page.getByTestId('workspace-shell')).toBeVisible()

  await page.getByTestId('toggle-right-panel').click()
  await expect(page.getByTestId('right-panel')).toBeVisible()

  await page.reload()
  await expect(page.getByTestId('right-panel')).toBeVisible()
})
```

(If `data-testid` attributes don't exist yet, add them in this commit — they're
cheap and reusable.)

**Step 2: Run the e2e spec locally**

Run: `cd apps/web && bun run test:e2e -- workbench.e2e-spec.ts` Expected: PASS.

**Step 3: Commit**

```bash
git add apps/web/e2e/workbench.e2e-spec.ts apps/web/components/projects/
git commit -m "test(e2e): smoke-test store-backed workspace shell"
```

**Phase 1A acceptance:**

- `page.tsx` ≤ 100 lines
- All hook/component/e2e tests green
- `useProjectWorkspaceUi` and the 6 `build*` hooks deleted
- Right panel + dock state persists across reloads

---

## Phase 1B — Unify Plan + Spec into one approval pipeline

**Strategy:** `planningSessions` is the surviving system. The `specifications`
table becomes a verification artifact attached to a planning session, not its
own approval gate. UI consolidates to one set of buttons (Approve, Edit, Build).

### Task 1B.1: Document and confirm the migration model

**Files:**

- Create: `docs/plans/2026-04-19-plan-spec-unification-model.md`

**Step 1: Write the design doc**

Document the following as the source of truth for this phase. Get explicit user
sign-off before implementing.

```markdown
# Plan + Spec Unification — Final Model

## Single concept: "Plan"

A Plan is the user-facing approval surface. Backed by `planningSessions`.

Lifecycle (single status enum): intake → drafting → ready_for_review → approved
→ executing → completed | failed | stale

## Specifications become "verification artifacts"

- `specifications` table is renamed conceptually to "Plan Verifications"
- A specification record stores: pre/post-conditions, acceptance criteria, drift
  signals
- It is created automatically when a plan is generated (no user-facing "spec"
  approval)
- `tier: 'instant' | 'ambient' | 'explicit'` is dropped — replaced by a boolean
  `verificationLevel: 'lightweight' | 'strict'` set by the plan's mode (build =
  lightweight, plan = strict)

## UI consolidation

- Delete: `SpecApproval`, `SpecPanel`, `SpecBadge` standalone surfaces
- Keep: `SpecVerificationResults` (renamed `PlanVerificationResults`), shown
  inline in the Plan tab after execution
- Approval flow has one path: PlanReview → PlanApprove → BuildFromPlan

## Schema migration

- Add to `planningSessions`: `verificationId?: v.id('specifications')`
- Add to `specifications`: `planningSessionId?: v.string()` (link back)
- No data migration needed — existing rows continue to work; UI just stops
  surfacing the spec separately

## Code changes (surface area)

- `useAgent` no longer emits separate `spec_pending_approval` events; promote to
  `plan_pending_approval`
- `chatPanelProps` loses `pendingSpec`, `onSpecApprove`, `onSpecCancel`,
  `showInlineSpecReview`, `specSurfaceMode`, `onCloseSpecSurface`,
  `onEditPendingSpec`, `onExecutePendingSpec`
- One unified hook `usePlanApproval` replaces `useProjectPlanDraft` + the spec
  approval branch
```

**Step 2: Commit and request user confirmation**

```bash
git add docs/plans/2026-04-19-plan-spec-unification-model.md
git commit -m "docs: define plan+spec unification model"
```

**HALT here.** Ask the user to confirm the model before continuing. If the user
wants to keep the spec surface separate, abandon Phase 1B and skip to Phase 1C.

---

### Task 1B.2: Add `usePlanApproval` (test-first)

**Files:**

- Create: `apps/web/hooks/usePlanApproval.ts`
- Create: `apps/web/hooks/usePlanApproval.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, test, expect } from 'bun:test'
import { derivePlanApprovalState } from './usePlanApproval'

describe('derivePlanApprovalState', () => {
  test('idle when no plan and no spec', () => {
    const r = derivePlanApprovalState({
      planningSession: null,
      pendingSpec: null,
    })
    expect(r.status).toBe('idle')
  })

  test('awaiting_review when planningSession has a generated plan', () => {
    const r = derivePlanApprovalState({
      planningSession: {
        sessionId: 'a',
        status: 'ready_for_review',
        generatedPlan: { status: 'ready_for_review' } as any,
      } as any,
      pendingSpec: null,
    })
    expect(r.status).toBe('awaiting_review')
    expect(r.canApprove).toBe(true)
  })

  test('approved → can build', () => {
    const r = derivePlanApprovalState({
      planningSession: {
        sessionId: 'a',
        status: 'accepted',
        generatedPlan: { status: 'accepted' } as any,
      } as any,
      pendingSpec: null,
    })
    expect(r.status).toBe('approved')
    expect(r.canBuild).toBe(true)
  })

  test('legacy pendingSpec is treated as awaiting_review', () => {
    const r = derivePlanApprovalState({
      planningSession: null,
      pendingSpec: { id: 'spec_1', status: 'draft' } as any,
    })
    expect(r.status).toBe('awaiting_review')
  })
})
```

Run: `cd apps/web && bun test hooks/usePlanApproval.test.ts` Expected: FAIL.

**Step 2: Implement the pure deriver**

```ts
// apps/web/hooks/usePlanApproval.ts
import type { ProjectPlanningSessionRecord } from './useProjectPlanningSession'

export type UnifiedPlanStatus =
  | 'idle'
  | 'drafting'
  | 'awaiting_review'
  | 'approved'
  | 'executing'
  | 'completed'
  | 'failed'

export interface PlanApprovalState {
  status: UnifiedPlanStatus
  canApprove: boolean
  canBuild: boolean
}

export function derivePlanApprovalState(args: {
  planningSession: ProjectPlanningSessionRecord
  pendingSpec: { status: string } | null
}): PlanApprovalState {
  const { planningSession, pendingSpec } = args
  if (planningSession?.generatedPlan?.status === 'ready_for_review') {
    return { status: 'awaiting_review', canApprove: true, canBuild: false }
  }
  if (planningSession?.generatedPlan?.status === 'accepted') {
    return { status: 'approved', canApprove: false, canBuild: true }
  }
  if (planningSession?.generatedPlan?.status === 'executing') {
    return { status: 'executing', canApprove: false, canBuild: false }
  }
  if (planningSession?.generatedPlan?.status === 'completed') {
    return { status: 'completed', canApprove: false, canBuild: false }
  }
  if (planningSession?.generatedPlan?.status === 'failed') {
    return { status: 'failed', canApprove: false, canBuild: true }
  }
  if (pendingSpec) {
    return { status: 'awaiting_review', canApprove: true, canBuild: false }
  }
  return { status: 'idle', canApprove: false, canBuild: false }
}
```

**Step 3: Run tests**

Run: `cd apps/web && bun test hooks/usePlanApproval.test.ts` Expected: PASS.

**Step 4: Commit**

```bash
git add apps/web/hooks/usePlanApproval.ts apps/web/hooks/usePlanApproval.test.ts
git commit -m "feat(plan): add unified derivePlanApprovalState"
```

---

### Task 1B.3: Wire `usePlanApproval` into `ProjectChatPanel` and remove spec-only buttons

**Files:**

- Modify: `apps/web/components/projects/ProjectChatPanel.tsx`
- Modify: `apps/web/components/chat/SpecSurface.tsx` (delete or reduce to
  verification renderer)
- Modify: `apps/web/contexts/AgentRuntimeContext.tsx`

**Step 1: Replace the dual-button block**

Find the JSX block in `ProjectChatPanel` that conditionally renders
`<PlanReview>` AND `<SpecSurface>`. Collapse to:

```tsx
const planApproval = derivePlanApprovalState({
  planningSession: agent.planningSession,
  pendingSpec: agent.pendingSpec,
})

{
  planApproval.status === 'awaiting_review' && (
    <PlanReview
      plan={agent.planningSession?.generatedPlan ?? agent.pendingSpec}
      onApprove={() => agent.approvePlan()}
      onEdit={() => openRightPanelTab('plan')}
      onCancel={() => agent.cancelPlan()}
    />
  )
}

{
  planApproval.canBuild && (
    <Button onClick={() => agent.buildFromPlan()}>Build From Plan</Button>
  )
}
```

**Step 2: Add `agent.approvePlan/cancelPlan/buildFromPlan` to the runtime
context**

In `AgentRuntimeContext`, expose three functions that internally route to
whichever underlying system (`planningSessions.acceptPlan` or
`agent.approvePendingSpec`) is active. This is the bridge that lets the UI stop
caring which backend produced the plan.

```ts
const approvePlan = useCallback(async () => {
  if (planningSession?.generatedPlan) {
    await planningSession.acceptPlan()
    return
  }
  if (agent.pendingSpec) {
    agent.approvePendingSpec(agent.pendingSpec)
  }
}, [planningSession, agent.pendingSpec, agent.approvePendingSpec])
```

**Step 3: Delete `SpecSurface` standalone modes**

`SpecSurface` had three modes: `closed | approval | inspect`. Drop `approval`.
Keep `inspect` — rename the file to `PlanVerificationDrawer.tsx`. Update all
imports.

**Step 4: Verify**

```bash
cd apps/web && bun run typecheck && bun test components/
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/components apps/web/contexts/AgentRuntimeContext.tsx
git commit -m "refactor(plan): collapse plan+spec approval UI to a single surface"
```

---

### Task 1B.4: Schema link + cleanup

**Files:**

- Modify: `convex/schema.ts`
- Modify: `convex/specifications.ts`
- Modify: `convex/planningSessions.ts`

**Step 1: Add the link fields**

In `convex/schema.ts`:

```ts
// In planningSessions table
verificationId: v.optional(v.id('specifications')),

// In specifications table
planningSessionId: v.optional(v.string()),
```

**Step 2: Add a query to fetch verification by planning session**

```ts
// convex/planningSessions.ts
export const getVerificationForSession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    return await ctx.db
      .query('specifications')
      .filter((q) => q.eq(q.field('planningSessionId'), sessionId))
      .first()
  },
})
```

**Step 3: Run convex codegen**

Run:
`cd "/home/nochaserz/Documents/Coding Projects/panda" && bunx convex codegen`
Expected: `_generated/` updated.

**Step 4: Run schema validation**

Run: `cd apps/web && bun run typecheck` Expected: PASS.

**Step 5: Commit**

```bash
git add convex/schema.ts convex/specifications.ts convex/planningSessions.ts convex/_generated
git commit -m "feat(convex): link planningSessions to specifications as verification artifact"
```

---

### Task 1B.5: Update agent runtime to write verifications via the unified path

**Files:**

- Modify: `apps/web/lib/agent/spec/persistence.ts`
- Modify: `apps/web/hooks/useAgent-spec-events.ts` (or wherever `spec_generated`
  is handled)

**Step 1: When a spec is generated, attach it to the active planningSession**

In the spec persistence layer, accept an optional `planningSessionId` and write
it on the spec row. When a planning session is generated, mark the spec as the
planning session's `verificationId`.

**Step 2: Drop the standalone `pendingSpec` event from the UI flow**

Keep emitting it for backward compat, but in `AgentRuntimeContext` ignore it if
`planningSession.generatedPlan` is present (planning takes priority).

**Step 3: Run agent tests**

Run: `cd apps/web && bun test lib/agent/spec/ hooks/useAgent` Expected: PASS.

**Step 4: Commit**

```bash
git add apps/web/lib/agent/spec/persistence.ts apps/web/hooks/useAgent-spec-events.ts apps/web/contexts/AgentRuntimeContext.tsx
git commit -m "refactor(agent): persist specs as planningSession verifications"
```

**Phase 1B acceptance:**

- One approval surface (PlanReview) — no separate spec buttons in chat
- `derivePlanApprovalState` is the single source of truth for plan UI gating
- Specifications still persist but are linked to planningSessions
- All existing tests green; `useAgent.pendingSpec` no longer triggers UI without
  a planning context

---

## Phase 1C — Chat-Workbench Context Bridge

**Strategy:** Editor selection state already lives in `editorContextStore`
(Phase 1A). Now feed it into every agent prompt automatically. The user can opt
out per-message by toggling a UI affordance.

### Task 1C.1: Capture selection from CodeMirror into the store

**Files:**

- Modify: `apps/web/components/editor/CodeMirrorEditor.tsx`
- Create: `apps/web/components/editor/CodeMirrorEditor.selection.test.tsx`

**Step 1: Write the failing test**

```tsx
// apps/web/components/editor/CodeMirrorEditor.selection.test.tsx
import { describe, test, expect, beforeEach } from 'bun:test'
import { render } from '@testing-library/react'
import { CodeMirrorEditor } from './CodeMirrorEditor'
import { useEditorContextStore } from '@/stores/editorContextStore'

describe('CodeMirrorEditor selection sync', () => {
  beforeEach(() => useEditorContextStore.getState().reset())

  test('updates editorContextStore.selection when user selects a range', async () => {
    const { container } = render(
      <CodeMirrorEditor
        filePath="src/a.ts"
        content="line1\nline2\nline3"
        onChange={() => {}}
      />
    )
    // Simulate selection via the editor's view API:
    // (Use the editor's onSelectionChange handler that we will add in Step 2)
    const view = (container as any).__cmView
    view?.dispatch?.({ selection: { anchor: 6, head: 11 } }) // selects "line2"
    await new Promise((r) => setTimeout(r, 0))
    const sel = useEditorContextStore.getState().selection
    expect(sel?.filePath).toBe('src/a.ts')
    expect(sel?.startLine).toBe(2)
    expect(sel?.endLine).toBe(2)
  })
})
```

Run:
`cd apps/web && bun test components/editor/CodeMirrorEditor.selection.test.tsx`
Expected: FAIL.

**Step 2: Wire selection updates**

In `CodeMirrorEditor.tsx`, add a CodeMirror `EditorView.updateListener` that
pushes selection changes into
`useEditorContextStore.getState().setSelection(...)`:

```ts
import { EditorView } from '@codemirror/view'
import { useEditorContextStore } from '@/stores/editorContextStore'

const selectionListener = EditorView.updateListener.of((update) => {
  if (!update.selectionSet) return
  const { from, to } = update.state.selection.main
  if (from === to) {
    useEditorContextStore.getState().setSelection(null)
    return
  }
  const startLine = update.state.doc.lineAt(from).number
  const endLine = update.state.doc.lineAt(to).number
  const text = update.state.doc.sliceString(from, to)
  useEditorContextStore.getState().setSelection({
    filePath: filePathRef.current,
    startLine,
    endLine,
    text,
  })
})
```

Add `selectionListener` to the editor's `extensions` array.

**Step 3: Run test**

Run:
`cd apps/web && bun test components/editor/CodeMirrorEditor.selection.test.tsx`
Expected: PASS.

**Step 4: Commit**

```bash
git add apps/web/components/editor/CodeMirrorEditor.tsx apps/web/components/editor/CodeMirrorEditor.selection.test.tsx
git commit -m "feat(editor): sync CodeMirror selection into editorContextStore"
```

---

### Task 1C.2: Build the editor context block

**Files:**

- Create: `apps/web/lib/agent/buildEditorContextBlock.ts`
- Create: `apps/web/lib/agent/buildEditorContextBlock.test.ts`

**Step 1: Write the failing test**

```ts
// apps/web/lib/agent/buildEditorContextBlock.test.ts
import { describe, test, expect } from 'bun:test'
import { buildEditorContextBlock } from './buildEditorContextBlock'

describe('buildEditorContextBlock', () => {
  test('returns null when there is no active file and no selection', () => {
    expect(
      buildEditorContextBlock({
        activeFile: null,
        selection: null,
        openTabs: [],
      })
    ).toBeNull()
  })

  test('formats active file only', () => {
    const out = buildEditorContextBlock({
      activeFile: 'src/a.ts',
      selection: null,
      openTabs: [{ kind: 'file', path: 'src/a.ts' }],
    })
    expect(out).toContain('Active file: src/a.ts')
    expect(out).not.toContain('Selection')
  })

  test('formats active file with selection', () => {
    const out = buildEditorContextBlock({
      activeFile: 'src/a.ts',
      selection: {
        filePath: 'src/a.ts',
        startLine: 10,
        endLine: 20,
        text: 'foo',
      },
      openTabs: [{ kind: 'file', path: 'src/a.ts' }],
    })
    expect(out).toContain('Selection: src/a.ts:10-20')
    expect(out).toContain('foo')
  })

  test('lists other open tabs separately', () => {
    const out = buildEditorContextBlock({
      activeFile: 'src/a.ts',
      selection: null,
      openTabs: [
        { kind: 'file', path: 'src/a.ts' },
        { kind: 'file', path: 'src/b.ts' },
      ],
    })
    expect(out).toContain('Other open tabs: src/b.ts')
  })

  test('truncates selection text over 1000 chars', () => {
    const longText = 'x'.repeat(2000)
    const out = buildEditorContextBlock({
      activeFile: 'a.ts',
      selection: {
        filePath: 'a.ts',
        startLine: 1,
        endLine: 100,
        text: longText,
      },
      openTabs: [],
    })
    expect(out!.length).toBeLessThan(1500)
    expect(out).toContain('[truncated')
  })
})
```

Run: `cd apps/web && bun test lib/agent/buildEditorContextBlock.test.ts`
Expected: FAIL.

**Step 2: Implement**

````ts
// apps/web/lib/agent/buildEditorContextBlock.ts
import type { WorkspaceOpenTab } from '@/contexts/WorkspaceContext'
import type { EditorSelection } from '@/stores/editorContextStore'

const MAX_SELECTION_CHARS = 1000

export function buildEditorContextBlock(args: {
  activeFile: string | null
  selection: EditorSelection | null
  openTabs: WorkspaceOpenTab[]
}): string | null {
  const { activeFile, selection, openTabs } = args
  if (!activeFile && !selection && openTabs.length === 0) return null

  const lines: string[] = ['<editor-context>']
  if (activeFile) lines.push(`Active file: ${activeFile}`)
  if (selection) {
    lines.push(
      `Selection: ${selection.filePath}:${selection.startLine}-${selection.endLine}`
    )
    if (selection.text) {
      const text =
        selection.text.length > MAX_SELECTION_CHARS
          ? selection.text.slice(0, MAX_SELECTION_CHARS) + ' [truncated]'
          : selection.text
      lines.push('```')
      lines.push(text)
      lines.push('```')
    }
  }
  const others = openTabs
    .filter((t) => t.path !== activeFile)
    .map((t) => t.path)
  if (others.length > 0) {
    lines.push(`Other open tabs: ${others.join(', ')}`)
  }
  lines.push('</editor-context>')
  return lines.join('\n')
}
````

**Step 3: Run tests**

Run: `cd apps/web && bun test lib/agent/buildEditorContextBlock.test.ts`
Expected: PASS.

**Step 4: Commit**

```bash
git add apps/web/lib/agent/buildEditorContextBlock.ts apps/web/lib/agent/buildEditorContextBlock.test.ts
git commit -m "feat(agent): add buildEditorContextBlock formatter"
```

---

### Task 1C.3: Inject editor context into every `sendMessage`

**Files:**

- Modify: `apps/web/hooks/useAgent.ts` (or wherever `sendMessage` is defined)
- Modify: `apps/web/hooks/useProjectMessageWorkflow.ts`

**Step 1: Add the per-message opt-out flag**

Add to `SendAgentMessageOptions`:

```ts
type SendAgentMessageOptions = {
  // ... existing fields
  includeEditorContext?: boolean // defaults to true
}
```

**Step 2: Modify the message-build path to read from the store and prepend the
block**

In `useAgent.sendMessage` (or the underlying `runtime.ts` user-message build),
before sending:

```ts
import { useEditorContextStore } from '@/stores/editorContextStore'
import { buildEditorContextBlock } from '@/lib/agent/buildEditorContextBlock'

const includeEditorContext = options?.includeEditorContext ?? true
let finalContent = content
if (includeEditorContext) {
  const { selectedFilePath, selection, openTabs } =
    useEditorContextStore.getState()
  const block = buildEditorContextBlock({
    activeFile: selectedFilePath,
    selection,
    openTabs,
  })
  if (block) {
    finalContent = `${block}\n\n${content}`
  }
}
```

**Step 3: Add a test**

```ts
// apps/web/hooks/useAgent-context-injection.test.ts
import { describe, test, expect, beforeEach } from 'bun:test'
import { useEditorContextStore } from '@/stores/editorContextStore'
// (Use the same harness pattern as useAgent.test.ts to instantiate sendMessage)

describe('useAgent.sendMessage editor context injection', () => {
  beforeEach(() => useEditorContextStore.getState().reset())

  test('prepends editor context block when active file is set', async () => {
    useEditorContextStore.getState().openTab({ kind: 'file', path: 'src/a.ts' })
    const sentContent = await captureSentContent('hello')
    expect(sentContent).toContain('<editor-context>')
    expect(sentContent).toContain('Active file: src/a.ts')
    expect(sentContent).toContain('hello')
  })

  test('does not prepend when includeEditorContext is false', async () => {
    useEditorContextStore.getState().openTab({ kind: 'file', path: 'src/a.ts' })
    const sentContent = await captureSentContent('hello', {
      includeEditorContext: false,
    })
    expect(sentContent).not.toContain('<editor-context>')
  })

  test('omits block when no active file and no selection', async () => {
    const sentContent = await captureSentContent('hello')
    expect(sentContent).not.toContain('<editor-context>')
    expect(sentContent).toBe('hello')
  })
})
```

(Implement `captureSentContent` as a small spy helper that mocks the LLM
provider to capture the messages array.)

**Step 4: Run tests**

Run:
`cd apps/web && bun test hooks/useAgent-context-injection.test.ts hooks/useAgent.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/hooks/useAgent.ts apps/web/hooks/useAgent-context-injection.test.ts apps/web/hooks/useProjectMessageWorkflow.ts
git commit -m "feat(agent): auto-inject editor context block into every prompt"
```

---

### Task 1C.4: Add the UI affordance to opt out per-message

**Files:**

- Modify: `apps/web/components/chat/ChatInput.tsx`

**Step 1: Add a context-pill toggle**

Above the textarea, render a small chip showing what editor context will be
included:

```tsx
const activeFile = useEditorContextStore((s) => s.selectedFilePath)
const selection = useEditorContextStore((s) => s.selection)
const [includeContext, setIncludeContext] = useState(true)

{
  ;(activeFile || selection) && (
    <button
      type="button"
      className="flex items-center gap-1 text-xs opacity-70 hover:opacity-100"
      onClick={() => setIncludeContext((v) => !v)}
      title={
        includeContext
          ? 'Click to exclude editor context'
          : 'Click to include editor context'
      }
    >
      <Icon name={includeContext ? 'paperclip' : 'paperclip-off'} />
      {selection
        ? `${selection.filePath}:${selection.startLine}-${selection.endLine}`
        : activeFile}
    </button>
  )
}
```

When the user submits, pass `includeEditorContext: includeContext` into the
`onSendMessage` options.

**Step 2: Manual test**

Run the dev server:
`cd "/home/nochaserz/Documents/Coding Projects/panda" && bun run dev`

1. Open a project, select a file, highlight a few lines, send a message.
2. Open the chat inspector → Run tab → verify the assistant turn shows the
   `<editor-context>` block in the rendered prompt.
3. Toggle the chip off, send another message — verify the block is NOT present.

**Step 3: Commit**

```bash
git add apps/web/components/chat/ChatInput.tsx
git commit -m "feat(chat): add editor-context chip with per-message opt-out"
```

---

### Task 1C.5: E2E test the chat-workbench bridge

**Files:**

- Create: `apps/web/e2e/chat-context-bridge.e2e-spec.ts`

**Step 1: Write the e2e**

```ts
import { test, expect } from '@playwright/test'

test('agent receives selected file as context without @-mention', async ({
  page,
}) => {
  await page.goto('/projects/[seeded-project-id]')
  await page.getByTestId('file-tree').getByText('a.ts').click()
  // Select lines 1-3 in the editor
  await page.locator('.cm-editor').click()
  await page.keyboard.press('Control+Home')
  await page.keyboard.press('Control+Shift+End')

  await page.getByTestId('chat-input').fill('what does this do?')
  await page.getByTestId('chat-send').click()

  // Open the inspector and verify the rendered prompt contains the context block
  await page.getByTestId('open-inspector').click()
  const lastPrompt = page.getByTestId('inspector-last-prompt')
  await expect(lastPrompt).toContainText('<editor-context>')
  await expect(lastPrompt).toContainText('Active file: a.ts')
  await expect(lastPrompt).toContainText('Selection: a.ts:')
})
```

**Step 2: Run**

Run: `cd apps/web && bun run test:e2e -- chat-context-bridge.e2e-spec.ts`
Expected: PASS.

**Step 3: Commit**

```bash
git add apps/web/e2e/chat-context-bridge.e2e-spec.ts
git commit -m "test(e2e): verify chat-workbench context bridge end-to-end"
```

**Phase 1C acceptance:**

- Editor selection updates the store in real time
- Every chat message automatically includes the active file + selection in the
  prompt
- User can opt out per-message via a chip in the chat input
- E2E proves the round trip (selection → store → agent prompt)

---

## Phase 1 Wrap-up

### Task W.1: Verify the overall architecture

**Step 1: Run the full test suite**

```bash
cd "/home/nochaserz/Documents/Coding Projects/panda"
bun run typecheck
bun run lint
bun test
cd apps/web && bun run test:e2e
```

Expected: all PASS.

**Step 2: Verify line-count goals**

```bash
wc -l "apps/web/app/(dashboard)/projects/[projectId]/page.tsx"
```

Expected: ≤ 100 lines (down from 889).

```bash
git ls-files "apps/web/hooks/build*.ts" "apps/web/hooks/useProjectWorkspaceUi.ts" "apps/web/hooks/useProjectWorkspaceShellProps.ts" 2>/dev/null
```

Expected: empty (all deleted).

**Step 3: Update the project memory**

Update
`~/.claude/projects/-home-nochaserz-Documents-Coding-Projects-panda/memory/MEMORY.md`
to:

- Remove the "Known gap: Spec injection into agent prompts not implemented" line
  — it's now done.
- Note: "Workspace state lives in Zustand stores under `apps/web/stores/`. Page
  is a slim shell + provider; do not reintroduce prop builders."

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: phase 1 architecture overhaul complete"
```

---

## Notes for the Engineer

**Style:**

- DRY: if you write the same selector twice, hoist it into
  `apps/web/stores/selectors.ts`.
- YAGNI: do NOT add stores for state we don't currently have (no
  `useNotificationsStore`, no `usePermissionsStore` unless a task demands it).
- Frequent commits: every task above ends with a commit. Don't combine.
- TDD: every code task is preceded by a failing test. Don't write production
  code without a red test in your terminal.

**Convex specifics:**

- Schema changes require `bunx convex codegen` before TypeScript will see them.
  Always run codegen _before_ `bun run typecheck`.
- Convex queries auto-subscribe; don't add manual polling.

**Testing toolchain:**

- Unit: `bun test <path>`
- Component (uses Testing Library): `bun test components/...`
- E2E: `cd apps/web && bun run test:e2e`
- A pre-test hook runs `convex:codegen` automatically — don't bypass it.

**Known false-positive risk:**

- Tests that mock `convex/react` need `spyOn(...).mockReset()` in afterEach or
  you'll get cross-test pollution. Add `afterEach(() => mockReset())` whenever
  you spy.

**If you get blocked:**

- Stuck on a Zustand persistence issue → the `partialize` config in
  `workspaceUiStore` is intentional. Do NOT persist `isShareDialogOpen`,
  `isChatInspectorOpen`, etc.
- Stuck on a CodeMirror selection event firing too often → debounce the store
  write to `requestAnimationFrame` in `selectionListener`.
- Stuck on Phase 1B because the user hasn't confirmed the unification model →
  STOP and ask. Do not implement against an unconfirmed design.
