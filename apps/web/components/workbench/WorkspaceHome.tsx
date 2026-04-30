'use client'

import { motion } from 'framer-motion'
import { IconDiff, IconFile, IconNewChat, IconQuickAction, IconUpload } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { WorkspaceFocusState } from './workspace-focus'

interface WorkspaceHomeProps {
  focusState?: WorkspaceFocusState | null
  recentFiles?: Array<{ path: string; timeAgo: string }>
  pendingDiffs?: number
  activeAgents?: number
  problemCount?: number
  onOpenFile?: (path: string) => void
  onOpenDiffView?: () => void
  onStartAgent?: () => void
  onOpenTerminal?: () => void
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
  onOpenFile,
  onOpenDiffView,
  onStartAgent,
  onOpenTerminal,
  suggestedActions = [],
  onFocusPrimaryAction,
  onFocusSecondaryAction,
}: WorkspaceHomeProps) {
  const focusTone = focusState ? FOCUS_TONE_STYLES[focusState.tone] : null
  const primarySummary = focusState
    ? focusState.detail
    : 'Start an execution session, inspect changed work, and keep the next action obvious.'
  const quickActions: Array<{
    label: string
    icon: typeof IconFile
    onClick: () => void
  }> = []

  if (onOpenFile) {
    quickActions.push({
      label: 'Create File',
      icon: IconFile,
      onClick: () => onOpenFile(''),
    })
  }

  if (onStartAgent) {
    quickActions.push({
      label: 'New Session',
      icon: IconNewChat,
      onClick: onStartAgent,
    })
  }

  if (onOpenTerminal) {
    quickActions.push({
      label: 'Import Project',
      icon: IconUpload,
      onClick: onOpenTerminal,
    })
  }

  return (
    <div className="dot-grid scrollbar-thin h-full overflow-auto">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6"
        >
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_220px]">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-primary" />
                <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                  Execution Session
                </span>
              </div>
              <h1 className="max-w-xl text-2xl font-semibold tracking-tight text-foreground">
                {focusState
                  ? focusState.objective
                  : 'Keep intent, proof, and changed work in view.'}
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                {primarySummary}
              </p>
              <div className="grid gap-2 pt-1 sm:grid-cols-3">
                {quickActions.map((action) => {
                  const Icon = action.icon
                  return (
                    <Button
                      key={action.label}
                      variant="outline"
                      className="h-10 justify-start gap-2 rounded-none font-mono text-xs"
                      onClick={action.onClick}
                    >
                      <Icon className="h-4 w-4" weight="duotone" />
                      {action.label}
                    </Button>
                  )
                })}
              </div>
            </div>

            <div
              className={cn(
                'border border-border bg-background/85 p-4',
                focusState && focusTone?.panel
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Session State
                </span>
                <span
                  className={cn(
                    'border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em]',
                    focusState && focusTone
                      ? focusTone.badge
                      : 'border-border bg-background/70 text-muted-foreground'
                  )}
                >
                  {focusState ? focusState.statusLabel : 'Idle'}
                </span>
              </div>
              <div className="mt-4 space-y-3 font-mono text-[11px] text-muted-foreground">
                <div className="flex items-start justify-between gap-4">
                  <span>Session changes</span>
                  <span className="text-foreground">{pendingDiffs}</span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span>Active runs</span>
                  <span className="text-foreground">{activeAgents}</span>
                </div>
                {focusState ? (
                  <div className="border-t border-border pt-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Next: <span className="text-foreground">{focusState.nextStep}</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </motion.div>

        {focusState && focusTone ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.04 }}
            className={cn('mb-6 border p-4', focusTone.panel)}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                Next move
              </span>
              <span className="font-mono text-xs text-foreground">{focusState.nextStep}</span>
              <div className="ml-auto flex flex-wrap gap-2">
                {focusState.secondaryAction && onFocusSecondaryAction ? (
                  <Button
                    variant="outline"
                    className="h-8 rounded-none px-3 font-mono text-[10px] uppercase tracking-[0.2em]"
                    onClick={onFocusSecondaryAction}
                  >
                    {focusState.secondaryAction.label}
                  </Button>
                ) : null}
                {focusState.primaryAction && onFocusPrimaryAction ? (
                  <Button
                    className="h-8 rounded-none px-3 font-mono text-[10px] uppercase tracking-[0.2em]"
                    onClick={onFocusPrimaryAction}
                  >
                    {focusState.primaryAction.label}
                  </Button>
                ) : null}
              </div>
            </div>
          </motion.div>
        ) : null}

        {(suggestedActions.length > 0 || pendingDiffs > 0 || onStartAgent) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="mb-6"
          >
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
                  Start new session
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
      </div>
    </div>
  )
}
