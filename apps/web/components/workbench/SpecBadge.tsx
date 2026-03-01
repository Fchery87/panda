'use client'

import { cn } from '@/lib/utils'
import { Zap, CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react'
import type { SpecStatus } from '@/lib/agent/spec/types'

interface SpecBadgeProps {
  status: SpecStatus
  constraintsMet?: number
  constraintsTotal?: number
  onClick?: () => void
  className?: string
}

const statusConfig: Record<
  SpecStatus,
  {
    icon: React.ReactNode
    label: string
    colorClass: string
    animate?: boolean
  }
> = {
  draft: {
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
    label: 'Draft',
    colorClass: 'text-muted-foreground',
    animate: true,
  },
  validated: {
    icon: <Zap className="h-3 w-3" />,
    label: 'Validated',
    colorClass: 'text-primary',
  },
  approved: {
    icon: <Zap className="h-3 w-3" />,
    label: 'Approved',
    colorClass: 'text-primary',
  },
  executing: {
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
    label: 'Executing',
    colorClass: 'text-primary',
    animate: true,
  },
  verified: {
    icon: <CheckCircle2 className="h-3 w-3" />,
    label: 'Verified',
    colorClass: 'text-success',
  },
  drifted: {
    icon: <AlertTriangle className="h-3 w-3" />,
    label: 'Drifted',
    colorClass: 'text-warning',
  },
  failed: {
    icon: <XCircle className="h-3 w-3" />,
    label: 'Failed',
    colorClass: 'text-destructive',
  },
  archived: {
    icon: <Zap className="h-3 w-3" />,
    label: 'Archived',
    colorClass: 'text-muted-foreground',
  },
}

export function SpecBadge({
  status,
  constraintsMet,
  constraintsTotal,
  onClick,
  className,
}: SpecBadgeProps) {
  const config = statusConfig[status]
  const hasConstraints = typeof constraintsMet === 'number' && typeof constraintsTotal === 'number'

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 font-mono text-xs',
        'transition-colors hover:opacity-80',
        onClick && 'cursor-pointer',
        config.colorClass,
        className
      )}
      aria-label={`Spec status: ${config.label}${hasConstraints ? `, ${constraintsMet} of ${constraintsTotal} constraints met` : ''}`}
    >
      {config.icon}
      <span className="flex items-center gap-1">
        <span className={cn(config.animate && 'animate-pulse')}>
          {status === 'verified' ? 'Spec-verified' : `Spec ${config.label.toLowerCase()}`}
        </span>
        {hasConstraints && (
          <span className="text-muted-foreground">
            • {constraintsMet}/{constraintsTotal} constraints
          </span>
        )}
      </span>
    </button>
  )
}

interface SpecBadgeMiniProps {
  status: SpecStatus
  className?: string
}

export function SpecBadgeMini({ status, className }: SpecBadgeMiniProps) {
  const config = statusConfig[status]

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center',
        'h-4 w-4 rounded-none border',
        status === 'verified' && 'border-success/50 bg-success/10 text-success',
        status === 'failed' && 'border-destructive/50 bg-destructive/10 text-destructive',
        status === 'drifted' && 'border-warning/50 bg-warning/10 text-warning',
        status === 'executing' && 'border-primary/50 bg-primary/10 text-primary',
        (status === 'draft' ||
          status === 'validated' ||
          status === 'approved' ||
          status === 'archived') &&
          'border-border bg-muted/50 text-muted-foreground',
        className
      )}
      title={`Spec ${status}`}
    >
      {config.icon}
    </span>
  )
}
