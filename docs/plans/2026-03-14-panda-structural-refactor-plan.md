# Panda IDE Structural Refactor — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Eliminate prop drilling, consolidate state management, create shared
abstractions, fix keyboard shortcut conflicts, and close competitive gaps (git
panel, deploy integration, shortcut registry) — making the codebase maintainable
and extensible enough to compete with Cursor/Blackbox/Replit.

**Architecture:** Introduce a `WorkspaceContext` provider at the page level to
replace 4-layer prop drilling. Extract a shared `TabContainer` component to
eliminate 4 duplicate tab implementations. Create a centralized `useShortcuts`
registry to replace 5 scattered keyboard handlers. Decompose `ProjectChatPanel`
(56+ props) into focused sub-components that consume context directly.

**Tech Stack:** React 19, Next.js (App Router), TypeScript, Zustand (expand from
1 store), Tailwind CSS, Convex, bun test

**Analysis reference:** Conversation from 2026-03-14 deep analysis session
(competitive benchmarking + codebase audit)

---

## Phase 1: Foundation — Shared Abstractions

### Task 1: Create `TabContainer` Shared Component

Currently `RightPanel.tsx`, `SpecPanel.tsx`, `PlanPanel.tsx`, and
`PreviewPanel.tsx` each independently implement tab state + tab button UI +
content switching. ~200 lines of duplication.

**Files:**

- Create: `apps/web/components/ui/tab-container.tsx`
- Test: `apps/web/components/ui/tab-container.test.tsx`

**Step 1: Write the failing test**

```tsx
// apps/web/components/ui/tab-container.test.tsx
import { describe, it, expect } from 'bun:test'
import type { TabItem } from './tab-container'

describe('TabContainer types', () => {
  it('TabItem requires id, label, and content', () => {
    const tab: TabItem = {
      id: 'chat',
      label: 'Chat',
      content: null, // ReactNode
    }
    expect(tab.id).toBe('chat')
    expect(tab.label).toBe('Chat')
  })

  it('TabItem optionally accepts icon className', () => {
    const tab: TabItem = {
      id: 'preview',
      label: 'Preview',
      icon: 'eye-icon-placeholder',
      content: null,
    }
    expect(tab.icon).toBeDefined()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd apps/web && bun test components/ui/tab-container.test.tsx` Expected:
FAIL — `Cannot find module './tab-container'`

**Step 3: Write the TabContainer component**

```tsx
// apps/web/components/ui/tab-container.tsx
'use client'

import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface TabItem {
  id: string
  label: string
  icon?: ReactNode
  content: ReactNode
}

interface TabContainerProps {
  tabs: TabItem[]
  defaultTab?: string
  activeTab?: string
  onTabChange?: (tabId: string) => void
  className?: string
  tabBarClassName?: string
  contentClassName?: string
  /** Variant controls tab styling density */
  variant?: 'default' | 'compact'
}

export function TabContainer({
  tabs,
  defaultTab,
  activeTab: controlledTab,
  onTabChange,
  className,
  tabBarClassName,
  contentClassName,
  variant = 'default',
}: TabContainerProps) {
  const [internalTab, setInternalTab] = useState(
    defaultTab ?? tabs[0]?.id ?? ''
  )
  const activeTab = controlledTab ?? internalTab

  function handleTabChange(tabId: string) {
    if (controlledTab === undefined) {
      setInternalTab(tabId)
    }
    onTabChange?.(tabId)
  }

  const isCompact = variant === 'compact'

  return (
    <div className={cn('flex h-full flex-col', className)}>
      <div
        className={cn(
          'border-border flex border-b',
          isCompact ? 'px-2' : 'px-3',
          tabBarClassName
        )}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                'flex items-center gap-1.5 font-mono tracking-widest uppercase transition-colors duration-150',
                isCompact ? 'px-3 py-1.5 text-[10px]' : 'px-2 py-1 text-xs',
                isActive
                  ? 'border-primary text-foreground border-b-2'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          )
        })}
      </div>
      <div className={cn('flex-1 overflow-hidden', contentClassName)}>
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={cn('h-full', tab.id !== activeTab && 'hidden')}
          >
            {tab.content}
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `cd apps/web && bun test components/ui/tab-container.test.tsx` Expected:
PASS

**Step 5: Commit**

```bash
git add apps/web/components/ui/tab-container.tsx apps/web/components/ui/tab-container.test.tsx
git commit -m "feat: add shared TabContainer component to eliminate tab duplication"
```

---

### Task 2: Create `useShortcuts` Centralized Keyboard Shortcut Registry

Currently keyboard shortcuts are handled in 5 separate places with **a Ctrl+B
conflict** between `useSidebar.ts:35` (toggles flyout) and
`useProjectWorkspaceUi.ts:51` (toggles chat panel). Additional handlers in
`CommandPalette.tsx` (react-hotkeys-hook), `MentionPicker.tsx`, and
`AgentSelector.tsx`.

**Files:**

- Create: `apps/web/hooks/useShortcuts.ts`
- Create: `apps/web/lib/shortcuts/registry.ts`
- Test: `apps/web/lib/shortcuts/registry.test.ts`

**Step 1: Write the failing test**

```ts
// apps/web/lib/shortcuts/registry.test.ts
import { describe, it, expect } from 'bun:test'
import { ShortcutRegistry } from './registry'

describe('ShortcutRegistry', () => {
  it('registers and retrieves a shortcut', () => {
    const registry = new ShortcutRegistry()
    registry.register({
      id: 'toggle-sidebar',
      keys: 'mod+b',
      label: 'Toggle Sidebar',
      handler: () => {},
    })
    const shortcut = registry.get('toggle-sidebar')
    expect(shortcut).toBeDefined()
    expect(shortcut!.keys).toBe('mod+b')
  })

  it('detects key conflicts', () => {
    const registry = new ShortcutRegistry()
    registry.register({
      id: 'toggle-sidebar',
      keys: 'mod+b',
      label: 'Toggle Sidebar',
      handler: () => {},
    })
    const conflict = registry.findConflict('mod+b')
    expect(conflict).toBe('toggle-sidebar')
  })

  it('unregisters a shortcut', () => {
    const registry = new ShortcutRegistry()
    registry.register({
      id: 'toggle-sidebar',
      keys: 'mod+b',
      label: 'Toggle Sidebar',
      handler: () => {},
    })
    registry.unregister('toggle-sidebar')
    expect(registry.get('toggle-sidebar')).toBeUndefined()
  })

  it('lists all shortcuts for help UI', () => {
    const registry = new ShortcutRegistry()
    registry.register({ id: 'a', keys: 'mod+b', label: 'A', handler: () => {} })
    registry.register({ id: 'b', keys: 'mod+k', label: 'B', handler: () => {} })
    expect(registry.listAll()).toHaveLength(2)
  })

  it('matchEvent returns the correct handler', () => {
    let called = false
    const registry = new ShortcutRegistry()
    registry.register({
      id: 'test',
      keys: 'mod+shift+e',
      label: 'Test',
      handler: () => {
        called = true
      },
    })
    // Simulate a KeyboardEvent-like object
    const event = {
      key: 'e',
      metaKey: true,
      ctrlKey: false,
      shiftKey: true,
      altKey: false,
      preventDefault: () => {},
    }
    const match = registry.matchEvent(event as unknown as KeyboardEvent)
    expect(match).toBeDefined()
    match!.handler()
    expect(called).toBe(true)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd apps/web && bun test lib/shortcuts/registry.test.ts` Expected: FAIL —
`Cannot find module './registry'`

**Step 3: Write the ShortcutRegistry class**

```ts
// apps/web/lib/shortcuts/registry.ts

export interface ShortcutEntry {
  id: string
  keys: string // e.g. 'mod+b', 'mod+shift+e', 'mod+k'
  label: string
  handler: () => void
  /** Optional category for grouping in help UI */
  category?: string
}

/**
 * Centralized shortcut registry. Replaces 5 scattered keydown listeners.
 *
 * Key format: 'mod+key' where mod = Cmd (mac) / Ctrl (win/linux)
 * Modifiers: mod, shift, alt — always lowercase, '+' separated
 * Examples: 'mod+b', 'mod+shift+e', 'mod+k', 'mod+`'
 */
export class ShortcutRegistry {
  private shortcuts = new Map<string, ShortcutEntry>()

  register(entry: ShortcutEntry): void {
    this.shortcuts.set(entry.id, entry)
  }

  unregister(id: string): void {
    this.shortcuts.delete(id)
  }

  get(id: string): ShortcutEntry | undefined {
    return this.shortcuts.get(id)
  }

  findConflict(keys: string): string | undefined {
    for (const [id, entry] of this.shortcuts) {
      if (entry.keys === keys) return id
    }
    return undefined
  }

  listAll(): ShortcutEntry[] {
    return Array.from(this.shortcuts.values())
  }

  /**
   * Match a DOM KeyboardEvent against registered shortcuts.
   * Returns the matching entry or undefined.
   */
  matchEvent(event: KeyboardEvent): ShortcutEntry | undefined {
    const parts: string[] = []
    if (event.metaKey || event.ctrlKey) parts.push('mod')
    if (event.shiftKey) parts.push('shift')
    if (event.altKey) parts.push('alt')
    parts.push(event.key.toLowerCase())
    const pressed = parts.join('+')

    for (const entry of this.shortcuts.values()) {
      if (entry.keys === pressed) return entry
    }
    return undefined
  }
}

/** Singleton instance shared across the app */
export const shortcutRegistry = new ShortcutRegistry()
```

**Step 4: Run test to verify it passes**

Run: `cd apps/web && bun test lib/shortcuts/registry.test.ts` Expected: PASS
(all 5 tests)

**Step 5: Write the `useShortcuts` hook**

```ts
// apps/web/hooks/useShortcuts.ts
'use client'

import { useEffect } from 'react'
import { shortcutRegistry, type ShortcutEntry } from '@/lib/shortcuts/registry'

/**
 * Register shortcuts on mount, unregister on unmount.
 * Replaces scattered window.addEventListener('keydown', ...) calls.
 */
export function useShortcuts(entries: ShortcutEntry[]) {
  useEffect(() => {
    for (const entry of entries) {
      shortcutRegistry.register(entry)
    }
    return () => {
      for (const entry of entries) {
        shortcutRegistry.unregister(entry.id)
      }
    }
  }, [entries])
}

/**
 * Attach a single global keydown listener that dispatches to the registry.
 * Call this ONCE at the app root (e.g. in a layout or provider).
 */
export function useShortcutListener() {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const match = shortcutRegistry.matchEvent(event)
      if (match) {
        event.preventDefault()
        match.handler()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
}
```

**Step 6: Commit**

```bash
git add apps/web/lib/shortcuts/registry.ts apps/web/lib/shortcuts/registry.test.ts apps/web/hooks/useShortcuts.ts
git commit -m "feat: add centralized ShortcutRegistry and useShortcuts hook"
```

---

### Task 3: Create `WorkspaceContext` Provider

`page.tsx` currently passes 28 props through `ProjectWorkspaceLayout` to
`Workbench`, and 56+ props into `ProjectChatPanel`. This context will hold the
core workspace state so deeply-nested components can consume directly.

**Files:**

- Create: `apps/web/contexts/WorkspaceContext.tsx`
- Test: `apps/web/contexts/WorkspaceContext.test.tsx`

**Step 1: Write the failing test**

```tsx
// apps/web/contexts/WorkspaceContext.test.tsx
import { describe, it, expect } from 'bun:test'

// Type-level test — ensure the context shape is importable and correct
describe('WorkspaceContext types', () => {
  it('exports WorkspaceProvider and useWorkspace', async () => {
    const mod = await import('./WorkspaceContext')
    expect(mod.WorkspaceProvider).toBeDefined()
    expect(mod.useWorkspace).toBeDefined()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd apps/web && bun test contexts/WorkspaceContext.test.tsx` Expected: FAIL
— `Cannot find module './WorkspaceContext'`

**Step 3: Write the WorkspaceContext**

```tsx
// apps/web/contexts/WorkspaceContext.tsx
'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { Id } from '@convex/_generated/dataModel'
import type { ChatMode } from '@/lib/agent/prompt-library'
import type { SidebarSection } from '@/components/sidebar/SidebarRail'

// ── File/Editor State ──────────────────────────────────────
interface FileState {
  selectedFilePath: string | null
  setSelectedFilePath: (path: string | null) => void
  selectedFileLocation: { line: number; column: number; nonce: number } | null
  setSelectedFileLocation: (
    loc: { line: number; column: number; nonce: number } | null
  ) => void
  openTabs: Array<{ path: string; isDirty?: boolean }>
  setOpenTabs: (
    fn: (
      prev: Array<{ path: string; isDirty?: boolean }>
    ) => Array<{ path: string; isDirty?: boolean }>
  ) => void
  cursorPosition: { line: number; column: number } | null
  setCursorPosition: (pos: { line: number; column: number } | null) => void
}

// ── Sidebar State ──────────────────────────────────────────
interface SidebarState {
  activeSection: SidebarSection
  isFlyoutOpen: boolean
  handleSectionChange: (section: SidebarSection) => void
  toggleFlyout: () => void
}

// ── Layout State ───────────────────────────────────────────
interface LayoutState {
  isMobileLayout: boolean
  isCompactDesktopLayout: boolean
  mobilePrimaryPanel: 'workspace' | 'chat' | 'preview'
  setMobilePrimaryPanel: (panel: 'workspace' | 'chat' | 'preview') => void
  isChatPanelOpen: boolean
  setIsChatPanelOpen: (value: boolean | ((prev: boolean) => boolean)) => void
}

// ── Project/Chat Identity ──────────────────────────────────
interface ProjectState {
  projectId: Id<'projects'>
  activeChatId?: Id<'chats'>
  chatMode: ChatMode
  onSelectChat: (chatId: Id<'chats'>) => void
  onNewChat: () => void
}

// ── Combined ───────────────────────────────────────────────
export interface WorkspaceContextValue
  extends FileState, SidebarState, LayoutState, ProjectState {}

const WorkspaceCtx = createContext<WorkspaceContextValue | null>(null)

interface WorkspaceProviderProps {
  value: WorkspaceContextValue
  children: ReactNode
}

export function WorkspaceProvider({ value, children }: WorkspaceProviderProps) {
  return <WorkspaceCtx.Provider value={value}>{children}</WorkspaceCtx.Provider>
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceCtx)
  if (!ctx) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider')
  }
  return ctx
}
```

**Step 4: Run test to verify it passes**

Run: `cd apps/web && bun test contexts/WorkspaceContext.test.tsx` Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/contexts/WorkspaceContext.tsx apps/web/contexts/WorkspaceContext.test.tsx
git commit -m "feat: add WorkspaceContext to replace 4-layer prop drilling"
```

---

## Phase 2: Fix Conflicts & Consolidate State

### Task 4: Fix Ctrl+B Keyboard Shortcut Conflict

**The bug:** Both `useSidebar.ts:35` and `useProjectWorkspaceUi.ts:51` listen
for `Ctrl+B`. The sidebar handler toggles the flyout. The workspace UI handler
toggles the chat panel. Both fire simultaneously.

**Decision:** Ctrl+B should toggle the sidebar flyout (matches VS Code
convention). Chat panel toggle is no longer needed since chat is always visible
in the right panel tabs.

**Files:**

- Modify: `apps/web/hooks/useProjectWorkspaceUi.ts:49-66`
- Modify: `apps/web/hooks/useSidebar.ts:32-43`

**Step 1: Remove the conflicting Ctrl+B handler from useProjectWorkspaceUi**

In `apps/web/hooks/useProjectWorkspaceUi.ts`, remove the entire `useEffect`
block at lines 49-66 that handles keyboard shortcuts. The Ctrl+B binding will
live exclusively in `useSidebar.ts`, and the terminal toggle (`Ctrl+backtick`)
will be migrated to the shortcut registry in a later task.

Replace lines 49-66 with:

```ts
// Keyboard shortcuts moved to useShortcuts registry (Task 2)
// Terminal toggle: Ctrl+` → handled by shortcut registry
// Sidebar toggle: Ctrl+B → handled by useSidebar.ts
```

**Step 2: Verify no regressions**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -30` Expected: No
type errors

Run: `cd apps/web && bun test hooks/ 2>&1 | tail -20` Expected: All existing
hook tests pass

**Step 3: Commit**

```bash
git add apps/web/hooks/useProjectWorkspaceUi.ts
git commit -m "fix: remove duplicate Ctrl+B handler from useProjectWorkspaceUi (conflict with useSidebar)"
```

---

### Task 5: Consolidate localStorage Persistence

Currently 3 separate persistence mechanisms:

- `useLayoutPersistence.ts` — stores `isChatPanelOpen`, `activeSidebarTab`
  (STALE — sidebar moved to `useSidebar`), `isTerminalExpanded` (STALE —
  terminal state moved to `Workbench.tsx`)
- `useSidebar.ts` — stores `activeSection`, `isFlyoutOpen` with 2 separate
  `localStorage.setItem` calls
- `Workbench.tsx:204-206` — stores `isTerminalExpanded` independently

**Files:**

- Modify: `apps/web/hooks/useLayoutPersistence.ts`
- Modify: `apps/web/hooks/useSidebar.ts`

**Step 1: Audit what useLayoutPersistence still provides**

Read `apps/web/hooks/useLayoutPersistence.ts` and check which of its exports are
consumed:

- `isChatPanelOpen` / `setIsChatPanelOpen` → used by
  `useProjectWorkspaceUi.ts:11`
- `activeSidebarTab` / `setActiveSidebarTab` → **NOT imported anywhere** (stale
  since sidebar refactor)
- `isTerminalExpanded` / `setIsTerminalExpanded` → **NOT imported anywhere**
  (Workbench manages its own)

**Step 2: Remove stale exports from useLayoutPersistence**

Simplify `useLayoutPersistence.ts` to only handle `isChatPanelOpen`:

```ts
// apps/web/hooks/useLayoutPersistence.ts
'use client'

import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'panda:layout-state'

interface LayoutState {
  isChatPanelOpen: boolean
}

const defaultState: LayoutState = {
  isChatPanelOpen: true,
}

export function useLayoutPersistence() {
  const [state, setState] = useState<LayoutState>(() => {
    if (typeof window === 'undefined') return defaultState
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        return {
          isChatPanelOpen:
            parsed.isChatPanelOpen ?? defaultState.isChatPanelOpen,
        }
      }
    } catch {
      // Ignore parse errors
    }
    return defaultState
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const setIsChatPanelOpen = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      setState((prev) => ({
        ...prev,
        isChatPanelOpen:
          typeof value === 'function' ? value(prev.isChatPanelOpen) : value,
      }))
    },
    []
  )

  return {
    isChatPanelOpen: state.isChatPanelOpen,
    setIsChatPanelOpen,
  }
}
```

**Step 3: Verify compilation**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -30` Expected: No
errors (confirm no file imports the removed `activeSidebarTab` or
`isTerminalExpanded`)

**Step 4: Commit**

```bash
git add apps/web/hooks/useLayoutPersistence.ts
git commit -m "refactor: remove stale activeSidebarTab and isTerminalExpanded from useLayoutPersistence"
```

---

### Task 6: Consolidate Mobile State Into `useMobileLayout` Hook

Mobile state is scattered across `useProjectWorkspaceUi.ts` (5 pieces) and
`Workbench.tsx` (duplicate media query + local `mobilePanel` state).

**Files:**

- Create: `apps/web/hooks/useMobileLayout.ts`
- Test: `apps/web/hooks/useMobileLayout.test.ts`

**Step 1: Write the failing test**

```ts
// apps/web/hooks/useMobileLayout.test.ts
import { describe, it, expect } from 'bun:test'

describe('useMobileLayout types', () => {
  it('exports useMobileLayout', async () => {
    const mod = await import('./useMobileLayout')
    expect(mod.useMobileLayout).toBeDefined()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd apps/web && bun test hooks/useMobileLayout.test.ts` Expected: FAIL —
`Cannot find module`

**Step 3: Write the hook**

```ts
// apps/web/hooks/useMobileLayout.ts
'use client'

import { useState, useEffect, useCallback } from 'react'

type MobilePrimaryPanel = 'workspace' | 'chat' | 'preview'

export function useMobileLayout() {
  const [isMobileLayout, setIsMobileLayout] = useState(false)
  const [isCompactDesktopLayout, setIsCompactDesktopLayout] = useState(false)
  const [mobilePrimaryPanel, setMobilePrimaryPanel] =
    useState<MobilePrimaryPanel>('workspace')
  const [mobileUnreadCount, setMobileUnreadCount] = useState(0)
  const [isMobileKeyboardOpen, setIsMobileKeyboardOpen] = useState(false)

  // Media query listeners — single source of truth
  useEffect(() => {
    const mobileMedia = window.matchMedia('(max-width: 1023px)')
    const compactDesktopMedia = window.matchMedia(
      '(min-width: 1024px) and (max-width: 1279px)'
    )
    const update = () => {
      setIsMobileLayout(mobileMedia.matches)
      setIsCompactDesktopLayout(compactDesktopMedia.matches)
    }
    update()
    mobileMedia.addEventListener('change', update)
    compactDesktopMedia.addEventListener('change', update)
    return () => {
      mobileMedia.removeEventListener('change', update)
      compactDesktopMedia.removeEventListener('change', update)
    }
  }, [])

  // Reset unread count when viewing chat on mobile
  const resetUnreadCount = useCallback(() => {
    setMobileUnreadCount(0)
  }, [])

  return {
    isMobileLayout,
    isCompactDesktopLayout,
    mobilePrimaryPanel,
    setMobilePrimaryPanel,
    mobileUnreadCount,
    setMobileUnreadCount,
    resetUnreadCount,
    isMobileKeyboardOpen,
    setIsMobileKeyboardOpen,
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd apps/web && bun test hooks/useMobileLayout.test.ts` Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/hooks/useMobileLayout.ts apps/web/hooks/useMobileLayout.test.ts
git commit -m "feat: add useMobileLayout hook to consolidate scattered mobile state"
```

---

## Phase 3: Wire WorkspaceContext Into Component Tree

### Task 7: Wire `WorkspaceProvider` in `page.tsx`

Wrap the render tree with `WorkspaceProvider`, populate the context value from
existing hooks. This is a **pure wiring task** — no behavior changes, just
making state available via context.

**Files:**

- Modify: `apps/web/app/(dashboard)/projects/[projectId]/page.tsx`

**Step 1: Import and wrap**

At the top of `page.tsx`, add import:

```ts
import {
  WorkspaceProvider,
  type WorkspaceContextValue,
} from '@/contexts/WorkspaceContext'
```

Before the `return` statement (after all hooks and callbacks are defined),
assemble the context value:

```tsx
const workspaceContextValue: WorkspaceContextValue = {
  // File state
  selectedFilePath,
  setSelectedFilePath,
  selectedFileLocation,
  setSelectedFileLocation,
  openTabs,
  setOpenTabs,
  cursorPosition,
  setCursorPosition,
  // Sidebar state
  activeSection,
  isFlyoutOpen,
  handleSectionChange,
  toggleFlyout,
  // Layout state
  isMobileLayout,
  isCompactDesktopLayout,
  mobilePrimaryPanel,
  setMobilePrimaryPanel,
  isChatPanelOpen,
  setIsChatPanelOpen,
  // Project state
  projectId,
  activeChatId: activeChat?._id,
  chatMode,
  onSelectChat: handleSelectChat,
  onNewChat: () => {
    void handleNewChat()
  },
}
```

Wrap the main return JSX:

```tsx
return (
  <WorkspaceProvider value={workspaceContextValue}>
    <div className="bg-background fixed inset-0 top-0 z-10 flex flex-col overflow-hidden">
      {/* ... existing JSX unchanged ... */}
    </div>
  </WorkspaceProvider>
)
```

**Step 2: Verify compilation — zero new errors**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -30` Expected: No
errors

**Step 3: Commit**

```bash
git add apps/web/app/\(dashboard\)/projects/\[projectId\]/page.tsx
git commit -m "feat: wire WorkspaceProvider at page level with full context value"
```

---

### Task 8: Migrate `Workbench.tsx` to Consume `useWorkspace`

Replace prop drilling for sidebar, file selection, and layout state. Remove the
**duplicate media query listeners** in `Workbench.tsx:224-238` (already handled
by `useMobileLayout` via context).

**Files:**

- Modify: `apps/web/components/workbench/Workbench.tsx`

**Step 1: Remove duplicated props from WorkbenchProps**

Remove these props from the `WorkbenchProps` interface (they'll come from
context):

- `sidebarActiveSection`, `isSidebarFlyoutOpen`, `onSidebarSectionChange`,
  `onToggleSidebarFlyout`
- `onSelectChat`, `onNewChat`

Keep props that are workbench-specific (files, editor callbacks, etc.).

**Step 2: Import and consume context**

```ts
import { useWorkspace } from '@/contexts/WorkspaceContext'

// Inside the component:
const {
  activeSection: sidebarActiveSection,
  isFlyoutOpen: isSidebarFlyoutOpen,
  handleSectionChange: onSidebarSectionChange,
  toggleFlyout: onToggleSidebarFlyout,
  onSelectChat,
  onNewChat,
  isMobileLayout: isMobile,
  isCompactDesktopLayout: isCompactDesktop,
} = useWorkspace()
```

**Step 3: Remove the duplicate media query useEffect** (lines ~224-238)

Delete the `useEffect` that creates `mobileMedia` and `compactDesktopMedia`
listeners — this is now handled by `useMobileLayout` which feeds into context.

Also remove the local `useState` for `isMobile` and `isCompactDesktop` (lines
~201-202).

**Step 4: Update ProjectWorkspaceLayout to stop passing removed props**

In `apps/web/components/projects/ProjectWorkspaceLayout.tsx`, remove the
now-unnecessary props from the `<Workbench>` JSX:

- Remove: `sidebarActiveSection`, `isSidebarFlyoutOpen`,
  `onSidebarSectionChange`, `onToggleSidebarFlyout`, `onSelectChat`, `onNewChat`

Remove these from `ProjectWorkspaceLayoutProps` as well.

**Step 5: Verify compilation**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -30` Expected: No
errors

**Step 6: Commit**

```bash
git add apps/web/components/workbench/Workbench.tsx apps/web/components/projects/ProjectWorkspaceLayout.tsx
git commit -m "refactor: migrate Workbench to consume WorkspaceContext, remove prop drilling"
```

---

## Phase 4: Refactor `TabContainer` Into Existing Panels

### Task 9: Migrate `RightPanel` to Use `TabContainer`

**Files:**

- Modify: `apps/web/components/panels/RightPanel.tsx`

**Step 1: Rewrite RightPanel using TabContainer**

```tsx
// apps/web/components/panels/RightPanel.tsx
'use client'

import type { ReactNode } from 'react'
import { Eye, MessageSquare } from 'lucide-react'
import { TabContainer, type TabItem } from '@/components/ui/tab-container'
import { ModeToggle } from '@/components/chat/ModeToggle'

export type RightPanelTab = 'chat' | 'preview'

interface RightPanelProps {
  chatContent: ReactNode
  previewContent: ReactNode
  chatInput: ReactNode
  automationMode: 'manual' | 'auto'
  onAutomationModeChange: (mode: 'manual' | 'auto') => void
  isStreaming?: boolean
  activeTab?: RightPanelTab
  onTabChange?: (tab: RightPanelTab) => void
}

export function RightPanel({
  chatContent,
  previewContent,
  chatInput,
  automationMode,
  onAutomationModeChange,
  isStreaming,
  activeTab,
  onTabChange,
}: RightPanelProps) {
  const tabs: TabItem[] = [
    {
      id: 'chat',
      label: 'Chat',
      icon: <MessageSquare className="h-3.5 w-3.5" />,
      content: chatContent,
    },
    {
      id: 'preview',
      label: 'Preview',
      icon: <Eye className="h-3.5 w-3.5" />,
      content: previewContent,
    },
  ]

  return (
    <div className="surface-1 border-border flex h-full flex-col border-l">
      <div className="border-border flex items-center justify-between border-b px-3 py-2">
        <TabContainer
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(id) => onTabChange?.(id as RightPanelTab)}
          className="flex-1"
          tabBarClassName="border-b-0"
        />
        <ModeToggle
          mode={automationMode}
          onModeChange={onAutomationModeChange}
          disabled={isStreaming}
        />
      </div>
      {/* Tab content rendered by TabContainer above handles visibility */}
      {chatInput}
    </div>
  )
}
```

> **Note:** This task may require adjusting how `TabContainer` renders content
> vs header. If `TabContainer` bundles both header+content, the `RightPanel`
> layout needs `TabContainer` to accept a `headerSlot` or use it in a
> "header-only" + "content-only" split mode. Evaluate during implementation — if
> the split is cleaner, add `renderHeader` / `renderContent` props to
> `TabContainer` instead.

**Step 2: Verify compilation**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -30` Expected: No
errors

**Step 3: Commit**

```bash
git add apps/web/components/panels/RightPanel.tsx
git commit -m "refactor: migrate RightPanel to use shared TabContainer"
```

---

### Task 10: Migrate `PreviewPanel` to Use `TabContainer`

**Files:**

- Modify: `apps/web/components/preview/PreviewPanel.tsx`

**Step 1: Rewrite using TabContainer**

Replace the inline tab buttons and state with `TabContainer` using
`variant="compact"`.

**Step 2: Verify compilation**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -30` Expected: No
errors

**Step 3: Commit**

```bash
git add apps/web/components/preview/PreviewPanel.tsx
git commit -m "refactor: migrate PreviewPanel to use shared TabContainer"
```

---

## Phase 5: Competitive Gap — Shortcut Registry Integration

### Task 11: Migrate All Keyboard Shortcuts to Registry

Replace the 5 scattered `window.addEventListener('keydown')` implementations
with `useShortcuts` + `useShortcutListener`.

**Files:**

- Modify: `apps/web/hooks/useSidebar.ts` — remove `useEffect` keydown listener,
  use `useShortcuts`
- Modify: `apps/web/hooks/useProjectWorkspaceUi.ts` — already cleaned in Task 4
- Modify: `apps/web/components/command-palette/CommandPalette.tsx` — migrate
  `react-hotkeys-hook` to registry
- Modify: `apps/web/app/(dashboard)/projects/[projectId]/page.tsx` — add
  `useShortcutListener()` call
- Modify: `apps/web/components/workbench/Workbench.tsx` — remove
  `panda:toggle-terminal` custom event

**Step 1: Add `useShortcutListener()` to page.tsx**

In `page.tsx`, after hooks are initialized:

```ts
import { useShortcutListener } from '@/hooks/useShortcuts'

// Inside ProjectPage, after all hook calls:
useShortcutListener()
```

**Step 2: Migrate useSidebar.ts**

Remove the `useEffect` at lines 32-43. Replace with:

```ts
import { useShortcuts } from '@/hooks/useShortcuts'

// Inside useSidebar(), replace the useEffect with:
useShortcuts([
  {
    id: 'toggle-sidebar',
    keys: 'mod+b',
    label: 'Toggle Sidebar',
    handler: () => setIsFlyoutOpen((prev) => !prev),
    category: 'Navigation',
  },
])
```

**Step 3: Migrate CommandPalette.tsx**

Replace the `react-hotkeys-hook` import and `useHotkeys('mod+k', ...)` call
with:

```ts
import { useShortcuts } from '@/hooks/useShortcuts'

useShortcuts([
  {
    id: 'command-palette',
    keys: 'mod+k',
    label: 'Command Palette',
    handler: () => useCommandPaletteStore.getState().toggle(),
    category: 'General',
  },
])
```

**Step 4: Migrate terminal toggle**

In `page.tsx` (or `Workbench.tsx`), register:

```ts
{
  id: 'toggle-terminal',
  keys: 'mod+`',
  label: 'Toggle Terminal',
  handler: () => setIsTerminalExpanded((prev) => !prev),
  category: 'Panels',
}
```

Remove the `window.dispatchEvent(new CustomEvent('panda:toggle-terminal'))` from
`useProjectWorkspaceUi.ts` and the corresponding
`window.addEventListener('panda:toggle-terminal')` from `Workbench.tsx`.

**Step 5: Verify no regressions**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -30` Expected: No
errors

Run: `cd apps/web && bun test hooks/ lib/shortcuts/ 2>&1 | tail -20` Expected:
All tests pass

**Step 6: Commit**

```bash
git add apps/web/hooks/useSidebar.ts apps/web/hooks/useProjectWorkspaceUi.ts apps/web/hooks/useShortcuts.ts apps/web/components/command-palette/CommandPalette.tsx apps/web/components/workbench/Workbench.tsx apps/web/app/\(dashboard\)/projects/\[projectId\]/page.tsx
git commit -m "refactor: migrate all keyboard shortcuts to centralized ShortcutRegistry"
```

---

## Phase 6: Competitive Gap — Git Integration Panel

### Task 12: Create `GitStatusPanel` Sidebar Component

Add a basic git status/diff viewer to the sidebar. This is the most-requested
missing feature compared to Cursor/Blackbox. Since Panda files live in Convex
(not local filesystem), this panel shows **file change history** from the Convex
`files` table rather than actual git.

**Files:**

- Create: `apps/web/components/sidebar/SidebarGitPanel.tsx`
- Modify: `apps/web/components/sidebar/SidebarRail.tsx` — add `git` section to
  rail items
- Modify: `apps/web/components/sidebar/SidebarRail.tsx` — update
  `SidebarSection` type
- Modify: `apps/web/components/workbench/Workbench.tsx` — render
  `SidebarGitPanel` in flyout

**Step 1: Update `SidebarSection` type**

In `apps/web/components/sidebar/SidebarRail.tsx`, add `'git'` to the
`SidebarSection` union type:

```ts
export type SidebarSection =
  | 'new-chat'
  | 'explorer'
  | 'search'
  | 'history'
  | 'builder'
  | 'specs'
  | 'git'
  | 'terminal'
```

Add to `MAIN_ITEMS` array (between `specs` and `terminal`):

```ts
{ id: 'git', icon: GitBranch, label: 'Source Control', shortcut: 'Ctrl+Shift+G' },
```

Import `GitBranch` from `lucide-react`.

**Step 2: Create SidebarGitPanel**

```tsx
// apps/web/components/sidebar/SidebarGitPanel.tsx
'use client'

import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { GitBranch, FileDiff, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'

interface SidebarGitPanelProps {
  projectId: Id<'projects'>
}

export function SidebarGitPanel({ projectId }: SidebarGitPanelProps) {
  const files = useQuery(api.files.list, { projectId })

  // Sort by most recently updated
  const recentlyChanged = [...(files ?? [])]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 20)

  return (
    <div className="flex h-full flex-col">
      <div className="border-border flex items-center gap-2 border-b px-3 py-2">
        <GitBranch className="text-muted-foreground h-3.5 w-3.5" />
        <span className="text-muted-foreground font-mono text-xs">main</span>
      </div>

      <div className="border-border border-b px-3 py-2">
        <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
          Changed Files ({recentlyChanged.length})
        </span>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-1">
          {recentlyChanged.length === 0 ? (
            <div className="text-muted-foreground px-3 py-6 text-center font-mono text-xs">
              No file changes
            </div>
          ) : (
            recentlyChanged.map((file) => (
              <div
                key={file._id}
                className="hover:bg-surface-2 flex items-center gap-2 px-3 py-1.5 text-left transition-colors duration-150"
              >
                <FileDiff className="text-muted-foreground h-3.5 w-3.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-foreground truncate font-mono text-xs">
                    {file.path.split('/').pop()}
                  </div>
                  <div className="text-muted-foreground truncate font-mono text-[10px]">
                    {file.path}
                  </div>
                </div>
                <div className="text-muted-foreground flex items-center gap-1 font-mono text-[10px]">
                  <Clock className="h-3 w-3" />
                  {new Date(file.updatedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
```

**Step 3: Wire into Workbench flyout**

In `Workbench.tsx`, import `SidebarGitPanel` and add a rendering block:

```tsx
{
  sidebarActiveSection === 'git' && <SidebarGitPanel projectId={projectId} />
}
```

**Step 4: Verify compilation**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -30` Expected: No
errors

**Step 5: Commit**

```bash
git add apps/web/components/sidebar/SidebarRail.tsx apps/web/components/sidebar/SidebarGitPanel.tsx apps/web/components/workbench/Workbench.tsx
git commit -m "feat: add SidebarGitPanel with file change history (Source Control section)"
```

---

## Phase 7: Activate Panda's Competitive Moat — Spec System

### Task 13: Enable Spec Engine by Default

The spec system (`FormalSpecification`, `SpecTier`, drift detection,
verification) is Panda's **unique differentiator** — no competitor has this. But
it's disabled (`specEngine.enabled = false`) and the tracking plugin isn't
registered.

**Files:**

- Modify: `apps/web/lib/agent/spec/engine.ts` — change default `enabled` to
  `true`
- Modify: `apps/web/lib/agent/harness/plugins.ts` — register
  `specTrackingPlugin`
- Modify: `apps/web/hooks/useAgent.ts` — ensure spec engine is wired

**Step 1: Find and flip the enabled flag**

Search for `enabled = false` or `enabled: false` in
`apps/web/lib/agent/spec/engine.ts` and change to `true`.

**Step 2: Register the specTrackingPlugin**

In `apps/web/lib/agent/harness/plugins.ts`, find where plugins are
collected/exported and add `specTrackingPlugin` to the active plugin list.

**Step 3: Deploy Convex schema** (if not already deployed)

Run:
`cd "/home/nochaserz/Documents/Coding Projects/panda" && npx convex dev --once`
Expected: `specifications` table deployed without errors

**Step 4: Verify tests**

Run: `cd apps/web && bun test lib/agent/spec/ 2>&1 | tail -20` Expected: All
spec tests pass

**Step 5: Verify compilation**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -30` Expected: No
errors

**Step 6: Commit**

```bash
git add apps/web/lib/agent/spec/engine.ts apps/web/lib/agent/harness/plugins.ts
git commit -m "feat: enable spec engine by default and register specTrackingPlugin"
```

---

## Phase 8: Final Verification

### Task 14: Full Verification Pass

**Step 1: TypeScript compilation**

Run: `cd apps/web && npx tsc --noEmit --pretty` Expected: Zero errors

**Step 2: Full test suite**

Run: `cd apps/web && bun test app components hooks lib` Expected: All tests pass
(no regressions)

**Step 3: Manual browser verification checklist**

1. Open a project — sidebar rail shows all sections including new "Source
   Control" (git icon)
2. Click sidebar icons — flyout opens/closes, sections switch correctly
3. Press `Ctrl+B` — sidebar flyout toggles (NOT chat panel)
4. Press `Ctrl+K` — command palette opens
5. Press `Ctrl+backtick` — terminal expands/collapses
6. No shortcut conflicts (each fires exactly once)
7. Right panel tabs (Chat/Preview) work correctly
8. New Chat button in sidebar creates chat and switches to history
9. Terminal button in sidebar opens terminal and closes flyout
10. Preview button in sidebar shows PreviewPanel inline
11. History panel — clicking a chat switches to it
12. Source Control panel — shows recently changed files

**Step 4: Commit any final fixups**

```bash
git add -A
git commit -m "chore: final verification fixups for structural refactor"
```

---

## Summary

| Phase       | Tasks      | What It Fixes                                                                 |
| ----------- | ---------- | ----------------------------------------------------------------------------- |
| **Phase 1** | Tasks 1-3  | Create shared abstractions (TabContainer, ShortcutRegistry, WorkspaceContext) |
| **Phase 2** | Tasks 4-6  | Fix Ctrl+B conflict, consolidate localStorage, unify mobile state             |
| **Phase 3** | Tasks 7-8  | Wire WorkspaceContext, eliminate prop drilling through Layout→Workbench       |
| **Phase 4** | Tasks 9-10 | Migrate panels to shared TabContainer                                         |
| **Phase 5** | Task 11    | Centralize all keyboard shortcuts                                             |
| **Phase 6** | Task 12    | Competitive gap: Git/Source Control panel                                     |
| **Phase 7** | Task 13    | Activate spec engine (Panda's competitive moat)                               |
| **Phase 8** | Task 14    | Full verification pass                                                        |

**Total: 14 tasks across 8 phases** **Files created:** 6 new files **Files
modified:** ~10 existing files **Files removed:** 0 **Backend changes:** Convex
schema deploy (already exists, just needs `npx convex dev`)

**Impact:**

- Prop count reduced: `ProjectWorkspaceLayout` 28 → ~18, `Workbench` 22 → ~14
- Keyboard shortcut conflict: **fixed**
- Tab duplication: **eliminated** (shared `TabContainer`)
- State persistence: **consolidated** (3 systems → 2 clean systems)
- New competitive feature: **Source Control panel**
- Competitive moat activated: **Spec engine enabled**
