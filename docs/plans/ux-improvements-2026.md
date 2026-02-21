# UX Improvement Implementation Plan

**Project:** Panda.ai Browser IDE  
**Created:** 2026-02-20  
**Status:** Ready for Development  
**Priority:** P0-P2

---

## Overview

This plan implements industry-standard UX improvements aligned with Cursor,
Windsurf, Claude Code, VS Code Web, and GitHub Codespaces (2025-2026 standards).
All recommendations are based on current WCAG 2.2 guidelines and competitive
analysis.

**Excluded from this plan:**

- Keyboard Shortcuts Panel (deferred)
- Live Share/Collaboration (deferred)

---

## Phase 1: Critical Accessibility & WCAG Compliance (P0)

### 1.1 Icon Button Accessibility

**Priority:** P0 | **Effort:** 1 hour | **Impact:** High

**Problem:** Icon-only buttons lack `aria-label` for screen readers **Files:**
`Workbench.tsx`, `ArtifactPanel.tsx`, `page.tsx`

**Implementation:**

```tsx
// Before
<Button variant="ghost" size="icon" className="h-8 w-8">
  <ChevronLeft className="h-4 w-4" />
</Button>

// After
<Button
  variant="ghost"
  size="icon"
  className="h-11 w-11"
  aria-label="Back to projects"
>
  <ChevronLeft className="h-4 w-4" />
</Button>
```

**Tasks:**

- [ ] Audit all icon-only buttons in codebase
- [ ] Add descriptive `aria-label` attributes
- [ ] Add `title` attributes for hover tooltips
- [ ] Test with screen reader (NVDA/VoiceOver)

---

### 1.2 Touch Target Size (WCAG 2.2)

**Priority:** P0 | **Effort:** 30 min | **Impact:** High

**Problem:** Touch targets below 44x44px (WCAG 2.2 Success Criterion 2.5.8)
**Files:** `button.tsx`, `ChatInput.tsx`, various components

**Implementation:**

```tsx
// components/ui/button.tsx
const buttonVariants = cva('...', {
  variants: {
    size: {
      default: 'h-11 px-4 py-2', // Was h-10
      sm: 'h-9 rounded-md px-3', // Keep for desktop
      lg: 'h-12 rounded-md px-8', // Was h-11
      icon: 'h-11 w-11', // Was h-10 w-10 - CRITICAL
    },
  },
})
```

**Tasks:**

- [ ] Update `button.tsx` size variants
- [ ] Audit all `size="icon"` usages
- [ ] Test on mobile devices (iOS Safari, Chrome Android)

---

### 1.3 prefers-reduced-motion Support

**Priority:** P0 | **Effort:** 15 min | **Impact:** High

**Problem:** Animations run regardless of user accessibility preferences
**Files:** `globals.css`, `page.tsx`

**Implementation:**

```css
/* Add to apps/web/app/globals.css */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }

  /* Disable dot grid animation */
  .dot-grid {
    animation: none !important;
  }
}
```

**Tasks:**

- [ ] Add media query to globals.css
- [ ] Test with macOS "Reduce motion" setting
- [ ] Test with Windows "Show animations" disabled

---

### 1.4 Skip-to-Content Link

**Priority:** P0 | **Effort:** 30 min | **Impact:** Medium

**Problem:** Keyboard users must tab through navigation to reach content
**Files:** `layout.tsx`, `DashboardLayout`

**Implementation:**

```tsx
// apps/web/app/(dashboard)/layout.tsx
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <a
        href="#main-content"
        className="focus:bg-primary focus:text-primary-foreground sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4"
      >
        Skip to main content
      </a>
      <div className="bg-background min-h-screen">
        <DashboardHeader />
        <main id="main-content" className="container py-6" tabIndex={-1}>
          {children}
        </main>
      </div>
    </ProtectedRoute>
  )
}
```

**Tasks:**

- [ ] Add skip link to dashboard layout
- [ ] Add skip link to landing page
- [ ] Add skip link to settings page
- [ ] Test keyboard navigation flow

---

### 1.5 Form Label Associations

**Priority:** P0 | **Effort:** 1 hour | **Impact:** Medium

**Problem:** Form inputs lack proper `htmlFor`/`id` associations **Files:**
`page.tsx` (CreateProjectDialog), `settings/page.tsx`

**Implementation:**

```tsx
// Before
<label className="font-mono text-sm">Project Name</label>
<Input id="name" ... />

// After
<Label htmlFor="name" className="font-mono text-sm">Project Name</Label>
<Input id="name" aria-describedby="name-help" ... />
<p id="name-help" className="text-xs text-muted-foreground">
  Use lowercase letters, numbers, and hyphens
</p>
```

**Tasks:**

- [ ] Audit all form inputs
- [ ] Add `htmlFor` to all Label components
- [ ] Add `aria-describedby` for help text
- [ ] Test with screen reader

---

## Phase 2: Core IDE Features (P1)

### 2.1 Command Palette (Cmd+K)

**Priority:** P1 | **Effort:** 2 days | **Impact:** Very High

**Problem:** No quick access to files, commands, settings **Industry Standard:**
VS Code, Cursor, Windsurf, GitHub (Cmd+K or Ctrl+Shift+P)

**New Files:**

- `components/command-palette/CommandPalette.tsx`
- `components/command-palette/CommandPaletteProvider.tsx`
- `hooks/useCommandPalette.ts`
- `lib/commands/registry.ts`

**Implementation:**

```tsx
// components/command-palette/CommandPalette.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  FileIcon,
  CommandIcon,
  SettingsIcon,
  MessageSquareIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CommandItem {
  id: string
  type: 'file' | 'command' | 'mode' | 'setting'
  title: string
  subtitle?: string
  icon: React.ReactNode
  shortcut?: string
  action: () => void
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Register Cmd+K shortcut
  useHotkeys('cmd+k, ctrl+k', (e) => {
    e.preventDefault()
    setOpen(true)
  })

  // Close on Escape
  useHotkeys('esc', () => setOpen(false), { enabled: open })

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    return commands.filter(
      (cmd) =>
        cmd.title.toLowerCase().includes(query.toLowerCase()) ||
        cmd.subtitle?.toLowerCase().includes(query.toLowerCase())
    )
  }, [query])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl gap-0 rounded-none p-0">
        {/* Search Input */}
        <div className="border-border border-b p-4">
          <Input
            placeholder="Search files, commands, or settings..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            className="border-0 bg-transparent text-lg focus-visible:ring-0"
            autoFocus
          />
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {filteredCommands.map((cmd, index) => (
            <button
              key={cmd.id}
              onClick={() => {
                cmd.action()
                setOpen(false)
              }}
              className={cn(
                'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
                index === selectedIndex && 'bg-primary/10'
              )}
            >
              {cmd.icon}
              <div className="min-w-0 flex-1">
                <div className="font-medium">{cmd.title}</div>
                {cmd.subtitle && (
                  <div className="text-muted-foreground truncate text-sm">
                    {cmd.subtitle}
                  </div>
                )}
              </div>
              {cmd.shortcut && (
                <kbd className="bg-muted rounded px-2 py-1 text-xs">
                  {cmd.shortcut}
                </kbd>
              )}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="border-border text-muted-foreground flex items-center gap-4 border-t p-2 text-xs">
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>esc Close</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

**Command Registry:**

```tsx
// lib/commands/registry.ts
export const commands: CommandItem[] = [
  // Files
  {
    id: 'file-search',
    type: 'file',
    title: 'Search Files...',
    icon: <FileIcon />,
    action: () => {},
  },

  // Modes
  {
    id: 'mode-ask',
    type: 'mode',
    title: 'Switch to Ask Mode',
    icon: <MessageSquareIcon />,
    action: () => setMode('ask'),
  },
  {
    id: 'mode-architect',
    type: 'mode',
    title: 'Switch to Architect Mode',
    icon: <MessageSquareIcon />,
    action: () => setMode('architect'),
  },
  {
    id: 'mode-code',
    type: 'mode',
    title: 'Switch to Code Mode',
    icon: <MessageSquareIcon />,
    action: () => setMode('code'),
  },
  {
    id: 'mode-build',
    type: 'mode',
    title: 'Switch to Build Mode',
    icon: <MessageSquareIcon />,
    action: () => setMode('build'),
  },

  // Settings
  {
    id: 'settings-open',
    type: 'setting',
    title: 'Open Settings',
    icon: <SettingsIcon />,
    action: () => router.push('/settings'),
  },

  // Commands
  {
    id: 'cmd-toggle-chat',
    type: 'command',
    title: 'Toggle Chat Panel',
    shortcut: 'Cmd+/',
    icon: <CommandIcon />,
    action: () => {},
  },
  {
    id: 'cmd-toggle-sidebar',
    type: 'command',
    title: 'Toggle Sidebar',
    shortcut: 'Cmd+B',
    icon: <CommandIcon />,
    action: () => {},
  },
  {
    id: 'cmd-save-file',
    type: 'command',
    title: 'Save File',
    shortcut: 'Cmd+S',
    icon: <CommandIcon />,
    action: () => {},
  },
]
```

**Tasks:**

- [ ] Install `react-hotkeys-hook` dependency
- [ ] Create CommandPalette component
- [ ] Create command registry
- [ ] Integrate with file system for file search
- [ ] Add keyboard navigation (↑↓, Enter, Escape)
- [ ] Add to layout providers
- [ ] Test on macOS (Cmd+K) and Windows (Ctrl+K)

---

### 2.2 Side-by-Side Diff View for Artifacts

**Priority:** P1 | **Effort:** 2 days | **Impact:** High

**Problem:** Current artifact cards show stacked/inline diffs only **Industry
Standard:** Cursor users request side-by-side diffs for complex changes

**New Files:**

- `components/diff/DiffViewer.tsx`
- `components/diff/DiffLine.tsx`
- `lib/diff/compute.ts`

**Implementation:**

```tsx
// components/diff/DiffViewer.tsx
'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { FileIcon, ChevronLeft, ChevronRight } from 'lucide-react'

type DiffType = 'added' | 'removed' | 'unchanged'

interface DiffLine {
  type: DiffType
  oldLineNumber?: number
  newLineNumber?: number
  content: string
}

interface DiffViewerProps {
  original: string
  modified: string
  fileName: string
  mode?: 'side-by-side' | 'unified'
  onApply?: () => void
  onReject?: () => void
}

export function DiffViewer({
  original,
  modified,
  fileName,
  mode = 'side-by-side',
  onApply,
  onReject,
}: DiffViewerProps) {
  const [viewMode, setViewMode] = useState(mode)
  const diff = computeDiff(original, modified)

  return (
    <div className="border-border flex h-full flex-col rounded-none border">
      {/* Header */}
      <div className="border-border bg-surface-1 flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <FileIcon className="text-muted-foreground h-4 w-4" />
          <span className="font-mono text-sm">{fileName}</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'rounded-none text-xs',
              viewMode === 'side-by-side' && 'bg-primary/10'
            )}
            onClick={() => setViewMode('side-by-side')}
          >
            Split
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'rounded-none text-xs',
              viewMode === 'unified' && 'bg-primary/10'
            )}
            onClick={() => setViewMode('unified')}
          >
            Unified
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-none"
            onClick={onReject}
          >
            Reject
          </Button>
          <Button size="sm" className="rounded-none" onClick={onApply}>
            Apply
          </Button>
        </div>
      </div>

      {/* Diff Content */}
      <div className="flex-1 overflow-auto font-mono text-xs">
        {viewMode === 'side-by-side' ? (
          <SideBySideView diff={diff} />
        ) : (
          <UnifiedView diff={diff} />
        )}
      </div>
    </div>
  )
}

function SideBySideView({ diff }: { diff: DiffLine[] }) {
  return (
    <div className="flex">
      {/* Original */}
      <div className="border-border flex-1 border-r">
        <div className="bg-surface-2 text-muted-foreground sticky top-0 px-2 py-1 text-xs font-medium">
          Original
        </div>
        {diff.map((line, i) => (
          <div
            key={`old-${i}`}
            className={cn(
              'flex px-2 py-0.5',
              line.type === 'removed' &&
                'bg-red-500/10 text-red-700 dark:text-red-300',
              line.type === 'unchanged' && 'text-muted-foreground'
            )}
          >
            <span className="text-muted-foreground w-8 text-right select-none">
              {line.oldLineNumber || ' '}
            </span>
            <span className="ml-4">
              {line.type === 'added' ? '' : line.content}
            </span>
          </div>
        ))}
      </div>

      {/* Modified */}
      <div className="flex-1">
        <div className="bg-surface-2 text-muted-foreground sticky top-0 px-2 py-1 text-xs font-medium">
          Modified
        </div>
        {diff.map((line, i) => (
          <div
            key={`new-${i}`}
            className={cn(
              'flex px-2 py-0.5',
              line.type === 'added' &&
                'bg-green-500/10 text-green-700 dark:text-green-300',
              line.type === 'unchanged' && 'text-muted-foreground'
            )}
          >
            <span className="text-muted-foreground w-8 text-right select-none">
              {line.newLineNumber || ' '}
            </span>
            <span className="ml-4">
              {line.type === 'removed' ? '' : line.content}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Integration:**

```tsx
// Update ArtifactPanel.tsx
{
  pendingArtifacts.length > 0 && (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Separator className="flex-1" />
        <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          Pending ({pendingArtifacts.length})
        </span>
        <Separator className="flex-1" />
      </div>
      {pendingArtifacts.map((artifact, index) => (
        <motion.div
          key={artifact.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          {/* Show DiffViewer for file changes */}
          {artifact.type === 'file_write' ? (
            <DiffViewer
              original={/* fetch from file system */}
              modified={artifact.payload.content}
              fileName={artifact.payload.filePath}
              onApply={() => handleApply(artifact.id)}
              onReject={() => handleReject(artifact.id)}
            />
          ) : (
            <ArtifactCard
              artifact={artifact as any}
              onApply={handleApply}
              onReject={handleReject}
            />
          )}
        </motion.div>
      ))}
    </div>
  )
}
```

**Tasks:**

- [ ] Create DiffViewer component
- [ ] Implement diff algorithm (use `diff-match-patch` library)
- [ ] Add side-by-side and unified view modes
- [ ] Integrate with ArtifactPanel
- [ ] Add syntax highlighting to diff lines
- [ ] Test with large file diffs

---

### 2.3 Context Window Visual Warning

**Priority:** P1 | **Effort:** 4 hours | **Impact:** High

**Problem:** Context window usage hard to see; no warning before performance
degrades **Industry Standard:** Claude Code warns at 80%, Cursor shows in status
bar

**Files:** `page.tsx` (chat header)

**Implementation:**

```tsx
// Update chat header in page.tsx
;<div className="panel-header flex items-center gap-2" data-number="04">
  <Bot className="text-primary h-3.5 w-3.5" />
  <span>Chat</span>

  {/* Context Window Indicator */}
  <div className="ml-2 hidden min-w-0 flex-1 overflow-hidden md:block">
    <ContextWindowIndicator
      usage={agent.usageMetrics}
      onNewSession={() => setShowResetDialog(true)}
    />
  </div>

  {/* ... rest of header */}
</div>

// components/chat/ContextWindowIndicator.tsx
;('use client')

import { Progress } from '@/components/ui/progress'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface ContextWindowIndicatorProps {
  usage: {
    usedTokens: number
    contextWindow: number
    remainingTokens: number
    usagePct: number
    session: { totalTokens: number }
    currentRun?: { source: string }
  }
  onNewSession: () => void
}

export function ContextWindowIndicator({
  usage,
  onNewSession,
}: ContextWindowIndicatorProps) {
  const isWarning = usage.usagePct > 80
  const isCritical = usage.usagePct > 95

  return (
    <div className="flex items-center gap-3">
      {/* Progress Bar */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-1 items-center gap-2">
            <div className="bg-muted relative h-2 w-20 overflow-hidden rounded-none">
              <div
                className={cn(
                  'absolute inset-y-0 left-0 transition-all duration-300',
                  isCritical
                    ? 'bg-destructive'
                    : isWarning
                      ? 'bg-amber-500'
                      : 'bg-primary'
                )}
                style={{ width: `${Math.min(usage.usagePct, 100)}%` }}
              />
            </div>
            <span
              className={cn(
                'font-mono text-xs',
                isCritical && 'text-destructive font-bold',
                isWarning && 'text-amber-500'
              )}
            >
              {usage.usagePct}%
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1 text-xs">
            <p>
              <strong>Context Window Usage</strong>
            </p>
            <p>Used: {usage.usedTokens.toLocaleString()} tokens</p>
            <p>Window: {usage.contextWindow.toLocaleString()} tokens</p>
            <p>Remaining: {usage.remainingTokens.toLocaleString()} tokens</p>
            <p>Session: {usage.session.totalTokens.toLocaleString()} tokens</p>
            {isWarning && (
              <p className="mt-2 text-amber-500">
                Warning: Performance may degrade. Consider starting a new
                session.
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>

      {/* Warning Icon */}
      {isWarning && (
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertTriangle
              className={cn(
                'h-4 w-4',
                isCritical ? 'text-destructive' : 'text-amber-500'
              )}
            />
          </TooltipTrigger>
          <TooltipContent>
            {isCritical
              ? 'Context window nearly full. Start a new session now.'
              : 'Context window filling up. Consider starting a new session.'}
          </TooltipContent>
        </Tooltip>
      )}

      {/* New Session Button (when warning) */}
      {isWarning && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={onNewSession}
        >
          <RefreshCw className="mr-1 h-3 w-3" />
          New Session
        </Button>
      )}
    </div>
  )
}
```

**Session Reset Dialog:**

```tsx
// components/chat/SessionResetDialog.tsx
'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Copy } from 'lucide-react'
import { useState } from 'react'

interface SessionResetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onReset: () => void
  chatHistory: { role: string; content: string }[]
}

export function SessionResetDialog({
  open,
  onOpenChange,
  onReset,
  chatHistory,
}: SessionResetDialogProps) {
  const [copied, setCopied] = useState(false)

  const summary = generateSummary(chatHistory)

  const copySummary = () => {
    navigator.clipboard.writeText(summary)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Start New Session?
          </DialogTitle>
          <DialogDescription>
            Your context window is {usagePct}% full. Starting a new session will
            reset the conversation history but preserve your files and
            artifacts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted rounded-none p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium">Session Summary</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6"
                onClick={copySummary}
              >
                <Copy className="mr-1 h-3 w-3" />
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <p className="text-muted-foreground line-clamp-4 font-mono text-xs">
              {summary}
            </p>
          </div>

          <p className="text-muted-foreground text-xs">
            Tip: Copy the summary above and paste it in the new session to
            maintain context.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onReset}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Start New Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function generateSummary(history: { role: string; content: string }[]): string {
  // Extract key points from conversation
  const keyPoints = history
    .filter((msg) => msg.role === 'assistant')
    .slice(-3)
    .map((msg) => msg.content.slice(0, 200))
    .join('\n\n')

  return `Previous session context:\n${keyPoints}`
}
```

**Tasks:**

- [ ] Create ContextWindowIndicator component
- [ ] Create SessionResetDialog component
- [ ] Update chat header
- [ ] Add warning thresholds (80%, 95%)
- [ ] Add session summary generation
- [ ] Test context window calculations

---

## Phase 3: Advanced IDE Features (P2)

### 3.1 Inline Chat/Edit in Editor (Cmd+K)

**Priority:** P2 | **Effort:** 3 days | **Impact:** High

**Problem:** Users must switch to chat panel for AI assistance **Industry
Standard:** Cursor's signature feature - sticky in-editor AI controls

**New Files:**

- `components/editor/InlineChat.tsx`
- `components/editor/InlineChatProvider.tsx`
- `hooks/useInlineChat.ts`

**Implementation:**

```tsx
// components/editor/InlineChat.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { motion, AnimatePresence } from 'framer-motion'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Send, X, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InlineChatProps {
  editorView: EditorView
  selection: { from: number; to: number }
  onClose: () => void
  onSubmit: (prompt: string, selection: string) => void
}

export function InlineChat({
  editorView,
  selection,
  onClose,
  onSubmit,
}: InlineChatProps) {
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Position widget at selection
  const coords = editorView.coordsAtPos(selection.from)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleSubmit = async () => {
    if (!prompt.trim()) return

    setIsLoading(true)
    const selectedText = editorView.state.doc.sliceString(
      selection.from,
      selection.to
    )
    await onSubmit(prompt, selectedText)
    setIsLoading(false)
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="bg-background border-border absolute z-50 w-[400px] rounded-none border shadow-lg"
        style={{
          top: (coords?.top || 0) + 20,
          left: coords?.left || 0,
        }}
      >
        {/* Header */}
        <div className="border-border bg-surface-1 flex items-center justify-between border-b px-3 py-2">
          <div className="flex items-center gap-2">
            <Sparkles className="text-primary h-4 w-4" />
            <span className="text-sm font-medium">Edit with AI</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onClose}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>

        {/* Input */}
        <div className="p-3">
          <Textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the change you want..."
            className="min-h-[80px] resize-none border-0 bg-transparent focus-visible:ring-0"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
              }
              if (e.key === 'Escape') {
                onClose()
              }
            }}
          />

          {/* Selected code preview */}
          <div className="bg-muted mt-2 line-clamp-3 rounded-none p-2 font-mono text-xs">
            {editorView.state.doc
              .sliceString(selection.from, selection.to)
              .slice(0, 150)}
            {selection.to - selection.from > 150 && '...'}
          </div>
        </div>

        {/* Actions */}
        <div className="border-border flex items-center justify-between border-t px-3 py-2">
          <span className="text-muted-foreground text-xs">
            Enter to submit · Esc to cancel
          </span>
          <Button
            size="sm"
            disabled={!prompt.trim() || isLoading}
            onClick={handleSubmit}
            className="rounded-none"
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <Send className="mr-1 h-3 w-3" />
                Submit
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
```

**Integration with CodeMirror:**

```tsx
// Update CodeMirrorEditor.tsx
import { useInlineChat } from '@/hooks/useInlineChat'

export function CodeMirrorEditor({ ... }) {
  const { showInlineChat, selection, openInlineChat, closeInlineChat } = useInlineChat()

  // Register Cmd+K shortcut
  useHotkeys('cmd+k', (e) => {
    e.preventDefault()
    const selection = editorView.state.selection.main
    if (selection.from !== selection.to) {
      openInlineChat(selection)
    }
  })

  const handleInlineSubmit = async (prompt: string, selectedText: string) => {
    // Send to AI with context
    const response = await sendToAI({
      prompt,
      selectedCode: selectedText,
      filePath,
      mode: 'code',
    })

    // Apply diff to editor
    applyDiffToEditor(editorView, response.changes)
    closeInlineChat()
  }

  return (
    <div className="relative h-full">
      <div ref={editorRef} className="h-full" />

      {showInlineChat && (
        <InlineChat
          editorView={editorView}
          selection={selection}
          onClose={closeInlineChat}
          onSubmit={handleInlineSubmit}
        />
      )}
    </div>
  )
}
```

**Tasks:**

- [ ] Create InlineChat component
- [ ] Create useInlineChat hook
- [ ] Integrate with CodeMirrorEditor
- [ ] Handle selection-to-coordinates positioning
- [ ] Implement AI request with context
- [ ] Apply diff results to editor
- [ ] Add keyboard shortcut (Cmd+K when text selected)

---

### 3.2 Multi-Model Selection in Chat

**Priority:** P2 | **Effort:** 1 day | **Impact:** Medium

**Problem:** Users can't easily switch models per-request **Industry Standard:**
Cursor, Windsurf allow per-message model selection

**Implementation:**

```tsx
// components/chat/ModelSelector.tsx
'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Bot, Zap, Brain, Sparkles } from 'lucide-react'

interface Model {
  id: string
  name: string
  provider: string
  contextWindow: string
  description: string
  icon: React.ReactNode
}

const models: Model[] = [
  {
    id: 'claude-4.6-sonnet',
    name: 'Claude 4.6 Sonnet',
    provider: 'Anthropic',
    contextWindow: '1M',
    description: 'Best for complex tasks',
    icon: <Brain className="h-4 w-4" />,
  },
  {
    id: 'claude-4.6-opus',
    name: 'Claude 4.6 Opus',
    provider: 'Anthropic',
    contextWindow: '1M',
    description: 'Most capable',
    icon: <Brain className="h-4 w-4" />,
  },
  {
    id: 'gpt-5.2',
    name: 'GPT-5.2',
    provider: 'OpenAI',
    contextWindow: '272K',
    description: 'Fast and capable',
    icon: <Sparkles className="h-4 w-4" />,
  },
  {
    id: 'gemini-3.1-pro',
    name: 'Gemini 3.1 Pro',
    provider: 'Google',
    contextWindow: '1M',
    description: 'Large context window',
    icon: <Zap className="h-4 w-4" />,
  },
]

interface ModelSelectorProps {
  value: string
  onChange: (modelId: string) => void
  disabled?: boolean
}

export function ModelSelector({
  value,
  onChange,
  disabled,
}: ModelSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="h-8 w-[200px] rounded-none text-xs">
        <SelectValue placeholder="Select model" />
      </SelectTrigger>
      <SelectContent className="rounded-none">
        {models.map((model) => (
          <SelectItem key={model.id} value={model.id} className="rounded-none">
            <div className="flex items-center gap-2">
              {model.icon}
              <div className="flex flex-col">
                <span className="text-sm font-medium">{model.name}</span>
                <span className="text-muted-foreground text-xs">
                  {model.provider} · {model.contextWindow} context
                </span>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
```

**Integration with ChatInput:**

```tsx
// Update ChatInput.tsx
<div className="mt-2 flex items-center gap-2">
  <ModeSelector mode={mode} onModeChange={setMode} disabled={isStreaming} />

  <ModelSelector
    value={selectedModel}
    onChange={setSelectedModel}
    disabled={isStreaming}
  />

  {/* Brainstorm toggle for architect mode */}
  {showBrainstormToggle && (
    <button ...>...</button>
  )}

  <span className="ml-auto font-mono text-[10px] text-muted-foreground">
    {filePaths.length > 0 ? '@ to mention a file · ' : ''}Enter to send
  </span>
</div>
```

**Tasks:**

- [ ] Create ModelSelector component
- [ ] Update ChatInput to include model selector
- [ ] Pass selected model to useAgent hook
- [ ] Update agent hook to use per-request model
- [ ] Add model icons and descriptions

---

### 3.3 Plan Mode with Visual Diagrams

**Priority:** P2 | **Effort:** 2 days | **Impact:** Medium

**Problem:** Plan mode shows plain text only **Industry Standard:** Cursor 2.2+
renders Mermaid diagrams in plan mode

**New Files:**

- `components/plan/MermaidRenderer.tsx`
- `components/plan/PlanPanel.tsx`

**Implementation:**

````tsx
// components/plan/MermaidRenderer.tsx
'use client'

import { useEffect, useRef } from 'react'
import mermaid from 'mermaid'

interface MermaidRendererProps {
  content: string
}

export function MermaidRenderer({ content }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'strict',
    })

    if (containerRef.current) {
      mermaid.render('mermaid-diagram', content).then(({ svg }) => {
        if (containerRef.current) {
          containerRef.current.innerHTML = svg
        }
      })
    }
  }, [content])

  return <div ref={containerRef} className="mermaid-diagram" />
}

// components/plan/PlanPanel.tsx
;('use client')

import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MermaidRenderer } from './MermaidRenderer'
import { FileText, GitGraph, Check } from 'lucide-react'

interface PlanPanelProps {
  planDraft: string
  onChange: (value: string) => void
  onSave: () => void
  isSaving: boolean
  lastSavedAt: number | null
}

export function PlanPanel({
  planDraft,
  onChange,
  onSave,
  isSaving,
  lastSavedAt,
}: PlanPanelProps) {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit')

  // Extract mermaid diagrams from plan
  const mermaidBlocks = extractMermaidBlocks(planDraft)

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-border flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <GitGraph className="text-primary h-4 w-4" />
          <span className="font-mono text-sm font-medium">Plan Draft</span>
        </div>

        <div className="flex items-center gap-2">
          {lastSavedAt && (
            <span className="text-muted-foreground text-xs">
              Saved {new Date(lastSavedAt).toLocaleTimeString()}
            </span>
          )}
          <Button
            size="sm"
            onClick={onSave}
            disabled={isSaving}
            className="rounded-none"
          >
            {isSaving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <Check className="mr-1 h-3 w-3" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'edit' | 'preview')}
      >
        <TabsList className="border-border w-full rounded-none border-b bg-transparent">
          <TabsTrigger
            value="edit"
            className="data-[state=active]:bg-surface-2 rounded-none"
          >
            <FileText className="mr-1 h-3 w-3" />
            Edit
          </TabsTrigger>
          <TabsTrigger
            value="preview"
            className="data-[state=active]:bg-surface-2 rounded-none"
          >
            <GitGraph className="mr-1 h-3 w-3" />
            Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="edit" className="m-0 flex-1">
          <Textarea
            value={planDraft}
            onChange={(e) => onChange(e.target.value)}
            className="min-h-[400px] resize-none rounded-none border-0 font-mono text-sm"
            placeholder="# Project Plan

## Phase 1: Setup
- Initialize project
- Configure build tools

## Phase 2: Implementation
- Create components
- Add routing

## Diagram
```mermaid
flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
```"
          />
        </TabsContent>

        <TabsContent value="preview" className="m-0 flex-1 overflow-auto p-4">
          {/* Render markdown */}
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{removeMermaidBlocks(planDraft)}</ReactMarkdown>
          </div>

          {/* Render mermaid diagrams */}
          {mermaidBlocks.map((block, index) => (
            <div key={index} className="bg-muted my-4 rounded-none p-4">
              <MermaidRenderer content={block} />
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function extractMermaidBlocks(content: string): string[] {
  const regex = /```mermaid\n([\s\S]*?)```/g
  const blocks: string[] = []
  let match
  while ((match = regex.exec(content)) !== null) {
    blocks.push(match[1])
  }
  return blocks
}

function removeMermaidBlocks(content: string): string {
  return content.replace(/```mermaid[\s\S]*?```/g, '')
}
````

**Tasks:**

- [ ] Install `mermaid` library
- [ ] Create MermaidRenderer component
- [ ] Create PlanPanel component with tabs
- [ ] Integrate with existing Plan Draft dialog
- [ ] Add markdown rendering
- [ ] Test with various diagram types (flowchart, sequence, etc.)

---

## Phase 4: Polish & Testing

### 4.1 Empty State Improvements

**Priority:** P2 | **Effort:** 2 hours | **Impact:** Low

**File:** `Workbench.tsx`

**Implementation:**

```tsx
// Current empty state
<div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
  <div className="font-mono text-sm">
    <span className="text-primary">{'{'}</span>
    <span className="mx-2">No file selected</span>
    <span className="text-primary">{'}'}</span>
  </div>
  <p className="text-xs text-muted-foreground/60">
    Select a file from the explorer
  </p>
</div>

// Improved empty state with actions
<div className="flex h-full flex-col items-center justify-center gap-6 text-muted-foreground p-8">
  <div className="text-center space-y-2">
    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
      <FileCode className="h-8 w-8 text-muted-foreground" />
    </div>
    <h3 className="font-mono text-lg font-medium text-foreground">No file selected</h3>
    <p className="text-sm text-muted-foreground max-w-xs">
      Select a file from the explorer, or create a new file to get started
    </p>
  </div>

  <div className="flex gap-3">
    <Button
      variant="outline"
      size="sm"
      className="rounded-none"
      onClick={() => onCreateFile?.('')}
    >
      <Plus className="h-4 w-4 mr-2" />
      New File
    </Button>
    <Button
      variant="outline"
      size="sm"
      className="rounded-none"
      onClick={() => setActiveSidebarTab('search')}
    >
      <Search className="h-4 w-4 mr-2" />
      Search
    </Button>
  </div>

  <div className="text-xs text-muted-foreground/50">
    <kbd className="px-2 py-1 bg-muted rounded-none">⌘K</kbd> to open command palette
  </div>
</div>
```

**Tasks:**

- [ ] Update empty state in Workbench
- [ ] Add quick action buttons
- [ ] Add keyboard shortcut hints

---

### 4.2 Cursor Pointer on Interactive Elements

**Priority:** P2 | **Effort:** 30 min | **Impact:** Low

**Files:** Various

**Implementation:**

```tsx
// Add to globals.css
@layer components {
  /* All interactive elements should show pointer */
  button:not(:disabled),
  a,
  [role="button"],
  [role="link"],
  input[type="checkbox"],
  input[type="radio"],
  select,
  .cursor-pointer {
    cursor: pointer;
  }

  /* Disabled state */
  button:disabled,
  a[aria-disabled="true"] {
    cursor: not-allowed;
  }
}
```

**Tasks:**

- [ ] Add cursor styles to globals.css
- [ ] Audit interactive elements

---

## Testing Checklist

### Accessibility Testing

- [ ] Test with NVDA screen reader (Windows)
- [ ] Test with VoiceOver (macOS)
- [ ] Test with TalkBack (Android)
- [ ] Test with "Reduce motion" enabled
- [ ] Test keyboard-only navigation
- [ ] Run axe DevTools accessibility audit

### Cross-Platform Testing

- [ ] macOS Chrome
- [ ] macOS Safari
- [ ] Windows Chrome
- [ ] Windows Edge
- [ ] iOS Safari
- [ ] Android Chrome

### Feature Testing

- [ ] Command Palette: Cmd+K, arrow navigation, Enter to select
- [ ] Diff Viewer: Side-by-side and unified modes, apply/reject
- [ ] Context Warning: Triggers at 80%, critical at 95%
- [ ] Inline Chat: Cmd+K with text selected, submit, cancel
- [ ] Model Selector: Switch models, verify per-request
- [ ] Plan Mode: Mermaid diagrams render correctly

---

## Dependencies to Install

```bash
# Command palette keyboard shortcuts
bun add react-hotkeys-hook

# Diff computation
bun add diff-match-patch
bun add -D @types/diff-match-patch

# Mermaid diagrams
bun add mermaid

# Markdown rendering (for plan preview)
bun add react-markdown
bun add remark-gfm
```

---

## Estimated Timeline

| Phase     | Features                               | Duration      | Dependencies |
| --------- | -------------------------------------- | ------------- | ------------ |
| Phase 1   | Accessibility fixes                    | 1-2 days      | None         |
| Phase 2   | Command Palette, Diff, Context Warning | 3-4 days      | Phase 1      |
| Phase 3   | Inline Chat, Model Selector, Plan Mode | 4-5 days      | Phase 2      |
| Phase 4   | Polish & Testing                       | 2 days        | Phase 3      |
| **Total** |                                        | **2-3 weeks** |              |

---

## Success Metrics

- [ ] WCAG 2.2 AA compliance (no axe violations)
- [ ] Command Palette opens in <100ms
- [ ] Context warning shows at exactly 80% usage
- [ ] Inline chat appears within 50ms of Cmd+K
- [ ] All new features work on mobile touch devices
- [ ] No console errors

---

## Notes

1. **Brutalist Design Consistency:** All new components must use `rounded-none`,
   `font-mono`, and the amber accent color
2. **Convex Integration:** Ensure real-time updates for context window metrics
3. **Mobile First:** Test all features on mobile before desktop
4. **Performance:** Lazy load Mermaid and diff libraries

---

**Last Updated:** 2026-02-20  
**Author:** AI Development Team  
**Review Status:** Ready for Development
