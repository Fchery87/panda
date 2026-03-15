# Panda Layout Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Restructure Panda's workbench layout with a dual-layer sidebar,
unified right panel (Chat + Preview/Artifacts), Manual/Auto mode toggle, history
panel, attachment support, and spacing/polish refinements — inspired by
Blackbox.ai's polished layout.

**Architecture:** The existing `Workbench` + `ProjectWorkspaceLayout` +
`ProjectChatPanel` components are refactored into a three-zone layout:
dual-layer sidebar (icon rail + flyout) on the left, editor area in the center,
and a unified tabbed right panel (Chat/Preview) replacing the current separate
chat + artifact overlay. The top bar is simplified and a Manual/Auto mode toggle
is added to the right panel header.

**Tech Stack:** Next.js (App Router), React, TypeScript, Tailwind CSS,
react-resizable-panels, framer-motion, lucide-react, shadcn/ui, Convex (backend
unchanged)

**Design Doc:** `docs/plans/2026-03-14-panda-layout-overhaul-design.md`

---

## Phase 1: Dual-Layer Sidebar

### Task 1: Create SidebarRail Component

**Files:**

- Create: `apps/web/components/sidebar/SidebarRail.tsx`

**Step 1: Create the SidebarRail component**

```tsx
'use client'

import {
  MessageSquarePlus,
  FolderTree,
  Search,
  Clock,
  Eye,
  FileCheck,
  TerminalSquare,
  Settings,
  BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import Link from 'next/link'

export type SidebarSection =
  | 'new-chat'
  | 'explorer'
  | 'search'
  | 'history'
  | 'builder'
  | 'specs'
  | 'terminal'

interface SidebarRailProps {
  activeSection: SidebarSection
  isFlyoutOpen: boolean
  onSectionChange: (section: SidebarSection) => void
  onToggleFlyout: () => void
  projectId?: string
}

const MAIN_ITEMS: {
  id: SidebarSection
  icon: typeof FolderTree
  label: string
  shortcut?: string
}[] = [
  {
    id: 'new-chat',
    icon: MessageSquarePlus,
    label: 'New Chat',
    shortcut: 'Ctrl+N',
  },
  {
    id: 'explorer',
    icon: FolderTree,
    label: 'Explorer',
    shortcut: 'Ctrl+Shift+E',
  },
  { id: 'search', icon: Search, label: 'Search', shortcut: 'Ctrl+Shift+F' },
  { id: 'history', icon: Clock, label: 'History', shortcut: 'Ctrl+Shift+H' },
  { id: 'builder', icon: Eye, label: 'Preview', shortcut: 'Ctrl+Shift+P' },
  { id: 'specs', icon: FileCheck, label: 'Specs', shortcut: 'Ctrl+Shift+S' },
  {
    id: 'terminal',
    icon: TerminalSquare,
    label: 'Terminal',
    shortcut: 'Ctrl+`',
  },
]

export function SidebarRail({
  activeSection,
  isFlyoutOpen,
  onSectionChange,
  onToggleFlyout,
  projectId,
}: SidebarRailProps) {
  const handleClick = (section: SidebarSection) => {
    if (section === activeSection && isFlyoutOpen) {
      onToggleFlyout()
    } else {
      onSectionChange(section)
      if (!isFlyoutOpen) {
        onToggleFlyout()
      }
    }
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="surface-1 border-border flex h-full w-12 flex-shrink-0 flex-col border-r">
        <div className="flex flex-col">
          {MAIN_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = item.id === activeSection && isFlyoutOpen

            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => handleClick(item.id)}
                    className={cn(
                      'relative flex h-11 w-12 items-center justify-center transition-colors duration-150',
                      isActive
                        ? 'bg-surface-2 text-foreground'
                        : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground'
                    )}
                    aria-label={item.label}
                    aria-pressed={isActive}
                  >
                    {isActive && (
                      <div className="bg-primary absolute top-0 left-0 h-full w-0.5" />
                    )}
                    <Icon className="h-[18px] w-[18px]" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-mono text-xs">
                  {item.label}
                  {item.shortcut && (
                    <span className="text-muted-foreground ml-2">
                      ({item.shortcut})
                    </span>
                  )}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>

        <div className="flex-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href={projectId ? `/projects/${projectId}/settings` : '/settings'}
              className="text-muted-foreground hover:bg-surface-2 hover:text-foreground flex h-11 w-12 items-center justify-center transition-colors duration-150"
              aria-label="Settings"
            >
              <Settings className="h-[18px] w-[18px]" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-mono text-xs">
            Settings
            <span className="text-muted-foreground ml-2">(Ctrl+,)</span>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/education"
              className="text-muted-foreground hover:bg-surface-2 hover:text-foreground flex h-11 w-12 items-center justify-center transition-colors duration-150"
              aria-label="Docs"
            >
              <BookOpen className="h-[18px] w-[18px]" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-mono text-xs">
            Docs
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
```

**Step 2: Verify it compiles**

Run:
`cd "/home/nochaserz/Documents/Coding Projects/panda" && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors related to SidebarRail

**Step 3: Commit**

```bash
git add apps/web/components/sidebar/SidebarRail.tsx
git commit -m "feat: add SidebarRail component with icon navigation items"
```

---

### Task 2: Create SidebarFlyout Component

**Files:**

- Create: `apps/web/components/sidebar/SidebarFlyout.tsx`

**Step 1: Create the SidebarFlyout wrapper component**

```tsx
'use client'

import { AnimatePresence, motion } from 'framer-motion'
import type { SidebarSection } from './SidebarRail'

interface SidebarFlyoutProps {
  isOpen: boolean
  activeSection: SidebarSection
  children: React.ReactNode
}

export function SidebarFlyout({
  isOpen,
  activeSection,
  children,
}: SidebarFlyoutProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 220, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="surface-1 border-border h-full flex-shrink-0 overflow-hidden border-r"
        >
          <div className="flex h-full w-[220px] flex-col">
            <div className="panel-header-compact shrink-0 font-mono text-xs tracking-widest uppercase">
              {activeSection === 'new-chat' && 'New Chat'}
              {activeSection === 'explorer' && 'Explorer'}
              {activeSection === 'search' && 'Search'}
              {activeSection === 'history' && 'History'}
              {activeSection === 'builder' && 'Preview'}
              {activeSection === 'specs' && 'Specifications'}
              {activeSection === 'terminal' && 'Terminal'}
            </div>
            <div className="flex-1 overflow-auto">{children}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

**Step 2: Verify it compiles**

Run:
`cd "/home/nochaserz/Documents/Coding Projects/panda" && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors related to SidebarFlyout

**Step 3: Commit**

```bash
git add apps/web/components/sidebar/SidebarFlyout.tsx
git commit -m "feat: add SidebarFlyout animated wrapper component"
```

---

### Task 3: Create SidebarHistoryPanel Component

**Files:**

- Create: `apps/web/components/sidebar/SidebarHistoryPanel.tsx`

**Step 1: Create the history panel with project/all toggle**

```tsx
'use client'

import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { MessageSquare, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'

interface SidebarHistoryPanelProps {
  projectId: Id<'projects'>
  activeChatId?: Id<'chats'>
  onSelectChat: (chatId: Id<'chats'>) => void
}

export function SidebarHistoryPanel({
  projectId,
  activeChatId,
  onSelectChat,
}: SidebarHistoryPanelProps) {
  const [scope, setScope] = useState<'project' | 'all'>('project')
  const [searchQuery, setSearchQuery] = useState('')

  const chats = useQuery(api.chats.list, { projectId })

  const filteredChats = (chats ?? []).filter((chat) => {
    if (!searchQuery) return true
    const title = (chat as { title?: string }).title || ''
    return title.toLowerCase().includes(searchQuery.toLowerCase())
  })

  return (
    <div className="flex h-full flex-col">
      {/* Scope toggle */}
      <div className="border-border flex border-b">
        <button
          type="button"
          onClick={() => setScope('project')}
          className={cn(
            'flex-1 py-2 font-mono text-[10px] tracking-widest uppercase transition-colors duration-150',
            scope === 'project'
              ? 'bg-surface-2 text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          This Project
        </button>
        <button
          type="button"
          onClick={() => setScope('all')}
          className={cn(
            'flex-1 py-2 font-mono text-[10px] tracking-widest uppercase transition-colors duration-150',
            scope === 'all'
              ? 'bg-surface-2 text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          All Projects
        </button>
      </div>

      {/* Search */}
      <div className="border-border border-b p-2">
        <div className="border-border bg-background flex items-center gap-2 border px-2 py-1.5">
          <Search className="text-muted-foreground h-3 w-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search history..."
            className="text-foreground placeholder:text-muted-foreground/50 w-full bg-transparent font-mono text-xs focus:outline-none"
          />
        </div>
      </div>

      {/* Chat list */}
      <ScrollArea className="flex-1">
        <div className="p-1">
          {filteredChats.length === 0 ? (
            <div className="text-muted-foreground px-3 py-6 text-center font-mono text-xs">
              No conversations yet
            </div>
          ) : (
            filteredChats.map((chat) => {
              const title = (chat as { title?: string }).title || 'Untitled'
              const isActive = chat._id === activeChatId
              return (
                <button
                  key={chat._id}
                  type="button"
                  onClick={() => onSelectChat(chat._id)}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2 text-left transition-colors duration-150',
                    isActive
                      ? 'bg-primary/10 text-foreground'
                      : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground'
                  )}
                >
                  <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-xs">{title}</div>
                    <div className="text-muted-foreground font-mono text-[10px]">
                      {chat._creationTime
                        ? new Date(chat._creationTime).toLocaleDateString()
                        : ''}
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
```

**Step 2: Verify it compiles**

Run:
`cd "/home/nochaserz/Documents/Coding Projects/panda" && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors (may need to verify `api.chats.list` signature matches)

**Step 3: Commit**

```bash
git add apps/web/components/sidebar/SidebarHistoryPanel.tsx
git commit -m "feat: add SidebarHistoryPanel with project/all toggle and search"
```

---

### Task 4: Create Sidebar Hook for State Management

**Files:**

- Create: `apps/web/hooks/useSidebar.ts`

**Step 1: Create the sidebar state hook**

```ts
'use client'

import { useState, useCallback, useEffect } from 'react'
import type { SidebarSection } from '@/components/sidebar/SidebarRail'

const STORAGE_KEY_SECTION = 'panda:sidebar-section'
const STORAGE_KEY_OPEN = 'panda:sidebar-flyout-open'

export function useSidebar(defaultSection: SidebarSection = 'explorer') {
  const [activeSection, setActiveSection] = useState<SidebarSection>(() => {
    if (typeof window === 'undefined') return defaultSection
    return (
      (localStorage.getItem(STORAGE_KEY_SECTION) as SidebarSection) ||
      defaultSection
    )
  })

  const [isFlyoutOpen, setIsFlyoutOpen] = useState(() => {
    if (typeof window === 'undefined') return true
    const stored = localStorage.getItem(STORAGE_KEY_OPEN)
    return stored !== 'false'
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SECTION, activeSection)
  }, [activeSection])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_OPEN, String(isFlyoutOpen))
  }, [isFlyoutOpen])

  const handleSectionChange = useCallback(
    (section: SidebarSection) => {
      if (section === activeSection && isFlyoutOpen) {
        setIsFlyoutOpen(false)
      } else {
        setActiveSection(section)
        if (!isFlyoutOpen) {
          setIsFlyoutOpen(true)
        }
      }
    },
    [activeSection, isFlyoutOpen]
  )

  const toggleFlyout = useCallback(() => {
    setIsFlyoutOpen((prev) => !prev)
  }, [])

  // Keyboard shortcut: Cmd/Ctrl+B toggles flyout
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault()
        toggleFlyout()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggleFlyout])

  return {
    activeSection,
    isFlyoutOpen,
    handleSectionChange,
    toggleFlyout,
  }
}
```

**Step 2: Verify it compiles**

Run:
`cd "/home/nochaserz/Documents/Coding Projects/panda" && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors

**Step 3: Commit**

```bash
git add apps/web/hooks/useSidebar.ts
git commit -m "feat: add useSidebar hook with persistence and keyboard shortcuts"
```

---

### Task 5: Integrate Sidebar into Workbench (Replace ActivityBar)

**Files:**

- Modify: `apps/web/components/workbench/Workbench.tsx`
- Modify: `apps/web/components/projects/ProjectWorkspaceLayout.tsx`

**Step 1: Refactor Workbench to use new sidebar**

Replace the `ActivityBar` + inline sidebar panel in `Workbench.tsx` (lines
427-478) with the new `SidebarRail` + `SidebarFlyout` components. The
`Workbench` component should:

1. Remove the `useActivityBarState()` import and usage (line 26, 181-186)
2. Accept `sidebarActiveSection`, `isSidebarFlyoutOpen`,
   `onSidebarSectionChange`, `onToggleSidebarFlyout` as props instead
3. Replace the `<ActivityBar>` render (lines 429-435) with `<SidebarRail>`
4. Replace the conditional sidebar panel (lines 437-478) with `<SidebarFlyout>`
   wrapping the same content
5. Add `SidebarHistoryPanel` as content when `activeSection === 'history'`
6. Add placeholder content for `new-chat`, `builder`, and `terminal` sections

**Key changes in the desktop render (line 424-622):**

- Lines 428-435: Replace `<ActivityBar ... />` with `<SidebarRail ... />`
- Lines 437-478: Replace inline sidebar panel with `<SidebarFlyout>` containing
  section-specific content
- Add new section rendering for `history`, `new-chat`, `builder`, `terminal`

**Step 2: Update ProjectWorkspaceLayout to pass sidebar props**

`ProjectWorkspaceLayout.tsx` needs to:

1. Import and use `useSidebar` hook
2. Pass sidebar state down to `Workbench`

**Step 3: Verify it compiles and renders**

Run:
`cd "/home/nochaserz/Documents/Coding Projects/panda" && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No type errors

**Step 4: Test in browser**

Run dev server and verify:

- Icon rail shows all 7 main items + Settings + Docs at bottom
- Clicking icons toggles flyout open/close
- Explorer, Search, Specs sections render existing content
- History section renders new panel
- Ctrl+B toggles flyout
- State persists across page reloads

**Step 5: Commit**

```bash
git add apps/web/components/workbench/Workbench.tsx apps/web/components/projects/ProjectWorkspaceLayout.tsx
git commit -m "feat: replace ActivityBar with dual-layer SidebarRail + SidebarFlyout"
```

---

## Phase 2: Unified Right Panel (Chat + Preview/Artifacts)

### Task 6: Create ModeToggle Component (Manual/Auto)

**Files:**

- Create: `apps/web/components/chat/ModeToggle.tsx`

**Step 1: Create the Manual/Auto sliding toggle**

```tsx
'use client'

import { cn } from '@/lib/utils'

interface ModeToggleProps {
  mode: 'manual' | 'auto'
  onModeChange: (mode: 'manual' | 'auto') => void
  disabled?: boolean
}

export function ModeToggle({
  mode,
  onModeChange,
  disabled = false,
}: ModeToggleProps) {
  return (
    <div className="flex items-center">
      <div className="border-border bg-background relative flex border">
        {/* Sliding pill indicator */}
        <div
          className={cn(
            'bg-primary absolute inset-y-0 w-1/2 transition-transform duration-150',
            mode === 'auto' ? 'translate-x-full' : 'translate-x-0'
          )}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => onModeChange('manual')}
          className={cn(
            'relative z-10 px-3 py-1 font-mono text-[10px] tracking-widest uppercase transition-colors duration-150',
            mode === 'manual'
              ? 'text-primary-foreground'
              : 'text-muted-foreground'
          )}
        >
          Manual
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onModeChange('auto')}
          className={cn(
            'relative z-10 px-3 py-1 font-mono text-[10px] tracking-widest uppercase transition-colors duration-150',
            mode === 'auto'
              ? 'text-primary-foreground'
              : 'text-muted-foreground'
          )}
        >
          Auto
        </button>
      </div>
    </div>
  )
}
```

**Step 2: Verify it compiles**

Run:
`cd "/home/nochaserz/Documents/Coding Projects/panda" && npx tsc --noEmit --pretty 2>&1 | head -30`

**Step 3: Commit**

```bash
git add apps/web/components/chat/ModeToggle.tsx
git commit -m "feat: add Manual/Auto ModeToggle with sliding pill animation"
```

---

### Task 7: Create LivePreview Component

**Files:**

- Create: `apps/web/components/preview/LivePreview.tsx`

**Step 1: Create the iframe-based live preview**

```tsx
'use client'

import { useState } from 'react'
import { RefreshCw, ExternalLink, Monitor, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface LivePreviewProps {
  url?: string | null
  className?: string
}

export function LivePreview({ url, className }: LivePreviewProps) {
  const [key, setKey] = useState(0)
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop')

  if (!url) {
    return (
      <div
        className={cn(
          'text-muted-foreground flex h-full flex-col items-center justify-center gap-4',
          className
        )}
      >
        <Monitor className="text-muted-foreground/30 h-12 w-12" />
        <div className="text-center">
          <p className="text-foreground font-mono text-sm font-medium">
            No preview available
          </p>
          <p className="text-muted-foreground mt-1 font-mono text-xs">
            Preview will appear when the agent generates a running application
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Preview toolbar */}
      <div className="surface-1 border-border flex h-8 shrink-0 items-center justify-between border-b px-2">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewport('desktop')}
            className={cn(
              'h-6 w-6 rounded-none p-0',
              viewport === 'desktop' && 'bg-surface-2 text-foreground'
            )}
          >
            <Monitor className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewport('mobile')}
            className={cn(
              'h-6 w-6 rounded-none p-0',
              viewport === 'mobile' && 'bg-surface-2 text-foreground'
            )}
          >
            <Smartphone className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setKey((k) => k + 1)}
            className="h-6 w-6 rounded-none p-0"
            aria-label="Refresh preview"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          {url && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(url, '_blank')}
              className="h-6 w-6 rounded-none p-0"
              aria-label="Open in new tab"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Preview iframe */}
      <div className="bg-background flex flex-1 items-center justify-center overflow-hidden p-2">
        <iframe
          key={key}
          src={url}
          title="Live Preview"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          className={cn(
            'border-border h-full border bg-white',
            viewport === 'desktop' ? 'w-full' : 'w-[375px]'
          )}
        />
      </div>
    </div>
  )
}
```

**Step 2: Verify it compiles**

Run:
`cd "/home/nochaserz/Documents/Coding Projects/panda" && npx tsc --noEmit --pretty 2>&1 | head -30`

**Step 3: Commit**

```bash
git add apps/web/components/preview/LivePreview.tsx
git commit -m "feat: add LivePreview component with iframe, viewport toggle, and refresh"
```

---

### Task 8: Create Unified RightPanel Component

**Files:**

- Create: `apps/web/components/panels/RightPanel.tsx`

**Step 1: Create the tabbed right panel wrapper**

This component wraps Chat content and Preview/Artifacts content in a tabbed
interface. It does NOT re-implement chat — it accepts `chatContent` as a React
node.

```tsx
'use client'

import { useState } from 'react'
import { MessageSquare, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ModeToggle } from '@/components/chat/ModeToggle'

export type RightPanelTab = 'chat' | 'preview'

interface RightPanelProps {
  chatContent: React.ReactNode
  previewContent: React.ReactNode
  chatInput: React.ReactNode
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
  isStreaming = false,
  activeTab: controlledTab,
  onTabChange,
}: RightPanelProps) {
  const [uncontrolledTab, setUncontrolledTab] = useState<RightPanelTab>('chat')
  const activeTab = controlledTab ?? uncontrolledTab
  const setTab = (tab: RightPanelTab) => {
    onTabChange?.(tab)
    if (controlledTab === undefined) setUncontrolledTab(tab)
  }

  return (
    <div className="surface-1 border-border flex h-full flex-col border-l">
      {/* Tab header with mode toggle */}
      <div className="border-border flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setTab('chat')}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 font-mono text-xs tracking-widest uppercase transition-colors duration-150',
              activeTab === 'chat'
                ? 'border-primary text-foreground border-b-2'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Chat
          </button>
          <button
            type="button"
            onClick={() => setTab('preview')}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 font-mono text-xs tracking-widest uppercase transition-colors duration-150',
              activeTab === 'preview'
                ? 'border-primary text-foreground border-b-2'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Eye className="h-3.5 w-3.5" />
            Preview
          </button>
        </div>

        <ModeToggle
          mode={automationMode}
          onModeChange={onAutomationModeChange}
          disabled={isStreaming}
        />
      </div>

      {/* Tab content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div
          className={cn(
            'flex-1 overflow-hidden',
            activeTab !== 'chat' && 'hidden'
          )}
        >
          {chatContent}
        </div>
        <div
          className={cn(
            'flex-1 overflow-hidden',
            activeTab !== 'preview' && 'hidden'
          )}
        >
          {previewContent}
        </div>
      </div>

      {/* Chat input — always visible regardless of tab */}
      {chatInput}
    </div>
  )
}
```

**Step 2: Verify it compiles**

Run:
`cd "/home/nochaserz/Documents/Coding Projects/panda" && npx tsc --noEmit --pretty 2>&1 | head -30`

**Step 3: Commit**

```bash
git add apps/web/components/panels/RightPanel.tsx
git commit -m "feat: add unified RightPanel with Chat/Preview tabs and ModeToggle"
```

---

### Task 9: Create PreviewPanel with Artifacts Sub-Tab

**Files:**

- Create: `apps/web/components/preview/PreviewPanel.tsx`

**Step 1: Create the preview panel with Preview/Artifacts sub-tabs**

```tsx
'use client'

import { useState } from 'react'
import { Eye, FileStack } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LivePreview } from './LivePreview'
import { ArtifactPanel } from '@/components/artifacts/ArtifactPanel'
import type { Id } from '@convex/_generated/dataModel'

interface PreviewPanelProps {
  projectId: Id<'projects'>
  chatId?: Id<'chats'>
  previewUrl?: string | null
}

export function PreviewPanel({
  projectId,
  chatId,
  previewUrl,
}: PreviewPanelProps) {
  const [subTab, setSubTab] = useState<'preview' | 'artifacts'>('preview')

  return (
    <div className="flex h-full flex-col">
      {/* Sub-tab bar */}
      <div className="surface-2 border-border flex border-b px-2">
        <button
          type="button"
          onClick={() => setSubTab('preview')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] tracking-widest uppercase transition-colors duration-150',
            subTab === 'preview'
              ? 'border-primary text-foreground border-b'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Eye className="h-3 w-3" />
          Preview
        </button>
        <button
          type="button"
          onClick={() => setSubTab('artifacts')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] tracking-widest uppercase transition-colors duration-150',
            subTab === 'artifacts'
              ? 'border-primary text-foreground border-b'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <FileStack className="h-3 w-3" />
          Artifacts
        </button>
      </div>

      {/* Sub-tab content */}
      <div className="flex-1 overflow-hidden">
        {subTab === 'preview' ? (
          <LivePreview url={previewUrl} />
        ) : (
          <ArtifactPanel
            projectId={projectId}
            chatId={chatId}
            isOpen={true}
            position="right"
          />
        )}
      </div>
    </div>
  )
}
```

**Step 2: Verify it compiles**

Run:
`cd "/home/nochaserz/Documents/Coding Projects/panda" && npx tsc --noEmit --pretty 2>&1 | head -30`

**Step 3: Commit**

```bash
git add apps/web/components/preview/PreviewPanel.tsx
git commit -m "feat: add PreviewPanel with Preview/Artifacts sub-tabs"
```

---

### Task 10: Create AttachmentButton Component

**Files:**

- Create: `apps/web/components/chat/AttachmentButton.tsx`

**Step 1: Create the attachment button with file/image upload**

```tsx
'use client'

import { useRef, useCallback, useState } from 'react'
import { Paperclip, FilePlus2, ImagePlus, X } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export interface Attachment {
  id: string
  file: File
  type: 'file' | 'image'
  preview?: string
}

interface AttachmentButtonProps {
  attachments: Attachment[]
  onAttach: (attachment: Attachment) => void
  onRemove: (id: string) => void
  disabled?: boolean
}

export function AttachmentButton({
  attachments,
  onAttach,
  onRemove,
  disabled = false,
}: AttachmentButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    (file: File, type: 'file' | 'image') => {
      const id = `${Date.now()}-${file.name}`
      const attachment: Attachment = { id, file, type }

      if (type === 'image') {
        const reader = new FileReader()
        reader.onload = (e) => {
          attachment.preview = e.target?.result as string
          onAttach(attachment)
        }
        reader.readAsDataURL(file)
      } else {
        onAttach(attachment)
      }
      setIsOpen(false)
    },
    [onAttach]
  )

  return (
    <div className="flex flex-col gap-2">
      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="group border-border bg-background relative flex items-center gap-1.5 border px-2 py-1"
            >
              {att.type === 'image' && att.preview ? (
                <img
                  src={att.preview}
                  alt={att.file.name}
                  className="h-8 w-8 object-cover"
                />
              ) : (
                <FilePlus2 className="text-muted-foreground h-3.5 w-3.5" />
              )}
              <span className="text-muted-foreground max-w-[120px] truncate font-mono text-[10px]">
                {att.file.name}
              </span>
              <button
                type="button"
                onClick={() => onRemove(att.id)}
                className="text-muted-foreground hover:text-foreground ml-1"
                aria-label={`Remove ${att.file.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Attach button */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              'border-border text-muted-foreground flex h-7 w-7 items-center justify-center border transition-colors duration-150',
              'hover:border-foreground/30 hover:text-foreground',
              disabled && 'cursor-not-allowed opacity-50'
            )}
            aria-label="Attach file or image"
          >
            <Paperclip className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          side="top"
          sideOffset={8}
          className="border-border w-auto min-w-[160px] rounded-none p-1"
        >
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-muted-foreground hover:bg-surface-2 hover:text-foreground flex w-full items-center gap-2 px-3 py-2 font-mono text-xs transition-colors"
          >
            <FilePlus2 className="h-3.5 w-3.5" />
            Upload File
          </button>
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="text-muted-foreground hover:bg-surface-2 hover:text-foreground flex w-full items-center gap-2 px-3 py-2 font-mono text-xs transition-colors"
          >
            <ImagePlus className="h-3.5 w-3.5" />
            Upload Image
          </button>
        </PopoverContent>
      </Popover>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file, 'file')
          e.target.value = ''
        }}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file, 'image')
          e.target.value = ''
        }}
      />
    </div>
  )
}
```

**Step 2: Verify it compiles**

Run:
`cd "/home/nochaserz/Documents/Coding Projects/panda" && npx tsc --noEmit --pretty 2>&1 | head -30`

**Step 3: Commit**

```bash
git add apps/web/components/chat/AttachmentButton.tsx
git commit -m "feat: add AttachmentButton with file/image upload and preview chips"
```

---

## Phase 3: Integration — Wire Everything Together

### Task 11: Refactor ProjectChatPanel to Extract Chat Content

**Files:**

- Modify: `apps/web/components/projects/ProjectChatPanel.tsx`

**Step 1: Refactor to separate concerns**

The current `ProjectChatPanel` renders the full chat experience including its
own header, message list, action bar, input, and overlays. We need to:

1. Extract the **chat body content** (message list + action bar + permission
   dialog + overlays) into its own renderable section
2. Extract the **chat input** section as a separate renderable piece
3. Remove the panel's own header (the `panel-header-compact` with "Chat" label
   at line 232) — this is now handled by `RightPanel` tabs
4. Remove the `border-l` / `border-t` styling (line 228-229) — borders are now
   on `RightPanel`

The component should still exist but be restructured so its internals can be
slotted into the `RightPanel`.

**Approach:** Rather than breaking `ProjectChatPanel` apart (which would require
massive prop changes upstream), wrap it with `RightPanel` at the
`ProjectWorkspaceLayout` level. `ProjectChatPanel` keeps working as-is inside
the Chat tab.

**Step 2: Verify it compiles**

Run:
`cd "/home/nochaserz/Documents/Coding Projects/panda" && npx tsc --noEmit --pretty 2>&1 | head -30`

**Step 3: Commit**

```bash
git add apps/web/components/projects/ProjectChatPanel.tsx
git commit -m "refactor: prepare ProjectChatPanel for RightPanel integration"
```

---

### Task 12: Integrate RightPanel into ProjectWorkspaceLayout

**Files:**

- Modify: `apps/web/components/projects/ProjectWorkspaceLayout.tsx`
- Modify: `apps/web/app/(dashboard)/projects/[projectId]/page.tsx`

**Step 1: Update ProjectWorkspaceLayout**

Major changes to `ProjectWorkspaceLayout.tsx`:

1. Import `RightPanel`, `PreviewPanel`
2. Add new props: `automationMode`, `onAutomationModeChange`, `previewUrl`
3. Remove `isArtifactPanelOpen` and `onArtifactPanelOpenChange` props (artifacts
   now live inside Preview tab)
4. Remove the floating `ArtifactPanel` overlay (lines 195-213)
5. Replace the chat panel rendering in the `PanelGroup` (lines 178-191) with
   `<RightPanel>` containing:
   - `chatContent` = existing `chatPanel` prop
   - `previewContent` = `<PreviewPanel>`
   - `chatInput` = extracted from chat panel (or keep within chatPanel for now)

**Step 2: Update page.tsx**

In `apps/web/app/(dashboard)/projects/[projectId]/page.tsx`:

1. Add `automationMode` state (default: 'manual')
2. Pass `automationMode` and `onAutomationModeChange` to
   `ProjectWorkspaceLayout`
3. Remove artifact panel toggle button from top bar (lines ~805-835)
4. Wire `automationMode` to the agent's `harnessEnableRiskInterrupts` flag:
   - `manual` mode → `harnessEnableRiskInterrupts: true` (agent asks for
     approval)
   - `auto` mode → `harnessEnableRiskInterrupts: false` (agent runs
     autonomously)

**Step 3: Verify it compiles and renders**

Run:
`cd "/home/nochaserz/Documents/Coding Projects/panda" && npx tsc --noEmit --pretty 2>&1 | head -30`

**Step 4: Test in browser**

- Right panel shows Chat and Preview tabs
- Manual/Auto toggle appears in right panel header
- Clicking Preview tab shows live preview (placeholder) and artifacts sub-tab
- Chat input visible on both tabs
- Artifact overlay no longer appears as separate floating panel

**Step 5: Commit**

```bash
git add apps/web/components/projects/ProjectWorkspaceLayout.tsx apps/web/app/\(dashboard\)/projects/\[projectId\]/page.tsx
git commit -m "feat: integrate RightPanel with Chat/Preview tabs and ModeToggle into workbench"
```

---

### Task 13: Simplify Top Bar

**Files:**

- Modify: `apps/web/app/(dashboard)/projects/[projectId]/page.tsx` (lines
  721-855)

**Step 1: Update the top bar header**

1. Replace the static Panda logo with a `PanelLeftOpen`/`PanelLeftClose` button
   that toggles the sidebar flyout + "Panda" wordmark text
2. Remove the "Toggle Chat" button (chat is now always visible as a tab)
3. Remove the "Toggle Artifacts" button (artifacts are now in Preview tab)
4. Remove the "Automation" dialog button (replaced by Manual/Auto toggle in
   right panel)
5. Keep: breadcrumb, job status indicator, Share button, More menu

**Step 2: Verify it compiles and renders**

Run:
`cd "/home/nochaserz/Documents/Coding Projects/panda" && npx tsc --noEmit --pretty 2>&1 | head -30`

**Step 3: Test in browser**

- Top bar is cleaner with fewer buttons
- Sidebar toggle works
- Breadcrumb and status still visible

**Step 4: Commit**

```bash
git add apps/web/app/\(dashboard\)/projects/\[projectId\]/page.tsx
git commit -m "feat: simplify top bar — add sidebar toggle, remove panel toggle buttons"
```

---

### Task 14: Update Chat Input with Attachment Button

**Files:**

- Modify: `apps/web/components/chat/ChatInput.tsx`

**Step 1: Add AttachmentButton to ChatInput**

1. Import `AttachmentButton` and `Attachment` type
2. Add local state:
   `const [attachments, setAttachments] = useState<Attachment[]>([])`
3. Add `handleAttach` and `handleRemoveAttachment` callbacks
4. Place `<AttachmentButton>` at the start of the bottom toolbar (line 444),
   before `<AgentSelector>`
5. Show attachment previews above the textarea
6. Replace `Send` icon with `ArrowUp` icon (import it from lucide-react)
7. Clear attachments on send

**Step 2: Verify it compiles**

Run:
`cd "/home/nochaserz/Documents/Coding Projects/panda" && npx tsc --noEmit --pretty 2>&1 | head -30`

**Step 3: Test in browser**

- Paperclip button visible in chat input bar
- Clicking opens popover with Upload File / Upload Image
- Attached files show as chips
- Attached images show as thumbnails
- Attachments clear after sending

**Step 4: Commit**

```bash
git add apps/web/components/chat/ChatInput.tsx
git commit -m "feat: add attachment button with file/image upload to ChatInput"
```

---

## Phase 4: Mobile Layout Updates

### Task 15: Update Mobile Layout with Three Tabs

**Files:**

- Modify: `apps/web/components/projects/ProjectWorkspaceLayout.tsx`

**Step 1: Add Preview tab to mobile bottom bar**

In the mobile layout section (lines 129-167):

1. Change `grid-cols-2` to `grid-cols-3`
2. Add `mobilePrimaryPanel: 'workspace' | 'chat' | 'preview'` type (update
   existing type)
3. Add "Preview" button to the tab bar
4. When Preview is selected, render `<PreviewPanel>` in the content area

**Step 2: Add mobile sidebar overlay**

1. When sidebar toggle is tapped on mobile, show a full-screen overlay with all
   sidebar navigation items (labeled, with icons)
2. Tapping an item navigates or opens the relevant section
3. Dismiss overlay on item selection or backdrop tap

**Step 3: Verify it compiles and renders**

Run:
`cd "/home/nochaserz/Documents/Coding Projects/panda" && npx tsc --noEmit --pretty 2>&1 | head -30`

**Step 4: Test on mobile viewport**

- Three tabs visible at bottom: Workspace, Chat, Preview
- Sidebar opens as full-screen overlay
- Each tab shows correct content

**Step 5: Commit**

```bash
git add apps/web/components/projects/ProjectWorkspaceLayout.tsx
git commit -m "feat: add Preview tab to mobile layout and sidebar overlay"
```

---

## Phase 5: Spacing & Polish

### Task 16: Refine Spacing and Visual Hierarchy

**Files:**

- Modify: `apps/web/app/globals.css`
- Modify: Various components for spacing consistency

**Step 1: Add transition utility classes to globals.css**

```css
/* Transitions */
.transition-sidebar {
  transition:
    width 200ms ease-out,
    opacity 200ms ease-out;
}
.transition-tab {
  transition: opacity 150ms ease-in-out;
}
```

**Step 2: Audit and fix spacing inconsistencies**

Review each component and ensure:

- All padding values are multiples of 4px (`p-1` = 4px, `p-2` = 8px, `p-3` =
  12px, `p-4` = 16px)
- All gaps are multiples of 4px
- Panel content uses `p-3`
- Dense areas (file tree, terminal headers) use `p-2`
- Toolbars use `gap-2`

**Step 3: Refine active states**

- Sidebar active icon: ensure `surface-2` bg + `primary` left border indicator
- Right panel active tab: ensure `border-b-2 border-primary` underline
- Consistent hover transitions: `duration-150`

**Step 4: Verify visually in browser**

Check both light and dark modes for:

- Consistent spacing
- Clean visual hierarchy
- Smooth transitions on all interactive elements

**Step 5: Commit**

```bash
git add -A
git commit -m "polish: refine spacing, transitions, and visual hierarchy across workbench"
```

---

### Task 17: Clean Up Deprecated Components

**Files:**

- Delete or archive: `apps/web/components/workbench/ActivityBar.tsx` (if no
  longer imported anywhere)

**Step 1: Verify ActivityBar is no longer imported**

Run: `grep -r "ActivityBar" apps/web/ --include="*.tsx" --include="*.ts"`
Expected: No imports remaining

**Step 2: Remove the file**

```bash
rm apps/web/components/workbench/ActivityBar.tsx
```

**Step 3: Verify build passes**

Run:
`cd "/home/nochaserz/Documents/Coding Projects/panda" && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove deprecated ActivityBar component"
```

---

## Summary

| Phase       | Tasks       | Description                                                                                   |
| ----------- | ----------- | --------------------------------------------------------------------------------------------- |
| **Phase 1** | Tasks 1-5   | Dual-layer sidebar (SidebarRail + SidebarFlyout + History + Hook + Integration)               |
| **Phase 2** | Tasks 6-10  | Unified right panel (ModeToggle + LivePreview + RightPanel + PreviewPanel + AttachmentButton) |
| **Phase 3** | Tasks 11-14 | Integration (Refactor chat panel + Wire RightPanel + Simplify top bar + Update ChatInput)     |
| **Phase 4** | Task 15     | Mobile layout updates (3 tabs + sidebar overlay)                                              |
| **Phase 5** | Tasks 16-17 | Polish and cleanup                                                                            |

**Total: 17 tasks across 5 phases**

**Files created:** 8 new components + 1 hook **Files modified:** 4 existing
components + 1 page + 1 CSS file **Files removed:** 1 deprecated component

**Backend changes:** None (Convex untouched) **Agent harness changes:** None
(just wiring `automationMode` to existing `harnessEnableRiskInterrupts` flag)
