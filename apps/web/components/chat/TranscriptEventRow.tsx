'use client'

import { useMemo } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  FileStack,
  Loader2,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TranscriptBlock } from '@/lib/chat/transcript-blocks'

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

export function TranscriptEventRow({ block }: TranscriptEventRowProps) {
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
              {block.step.category ?? 'progress'}
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

  return null
}
