# Workbench Modernization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Transform Panda's workbench from a traditional IDE layout to a modern,
chat-dominant, agent-first workspace per the design doc at
`docs/plans/2026-04-04-workbench-modernization-design.md`.

**Architecture:** Replace the current three-layer layout (ProjectPage top bar →
ProjectWorkspaceLayout → Workbench) with a new two-layer layout (ProjectPage →
WorkspaceShell). The shell renders a slim NavRail, AgentTabBar, ChatPanel
(primary), and CodePanel (auto-collapsing). All sidebar content moves to
floating overlays. Terminal becomes an activity drawer. Visual design tokens are
updated globally.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 3.4, react-resizable-panels
2.1, framer-motion 12, CodeMirror 6, Convex, Geist Sans + Fira Code fonts.

**Frontend aesthetics guidance:** Use Geist Sans for UI (already loaded), Fira
Code for code. Gold/amber primary (`hsl(38 92% 50%)`) against dark surfaces.
Soft 8px radius. Subtle shadows on overlays. Dark mode is primary design target.
Avoid: monospace on non-code UI, uppercase tracking-widest headers, zero-radius
brutalist look.

---

## Task 1: Update Design Tokens & Global CSS

**Files:**

- Modify: `apps/web/app/globals.css`
- Modify: `apps/web/tailwind.config.ts`

**Step 1: Update CSS variables in globals.css**

In the `.dark` block, update surface layers for tighter range:

```css
/* Old */
--surface-0: 30 10% 8%;
--surface-1: 30 10% 12%;
--surface-2: 30 10% 16%;

/* New */
--surface-0: 30 10% 7%;
--surface-1: 30 10% 9%;
--surface-2: 30 10% 12%;
--surface-3: 30 10% 15%;
```

Update `--radius` in both `:root` and `.dark`:

```css
/* Old */
--radius: 0px;

/* New */
--radius: 8px;
```

Add new overlay/floating panel tokens:

```css
/* Add to both :root and .dark */
--overlay-backdrop: 0 0% 0% / 0.3;
--shadow-overlay: 0 8px 32px rgba(0, 0, 0, 0.24);
```

**Step 2: Update light mode surface values in `:root`**

```css
/* Old */
--surface-0: 40 20% 98%;
--surface-1: 40 15% 96%;
--surface-2: 40 10% 94%;

/* New - tighter range */
--surface-0: 40 20% 98%;
--surface-1: 40 15% 97%;
--surface-2: 40 10% 95%;
```

**Step 3: Add border-radius utility to Tailwind config**

In `tailwind.config.ts`, add to `theme.extend`:

```typescript
borderRadius: {
  lg: 'calc(var(--radius) + 4px)',    // 12px
  md: 'calc(var(--radius))',           // 8px
  sm: 'calc(var(--radius) - 2px)',     // 6px
  xs: 'calc(var(--radius) - 4px)',     // 4px
},
```

**Step 4: Add shadow tokens to Tailwind config**

```typescript
boxShadow: {
  'overlay': '0 8px 32px rgba(0,0,0,0.24)',
  'overlay-lg': '0 12px 48px rgba(0,0,0,0.32)',
  'drawer': '0 -4px 24px rgba(0,0,0,0.16)',
},
```

**Step 5: Verify the build compiles**

Run: `cd apps/web && npx next build --no-lint 2>&1 | tail -20` Expected: Build
succeeds (token changes are passive until consumed).

**Step 6: Commit**

```bash
git add apps/web/app/globals.css apps/web/tailwind.config.ts
git commit -m "style: update design tokens for workbench modernization — softer surfaces, 8px radius, overlay shadows"
```

---

## Task 2: Create FloatingOverlay Component

**Files:**

- Create: `apps/web/components/ui/floating-overlay.tsx`

**Step 1: Build the reusable FloatingOverlay component**

This is a generic floating panel used by the NavRail for file tree, search, and
history overlays.

```tsx
'use client'

import { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface FloatingOverlayProps {
  open: boolean
  onClose: () => void
  /** Anchor position: distance from left edge (rail width) */
  anchorLeft?: number
  /** Max width of the overlay */
  maxWidth?: number
  /** Max height as viewport percentage */
  maxHeightVh?: number
  className?: string
  children: React.ReactNode
  title?: string
}

export function FloatingOverlay({
  open,
  onClose,
  anchorLeft = 40,
  maxWidth = 320,
  maxHeightVh = 60,
  className,
  children,
  title,
}: FloatingOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (
        overlayRef.current &&
        !overlayRef.current.contains(e.target as Node)
      ) {
        onClose()
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Semi-transparent backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-black/20"
            aria-hidden
          />
          {/* Floating panel */}
          <motion.div
            ref={overlayRef}
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={cn(
              'border-border/50 bg-background shadow-overlay fixed z-50 flex flex-col overflow-hidden rounded-lg border',
              className
            )}
            style={{
              left: anchorLeft + 8,
              top: 56,
              maxWidth,
              maxHeight: `${maxHeightVh}vh`,
              width: maxWidth,
            }}
          >
            {title && (
              <div className="border-border/50 flex h-10 shrink-0 items-center border-b px-4">
                <span className="text-foreground text-sm font-medium">
                  {title}
                </span>
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-auto">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

**Step 2: Verify build**

Run: `cd apps/web && npx next build --no-lint 2>&1 | tail -20` Expected: Build
succeeds.

**Step 3: Commit**

```bash
git add apps/web/components/ui/floating-overlay.tsx
git commit -m "feat: add FloatingOverlay component for workbench rail overlays"
```

---

## Task 3: Create NavRail Component

**Files:**

- Create: `apps/web/components/workbench/NavRail.tsx`

**Step 1: Build NavRail — slim 40px icon rail with overlay triggers**

```tsx
'use client'

import { useState, useCallback } from 'react'
import { FolderOpen, Search, History, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export type NavRailSection = 'files' | 'search' | 'history' | 'settings'

interface NavRailProps {
  activeOverlay: NavRailSection | null
  onOverlayChange: (section: NavRailSection | null) => void
}

const NAV_ITEMS: Array<{
  id: NavRailSection
  icon: typeof FolderOpen
  label: string
  shortcut: string
}> = [
  { id: 'files', icon: FolderOpen, label: 'Files', shortcut: 'Ctrl+Shift+E' },
  { id: 'search', icon: Search, label: 'Search', shortcut: 'Ctrl+Shift+F' },
  { id: 'history', icon: History, label: 'History', shortcut: 'Ctrl+Shift+H' },
  { id: 'settings', icon: Settings, label: 'Settings', shortcut: 'Ctrl+,' },
]

export function NavRail({ activeOverlay, onOverlayChange }: NavRailProps) {
  const handleClick = useCallback(
    (section: NavRailSection) => {
      onOverlayChange(activeOverlay === section ? null : section)
    },
    [activeOverlay, onOverlayChange]
  )

  return (
    <TooltipProvider delayDuration={300}>
      <div className="bg-surface-1 flex h-full w-10 flex-shrink-0 flex-col">
        <div className="flex flex-1 flex-col pt-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = activeOverlay === item.id

            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => handleClick(item.id)}
                    className={cn(
                      'relative flex h-10 w-full items-center justify-center transition-colors',
                      isActive
                        ? 'text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {/* Active indicator bar */}
                    {isActive && (
                      <div className="bg-primary absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-r-full" />
                    )}
                    <Icon className="h-[18px] w-[18px]" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  <span>{item.label}</span>
                  <span className="text-muted-foreground ml-2 text-xs">
                    {item.shortcut}
                  </span>
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      </div>
    </TooltipProvider>
  )
}
```

**Step 2: Verify build**

Run: `cd apps/web && npx next build --no-lint 2>&1 | tail -20` Expected: Build
succeeds.

**Step 3: Commit**

```bash
git add apps/web/components/workbench/NavRail.tsx
git commit -m "feat: add NavRail component — slim 40px icon rail for workbench"
```

---

## Task 4: Create AgentTabBar Component

**Files:**

- Create: `apps/web/components/workbench/AgentTabBar.tsx`

**Step 1: Build AgentTabBar — top tab strip, single tab now, multi-ready**

```tsx
'use client'

import { cn } from '@/lib/utils'
import { Bot, Code, PanelRightOpen, PanelRightClose } from 'lucide-react'
import {
  ModelSelector,
  type AvailableModel,
} from '@/components/chat/ModelSelector'

interface AgentTabBarProps {
  projectName: string
  chatTitle?: string
  isCodePanelOpen: boolean
  onToggleCodePanel: () => void
  model?: string
  onModelChange?: (model: string) => void
  availableModels?: AvailableModel[]
  isStreaming?: boolean
}

export function AgentTabBar({
  projectName,
  chatTitle,
  isCodePanelOpen,
  onToggleCodePanel,
  model,
  onModelChange,
  availableModels,
  isStreaming,
}: AgentTabBarProps) {
  return (
    <div className="border-border/50 bg-surface-1 flex h-10 shrink-0 items-center border-b px-1">
      {/* Agent tab (single for now) */}
      <div className="border-primary flex h-full items-center gap-2 border-b-2 px-3">
        <Bot className="text-primary h-3.5 w-3.5" />
        <span className="text-foreground max-w-[200px] truncate text-sm font-medium">
          {chatTitle || projectName}
        </span>
        {isStreaming && (
          <div className="bg-primary h-1.5 w-1.5 animate-pulse rounded-full" />
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side controls */}
      <div className="flex items-center gap-1 pr-2">
        {model && onModelChange && availableModels && (
          <ModelSelector
            model={model}
            onModelChange={onModelChange}
            availableModels={availableModels}
          />
        )}
        <button
          type="button"
          onClick={onToggleCodePanel}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
            isCodePanelOpen
              ? 'bg-surface-2 text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
          title={isCodePanelOpen ? 'Hide code panel' : 'Show code panel'}
        >
          {isCodePanelOpen ? (
            <PanelRightClose className="h-3.5 w-3.5" />
          ) : (
            <PanelRightOpen className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  )
}
```

**Step 2: Verify build**

Run: `cd apps/web && npx next build --no-lint 2>&1 | tail -20` Expected: Build
succeeds.

**Step 3: Commit**

```bash
git add apps/web/components/workbench/AgentTabBar.tsx
git commit -m "feat: add AgentTabBar component — single tab now, multi-agent ready"
```

---

## Task 5: Create ActivityStrip Component

**Files:**

- Create: `apps/web/components/workbench/ActivityStrip.tsx`

**Step 1: Build ActivityStrip — 32px status strip at bottom of chat**

```tsx
'use client'

import { cn } from '@/lib/utils'
import { ChevronUp, GitBranch, Wifi, WifiOff } from 'lucide-react'

type AgentState = 'idle' | 'thinking' | 'writing' | 'running' | 'error'

interface ActivityStripProps {
  agentState: AgentState
  stateDetail?: string
  branchName?: string
  isConnected?: boolean
  isDrawerOpen: boolean
  onToggleDrawer: () => void
}

const STATE_CONFIG: Record<AgentState, { label: string; dotClass: string }> = {
  idle: { label: 'Idle', dotClass: 'bg-muted-foreground' },
  thinking: { label: 'Thinking...', dotClass: 'bg-primary animate-pulse' },
  writing: { label: 'Writing', dotClass: 'bg-green-500 animate-pulse' },
  running: { label: 'Running', dotClass: 'bg-amber-500 animate-pulse' },
  error: { label: 'Error', dotClass: 'bg-red-500' },
}

export function ActivityStrip({
  agentState,
  stateDetail,
  branchName,
  isConnected = true,
  isDrawerOpen,
  onToggleDrawer,
}: ActivityStripProps) {
  const config = STATE_CONFIG[agentState]

  return (
    <button
      type="button"
      onClick={onToggleDrawer}
      className="border-border/50 bg-surface-1 hover:bg-surface-2 flex h-8 w-full shrink-0 items-center gap-2 border-t px-3 transition-colors"
    >
      <ChevronUp
        className={cn(
          'text-muted-foreground h-3 w-3 transition-transform',
          isDrawerOpen && 'rotate-180'
        )}
      />
      <div className={cn('h-1.5 w-1.5 rounded-full', config.dotClass)} />
      <span className="text-muted-foreground text-xs">
        {stateDetail || config.label}
      </span>

      <div className="flex-1" />

      {branchName && (
        <div className="text-muted-foreground flex items-center gap-1 text-xs">
          <GitBranch className="h-3 w-3" />
          <span className="max-w-[120px] truncate">{branchName}</span>
        </div>
      )}

      <div className="flex items-center gap-1">
        {isConnected ? (
          <Wifi className="text-muted-foreground h-3 w-3" />
        ) : (
          <WifiOff className="h-3 w-3 text-red-500" />
        )}
      </div>
    </button>
  )
}
```

**Step 2: Verify build**

Run: `cd apps/web && npx next build --no-lint 2>&1 | tail -20` Expected: Build
succeeds.

**Step 3: Commit**

```bash
git add apps/web/components/workbench/ActivityStrip.tsx
git commit -m "feat: add ActivityStrip component — 32px status strip for agent state"
```

---

## Task 6: Create ActivityDrawer Component

**Files:**

- Create: `apps/web/components/workbench/ActivityDrawer.tsx`

**Step 1: Build ActivityDrawer — pull-up bottom sheet with activity feed + raw
terminal**

```tsx
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Terminal } from '@/components/workbench/Terminal'
import type { Id } from '@convex/_generated/dataModel'

type ActivityFilter = 'all' | 'commands' | 'files' | 'errors' | 'terminal'

interface ActivityDrawerProps {
  open: boolean
  projectId: Id<'projects'>
  /** Height as percentage of parent container, 20-50 */
  height?: number
}

const FILTER_TABS: Array<{ id: ActivityFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'commands', label: 'Commands' },
  { id: 'files', label: 'Files' },
  { id: 'errors', label: 'Errors' },
  { id: 'terminal', label: 'Terminal' },
]

export function ActivityDrawer({
  open,
  projectId,
  height = 40,
}: ActivityDrawerProps) {
  const [activeFilter, setActiveFilter] = useState<ActivityFilter>('all')

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: `${height}%` }}
          exit={{ height: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="border-border/50 bg-surface-1 shadow-drawer flex min-h-0 flex-col overflow-hidden border-t"
        >
          {/* Filter tabs */}
          <div className="border-border/50 flex h-9 shrink-0 items-center gap-1 border-b px-3">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs transition-colors',
                  activeFilter === tab.id
                    ? 'bg-surface-2 text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="min-h-0 flex-1 overflow-auto">
            {activeFilter === 'terminal' ? (
              <Terminal projectId={projectId} />
            ) : (
              <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
                Activity feed will be populated from agent events
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

**Step 2: Verify build**

Run: `cd apps/web && npx next build --no-lint 2>&1 | tail -20` Expected: Build
succeeds.

**Step 3: Commit**

```bash
git add apps/web/components/workbench/ActivityDrawer.tsx
git commit -m "feat: add ActivityDrawer component — bottom sheet with activity feed and raw terminal"
```

---

## Task 7: Create CodePanel Component

**Files:**

- Create: `apps/web/components/workbench/CodePanel.tsx`

**Step 1: Build CodePanel — right-side editor container with auto-expand logic**

```tsx
'use client'

import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { cn } from '@/lib/utils'
import { FileTabs } from '@/components/workbench/FileTabs'
import { EditorContainer } from '@/components/editor/EditorContainer'
import { PlanArtifactTab } from '@/components/workbench/PlanArtifactTab'
import { PendingArtifactOverlay } from '@/components/workbench/PendingArtifactOverlay'
import {
  isWorkspacePlanTab,
  type WorkspaceOpenTab,
} from '@/contexts/WorkspaceContext'
import type { Id } from '@convex/_generated/dataModel'
import type { WorkspaceArtifactPreview } from '@/components/workbench/artifact-preview'

interface CodePanelProps {
  files: Array<{
    _id: Id<'files'>
    path: string
    content?: string
    isBinary: boolean
    updatedAt: number
  }>
  selectedFilePath: string | null
  selectedLocation?: { line: number; column: number; nonce: number } | null
  openTabs: WorkspaceOpenTab[]
  onSelectFile: (
    path: string,
    location?: { line: number; column: number }
  ) => void
  onCloseTab: (path: string) => void
  onSaveFile: (filePath: string, content: string) => void
  onEditorDirtyChange: (filePath: string, isDirty: boolean) => void
  pendingArtifactPreview?: WorkspaceArtifactPreview | null
  onApplyPendingArtifact: (artifactId: string) => void
  onRejectPendingArtifact: (artifactId: string) => void
  onContextualChat?: (selection: string, filePath: string) => void
  onInlineChat?: (
    prompt: string,
    selectedText: string,
    filePath: string
  ) => Promise<string | null>
}

export function CodePanel({
  files,
  selectedFilePath,
  selectedLocation,
  openTabs,
  onSelectFile,
  onCloseTab,
  onSaveFile,
  onEditorDirtyChange,
  pendingArtifactPreview,
  onApplyPendingArtifact,
  onRejectPendingArtifact,
  onContextualChat,
  onInlineChat,
}: CodePanelProps) {
  const selectedFile = selectedFilePath
    ? files.find((f) => f.path === selectedFilePath)
    : undefined
  const selectedTab =
    openTabs.find((tab) => tab.path === selectedFilePath) ?? null
  const selectedPlanTab =
    selectedTab && isWorkspacePlanTab(selectedTab) ? selectedTab : null

  return (
    <div className="bg-background flex h-full min-h-0 min-w-0 flex-col">
      {/* File tabs */}
      {openTabs.length > 0 && (
        <FileTabs
          tabs={openTabs}
          activePath={selectedFilePath}
          onSelect={onSelectFile}
          onClose={onCloseTab}
        />
      )}

      {/* Editor content */}
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
        {selectedPlanTab ? (
          <PlanArtifactTab artifact={selectedPlanTab.artifact} />
        ) : selectedFile ? (
          <div className="flex h-full min-h-0 min-w-0 flex-col">
            {pendingArtifactPreview ? (
              <PendingArtifactOverlay
                preview={pendingArtifactPreview}
                onApply={onApplyPendingArtifact}
                onReject={onRejectPendingArtifact}
              />
            ) : (
              <div className="min-h-0 min-w-0 flex-1">
                <EditorContainer
                  filePath={selectedFile.path}
                  content={selectedFile.content ?? ''}
                  jumpTo={selectedLocation}
                  onSave={(content) => onSaveFile(selectedFile.path, content)}
                  onDirtyChange={(isDirty) =>
                    onEditorDirtyChange(selectedFile.path, isDirty)
                  }
                  onContextualChat={onContextualChat}
                  onInlineChat={onInlineChat}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
            Select a file to view
          </div>
        )}
      </div>
    </div>
  )
}
```

**Step 2: Verify build**

Run: `cd apps/web && npx next build --no-lint 2>&1 | tail -20` Expected: Build
succeeds.

**Step 3: Commit**

```bash
git add apps/web/components/workbench/CodePanel.tsx
git commit -m "feat: add CodePanel component — right-side editor with file tabs"
```

---

## Task 8: Create WorkspaceShell Component

**Files:**

- Create: `apps/web/components/workbench/WorkspaceShell.tsx`

This is the core layout component that replaces both `Workbench.tsx` and
`ProjectWorkspaceLayout.tsx`.

**Step 1: Build WorkspaceShell**

```tsx
'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { NavRail, type NavRailSection } from '@/components/workbench/NavRail'
import { AgentTabBar } from '@/components/workbench/AgentTabBar'
import { ActivityStrip } from '@/components/workbench/ActivityStrip'
import { ActivityDrawer } from '@/components/workbench/ActivityDrawer'
import { CodePanel } from '@/components/workbench/CodePanel'
import { FloatingOverlay } from '@/components/ui/floating-overlay'
import { FileTree } from '@/components/workbench/FileTree'
import { ProjectSearchPanel } from '@/components/workbench/ProjectSearchPanel'
import { SidebarHistoryPanel } from '@/components/sidebar/SidebarHistoryPanel'
import {
  useWorkspace,
  type WorkspaceOpenTab,
} from '@/contexts/WorkspaceContext'
import { useShortcuts } from '@/hooks/useShortcuts'
import type { AvailableModel } from '@/components/chat/ModelSelector'
import type { Id } from '@convex/_generated/dataModel'
import type { WorkspaceArtifactPreview } from '@/components/workbench/artifact-preview'

interface WorkspaceShellProps {
  projectId: Id<'projects'>
  projectName: string
  activeChatId?: Id<'chats'>
  chatTitle?: string
  files: Array<{
    _id: Id<'files'>
    path: string
    content?: string
    isBinary: boolean
    updatedAt: number
  }>
  selectedFilePath: string | null
  selectedLocation?: { line: number; column: number; nonce: number } | null
  openTabs: WorkspaceOpenTab[]
  onSelectFile: (
    path: string,
    location?: { line: number; column: number }
  ) => void
  onCloseTab: (path: string) => void
  onCreateFile: (path: string) => void
  onRenameFile: (oldPath: string, newPath: string) => void
  onDeleteFile: (path: string) => void
  onSaveFile: (filePath: string, content: string) => void
  onEditorDirtyChange: (filePath: string, isDirty: boolean) => void
  pendingArtifactPreview?: WorkspaceArtifactPreview | null
  onApplyPendingArtifact: (artifactId: string) => void
  onRejectPendingArtifact: (artifactId: string) => void
  onContextualChat?: (selection: string, filePath: string) => void
  onInlineChat?: (
    prompt: string,
    selectedText: string,
    filePath: string
  ) => Promise<string | null>
  /** The chat panel React node */
  chatPanel: React.ReactNode
  isStreaming?: boolean
  model?: string
  onModelChange?: (model: string) => void
  availableModels?: AvailableModel[]
}

const DRAWER_STORAGE_KEY = 'panda:activity-drawer-open'

export function WorkspaceShell({
  projectId,
  projectName,
  activeChatId,
  chatTitle,
  files,
  selectedFilePath,
  selectedLocation,
  openTabs,
  onSelectFile,
  onCloseTab,
  onCreateFile,
  onRenameFile,
  onDeleteFile,
  onSaveFile,
  onEditorDirtyChange,
  pendingArtifactPreview,
  onApplyPendingArtifact,
  onRejectPendingArtifact,
  onContextualChat,
  onInlineChat,
  chatPanel,
  isStreaming = false,
  model,
  onModelChange,
  availableModels,
}: WorkspaceShellProps) {
  const { onSelectChat } = useWorkspace()

  // Rail overlay state
  const [activeOverlay, setActiveOverlay] = useState<NavRailSection | null>(
    null
  )

  // Code panel state
  const [isCodePanelOpen, setIsCodePanelOpen] = useState(false)

  // Activity drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(DRAWER_STORAGE_KEY) === 'true'
  })

  useEffect(() => {
    localStorage.setItem(DRAWER_STORAGE_KEY, String(isDrawerOpen))
  }, [isDrawerOpen])

  // Auto-expand code panel when files have pending artifacts
  useEffect(() => {
    if (pendingArtifactPreview && !isCodePanelOpen) {
      setIsCodePanelOpen(true)
    }
  }, [pendingArtifactPreview, isCodePanelOpen])

  // Keyboard shortcuts
  const shortcuts = useMemo(
    () => [
      {
        id: 'toggle-code-panel',
        keys: 'mod+b',
        label: 'Toggle Code Panel',
        handler: () => setIsCodePanelOpen((prev) => !prev),
        category: 'Panels',
      },
      {
        id: 'toggle-activity-drawer',
        keys: 'mod+`',
        label: 'Toggle Activity Drawer',
        handler: () => setIsDrawerOpen((prev) => !prev),
        category: 'Panels',
      },
      {
        id: 'overlay-files',
        keys: 'mod+shift+e',
        label: 'Toggle Files',
        handler: () =>
          setActiveOverlay((prev) => (prev === 'files' ? null : 'files')),
        category: 'Navigation',
      },
      {
        id: 'overlay-search',
        keys: 'mod+shift+f',
        label: 'Toggle Search',
        handler: () =>
          setActiveOverlay((prev) => (prev === 'search' ? null : 'search')),
        category: 'Navigation',
      },
      {
        id: 'overlay-history',
        keys: 'mod+shift+h',
        label: 'Toggle History',
        handler: () =>
          setActiveOverlay((prev) => (prev === 'history' ? null : 'history')),
        category: 'Navigation',
      },
    ],
    []
  )

  useShortcuts(shortcuts)

  const handleOverlayClose = useCallback(() => setActiveOverlay(null), [])

  const handleToggleCodePanel = useCallback(() => {
    setIsCodePanelOpen((prev) => !prev)
  }, [])

  const handleToggleDrawer = useCallback(() => {
    setIsDrawerOpen((prev) => !prev)
  }, [])

  return (
    <div className="bg-background flex h-full min-h-0 min-w-0 flex-col">
      {/* Agent Tab Bar */}
      <AgentTabBar
        projectName={projectName}
        chatTitle={chatTitle}
        isCodePanelOpen={isCodePanelOpen}
        onToggleCodePanel={handleToggleCodePanel}
        model={model}
        onModelChange={onModelChange}
        availableModels={availableModels}
        isStreaming={isStreaming}
      />

      {/* Main content area */}
      <div className="relative flex min-h-0 min-w-0 flex-1">
        {/* Nav Rail */}
        <NavRail
          activeOverlay={activeOverlay}
          onOverlayChange={setActiveOverlay}
        />

        {/* Floating overlays */}
        <FloatingOverlay
          open={activeOverlay === 'files'}
          onClose={handleOverlayClose}
          title="Files"
          maxWidth={280}
        >
          <FileTree
            files={files.map((f) => ({
              _id: f._id,
              path: f.path,
              content: f.content ?? '',
              isBinary: f.isBinary,
              updatedAt: f.updatedAt,
            }))}
            selectedPath={selectedFilePath}
            onSelect={(path, location) => {
              onSelectFile(path, location)
              if (!isCodePanelOpen) setIsCodePanelOpen(true)
              setActiveOverlay(null)
            }}
            onCreate={onCreateFile}
            onRename={onRenameFile}
            onDelete={onDeleteFile}
          />
        </FloatingOverlay>

        <FloatingOverlay
          open={activeOverlay === 'search'}
          onClose={handleOverlayClose}
          title="Search"
          maxWidth={320}
        >
          <ProjectSearchPanel
            onSelectFile={(path, location) => {
              onSelectFile(path, location)
              if (!isCodePanelOpen) setIsCodePanelOpen(true)
              setActiveOverlay(null)
            }}
          />
        </FloatingOverlay>

        <FloatingOverlay
          open={activeOverlay === 'history'}
          onClose={handleOverlayClose}
          title="History"
          maxWidth={300}
        >
          <SidebarHistoryPanel
            projectId={projectId}
            activeChatId={activeChatId}
            onSelectChat={onSelectChat}
          />
        </FloatingOverlay>

        {/* Chat + Code split */}
        <div className="min-h-0 min-w-0 flex-1">
          <PanelGroup
            direction="horizontal"
            className="h-full min-h-0 min-w-0"
            autoSaveId="panda-shell-main"
          >
            {/* Chat panel (primary) */}
            <Panel
              defaultSize={isCodePanelOpen ? 60 : 100}
              minSize={30}
              className="flex min-h-0 min-w-0 flex-col"
            >
              <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
                {chatPanel}
              </div>

              {/* Activity strip + drawer */}
              <ActivityStrip
                agentState={isStreaming ? 'thinking' : 'idle'}
                isDrawerOpen={isDrawerOpen}
                onToggleDrawer={handleToggleDrawer}
              />
              <ActivityDrawer open={isDrawerOpen} projectId={projectId} />
            </Panel>

            {/* Code panel (auto-collapsing) */}
            {isCodePanelOpen && (
              <>
                <PanelResizeHandle className="group relative w-1 cursor-col-resize">
                  <div className="bg-border/50 group-hover:bg-primary group-data-[resize-handle-state=drag]:bg-primary absolute inset-y-0 left-1/2 w-px -translate-x-1/2 transition-colors" />
                </PanelResizeHandle>
                <Panel
                  defaultSize={40}
                  minSize={25}
                  maxSize={70}
                  className="min-h-0 min-w-0"
                >
                  <CodePanel
                    files={files}
                    selectedFilePath={selectedFilePath}
                    selectedLocation={selectedLocation}
                    openTabs={openTabs}
                    onSelectFile={onSelectFile}
                    onCloseTab={onCloseTab}
                    onSaveFile={onSaveFile}
                    onEditorDirtyChange={onEditorDirtyChange}
                    pendingArtifactPreview={pendingArtifactPreview}
                    onApplyPendingArtifact={onApplyPendingArtifact}
                    onRejectPendingArtifact={onRejectPendingArtifact}
                    onContextualChat={onContextualChat}
                    onInlineChat={onInlineChat}
                  />
                </Panel>
              </>
            )}
          </PanelGroup>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Verify build**

Run: `cd apps/web && npx next build --no-lint 2>&1 | tail -20` Expected: Build
succeeds.

**Step 3: Commit**

```bash
git add apps/web/components/workbench/WorkspaceShell.tsx
git commit -m "feat: add WorkspaceShell — new root layout component for modernized workbench"
```

---

## Task 9: Wire WorkspaceShell into ProjectPage

**Files:**

- Modify: `apps/web/app/(dashboard)/projects/[projectId]/page.tsx`

This is the integration task. The ProjectPage currently renders a top bar +
`ProjectWorkspaceLayout`. We replace it with the top bar integrated into
`WorkspaceShell`.

**Step 1: Update imports**

Replace:

```tsx
import { ProjectWorkspaceLayout } from '@/components/projects/ProjectWorkspaceLayout'
```

With:

```tsx
import { WorkspaceShell } from '@/components/workbench/WorkspaceShell'
```

**Step 2: Replace the ProjectWorkspaceLayout render**

In the return JSX (around line 1098), replace the
`<ProjectWorkspaceLayout ... />` block with:

````tsx
<WorkspaceShell
  projectId={projectId}
  projectName={project.name}
  activeChatId={activeChat?._id}
  chatTitle={activeChat?.title}
  files={files}
  selectedFilePath={selectedFilePath}
  selectedLocation={selectedFileLocation}
  openTabs={openTabs}
  onSelectFile={handleFileSelect}
  onCloseTab={handleTabClose}
  onCreateFile={handleFileCreate}
  onRenameFile={handleFileRename}
  onDeleteFile={handleFileDelete}
  onSaveFile={handleEditorSave}
  onEditorDirtyChange={handleEditorDirtyChange}
  pendingArtifactPreview={pendingArtifactPreview}
  onApplyPendingArtifact={handleApplyPendingArtifact}
  onRejectPendingArtifact={handleRejectPendingArtifact}
  onContextualChat={(selection, filePath) => {
    const ext = filePath.split('.').pop() || 'text'
    const prompt = `\`\`\`${ext}\n// ${filePath}\n${selection}\n\`\`\``
    setContextualPrompt(prompt)
  }}
  onInlineChat={async (prompt, selection, filePath) => {
    try {
      const result = await agent.runEvalScenario({
        prompt: `The user wants to edit ${filePath}.\n${selection ? `Selected text:\n\`\`\`\n${selection}\n\`\`\`\n` : ''}User request: ${prompt}\n\nReturn ONLY the new code that should replace the selected text (or be inserted at the cursor). Do NOT wrap it in markdown block quotes. Do NOT add any explanations.`,
        mode: 'code',
      })
      if (result.error) throw new Error(result.error)
      let output = result.output
      if (output.startsWith('```')) {
        const lines = output.split('\n')
        if (lines.length > 2) output = lines.slice(1, -1).join('\n')
      }
      return output
    } catch (err) {
      const failure = buildInlineChatFailureDisplay(err)
      appLog.error('[projects/[projectId]] Inline chat failed', {
        projectId,
        filePath,
        error:
          err instanceof Error
            ? { name: err.name, message: err.message, stack: err.stack }
            : err,
      })
      toast.error(failure.title, { description: failure.description })
      return null
    }
  }}
  chatPanel={chatPanelContent}
  isStreaming={agent.isLoading}
  model={uiSelectedModel}
  onModelChange={setUiSelectedModel}
  availableModels={availableModels}
/>
````

**Step 3: Simplify the top bar**

The current 56px top bar in ProjectPage has sidebar toggle, logo, breadcrumbs,
etc. Since the AgentTabBar now handles project name and model selection, the top
bar can be simplified to just the Panda logo + back button, or removed entirely
and integrated into the AgentTabBar.

For now, keep the top bar but remove:

- The sidebar toggle button (rail handles this now)
- The breadcrumb (project name is in AgentTabBar)
- Reduce height from `h-14` to `h-10`

Update the top bar to:

```tsx
<div className="border-border/50 bg-surface-1 flex h-10 shrink-0 items-center justify-between border-b px-3">
  <div className="flex items-center gap-2">
    <Link href="/" className="flex shrink-0 items-center">
      <PandaLogo size="sm" variant="icon" />
    </Link>
    <div className="bg-border/50 h-5 w-px" />
    <Link href="/projects">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1 rounded-md text-xs"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Projects</span>
      </Button>
    </Link>
  </div>
  <div className="flex items-center gap-1">
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 rounded-md text-xs">
          <MoreHorizontal className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="border-border/50 rounded-md">
        <DropdownMenuItem onClick={handleResetWorkspace} className="text-xs">
          <RotateCcw className="mr-2 h-3.5 w-3.5" />
          Reset Workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</div>
```

**Step 4: Verify the app renders**

Run: `cd apps/web && npx next dev` Navigate to a project page and verify the new
layout renders.

**Step 5: Commit**

```bash
git add apps/web/app/\(dashboard\)/projects/\[projectId\]/page.tsx
git commit -m "feat: wire WorkspaceShell into ProjectPage — chat-dominant layout live"
```

---

## Task 10: Restyle Chat Components for New Layout

**Files:**

- Modify: `apps/web/components/chat/ChatInput.tsx` — update mode selector
  positioning, remove monospace from non-code UI
- Modify: `apps/web/components/chat/MessageBubble.tsx` (or equivalent) — add
  max-width centering, update radius
- Modify: `apps/web/components/projects/ProjectChatPanel.tsx` — remove header
  chrome that's now in AgentTabBar, add centered max-width container

**Step 1: Update ProjectChatPanel to be the primary view**

The chat panel should:

- Remove its own header (project name, model selector moved to AgentTabBar)
- Add `max-w-3xl mx-auto` centering to the message list container
- Update bubble styles to use 8px radius instead of 0px

**Step 2: Update ChatInput**

- Move mode selector pills (Build / Architect / Ask) above the input textarea
- Remove `font-mono` from non-code labels
- Update button/input radius to `rounded-md`

**Step 3: Verify visually**

Run the dev server, confirm chat panel renders properly in the new layout with
centered messages and updated styling.

**Step 4: Commit**

```bash
git add apps/web/components/chat/ apps/web/components/projects/ProjectChatPanel.tsx
git commit -m "style: restyle chat components for chat-dominant layout — centered messages, soft radius"
```

---

## Task 11: Update Global Typography — Remove Excessive Monospace

**Files:**

- Modify: Multiple component files — search for `font-mono` usage on non-code
  elements
- Modify: Multiple component files — search for `uppercase tracking-widest`
  panel headers

**Step 1: Audit and fix font-mono usage**

Run:
`grep -rn 'font-mono' apps/web/components/ | grep -v 'node_modules' | grep -v '.test.'`

For each result, determine if it's code-related (keep) or UI text (change to
default Geist Sans by removing the `font-mono` class).

**Keep font-mono on:**

- Code editor, terminal output, file paths, keyboard shortcuts, diffs, code
  blocks

**Remove font-mono from:**

- Buttons, labels, headers, panel titles, navigation items, status text

**Step 2: Remove uppercase tracking-widest from panel headers**

Run: `grep -rn 'uppercase tracking-widest' apps/web/components/`

Replace `font-mono text-xs uppercase tracking-widest` with `text-sm font-medium`
on panel headers.

**Step 3: Verify visually**

Check that the app looks right — UI text in Geist Sans, code in Fira Code.

**Step 4: Commit**

```bash
git add apps/web/components/
git commit -m "style: replace monospace UI text with system font, remove uppercase tracking headers"
```

---

## Task 12: Update Button and Input Radius Globally

**Files:**

- Modify: `apps/web/components/ui/button.tsx` — update `rounded-none` to
  `rounded-md`
- Modify: `apps/web/components/ui/input.tsx` — same
- Modify: `apps/web/components/ui/dropdown-menu.tsx` — same
- Modify: `apps/web/components/ui/dialog.tsx` — same

**Step 1: Search and replace rounded-none in UI components**

Run: `grep -rn 'rounded-none' apps/web/components/ui/`

For each base UI component, replace `rounded-none` with `rounded-md` (which maps
to `var(--radius)` = 8px).

**Step 2: Verify visually**

Buttons, inputs, dropdowns, dialogs should all have soft 8px corners.

**Step 3: Commit**

```bash
git add apps/web/components/ui/
git commit -m "style: update UI components to use soft border-radius globally"
```

---

## Task 13: Mobile Responsive Layout

**Files:**

- Modify: `apps/web/components/workbench/WorkspaceShell.tsx`

**Step 1: Add mobile detection**

Use the existing `useWorkspace()` hook's `isMobileLayout` flag. When mobile:

- Hide the NavRail
- Hide the CodePanel
- Chat fills full screen
- Activity strip at bottom
- Add a floating action button for file access

**Step 2: Implement mobile layout branch**

Add a conditional render at the top of WorkspaceShell:

```tsx
if (isMobileLayout) {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-background">
      <AgentTabBar ... />
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
        {chatPanel}
      </div>
      <ActivityStrip ... />
    </div>
  )
}
```

**Step 3: Verify on mobile viewport**

Use browser dev tools to test at 375px width.

**Step 4: Commit**

```bash
git add apps/web/components/workbench/WorkspaceShell.tsx
git commit -m "feat: add mobile responsive layout to WorkspaceShell"
```

---

## Task 14: Clean Up Deprecated Components

**Files:**

- Keep but mark deprecated: `apps/web/components/workbench/Workbench.tsx`
- Keep but mark deprecated:
  `apps/web/components/projects/ProjectWorkspaceLayout.tsx`
- Keep but mark deprecated: `apps/web/components/sidebar/SidebarRail.tsx`
- Keep but mark deprecated: `apps/web/components/sidebar/SidebarFlyout.tsx`
- Keep but mark deprecated: `apps/web/components/workbench/StatusBar.tsx`
- Keep but mark deprecated: `apps/web/components/panels/RightPanel.tsx`

**Step 1: Add deprecation comments**

Add to the top of each deprecated file:

```tsx
/**
 * @deprecated Replaced by WorkspaceShell in the workbench modernization.
 * This component is kept for reference during migration.
 * Safe to delete once WorkspaceShell is fully validated.
 */
```

**Step 2: Verify no broken imports**

Run: `cd apps/web && npx next build --no-lint 2>&1 | tail -20`

**Step 3: Commit**

```bash
git add apps/web/components/
git commit -m "chore: mark deprecated workbench components for future removal"
```

---

## Summary

| Task | Component                | Type                 |
| ---- | ------------------------ | -------------------- |
| 1    | Design tokens & CSS      | Style                |
| 2    | FloatingOverlay          | New component        |
| 3    | NavRail                  | New component        |
| 4    | AgentTabBar              | New component        |
| 5    | ActivityStrip            | New component        |
| 6    | ActivityDrawer           | New component        |
| 7    | CodePanel                | New component        |
| 8    | WorkspaceShell           | New component (core) |
| 9    | Wire into ProjectPage    | Integration          |
| 10   | Restyle chat components  | Style                |
| 11   | Typography cleanup       | Style                |
| 12   | Radius cleanup           | Style                |
| 13   | Mobile responsive        | Feature              |
| 14   | Deprecate old components | Cleanup              |
