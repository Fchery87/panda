/**
 * SpecDiff - Visual diff between specification versions
 *
 * Displays differences between two specification versions:
 * - Added/removed requirements
 * - Constraint changes
 * - Step modifications
 * - Dependency updates
 *
 * Design: Brutalist - sharp corners, monospace fonts, precise spacing
 */

'use client'

import * as React from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import {
  Plus,
  Minus,
  Edit3,
  ArrowRight,
  GitCommit,
  Target,
  Shield,
  GitBranch,
  FileText,
} from 'lucide-react'
import type {
  FormalSpecification,
  Constraint,
  AcceptanceCriterion,
  SpecStep,
} from '@/lib/agent/spec/types'
import type { SpecDifference, SpecComparisonResult } from '@/lib/agent/spec/reconciler'

/**
 * Props for SpecDiff component
 */
export interface SpecDiffProps {
  /** First specification (older version) */
  specA: FormalSpecification
  /** Second specification (newer version) */
  specB: FormalSpecification
  /** Comparison result with differences */
  comparison: SpecComparisonResult
  /** Optional additional className */
  className?: string
  /** View mode: side-by-side or inline */
  viewMode?: 'side-by-side' | 'inline'
}

/**
 * SpecDiff component for comparing spec versions
 */
export function SpecDiff({
  specA,
  specB,
  comparison,
  className,
  viewMode = 'inline',
}: SpecDiffProps) {
  const [activeTab, setActiveTab] = React.useState<
    'overview' | 'requirements' | 'constraints' | 'plan'
  >('overview')

  // Group differences by type
  const groupedDiffs = React.useMemo(() => {
    const groups: Record<string, SpecDifference[]> = {
      constraints: [],
      criteria: [],
      steps: [],
      dependencies: [],
    }

    for (const diff of comparison.differences) {
      if (diff.field.includes('constraint')) {
        groups.constraints.push(diff)
      } else if (diff.field.includes('criterion')) {
        groups.criteria.push(diff)
      } else if (diff.field.includes('step')) {
        groups.steps.push(diff)
      } else if (diff.field.includes('dependency')) {
        groups.dependencies.push(diff)
      }
    }

    return groups
  }, [comparison.differences])

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">v{specA.version}</span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-mono text-xs font-medium">v{specB.version}</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <span className="font-mono text-xs text-muted-foreground">
            {comparison.differences.length} change{comparison.differences.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-success flex items-center gap-1 font-mono text-[10px]">
            <Plus className="h-3 w-3" />
            {comparison.differences.filter((d) => d.type.includes('added')).length}
          </span>
          <span className="flex items-center gap-1 font-mono text-[10px] text-destructive">
            <Minus className="h-3 w-3" />
            {comparison.differences.filter((d) => d.type.includes('removed')).length}
          </span>
          <span className="text-warning flex items-center gap-1 font-mono text-[10px]">
            <Edit3 className="h-3 w-3" />
            {comparison.differences.filter((d) => d.type.includes('changed')).length}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
        className="flex-1 overflow-hidden"
      >
        <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent px-4">
          <TabsTrigger
            value="overview"
            className="gap-1.5 rounded-none border-b-2 border-transparent px-3 py-2 font-mono text-xs uppercase tracking-wider data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            <GitCommit className="h-3.5 w-3.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="requirements"
            className="gap-1.5 rounded-none border-b-2 border-transparent px-3 py-2 font-mono text-xs uppercase tracking-wider data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            <Target className="h-3.5 w-3.5" />
            Requirements
            {groupedDiffs.criteria.length > 0 && (
              <span className="ml-1 flex h-4 w-4 items-center justify-center bg-primary/10 text-[10px] text-primary">
                {groupedDiffs.criteria.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="constraints"
            className="gap-1.5 rounded-none border-b-2 border-transparent px-3 py-2 font-mono text-xs uppercase tracking-wider data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            <Shield className="h-3.5 w-3.5" />
            Constraints
            {groupedDiffs.constraints.length > 0 && (
              <span className="ml-1 flex h-4 w-4 items-center justify-center bg-primary/10 text-[10px] text-primary">
                {groupedDiffs.constraints.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="plan"
            className="gap-1.5 rounded-none border-b-2 border-transparent px-3 py-2 font-mono text-xs uppercase tracking-wider data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            <GitBranch className="h-3.5 w-3.5" />
            Plan
            {groupedDiffs.steps.length + groupedDiffs.dependencies.length > 0 && (
              <span className="ml-1 flex h-4 w-4 items-center justify-center bg-primary/10 text-[10px] text-primary">
                {groupedDiffs.steps.length + groupedDiffs.dependencies.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="h-[calc(100%-48px)]">
          {/* Overview Tab */}
          <TabsContent value="overview" className="m-0 p-4">
            <OverviewTab comparison={comparison} specA={specA} specB={specB} />
          </TabsContent>

          {/* Requirements Tab */}
          <TabsContent value="requirements" className="m-0 p-4">
            <RequirementsDiff
              specA={specA}
              specB={specB}
              differences={groupedDiffs.criteria}
              viewMode={viewMode}
            />
          </TabsContent>

          {/* Constraints Tab */}
          <TabsContent value="constraints" className="m-0 p-4">
            <ConstraintsDiff
              specA={specA}
              specB={specB}
              differences={groupedDiffs.constraints}
              viewMode={viewMode}
            />
          </TabsContent>

          {/* Plan Tab */}
          <TabsContent value="plan" className="m-0 p-4">
            <PlanDiff
              specA={specA}
              specB={specB}
              stepDiffs={groupedDiffs.steps}
              dependencyDiffs={groupedDiffs.dependencies}
              viewMode={viewMode}
            />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  )
}

/**
 * Overview Tab Component
 */
function OverviewTab({
  comparison,
  specA,
  specB,
}: {
  comparison: SpecComparisonResult
  specA: FormalSpecification
  specB: FormalSpecification
}) {
  const added = comparison.differences.filter((d) => d.type.includes('added'))
  const removed = comparison.differences.filter((d) => d.type.includes('removed'))
  const changed = comparison.differences.filter((d) => d.type.includes('changed'))

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border-success/30 bg-success/5 border p-3">
          <div className="flex items-center gap-2">
            <Plus className="text-success h-4 w-4" />
            <span className="text-success font-mono text-xs uppercase">Added</span>
          </div>
          <p className="text-success mt-2 font-mono text-2xl font-semibold">{added.length}</p>
        </div>
        <div className="border border-destructive/30 bg-destructive/5 p-3">
          <div className="flex items-center gap-2">
            <Minus className="h-4 w-4 text-destructive" />
            <span className="font-mono text-xs uppercase text-destructive">Removed</span>
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold text-destructive">{removed.length}</p>
        </div>
        <div className="border-warning/30 bg-warning/5 border p-3">
          <div className="flex items-center gap-2">
            <Edit3 className="text-warning h-4 w-4" />
            <span className="text-warning font-mono text-xs uppercase">Changed</span>
          </div>
          <p className="text-warning mt-2 font-mono text-2xl font-semibold">{changed.length}</p>
        </div>
      </div>

      {/* Change List */}
      <div className="space-y-2">
        <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Changes
        </h3>
        <div className="space-y-1">
          {comparison.differences.map((diff, index) => (
            <DiffRow key={index} diff={diff} />
          ))}
          {comparison.differences.length === 0 && (
            <p className="py-4 text-center font-mono text-sm text-muted-foreground">
              No changes detected between versions
            </p>
          )}
        </div>
      </div>

      {/* Version Info */}
      <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
        <div>
          <span className="font-mono text-[10px] uppercase text-muted-foreground">From</span>
          <p className="font-mono text-sm">v{specA.version}</p>
          <p className="font-mono text-xs text-muted-foreground">
            {new Date(specA.createdAt).toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{specA.intent.goal}</p>
        </div>
        <div>
          <span className="font-mono text-[10px] uppercase text-muted-foreground">To</span>
          <p className="font-mono text-sm">v{specB.version}</p>
          <p className="font-mono text-xs text-muted-foreground">
            {new Date(specB.createdAt).toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{specB.intent.goal}</p>
        </div>
      </div>
    </div>
  )
}

/**
 * Single diff row
 */
function DiffRow({ diff }: { diff: SpecDifference }) {
  const getIcon = () => {
    if (diff.type.includes('added')) return <Plus className="text-success h-3.5 w-3.5" />
    if (diff.type.includes('removed')) return <Minus className="h-3.5 w-3.5 text-destructive" />
    return <Edit3 className="text-warning h-3.5 w-3.5" />
  }

  const getColorClass = () => {
    if (diff.type.includes('added')) return 'border-success/30 bg-success/5'
    if (diff.type.includes('removed')) return 'border-destructive/30 bg-destructive/5'
    return 'border-warning/30 bg-warning/5'
  }

  const getLabel = () => {
    const parts = diff.field.split('.')
    return parts[parts.length - 1]
  }

  return (
    <div className={cn('flex items-center gap-2 border p-2', getColorClass())}>
      {getIcon()}
      <span className="font-mono text-xs uppercase">{diff.type.replace(/_/g, ' ')}</span>
      <span className="font-mono text-xs text-muted-foreground">{getLabel()}</span>
    </div>
  )
}

/**
 * Requirements Diff Component
 */
function RequirementsDiff({
  specA,
  specB,
  differences,
  viewMode: _viewMode,
}: {
  specA: FormalSpecification
  specB: FormalSpecification
  differences: SpecDifference[]
  viewMode: 'side-by-side' | 'inline'
}) {
  // Build a map of all criteria from both specs
  const allCriteria = React.useMemo(() => {
    const map = new Map<string, { a?: AcceptanceCriterion; b?: AcceptanceCriterion }>()

    for (const c of specA.intent.acceptanceCriteria) {
      map.set(c.id, { a: c })
    }
    for (const c of specB.intent.acceptanceCriteria) {
      const existing = map.get(c.id)
      if (existing) {
        existing.b = c
      } else {
        map.set(c.id, { b: c })
      }
    }

    return map
  }, [specA, specB])

  return (
    <div className="space-y-2">
      <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        Acceptance Criteria Changes
      </h3>
      {Array.from(allCriteria.entries()).map(([id, { a, b }]) => {
        const isAdded = !a && b
        const isRemoved = a && !b
        const isChanged = a && b && JSON.stringify(a) !== JSON.stringify(b)

        if (!isAdded && !isRemoved && !isChanged) {
          return null
        }

        return (
          <CriterionDiffRow
            key={id}
            criterionA={a}
            criterionB={b}
            isAdded={!!isAdded}
            isRemoved={!!isRemoved}
            isChanged={!!isChanged}
          />
        )
      })}
      {differences.length === 0 && (
        <p className="py-4 text-center font-mono text-sm text-muted-foreground">
          No changes to requirements
        </p>
      )}
    </div>
  )
}

/**
 * Single criterion diff row
 */
function CriterionDiffRow({
  criterionA,
  criterionB,
  isAdded,
  isRemoved,
  isChanged,
}: {
  criterionA?: AcceptanceCriterion
  criterionB?: AcceptanceCriterion
  isAdded: boolean
  isRemoved: boolean
  isChanged: boolean
}) {
  const criterion = criterionB || criterionA

  return (
    <div
      className={cn(
        'border p-3',
        isAdded && 'border-success/30 bg-success/5',
        isRemoved && 'border-destructive/30 bg-destructive/5',
        isChanged && 'border-warning/30 bg-warning/5'
      )}
    >
      <div className="flex items-center gap-2">
        {isAdded && <Plus className="text-success h-3.5 w-3.5" />}
        {isRemoved && <Minus className="h-3.5 w-3.5 text-destructive" />}
        {isChanged && <Edit3 className="text-warning h-3.5 w-3.5" />}
        <span className="font-mono text-xs text-muted-foreground">{criterion?.id}</span>
      </div>
      <p className="mt-2 text-sm">
        <span className="text-muted-foreground">WHEN</span> {criterion?.trigger}
        <br />
        <span className="text-muted-foreground">THE SYSTEM SHALL</span> {criterion?.behavior}
      </p>
      {isChanged && criterionA && criterionB && (
        <div className="mt-2 space-y-1 border-t border-border pt-2">
          <p className="font-mono text-[10px] text-destructive line-through">
            {criterionA.behavior}
          </p>
          <p className="text-success font-mono text-[10px]">{criterionB.behavior}</p>
        </div>
      )}
    </div>
  )
}

/**
 * Constraints Diff Component
 */
function ConstraintsDiff({
  specA,
  specB,
  differences,
  viewMode: _viewMode,
}: {
  specA: FormalSpecification
  specB: FormalSpecification
  differences: SpecDifference[]
  viewMode: 'side-by-side' | 'inline'
}) {
  // Build a map of all constraints from both specs
  const allConstraints = React.useMemo(() => {
    const map = new Map<
      string,
      { a?: Constraint; b?: Constraint; indexA?: number; indexB?: number }
    >()

    const getConstraintKey = (c: Constraint): string => {
      switch (c.type) {
        case 'structural':
          return `${c.type}-${c.rule}-${c.target}`
        case 'behavioral':
          return `${c.type}-${c.rule}-${c.assertion}`
        case 'performance':
          return `${c.type}-${c.metric}-${c.threshold}`
        case 'compatibility':
          return `${c.type}-${c.requirement}-${c.scope}`
        case 'security':
          return `${c.type}-${c.requirement}`
        default:
          return `${(c as any).type}-${JSON.stringify(c)}`
      }
    }

    specA.intent.constraints.forEach((c, i) => {
      const key = getConstraintKey(c)
      map.set(key, { a: c, indexA: i })
    })
    specB.intent.constraints.forEach((c, i) => {
      const key = getConstraintKey(c)
      const existing = map.get(key)
      if (existing) {
        existing.b = c
        existing.indexB = i
      } else {
        map.set(key, { b: c, indexB: i })
      }
    })

    return map
  }, [specA, specB])

  return (
    <div className="space-y-2">
      <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        Constraint Changes
      </h3>
      {Array.from(allConstraints.entries()).map(([key, { a, b }]) => {
        const isAdded = !a && b
        const isRemoved = a && !b
        const isChanged = a && b && JSON.stringify(a) !== JSON.stringify(b)

        if (!isAdded && !isRemoved && !isChanged) {
          return null
        }

        return (
          <ConstraintDiffRow
            key={key}
            constraintA={a}
            constraintB={b}
            isAdded={!!isAdded}
            isRemoved={!!isRemoved}
            isChanged={!!isChanged}
          />
        )
      })}
      {differences.length === 0 && (
        <p className="py-4 text-center font-mono text-sm text-muted-foreground">
          No changes to constraints
        </p>
      )}
    </div>
  )
}

/**
 * Single constraint diff row
 */
function ConstraintDiffRow({
  constraintA,
  constraintB,
  isAdded,
  isRemoved,
  isChanged,
}: {
  constraintA?: Constraint
  constraintB?: Constraint
  isAdded: boolean
  isRemoved: boolean
  isChanged: boolean
}) {
  const constraint = constraintB || constraintA

  const getTypeLabel = () => {
    switch (constraint?.type) {
      case 'structural':
        return 'Structural'
      case 'behavioral':
        return 'Behavioral'
      case 'performance':
        return 'Performance'
      case 'compatibility':
        return 'Compatibility'
      case 'security':
        return 'Security'
      default:
        return 'Constraint'
    }
  }

  return (
    <div
      className={cn(
        'border p-3',
        isAdded && 'border-success/30 bg-success/5',
        isRemoved && 'border-destructive/30 bg-destructive/5',
        isChanged && 'border-warning/30 bg-warning/5'
      )}
    >
      <div className="flex items-center gap-2">
        {isAdded && <Plus className="text-success h-3.5 w-3.5" />}
        {isRemoved && <Minus className="h-3.5 w-3.5 text-destructive" />}
        {isChanged && <Edit3 className="text-warning h-3.5 w-3.5" />}
        <span className="border px-1.5 py-0.5 font-mono text-[10px] uppercase">
          {getTypeLabel()}
        </span>
      </div>
      <p className="mt-2 text-sm">
        {constraint &&
          (constraint.type === 'structural' || constraint.type === 'behavioral'
            ? constraint.rule
            : constraint.type === 'performance'
              ? `${constraint.metric} < ${constraint.threshold}${constraint.unit}`
              : constraint.requirement)}
      </p>
      {constraint?.type === 'structural' && (
        <p className="mt-1 font-mono text-xs text-muted-foreground">Target: {constraint.target}</p>
      )}
    </div>
  )
}

/**
 * Plan Diff Component
 */
function PlanDiff({
  specA,
  specB,
  stepDiffs,
  dependencyDiffs,
  viewMode: _viewMode,
}: {
  specA: FormalSpecification
  specB: FormalSpecification
  stepDiffs: SpecDifference[]
  dependencyDiffs: SpecDifference[]
  viewMode: 'side-by-side' | 'inline'
}) {
  // Build a map of all steps from both specs
  const allSteps = React.useMemo(() => {
    const map = new Map<string, { a?: SpecStep; b?: SpecStep }>()

    for (const s of specA.plan.steps) {
      map.set(s.id, { a: s })
    }
    for (const s of specB.plan.steps) {
      const existing = map.get(s.id)
      if (existing) {
        existing.b = s
      } else {
        map.set(s.id, { b: s })
      }
    }

    return map
  }, [specA, specB])

  return (
    <div className="space-y-6">
      {/* Steps */}
      <div className="space-y-2">
        <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Step Changes
        </h3>
        {Array.from(allSteps.entries()).map(([id, { a, b }]) => {
          const isAdded = !a && b
          const isRemoved = a && !b
          const isChanged = a && b && JSON.stringify(a) !== JSON.stringify(b)

          if (!isAdded && !isRemoved && !isChanged) {
            return null
          }

          return (
            <StepDiffRow
              key={id}
              stepA={a}
              stepB={b}
              isAdded={!!isAdded}
              isRemoved={!!isRemoved}
              isChanged={!!isChanged}
            />
          )
        })}
        {stepDiffs.length === 0 && (
          <p className="py-4 text-center font-mono text-sm text-muted-foreground">
            No changes to steps
          </p>
        )}
      </div>

      {/* Dependencies */}
      {dependencyDiffs.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Dependency Changes
          </h3>
          {dependencyDiffs.map((diff, index) => (
            <DependencyDiffRow key={index} diff={diff} />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Single step diff row
 */
function StepDiffRow({
  stepA,
  stepB,
  isAdded,
  isRemoved,
  isChanged,
}: {
  stepA?: SpecStep
  stepB?: SpecStep
  isAdded: boolean
  isRemoved: boolean
  isChanged: boolean
}) {
  const step = stepB || stepA

  return (
    <div
      className={cn(
        'border p-3',
        isAdded && 'border-success/30 bg-success/5',
        isRemoved && 'border-destructive/30 bg-destructive/5',
        isChanged && 'border-warning/30 bg-warning/5'
      )}
    >
      <div className="flex items-center gap-2">
        {isAdded && <Plus className="text-success h-3.5 w-3.5" />}
        {isRemoved && <Minus className="h-3.5 w-3.5 text-destructive" />}
        {isChanged && <Edit3 className="text-warning h-3.5 w-3.5" />}
        <span className="font-mono text-xs text-muted-foreground">{step?.id}</span>
      </div>
      <p className="mt-2 text-sm">{step?.description}</p>
      {step?.targetFiles && step.targetFiles.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {step.targetFiles.map((file) => (
            <code key={file} className="bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              {file}
            </code>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Single dependency diff row
 */
function DependencyDiffRow({ diff }: { diff: SpecDifference }) {
  const isAdded = diff.type.includes('added')
  const isRemoved = diff.type.includes('removed')
  const isChanged = diff.type.includes('changed')

  const dep = (diff.newValue || diff.oldValue) as {
    path?: string
    access?: string
    reason?: string
  }

  return (
    <div
      className={cn(
        'border p-3',
        isAdded && 'border-success/30 bg-success/5',
        isRemoved && 'border-destructive/30 bg-destructive/5',
        isChanged && 'border-warning/30 bg-warning/5'
      )}
    >
      <div className="flex items-center gap-2">
        {isAdded && <Plus className="text-success h-3.5 w-3.5" />}
        {isRemoved && <Minus className="h-3.5 w-3.5 text-destructive" />}
        {isChanged && <Edit3 className="text-warning h-3.5 w-3.5" />}
        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-mono text-xs">{dep?.path}</span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span
          className={cn(
            'border px-1.5 py-0.5 font-mono text-[10px] uppercase',
            dep?.access === 'read' && 'border-border bg-muted/50',
            dep?.access === 'write' && 'border-warning/50 bg-warning/5 text-warning',
            dep?.access === 'create' && 'border-success/50 bg-success/5 text-success',
            dep?.access === 'delete' && 'border-destructive/50 bg-destructive/5 text-destructive'
          )}
        >
          {dep?.access}
        </span>
        <span className="text-xs text-muted-foreground">{dep?.reason}</span>
      </div>
    </div>
  )
}

export default SpecDiff
