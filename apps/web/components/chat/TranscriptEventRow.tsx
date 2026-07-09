'use client'

import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDashed,
  FileStack,
  Loader2,
  ShieldAlert,
  Sparkles,
  ListChecks,
  Wrench,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useWorkspaceUiStore } from '@/stores/workspaceUiStore'
import type {
  TranscriptBlock,
  ToolChipGroup,
  PlanChecklistStep,
} from '@/lib/chat/transcript-blocks'
import { describeProgressCategory } from './live-run-utils'

interface TranscriptEventRowProps {
  block: TranscriptBlock
}

function toneClassName(tone: Extract<TranscriptBlock, { kind: 'spec_status' }>['tone']): string {
  switch (tone) {
    case 'primary':
      return 'border-primary/40 bg-primary/5 text-primary'
    case 'warning':
      return 'border-warning/40 bg-warning/5 text-warning'
    case 'danger':
      return 'border-destructive/40 bg-destructive/5 text-destructive'
    case 'success':
      return 'border-success/40 bg-success/5 text-success'
    case 'default':
    default:
      return 'border-border bg-muted/30 text-muted-foreground'
  }
}

function executionToneClassName(
  tone: Extract<TranscriptBlock, { kind: 'execution_update' }>['tone']
): string {
  switch (tone) {
    case 'primary':
      return 'border-primary/45 bg-primary/[0.035] text-foreground'
    case 'warning':
      return 'border-warning/50 bg-warning/5 text-foreground'
    case 'danger':
      return 'border-destructive/50 bg-destructive/5 text-foreground'
    case 'success':
      return 'border-success/50 bg-success/[0.035] text-foreground'
    case 'default':
    default:
      return 'border-border bg-background/70 text-foreground'
  }
}

function executionIconClassName(
  tone: Extract<TranscriptBlock, { kind: 'execution_update' }>['tone']
): string {
  switch (tone) {
    case 'primary':
      return 'text-primary'
    case 'warning':
      return 'text-warning'
    case 'danger':
      return 'text-destructive'
    case 'success':
      return 'text-success'
    case 'default':
    default:
      return 'text-muted-foreground'
  }
}

function chipGroupToneClass(tone: ToolChipGroup['tone']): string {
  switch (tone) {
    case 'primary':
      return 'border-primary/35 bg-primary/[0.04] text-primary'
    case 'success':
      return 'border-success/35 bg-success/[0.04] text-success'
    case 'danger':
      return 'border-destructive/35 bg-destructive/[0.04] text-destructive'
    case 'default':
    default:
      return 'border-border bg-muted/25 text-muted-foreground'
  }
}

/* -------------------------------------------------------------------------- */
/*  Tool Chips Row                                                            */
/* -------------------------------------------------------------------------- */

function ToolChipsRow({ block }: { block: Extract<TranscriptBlock, { kind: 'tool_chips' }> }) {
  const errorCount = block.entries.filter((entry) => entry.status === 'error').length
  const runningCount = block.entries.filter((entry) => entry.status === 'running').length

  return (
    <div className="ml-10 mr-1 pl-4">
      <div className="flex w-full items-center gap-2 text-left">
        <Wrench className="h-3 w-3 shrink-0 text-muted-foreground" />
        <div className="flex flex-wrap items-center gap-1.5">
          {block.groups.map((group, index) => (
            <span
              key={`${group.label}-${index}`}
              className={cn(
                'shadow-sharp-sm inline-flex items-center gap-1 border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em]',
                chipGroupToneClass(group.tone)
              )}
            >
              <span>{group.label}</span>
              <span className="font-semibold">{group.count}</span>
            </span>
          ))}
        </div>
        <span className="text-muted-foreground/70 ml-auto shrink-0 font-mono text-[10px] uppercase tracking-[0.15em]">
          {runningCount > 0
            ? `${runningCount} running · details in Run`
            : errorCount > 0
              ? `${errorCount} issue${errorCount === 1 ? '' : 's'} · details in Run`
              : 'Details in Run'}
        </span>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Plan Checklist                                                            */
/* -------------------------------------------------------------------------- */

function PlanChecklistRow({
  block,
}: {
  block: Extract<TranscriptBlock, { kind: 'plan_checklist' }>
}) {
  const [expanded, setExpanded] = useState(false)
  const isComplete = block.completedCount === block.totalCount
  const hasActive = block.steps.some((step) => step.status === 'active')

  return (
    <div className="ml-10 mr-1 pl-4">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center gap-2 text-left"
      >
        <ListChecks
          className={cn(
            'h-3.5 w-3.5 shrink-0',
            isComplete ? 'text-success' : hasActive ? 'text-primary' : 'text-muted-foreground'
          )}
        />
        <div
          className={cn(
            'shadow-sharp-sm inline-flex items-center gap-2 border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em]',
            isComplete
              ? 'border-success/40 bg-success/[0.04] text-success'
              : hasActive
                ? 'border-primary/40 bg-primary/[0.04] text-primary'
                : 'bg-muted/25 border-border text-muted-foreground'
          )}
        >
          <span>Plan</span>
          <span className="font-semibold">
            {block.completedCount}/{block.totalCount}
          </span>
          {hasActive && <span>• in progress</span>}
          {isComplete && <span>• done</span>}
        </div>
        <span className="text-muted-foreground/70 ml-auto shrink-0">
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </span>
      </button>

      {expanded && (
        <div className="mt-1.5 space-y-0.5">
          {block.steps.map((step) => (
            <PlanChecklistItem key={`plan-step-${step.index}`} step={step} />
          ))}
        </div>
      )}
    </div>
  )
}

function PlanChecklistItem({ step }: { step: PlanChecklistStep }) {
  return (
    <div
      className={cn(
        'shadow-sharp-sm flex items-start gap-2 border px-2.5 py-1.5 font-mono text-[11px]',
        step.status === 'active' && 'border-primary/30 bg-primary/[0.03]',
        step.status === 'completed' && 'bg-background/70 border-border',
        step.status === 'pending' && 'border-border/60 bg-muted/15'
      )}
    >
      {step.status === 'completed' ? (
        <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-success" />
      ) : step.status === 'active' ? (
        <Loader2 className="mt-0.5 h-3 w-3 shrink-0 animate-spin text-primary" />
      ) : (
        <CircleDashed className="text-muted-foreground/50 mt-0.5 h-3 w-3 shrink-0" />
      )}
      <span
        className={cn(
          'min-w-0 [overflow-wrap:anywhere]',
          step.status === 'completed' && 'text-muted-foreground line-through',
          step.status === 'active' && 'text-foreground',
          step.status === 'pending' && 'text-muted-foreground/70'
        )}
      >
        {step.title}
      </span>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Main row component                                                        */
/* -------------------------------------------------------------------------- */

export function TranscriptEventRow({ block }: TranscriptEventRowProps) {
  const setRightPanelOpen = useWorkspaceUiStore((state) => state.setRightPanelOpen)
  const setRightPanelTab = useWorkspaceUiStore((state) => state.setRightPanelTab)
  const icon = useMemo(() => {
    switch (block.kind) {
      case 'progress_line':
        if (block.step.status === 'running') return <Loader2 className="h-3.5 w-3.5 animate-spin" />
        if (block.step.status === 'error') return <AlertTriangle className="h-3.5 w-3.5" />
        return <ChevronRight className="h-3.5 w-3.5" />
      case 'approval_request':
        return <ShieldAlert className="h-3.5 w-3.5" />
      case 'snapshot_marker':
        return <FileStack className="h-3.5 w-3.5" />
      case 'spec_status':
        return <CheckCircle2 className="h-3.5 w-3.5" />
      case 'execution_update':
        return <CircleDashed className="h-3.5 w-3.5" />
      default:
        return <Sparkles className="h-3.5 w-3.5" />
    }
  }, [block])

  if (block.kind === 'tool_chips') {
    return <ToolChipsRow block={block} />
  }

  if (block.kind === 'plan_checklist') {
    return <PlanChecklistRow block={block} />
  }

  if (block.kind === 'progress_line') {
    const meta = [block.step.details?.toolName, block.step.planStepTitle]
      .filter(Boolean)
      .join(' • ')
    return (
      <div className="border-border/80 ml-10 mr-1 border-l pl-4">
        <div className="shadow-sharp-sm bg-background/80 flex items-start gap-2 border border-border px-3 py-2 font-mono text-[11px]">
          <span
            className={cn(
              'mt-0.5 shrink-0',
              block.step.status === 'error' ? 'text-destructive' : 'text-muted-foreground'
            )}
          >
            {icon}
          </span>
          <div className="min-w-0 space-y-1">
            <div className="uppercase tracking-[0.18em] text-muted-foreground">
              {describeProgressCategory(block.step.category)}
            </div>
            <div className="text-foreground [overflow-wrap:anywhere]">{block.step.content}</div>
            {meta ? (
              <div className="text-muted-foreground/80 [overflow-wrap:anywhere]">{meta}</div>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  if (block.kind === 'approval_request') {
    return (
      <div className="border-primary/40 ml-10 mr-1 border-l pl-4">
        <div className="shadow-sharp-sm border-primary/40 bg-primary/5 flex items-start gap-2 border px-3 py-2 font-mono text-[11px] text-primary">
          <span className="mt-0.5 shrink-0">{icon}</span>
          <div className="min-w-0 space-y-1">
            <div className="uppercase tracking-[0.18em]">{block.title}</div>
            {block.detail ? (
              <div className="text-foreground [overflow-wrap:anywhere]">{block.detail}</div>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  if (block.kind === 'snapshot_marker') {
    return (
      <div className="border-border/80 ml-10 mr-1 border-l pl-4">
        <div className="shadow-sharp-sm bg-muted/25 flex items-start gap-2 border border-border px-3 py-2 font-mono text-[11px] text-muted-foreground">
          <span className="mt-0.5 shrink-0">{icon}</span>
          <div className="min-w-0 space-y-1">
            <div className="uppercase tracking-[0.18em]">{block.title}</div>
            {block.detail ? <div className="[overflow-wrap:anywhere]">{block.detail}</div> : null}
          </div>
        </div>
      </div>
    )
  }

  if (block.kind === 'spec_status') {
    return (
      <div className="border-border/80 ml-10 mr-1 border-l pl-4">
        <div
          className={cn(
            'shadow-sharp-sm flex items-start gap-2 border px-3 py-2 font-mono text-[11px]',
            toneClassName(block.tone)
          )}
        >
          <span className="mt-0.5 shrink-0">{icon}</span>
          <div className="min-w-0 space-y-1">
            <div className="uppercase tracking-[0.18em]">{block.title}</div>
            {block.detail ? <div className="[overflow-wrap:anywhere]">{block.detail}</div> : null}
          </div>
        </div>
      </div>
    )
  }

  if (block.kind === 'execution_update') {
    const openActionTarget = () => {
      if (!block.action) return
      setRightPanelTab(block.action.target)
      setRightPanelOpen(true)
    }

    return (
      <div className="ml-10 mr-1 pl-4">
        <div
          className={cn(
            'shadow-sharp-sm flex items-start gap-2.5 border px-3 py-2.5 font-mono text-[11px] transition-colors',
            executionToneClassName(block.tone)
          )}
        >
          <span className={cn('mt-0.5 shrink-0', executionIconClassName(block.tone))}>{icon}</span>
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 uppercase tracking-[0.2em] text-muted-foreground">
              <span>{block.kicker ?? 'Run Update'}</span>
              {block.meta ? <span className="text-muted-foreground/70">{block.meta}</span> : null}
            </div>
            <div className="text-foreground [overflow-wrap:anywhere]">{block.title}</div>
            {block.detail ? (
              <div className="text-muted-foreground/90 [overflow-wrap:anywhere]">
                {block.detail}
              </div>
            ) : null}
            {block.action ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openActionTarget}
                className="hover:border-primary/60 hover:bg-primary/5 mt-1 h-8 border-border bg-background px-2.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors active:scale-[0.96]"
              >
                {block.action.label}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  return null
}
