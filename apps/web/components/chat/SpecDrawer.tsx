'use client'

// SpecDrawer component - uses internal state via isOpen prop
import {
  X,
  Zap,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Target,
  ListChecks,
  Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import type {
  FormalSpecification,
  SpecStatus,
  Constraint,
  AcceptanceCriterion,
} from '@/lib/agent/spec/types'

interface SpecDrawerProps {
  spec: FormalSpecification | null
  isOpen: boolean
  onClose: () => void
}

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
    icon: <Zap className="h-4 w-4" />,
    label: 'Validated',
    colorClass: 'text-primary',
    bgClass: 'bg-primary/10',
    borderClass: 'border-primary/50',
  },
  approved: {
    icon: <Zap className="h-4 w-4" />,
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
    icon: <XCircle className="h-4 w-4" />,
    label: 'Failed',
    colorClass: 'text-destructive',
    bgClass: 'bg-destructive/10',
    borderClass: 'border-destructive/50',
  },
  archived: {
    icon: <Zap className="h-4 w-4" />,
    label: 'Archived',
    colorClass: 'text-muted-foreground',
    bgClass: 'bg-muted/50',
    borderClass: 'border-border',
  },
}

function ConstraintItem({ constraint }: { constraint: Constraint }) {
  const icons: Record<Constraint['type'], React.ReactNode> = {
    structural: <Target className="h-3 w-3" />,
    behavioral: <ListChecks className="h-3 w-3" />,
    performance: <Zap className="h-3 w-3" />,
    compatibility: <Shield className="h-3 w-3" />,
    security: <Shield className="h-3 w-3" />,
  }

  const getDescription = (c: Constraint): string => {
    switch (c.type) {
      case 'structural':
        return c.rule
      case 'behavioral':
        return c.rule
      case 'performance':
        return `${c.metric}: ${c.threshold}${c.unit}`
      case 'compatibility':
        return c.requirement
      case 'security':
        return c.requirement
      default:
        return ''
    }
  }

  const getExtraInfo = (c: Constraint): { label: string; value: string } | null => {
    switch (c.type) {
      case 'structural':
        return { label: 'Target', value: c.target }
      case 'behavioral':
        return { label: 'Assertion', value: c.assertion }
      case 'compatibility':
        return { label: 'Scope', value: c.scope }
      case 'security':
        return c.standard ? { label: 'Standard', value: c.standard } : null
      default:
        return null
    }
  }

  const extraInfo = getExtraInfo(constraint)

  return (
    <div className="flex items-start gap-2 py-2">
      <span className="mt-0.5 text-muted-foreground">{icons[constraint.type]}</span>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {constraint.type}
          </span>
        </div>
        <p className="text-xs text-foreground">{getDescription(constraint)}</p>
        {extraInfo && (
          <p className="font-mono text-[10px] text-muted-foreground">
            {extraInfo.label}: {extraInfo.value}
          </p>
        )}
      </div>
    </div>
  )
}

function AcceptanceCriterionItem({ criterion }: { criterion: AcceptanceCriterion }) {
  const statusIcons = {
    pending: <div className="h-2 w-2 rounded-full border border-muted-foreground" />,
    passed: <CheckCircle2 className="text-success h-3 w-3" />,
    failed: <XCircle className="h-3 w-3 text-destructive" />,
    skipped: <div className="h-2 w-2 rounded-full bg-muted-foreground/50" />,
  }

  return (
    <div className="flex items-start gap-2 py-2">
      <span className="mt-0.5">{statusIcons[criterion.status]}</span>
      <div className="flex-1">
        <p className="text-xs text-foreground">
          WHEN <span className="font-medium">{criterion.trigger}</span> THE SYSTEM SHALL{' '}
          <span className="font-medium">{criterion.behavior}</span>
        </p>
        <p className="font-mono text-[10px] text-muted-foreground">
          Verification: {criterion.verificationMethod}
        </p>
      </div>
    </div>
  )
}

export function SpecDrawer({ spec, isOpen, onClose }: SpecDrawerProps) {
  if (!isOpen || !spec) return null

  const status = statusConfig[spec.status]
  const constraints = spec.intent.constraints || []
  const criteria = spec.intent.acceptanceCriteria || []
  const steps = spec.plan.steps || []

  return (
    <>
      {/* Backdrop */}
      <div
        className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50"
        onClick={onClose}
        data-state={isOpen ? 'open' : 'closed'}
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 w-full max-w-md',
          'surface-1 shadow-sharp-lg border-l border-border',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
          'flex flex-col'
        )}
        data-state={isOpen ? 'open' : 'closed'}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-3">
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
              <h2 className="font-mono text-sm font-medium">Specification</h2>
              <p className={cn('font-mono text-xs', status.colorClass)}>{status.label}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none" onClick={onClose}>
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="space-y-6 p-4">
            {/* Intent Section */}
            <section>
              <h3 className="mb-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Intent
              </h3>
              <div className="surface-2 border border-border p-3">
                <p className="text-sm font-medium">{spec.intent.goal}</p>
                <p className="mt-1 text-xs text-muted-foreground">{spec.intent.rawMessage}</p>
              </div>
            </section>

            {/* Tier Badge */}
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Tier:
              </span>
              <span
                className={cn(
                  'border px-2 py-0.5 font-mono text-[10px] uppercase',
                  spec.tier === 'explicit' && 'border-primary/50 bg-primary/10 text-primary',
                  spec.tier === 'ambient' && 'border-border bg-muted/50 text-muted-foreground',
                  spec.tier === 'instant' && 'border-border bg-muted/50 text-muted-foreground'
                )}
              >
                {spec.tier}
              </span>
              <span className="font-mono text-xs text-muted-foreground">v{spec.version}</span>
            </div>

            <Separator />

            {/* Constraints Section */}
            {constraints.length > 0 && (
              <section>
                <h3 className="mb-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  Constraints ({constraints.length})
                </h3>
                <div className="border border-border">
                  {constraints.map((constraint, index) => (
                    <div key={index}>
                      <ConstraintItem constraint={constraint} />
                      {index < constraints.length - 1 && <Separator />}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Acceptance Criteria Section */}
            {criteria.length > 0 && (
              <section>
                <h3 className="mb-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  Acceptance Criteria ({criteria.length})
                </h3>
                <div className="border border-border">
                  {criteria.map((criterion, index) => (
                    <div key={criterion.id}>
                      <AcceptanceCriterionItem criterion={criterion} />
                      {index < criteria.length - 1 && <Separator />}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Execution Plan Section */}
            {steps.length > 0 && (
              <section>
                <h3 className="mb-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  Execution Plan ({steps.length} steps)
                </h3>
                <div className="space-y-2">
                  {steps.map((step, index) => (
                    <div
                      key={step.id}
                      className={cn(
                        'flex items-start gap-3 border border-border p-3',
                        step.status === 'completed' && 'border-success/30 bg-success/5',
                        step.status === 'active' && 'border-primary/30 bg-primary/5',
                        step.status === 'failed' && 'border-destructive/30 bg-destructive/5'
                      )}
                    >
                      <span className="font-mono text-xs text-muted-foreground">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div className="flex-1">
                        <p className="text-xs">{step.description}</p>
                        {step.targetFiles.length > 0 && (
                          <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                            Files: {step.targetFiles.join(', ')}
                          </p>
                        )}
                      </div>
                      <span
                        className={cn(
                          'font-mono text-[10px] uppercase',
                          step.status === 'completed' && 'text-success',
                          step.status === 'active' && 'text-primary',
                          step.status === 'failed' && 'text-destructive',
                          step.status === 'pending' && 'text-muted-foreground'
                        )}
                      >
                        {step.status}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Verification Results */}
            {spec.verificationResults && spec.verificationResults.length > 0 && (
              <section>
                <h3 className="mb-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  Verification Results
                </h3>
                <div className="space-y-2">
                  {spec.verificationResults.map((result, index) => (
                    <div
                      key={index}
                      className={cn(
                        'flex items-center gap-2 border p-2',
                        result.passed
                          ? 'border-success/50 bg-success/5'
                          : 'border-destructive/50 bg-destructive/5'
                      )}
                    >
                      {result.passed ? (
                        <CheckCircle2 className="text-success h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3 text-destructive" />
                      )}
                      <span className="text-xs">{result.criterionId}</span>
                      {result.message && (
                        <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                          {result.message}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Provenance */}
            <section>
              <h3 className="mb-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Provenance
              </h3>
              <div className="space-y-1 font-mono text-[10px] text-muted-foreground">
                <p>Model: {spec.provenance.model}</p>
                <p>Created: {new Date(spec.provenance.timestamp).toLocaleString()}</p>
                <p>Hash: {spec.provenance.promptHash.slice(0, 16)}...</p>
              </div>
            </section>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-border p-4">
          <Button
            variant="outline"
            className="w-full rounded-none font-mono text-xs"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </>
  )
}

interface SpecDrawerButtonProps {
  spec: FormalSpecification | null
  onOpen: () => void
}

export function SpecDrawerButton({ spec, onOpen }: SpecDrawerButtonProps) {
  if (!spec) return null

  const status = statusConfig[spec.status]
  const constraints = spec.intent.constraints || []
  const metCount = constraints.filter(() => {
    // In a real implementation, we'd track constraint satisfaction
    // For now, assume verified means all met
    return spec.status === 'verified'
  }).length

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'flex items-center gap-2 border px-2 py-1 font-mono text-xs',
        'transition-colors hover:bg-muted/50',
        status.borderClass,
        status.bgClass
      )}
    >
      {status.icon}
      <span className={status.colorClass}>
        Spec-verified
        {constraints.length > 0 && ` • ${metCount}/${constraints.length} constraints`}
      </span>
    </button>
  )
}
