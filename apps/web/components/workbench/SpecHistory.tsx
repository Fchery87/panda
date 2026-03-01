'use client'

import { useMemo } from 'react'
import { useQuery } from 'convex/react'
import type { Id } from '@convex/_generated/dataModel'
import { api } from '@convex/_generated/api'
import { FileText, CheckCircle2, XCircle, AlertTriangle, Zap, Loader2, History } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { SpecStatus, SpecTier } from '@/lib/agent/spec/types'

interface SpecHistoryProps {
  projectId: Id<'projects'>
  onSelectSpec?: (specId: string) => void
  selectedSpecId?: string | null
}

interface SpecDocument {
  _id: Id<'specifications'>
  _creationTime: number
  projectId: Id<'projects'>
  chatId: Id<'chats'>
  runId?: Id<'agentRuns'>
  version: number
  tier: SpecTier
  status: SpecStatus
  intent: {
    goal: string
    rawMessage: string
    constraints: Array<{
      type: string
      rule?: string
      target?: string
    }>
    acceptanceCriteria: Array<{
      id: string
      trigger: string
      behavior: string
      status: string
    }>
  }
  createdAt: number
  updatedAt: number
}

const statusIcons: Record<SpecStatus, React.ReactNode> = {
  draft: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
  validated: <Zap className="h-3.5 w-3.5" />,
  approved: <Zap className="h-3.5 w-3.5" />,
  executing: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
  verified: <CheckCircle2 className="h-3.5 w-3.5" />,
  drifted: <AlertTriangle className="h-3.5 w-3.5" />,
  failed: <XCircle className="h-3.5 w-3.5" />,
  archived: <FileText className="h-3.5 w-3.5" />,
}

const statusColors: Record<SpecStatus, string> = {
  draft: 'text-muted-foreground',
  validated: 'text-primary',
  approved: 'text-primary',
  executing: 'text-primary',
  verified: 'text-success',
  drifted: 'text-warning',
  failed: 'text-destructive',
  archived: 'text-muted-foreground',
}

const tierLabels: Record<SpecTier, string> = {
  instant: 'Instant',
  ambient: 'Ambient',
  explicit: 'Explicit',
}

interface GroupedSpecs {
  today: SpecDocument[]
  yesterday: SpecDocument[]
  earlier: SpecDocument[]
}

function groupSpecsByDate(specs: SpecDocument[]): GroupedSpecs {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  return specs.reduce(
    (groups, spec) => {
      const specDate = new Date(spec.createdAt)
      const specDay = new Date(specDate.getFullYear(), specDate.getMonth(), specDate.getDate())

      if (specDay.getTime() === today.getTime()) {
        groups.today.push(spec)
      } else if (specDay.getTime() === yesterday.getTime()) {
        groups.yesterday.push(spec)
      } else {
        groups.earlier.push(spec)
      }
      return groups
    },
    { today: [], yesterday: [], earlier: [] } as GroupedSpecs
  )
}

function SpecItem({
  spec,
  isSelected,
  onClick,
}: {
  spec: SpecDocument
  isSelected: boolean
  onClick: () => void
}) {
  const constraintCount = spec.intent.constraints?.length ?? 0
  const criteriaCount = spec.intent.acceptanceCriteria?.length ?? 0

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full border-b border-border p-3 text-left transition-colors',
        'hover:bg-muted/50',
        isSelected && 'bg-surface-2'
      )}
    >
      <div className="flex items-start gap-2">
        <span className={cn('mt-0.5 shrink-0', statusColors[spec.status])}>
          {statusIcons[spec.status]}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{spec.intent.goal}</p>
          <div className="mt-1 flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
            <span
              className={cn(
                'border px-1 py-0.5',
                spec.tier === 'explicit' && 'border-primary/50 text-primary',
                spec.tier === 'ambient' && 'border-border',
                spec.tier === 'instant' && 'border-border'
              )}
            >
              {tierLabels[spec.tier]}
            </span>
            <span>v{spec.version}</span>
            {constraintCount > 0 && <span>• {constraintCount} constraints</span>}
            {criteriaCount > 0 && <span>• {criteriaCount} criteria</span>}
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {new Date(spec.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>
    </button>
  )
}

function SpecGroup({
  title,
  specs,
  selectedSpecId,
  onSelectSpec,
}: {
  title: string
  specs: SpecDocument[]
  selectedSpecId?: string | null
  onSelectSpec?: (specId: string) => void
}) {
  if (specs.length === 0) return null

  return (
    <div>
      <div className="bg-surface-1 sticky top-0 z-10 border-b border-border px-3 py-2">
        <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          {title}
        </h3>
      </div>
      <div>
        {specs.map((spec) => (
          <SpecItem
            key={spec._id}
            spec={spec}
            isSelected={selectedSpecId === spec._id}
            onClick={() => onSelectSpec?.(spec._id)}
          />
        ))}
      </div>
    </div>
  )
}

export function SpecHistory({ projectId, onSelectSpec, selectedSpecId }: SpecHistoryProps) {
  const specs = useQuery(api.specifications.listByProject, { projectId, limit: 100 })

  const groupedSpecs = useMemo(() => {
    if (!specs) return { today: [], yesterday: [], earlier: [] }
    return groupSpecsByDate(specs as SpecDocument[])
  }, [specs])

  if (specs === undefined) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading specs...
        </div>
      </div>
    )
  }

  const totalSpecs = specs.length

  if (totalSpecs === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center text-muted-foreground">
        <History className="mb-4 h-8 w-8 opacity-20" />
        <p className="font-mono text-sm">No specifications yet.</p>
        <p className="mt-2 max-w-xs text-xs text-muted-foreground">
          Specifications are generated automatically when the agent processes complex tasks. They
          will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border p-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Specifications
          </h2>
        </div>
        <span className="font-mono text-xs text-muted-foreground">{totalSpecs} total</span>
      </div>

      <ScrollArea className="flex-1">
        <SpecGroup
          title="Today"
          specs={groupedSpecs.today}
          selectedSpecId={selectedSpecId}
          onSelectSpec={onSelectSpec}
        />
        <SpecGroup
          title="Yesterday"
          specs={groupedSpecs.yesterday}
          selectedSpecId={selectedSpecId}
          onSelectSpec={onSelectSpec}
        />
        <SpecGroup
          title="Earlier"
          specs={groupedSpecs.earlier}
          selectedSpecId={selectedSpecId}
          onSelectSpec={onSelectSpec}
        />
      </ScrollArea>
    </div>
  )
}
