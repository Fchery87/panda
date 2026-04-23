'use client'

import { motion } from 'framer-motion'
import {
  IconAgents,
  IconDiff,
  IconFile,
  IconNewChat,
  IconQuickAction,
  IconUpload,
} from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { WorkspaceFocusState } from './workspace-focus'

interface WorkspaceHomeProps {
  focusState?: WorkspaceFocusState | null
  recentFiles?: Array<{ path: string; timeAgo: string }>
  pendingDiffs?: number
  activeAgents?: number
  problemCount?: number
  devServerRunning?: boolean
  previewUrl?: string | null
  onOpenFile?: (path: string) => void
  onOpenDiffView?: () => void
  onStartAgent?: () => void
  onOpenTerminal?: () => void
  onOpenPreview?: () => void
  suggestedActions?: Array<{ label: string; action: () => void }>
  onFocusPrimaryAction?: () => void
  onFocusSecondaryAction?: () => void
}

const FOCUS_TONE_STYLES: Record<
  NonNullable<WorkspaceHomeProps['focusState']>['tone'],
  { badge: string; panel: string }
> = {
  neutral: {
    badge: 'border-border bg-background/70 text-muted-foreground',
    panel: 'border-border bg-background/80',
  },
  progress: {
    badge: 'border-primary/40 bg-primary/5 text-primary',
    panel: 'border-primary/20 bg-primary/5',
  },
  attention: {
    badge:
      'border-[hsl(var(--status-warning)/0.45)] bg-[hsl(var(--status-warning)/0.08)] text-[hsl(var(--status-warning))]',
    panel: 'border-[hsl(var(--status-warning)/0.2)] bg-[hsl(var(--status-warning)/0.05)]',
  },
  success: {
    badge:
      'border-[hsl(var(--status-success)/0.45)] bg-[hsl(var(--status-success)/0.08)] text-[hsl(var(--status-success))]',
    panel: 'border-[hsl(var(--status-success)/0.2)] bg-[hsl(var(--status-success)/0.05)]',
  },
}

export function WorkspaceHome({
  focusState = null,
  recentFiles = [],
  pendingDiffs = 0,
  activeAgents = 0,
  problemCount: _problemCount = 0,
  devServerRunning = false,
  previewUrl,
  onOpenFile,
  onOpenDiffView,
  onStartAgent,
  onOpenTerminal,
  onOpenPreview,
  suggestedActions = [],
  onFocusPrimaryAction,
  onFocusSecondaryAction,
}: WorkspaceHomeProps) {
  const focusTone = focusState ? FOCUS_TONE_STYLES[focusState.tone] : null
  const isBareWorkspace =
    !focusState &&
    recentFiles.length === 0 &&
    pendingDiffs === 0 &&
    activeAgents === 0 &&
    !devServerRunning

  if (isBareWorkspace) {
    return (
      <div className="dot-grid scrollbar-thin h-full overflow-auto">
        <div className="mx-auto max-w-2xl px-6 py-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="border border-border bg-background/80 p-6"
          >
            <h2 className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Get Started
            </h2>
            <p className="mt-2 max-w-[44ch] text-sm leading-relaxed text-muted-foreground">
              Begin working on your project. Create a file, start a conversation, or import existing
              code.
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              <Button
                variant="outline"
                className="h-10 justify-start gap-2 rounded-none font-mono text-xs"
                onClick={() => onOpenFile?.('')}
              >
                <IconFile className="h-4 w-4" weight="duotone" />
                Create File
              </Button>
              <Button
                variant="outline"
                className="h-10 justify-start gap-2 rounded-none font-mono text-xs"
                onClick={onStartAgent}
              >
                <IconNewChat className="h-4 w-4" />
                Start Chat
              </Button>
              <Button
                variant="outline"
                className="h-10 justify-start gap-2 rounded-none font-mono text-xs"
                onClick={onOpenTerminal}
              >
                <IconUpload className="h-4 w-4" />
                Import Project
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="dot-grid scrollbar-thin h-full overflow-auto">
      <div className="mx-auto max-w-4xl px-6 py-8">
        {!focusState && recentFiles.length === 0 && pendingDiffs === 0 && activeAgents === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-8 border border-border bg-background/80 p-6"
          >
            <h2 className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Get Started
            </h2>
            <p className="mt-2 text-xs text-muted-foreground">
              Begin working on your project. Create a file, start a conversation, or import existing
              code.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <Button
                variant="outline"
                className="h-10 justify-start gap-2 rounded-none font-mono text-xs"
                onClick={() => onOpenFile?.('')}
              >
                <IconFile className="h-4 w-4" weight="duotone" />
                Create File
              </Button>
              <Button
                variant="outline"
                className="h-10 justify-start gap-2 rounded-none font-mono text-xs"
                onClick={onStartAgent}
              >
                <IconNewChat className="h-4 w-4" />
                Start Chat
              </Button>
              <Button
                variant="outline"
                className="h-10 justify-start gap-2 rounded-none font-mono text-xs"
                onClick={onOpenTerminal}
              >
                <IconUpload className="h-4 w-4" />
                Import Project
              </Button>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8"
        >
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(260px,0.9fr)]">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-primary" />
                <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                  Project mission control
                </span>
              </div>
              <h1 className="max-w-2xl text-2xl font-semibold tracking-tight text-foreground">
                {focusState
                  ? focusState.objective
                  : 'Keep work state, review, and execution in view.'}
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {focusState
                  ? `${focusState.detail} Next step: ${focusState.nextStep}`
                  : 'Use this workspace to monitor the current project, inspect active changes, and keep the next action obvious while Panda works.'}
              </p>
            </div>

            <div className="surface-1 border border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Current state
                </span>
                {focusState && focusTone ? (
                  <span
                    className={cn(
                      'border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em]',
                      focusTone.badge
                    )}
                  >
                    {focusState.statusLabel}
                  </span>
                ) : (
                  <span className="border border-border bg-background/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Idle
                  </span>
                )}
              </div>
              <div className="mt-4 space-y-3 font-mono text-[11px] text-muted-foreground">
                <div className="flex items-start justify-between gap-4">
                  <span>Pending review</span>
                  <span className="text-foreground">{pendingDiffs}</span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span>Active runs</span>
                  <span className="text-foreground">{activeAgents}</span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span>Runtime</span>
                  <span className="text-foreground">{devServerRunning ? 'Ready' : 'Offline'}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {focusState && focusTone ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.04 }}
            className={cn('mb-6 border p-5', focusTone.panel)}
          >
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(240px,0.9fr)]">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                    {focusState.kicker}
                  </span>
                  <span
                    className={cn(
                      'border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em]',
                      focusTone.badge
                    )}
                  >
                    {focusState.statusLabel}
                  </span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Current Objective</h2>
                  <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    {focusState.detail}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {focusState.primaryAction && onFocusPrimaryAction ? (
                    <Button
                      className="h-9 rounded-none px-4 font-mono text-[10px] uppercase tracking-[0.2em]"
                      onClick={onFocusPrimaryAction}
                    >
                      {focusState.primaryAction.label}
                    </Button>
                  ) : null}
                  {focusState.secondaryAction && onFocusSecondaryAction ? (
                    <Button
                      variant="outline"
                      className="h-9 rounded-none px-4 font-mono text-[10px] uppercase tracking-[0.2em]"
                      onClick={onFocusSecondaryAction}
                    >
                      {focusState.secondaryAction.label}
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="border border-border bg-background/75 p-3">
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Needs your attention
                  </div>
                  <p className="mt-2 text-sm text-foreground">{focusState.nextStep}</p>
                </div>
                <div className="border border-border bg-background/75 p-3">
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Latest activity
                  </div>
                  <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                    {activeAgents > 0
                      ? 'Panda is actively working in this project.'
                      : pendingDiffs > 0
                        ? `${pendingDiffs} changed file${pendingDiffs !== 1 ? 's' : ''} ready for inspection.`
                        : devServerRunning
                          ? 'Preview runtime is available for inspection.'
                          : 'No active run at the moment.'}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3"
        >
          <div className="surface-1 border border-border p-4">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <IconAgents className="h-3.5 w-3.5" weight="duotone" />
              Agents
            </div>
            <div className="mt-1.5 font-mono text-xl font-semibold text-foreground">
              {activeAgents}
            </div>
            <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
              {activeAgents > 0 ? 'running' : 'idle'}
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenDiffView}
            className="surface-1 hover:bg-surface-2 border border-border p-4 text-left transition-colors"
          >
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <IconDiff className="h-3.5 w-3.5" weight="duotone" />
              Diffs
            </div>
            <div className="mt-1.5 font-mono text-xl font-semibold text-foreground">
              {pendingDiffs}
            </div>
            <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
              {pendingDiffs > 0 ? 'pending review' : 'clean'}
            </div>
          </button>

          <button
            type="button"
            onClick={devServerRunning ? onOpenPreview : onOpenTerminal}
            className="surface-1 hover:bg-surface-2 border border-border p-4 text-left transition-colors"
          >
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <span
                className={`h-2 w-2 ${devServerRunning ? 'bg-[hsl(var(--status-success))]' : 'bg-muted-foreground/30'}`}
              />
              Dev Server
            </div>
            <div className="mt-1.5 font-mono text-sm font-semibold text-foreground">
              {devServerRunning ? 'Running' : 'Stopped'}
            </div>
            <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
              {devServerRunning ? (previewUrl ?? 'preview ready') : 'click to start'}
            </div>
          </button>
        </motion.div>

        {(suggestedActions.length > 0 ||
          pendingDiffs > 0 ||
          !devServerRunning ||
          Boolean(previewUrl)) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="mb-6"
          >
            <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.24em] text-primary">
              Continue Working
            </h2>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {pendingDiffs > 0 && (
                <Button
                  variant="outline"
                  className="h-9 justify-start gap-2 rounded-none font-mono text-xs"
                  onClick={onOpenDiffView}
                >
                  <IconDiff className="h-4 w-4 text-primary" weight="duotone" />
                  Review {pendingDiffs} pending diff{pendingDiffs !== 1 ? 's' : ''}
                </Button>
              )}
              {onStartAgent && (
                <Button
                  variant="outline"
                  className="h-9 justify-start gap-2 rounded-none font-mono text-xs"
                  onClick={onStartAgent}
                >
                  <IconQuickAction className="h-4 w-4 text-primary" weight="fill" />
                  Start new task
                </Button>
              )}
              {previewUrl && (
                <Button
                  variant="outline"
                  className="h-9 justify-start gap-2 rounded-none font-mono text-xs"
                  onClick={onOpenPreview}
                >
                  Open preview
                </Button>
              )}
              {suggestedActions.map((action, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  className="h-9 justify-start gap-2 rounded-none font-mono text-xs"
                  onClick={action.action}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </motion.div>
        )}

        {recentFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.24em] text-primary">
              Recent Files
            </h2>
            <div className="surface-1 border border-border">
              {recentFiles.map((file, idx) => (
                <button
                  key={file.path}
                  type="button"
                  onClick={() => onOpenFile?.(file.path)}
                  className={`hover:bg-surface-2 flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
                    idx > 0 ? 'border-t border-border' : ''
                  }`}
                >
                  <IconFile
                    className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                    weight="duotone"
                  />
                  <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">
                    {file.path}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                    {file.timeAgo}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.25 }}
          className="mt-8 text-center font-mono text-[10px] text-muted-foreground/50"
        >
          <kbd className="bg-muted px-1.5 py-0.5">Ctrl</kbd>+
          <kbd className="bg-muted px-1.5 py-0.5">K</kbd> command palette ·{' '}
          <kbd className="bg-muted px-1.5 py-0.5">Ctrl</kbd>+
          <kbd className="bg-muted px-1.5 py-0.5">I</kbd> composer
        </motion.div>
      </div>
    </div>
  )
}
