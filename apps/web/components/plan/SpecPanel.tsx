'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  Play,
  X,
  Edit3,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Target,
  Shield,
  GitBranch,
  FileText,
} from 'lucide-react'
import type {
  FormalSpecification,
  SpecStatus,
  SpecTier,
  Constraint,
  AcceptanceCriterion,
  SpecStep,
} from '@/lib/agent/spec/types'
import { RequirementEditor } from './RequirementEditor'
import { ConstraintEditor } from './ConstraintEditor'
import { SpecVerificationResults } from './SpecVerificationResults'

interface SpecPanelProps {
  /** The specification to display/edit */
  spec: FormalSpecification | null
  /** Current execution status */
  executionStatus?: 'idle' | 'running' | 'completed' | 'failed'
  /** Currently active step index during execution */
  activeStepIndex?: number
  /** Callback when user approves and wants to execute */
  onExecute?: (spec: FormalSpecification) => void
  /** Callback when user cancels */
  onCancel?: () => void
  /** Callback when user edits the spec */
  onEdit?: (spec: FormalSpecification) => void
  /** Callback when panel should be closed */
  onClose?: () => void
  /** Additional className */
  className?: string
  /** Whether the panel is read-only (post-execution view) */
  readOnly?: boolean
}

/**
 * Status configuration for visual indicators
 */
const statusConfig: Record<
  SpecStatus,
  {
    icon: React.ReactNode
    label: string
    colorClass: string
    bgClass: string
    borderClass: string
  }
> = {
  draft: {
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    label: 'Draft',
    colorClass: 'text-muted-foreground',
    bgClass: 'bg-muted/50',
    borderClass: 'border-border',
  },
  validated: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    label: 'Validated',
    colorClass: 'text-primary',
    bgClass: 'bg-primary/10',
    borderClass: 'border-primary/50',
  },
  approved: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    label: 'Approved',
    colorClass: 'text-primary',
    bgClass: 'bg-primary/10',
    borderClass: 'border-primary/50',
  },
  executing: {
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    label: 'Executing',
    colorClass: 'text-primary',
    bgClass: 'bg-primary/10',
    borderClass: 'border-primary/50',
  },
  verified: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    label: 'Verified',
    colorClass: 'text-success',
    bgClass: 'bg-success/10',
    borderClass: 'border-success/50',
  },
  drifted: {
    icon: <AlertTriangle className="h-4 w-4" />,
    label: 'Drifted',
    colorClass: 'text-warning',
    bgClass: 'bg-warning/10',
    borderClass: 'border-warning/50',
  },
  failed: {
    icon: <AlertTriangle className="h-4 w-4" />,
    label: 'Failed',
    colorClass: 'text-destructive',
    bgClass: 'bg-destructive/10',
    borderClass: 'border-destructive/50',
  },
  archived: {
    icon: <FileText className="h-4 w-4" />,
    label: 'Archived',
    colorClass: 'text-muted-foreground',
    bgClass: 'bg-muted/50',
    borderClass: 'border-border',
  },
}

const tierConfig: Record<SpecTier, { label: string; description: string; colorClass: string }> = {
  instant: {
    label: 'Instant',
    description: 'Direct response, no spec',
    colorClass: 'text-muted-foreground',
  },
  ambient: {
    label: 'Ambient',
    description: 'Silent spec generation',
    colorClass: 'text-muted-foreground',
  },
  explicit: {
    label: 'Explicit',
    description: 'Full spec review required',
    colorClass: 'text-primary',
  },
}

/**
 * SpecPanel - Full spec view panel for Tier 3 (explicit) specs
 *
 * Replaces PlanPanel position in workbench when spec is pending approval
 * Sections: Requirements, Constraints, Execution Plan, Risks
 * Edit/Preview/Verify modes
 * Execute and Cancel buttons
 */
export function SpecPanel({
  spec,
  executionStatus = 'idle',
  activeStepIndex = -1,
  onExecute,
  onCancel,
  onEdit,
  onClose,
  className,
  readOnly = false,
}: SpecPanelProps) {
  const [activeTab, setActiveTab] = useState<'requirements' | 'constraints' | 'plan' | 'verify'>(
    'requirements'
  )
  const [editedSpec, setEditedSpec] = useState<FormalSpecification | null>(spec)
  const [hasChanges, setHasChanges] = useState(false)

  // Sync with external spec changes
  useEffect(() => {
    setEditedSpec(spec)
    setHasChanges(false)
  }, [spec])

  const handleRequirementsChange = useCallback(
    (requirements: AcceptanceCriterion[]) => {
      if (!editedSpec) return
      setEditedSpec({
        ...editedSpec,
        intent: {
          ...editedSpec.intent,
          acceptanceCriteria: requirements,
        },
      })
      setHasChanges(true)
    },
    [editedSpec]
  )

  const handleConstraintsChange = useCallback(
    (constraints: Constraint[]) => {
      if (!editedSpec) return
      setEditedSpec({
        ...editedSpec,
        intent: {
          ...editedSpec.intent,
          constraints,
        },
      })
      setHasChanges(true)
    },
    [editedSpec]
  )

  const handleExecute = useCallback(() => {
    if (editedSpec && onExecute) {
      onExecute(editedSpec)
    }
  }, [editedSpec, onExecute])

  const handleSaveEdits = useCallback(() => {
    if (editedSpec && onEdit) {
      onEdit(editedSpec)
      setHasChanges(false)
    }
  }, [editedSpec, onEdit])

  if (!editedSpec) {
    return (
      <div className={cn('flex h-full flex-col items-center justify-center', className)}>
        <FileText className="h-12 w-12 text-muted-foreground/50" />
        <p className="mt-4 font-mono text-sm text-muted-foreground">No specification loaded</p>
      </div>
    )
  }

  const status = statusConfig[editedSpec.status]
  const tier = tierConfig[editedSpec.tier]
  const isExecuting = executionStatus === 'running' || editedSpec.status === 'executing'
  const isVerified = editedSpec.status === 'verified' || editedSpec.status === 'failed'
  const canExecute =
    !readOnly &&
    !isExecuting &&
    (editedSpec.status === 'draft' ||
      editedSpec.status === 'validated' ||
      editedSpec.status === 'approved')
  const showVerifyTab =
    isVerified || (editedSpec.verificationResults && editedSpec.verificationResults.length > 0)

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Header */}
      <div className="flex items-start justify-between border-b border-border bg-muted/30 px-4 py-3">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-none border',
              status.borderClass,
              status.bgClass,
              status.colorClass
            )}
          >
            {status.icon}
          </span>
          <div>
            <h2 className="font-mono text-sm font-medium">{editedSpec.intent.goal}</h2>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={cn(
                  'border px-1.5 py-0.5 font-mono text-[10px] uppercase',
                  status.borderClass,
                  status.bgClass,
                  status.colorClass
                )}
              >
                {status.label}
              </span>
              <span
                className={cn(
                  'border px-1.5 py-0.5 font-mono text-[10px] uppercase',
                  editedSpec.tier === 'explicit'
                    ? 'border-primary/50 bg-primary/10 text-primary'
                    : 'border-border bg-muted/50 text-muted-foreground'
                )}
              >
                {tier.label}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                v{editedSpec.version}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasChanges && !readOnly && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleSaveEdits}
              className="h-7 rounded-none border-primary/50 font-mono text-xs"
            >
              <Edit3 className="mr-1 h-3 w-3" />
              Save Changes
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 rounded-none">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Action Bar */}
      {canExecute && !readOnly && (
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <p className="font-mono text-xs text-muted-foreground">
            Review the specification before execution
          </p>
          <div className="flex items-center gap-2">
            {onCancel && (
              <Button
                variant="outline"
                size="sm"
                onClick={onCancel}
                className="h-7 rounded-none border-border font-mono text-xs"
              >
                <X className="mr-1 h-3 w-3" />
                Cancel
              </Button>
            )}
            {onExecute && (
              <Button
                size="sm"
                onClick={handleExecute}
                className="h-7 rounded-none font-mono text-xs"
              >
                <Play className="mr-1 h-3 w-3" />
                Execute
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
        className="flex-1 overflow-hidden"
      >
        <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent px-4">
          <TabsTrigger
            value="requirements"
            className="gap-1.5 rounded-none border-b-2 border-transparent px-3 py-2 font-mono text-xs uppercase tracking-wider data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            <Target className="h-3.5 w-3.5" />
            Requirements ({editedSpec.intent.acceptanceCriteria.length})
          </TabsTrigger>
          <TabsTrigger
            value="constraints"
            className="gap-1.5 rounded-none border-b-2 border-transparent px-3 py-2 font-mono text-xs uppercase tracking-wider data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            <Shield className="h-3.5 w-3.5" />
            Constraints ({editedSpec.intent.constraints.length})
          </TabsTrigger>
          <TabsTrigger
            value="plan"
            className="gap-1.5 rounded-none border-b-2 border-transparent px-3 py-2 font-mono text-xs uppercase tracking-wider data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            <GitBranch className="h-3.5 w-3.5" />
            Plan ({editedSpec.plan.steps.length})
          </TabsTrigger>
          {showVerifyTab && (
            <TabsTrigger
              value="verify"
              className="gap-1.5 rounded-none border-b-2 border-transparent px-3 py-2 font-mono text-xs uppercase tracking-wider data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Verify
            </TabsTrigger>
          )}
        </TabsList>

        <ScrollArea className="h-[calc(100%-48px)]">
          {/* Requirements Tab */}
          <TabsContent value="requirements" className="m-0 p-4">
            <RequirementEditor
              requirements={editedSpec.intent.acceptanceCriteria}
              onChange={handleRequirementsChange}
              readOnly={readOnly || isExecuting}
            />
          </TabsContent>

          {/* Constraints Tab */}
          <TabsContent value="constraints" className="m-0 p-4">
            <ConstraintEditor
              constraints={editedSpec.intent.constraints}
              onChange={handleConstraintsChange}
              readOnly={readOnly || isExecuting}
            />
          </TabsContent>

          {/* Plan Tab */}
          <TabsContent value="plan" className="m-0 p-4">
            <ExecutionPlanView
              steps={editedSpec.plan.steps}
              risks={editedSpec.plan.risks}
              dependencies={editedSpec.plan.dependencies}
              activeStepIndex={activeStepIndex}
              isExecuting={isExecuting}
            />
          </TabsContent>

          {/* Verify Tab */}
          <TabsContent value="verify" className="m-0 p-4">
            <SpecVerificationResults
              results={editedSpec.verificationResults || []}
              acceptanceCriteria={editedSpec.intent.acceptanceCriteria}
              constraints={editedSpec.intent.constraints}
            />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  )
}

/**
 * Execution Plan View Component
 */
interface ExecutionPlanViewProps {
  steps: SpecStep[]
  risks: Array<{ description: string; severity: 'low' | 'medium' | 'high'; mitigation: string }>
  dependencies: Array<{ path: string; access: string; reason: string }>
  activeStepIndex?: number
  isExecuting?: boolean
}

function ExecutionPlanView({
  steps,
  risks,
  dependencies,
  activeStepIndex = -1,
  isExecuting = false,
}: ExecutionPlanViewProps) {
  return (
    <div className="space-y-6">
      {/* Steps */}
      <div className="space-y-3">
        <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Execution Steps ({steps.length})
        </h3>
        <div className="space-y-2">
          {steps.map((step, index) => {
            const isActive = index === activeStepIndex
            const isCompleted = step.status === 'completed'
            const isFailed = step.status === 'failed'

            return (
              <div
                key={step.id}
                className={cn(
                  'border p-3 transition-colors',
                  isActive && 'border-primary/50 bg-primary/5',
                  isCompleted && 'border-success/30 bg-success/5',
                  isFailed && 'border-destructive/30 bg-destructive/5',
                  !isActive && !isCompleted && !isFailed && 'border-border'
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      'mt-0.5 font-mono text-xs',
                      isActive && 'text-primary',
                      isCompleted && 'text-success',
                      isFailed && 'text-destructive',
                      !isActive && !isCompleted && !isFailed && 'text-muted-foreground'
                    )}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm">{step.description}</p>
                    {step.targetFiles.length > 0 && (
                      <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                        Files: {step.targetFiles.join(', ')}
                      </p>
                    )}
                    {step.tools.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {step.tools.map((tool) => (
                          <span
                            key={tool}
                            className="border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                          >
                            {tool}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span
                    className={cn(
                      'font-mono text-[10px] uppercase',
                      isActive && 'text-primary',
                      isCompleted && 'text-success',
                      isFailed && 'text-destructive',
                      !isActive && !isCompleted && !isFailed && 'text-muted-foreground'
                    )}
                  >
                    {isExecuting && isActive ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      step.status
                    )}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Dependencies */}
      {dependencies.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            File Dependencies ({dependencies.length})
          </h3>
          <div className="border border-border">
            {dependencies.map((dep, index) => (
              <div
                key={index}
                className="flex items-center justify-between border-b border-border px-3 py-2 last:border-b-0"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-mono text-xs">{dep.path}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'border px-1.5 py-0.5 font-mono text-[10px] uppercase',
                      dep.access === 'read' && 'border-border bg-muted/50',
                      dep.access === 'write' && 'border-warning/50 bg-warning/5 text-warning',
                      dep.access === 'create' && 'border-success/50 bg-success/5 text-success',
                      dep.access === 'delete' &&
                        'border-destructive/50 bg-destructive/5 text-destructive'
                    )}
                  >
                    {dep.access}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risks */}
      {risks.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Risk Assessment ({risks.length})
          </h3>
          <div className="space-y-2">
            {risks.map((risk, index) => (
              <div
                key={index}
                className={cn(
                  'border p-3',
                  risk.severity === 'high' && 'border-destructive/30 bg-destructive/5',
                  risk.severity === 'medium' && 'border-warning/30 bg-warning/5',
                  risk.severity === 'low' && 'border-border'
                )}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle
                    className={cn(
                      'h-3.5 w-3.5',
                      risk.severity === 'high' && 'text-destructive',
                      risk.severity === 'medium' && 'text-warning',
                      risk.severity === 'low' && 'text-muted-foreground'
                    )}
                  />
                  <span
                    className={cn(
                      'border px-1.5 py-0.5 font-mono text-[10px] uppercase',
                      risk.severity === 'high' &&
                        'border-destructive/50 bg-destructive/10 text-destructive',
                      risk.severity === 'medium' && 'border-warning/50 bg-warning/10 text-warning',
                      risk.severity === 'low' && 'border-border bg-muted/50 text-muted-foreground'
                    )}
                  >
                    {risk.severity}
                  </span>
                </div>
                <p className="mt-2 text-sm">{risk.description}</p>
                <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                  Mitigation: {risk.mitigation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default SpecPanel
