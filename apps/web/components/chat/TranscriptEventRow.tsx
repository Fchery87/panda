'use client'

import { useMemo } from 'react'
import { AlertTriangle, CheckCircle2, ChevronRight, CircleDashed, FileStack, Loader2, ShieldAlert, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useWorkspaceUiStore } from '@/stores/workspaceUiStore'
import type { TranscriptBlock } from '@/lib/chat/transcript-blocks'
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
      return 'border-emerald-500/40 bg-emerald-500/5 text-emerald-500'
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
      return 'border-emerald-500/50 bg-emerald-500/[0.035] text-foreground'
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
      return 'text-emerald-500'
    case 'default':
    default:
      return 'text-muted-foreground'
  }
}

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

  if (block.kind === 'progress_line') {
    const meta = [block.step.details?.toolName, block.step.planStepTitle]
      .filter(Boolean)
      .join(' • ')
    return (
      <div className="ml-10 mr-1 border-l border-border/80 pl-4">
        <div className="shadow-sharp-sm flex items-start gap-2 border border-border bg-background/80 px-3 py-2 font-mono text-[11px]">
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
      <div className="ml-10 mr-1 border-l border-primary/40 pl-4">
        <div className="shadow-sharp-sm flex items-start gap-2 border border-primary/40 bg-primary/5 px-3 py-2 font-mono text-[11px] text-primary">
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
      <div className="ml-10 mr-1 border-l border-border/80 pl-4">
        <div className="shadow-sharp-sm flex items-start gap-2 border border-border bg-muted/25 px-3 py-2 font-mono text-[11px] text-muted-foreground">
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
      <div className="ml-10 mr-1 border-l border-border/80 pl-4">
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
                className="mt-1 h-8 rounded-none border-border bg-background px-2.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors hover:border-primary/60 hover:bg-primary/5 active:scale-[0.96]"
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
