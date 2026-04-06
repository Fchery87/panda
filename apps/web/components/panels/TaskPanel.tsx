'use client'

import { cn } from '@/lib/utils'

type TaskStatus =
  | 'draft'
  | 'planned'
  | 'ready'
  | 'in_progress'
  | 'blocked'
  | 'in_review'
  | 'qa_pending'
  | 'done'
  | 'rejected'

type TaskOwnerRole = 'builder' | 'manager' | 'executive'

type TaskCriterion = {
  id: string
  text: string
  status: 'pending' | 'passed' | 'failed' | 'waived'
}

type TaskEvidence = {
  label: string
  href?: string
}

type TaskReview = {
  type: 'architecture' | 'implementation'
  decision: 'pass' | 'concerns' | 'reject'
  summary: string
}

interface TaskPanelTask {
  title: string
  description: string
  rationale: string
  status: TaskStatus
  ownerRole: TaskOwnerRole
  acceptanceCriteria: TaskCriterion[]
  filesInScope: string[]
  blockers: string[]
  evidence: TaskEvidence[]
  latestReview?: TaskReview | null
}

interface TaskPanelProps {
  task: TaskPanelTask | null
}

function statusClassName(status: TaskCriterion['status']): string {
  if (status === 'passed') return 'border-primary/50 bg-primary/5 text-primary'
  if (status === 'failed') return 'border-destructive/50 bg-destructive/5 text-destructive'
  if (status === 'waived') return 'border-border bg-muted/50 text-muted-foreground'
  return 'border-border bg-background/70 text-muted-foreground'
}

export function TaskPanel({ task }: TaskPanelProps) {
  if (!task) {
    return (
      <div className="surface-1 flex h-full flex-col border-l border-border">
        <div className="border-b border-border px-3 py-2">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Active task
          </span>
        </div>
        <div className="flex flex-1 items-center justify-center px-4 py-6">
          <div className="shadow-sharp-sm max-w-sm border border-dashed border-border bg-background px-4 py-5 text-center">
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              No active task
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Tracked work will appear here once Panda activates structured delivery.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="surface-1 flex h-full flex-col border-l border-border">
      <div className="border-b border-border px-3 py-2">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Active task
        </span>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-auto px-3 py-3">
        <section className="shadow-sharp-sm border border-border bg-background/80 px-3 py-3">
          <h3 className="font-mono text-sm uppercase tracking-[0.18em] text-foreground">
            {task.title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{task.description}</p>
          <p className="mt-3 border-t border-border pt-3 text-sm leading-6 text-muted-foreground">
            {task.rationale}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="shadow-sharp-sm border border-border bg-background/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Status {task.status}
            </span>
            <span className="shadow-sharp-sm border border-border bg-background/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Owner {task.ownerRole}
            </span>
          </div>
        </section>

        <section className="shadow-sharp-sm border border-border bg-background/80 px-3 py-3">
          <h4 className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Acceptance criteria
          </h4>
          <div className="mt-3 space-y-2">
            {task.acceptanceCriteria.map((criterion) => (
              <div
                key={criterion.id}
                className="flex items-start justify-between gap-3 border border-border/70 px-2.5 py-2"
              >
                <span className="text-sm text-foreground">{criterion.text}</span>
                <span
                  className={cn(
                    'shrink-0 border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.2em]',
                    statusClassName(criterion.status)
                  )}
                >
                  {criterion.status}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-3 lg:grid-cols-2">
          <div className="shadow-sharp-sm border border-border bg-background/80 px-3 py-3">
            <h4 className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Files in scope
            </h4>
            <div className="mt-3 space-y-2">
              {task.filesInScope.map((filePath) => (
                <div
                  key={filePath}
                  className="border border-border/70 px-2.5 py-2 font-mono text-xs"
                >
                  {filePath}
                </div>
              ))}
            </div>
          </div>

          <div className="shadow-sharp-sm border border-border bg-background/80 px-3 py-3">
            <h4 className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Blockers
            </h4>
            <div className="mt-3 space-y-2">
              {task.blockers.length === 0 ? (
                <div className="border border-dashed border-border/70 px-2.5 py-2 text-sm text-muted-foreground">
                  No blockers recorded.
                </div>
              ) : (
                task.blockers.map((blocker) => (
                  <div key={blocker} className="border border-border/70 px-2.5 py-2 text-sm">
                    {blocker}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="shadow-sharp-sm border border-border bg-background/80 px-3 py-3">
          <h4 className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Evidence
          </h4>
          <div className="mt-3 space-y-2">
            {task.evidence.length === 0 ? (
              <div className="border border-dashed border-border/70 px-2.5 py-2 text-sm text-muted-foreground">
                No evidence linked yet.
              </div>
            ) : (
              task.evidence.map((evidence) =>
                evidence.href ? (
                  <a
                    key={`${evidence.label}-${evidence.href}`}
                    href={evidence.href}
                    className="block border border-border/70 px-2.5 py-2 text-sm hover:bg-muted/30"
                  >
                    {evidence.label}
                  </a>
                ) : (
                  <div key={evidence.label} className="border border-border/70 px-2.5 py-2 text-sm">
                    {evidence.label}
                  </div>
                )
              )
            )}
          </div>
        </section>

        {task.latestReview ? (
          <section className="shadow-sharp-sm border border-border bg-background/80 px-3 py-3">
            <h4 className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Latest review
            </h4>
            <div className="mt-3 space-y-2">
              <div className="flex flex-wrap gap-2">
                <span className="shadow-sharp-sm border border-border bg-background/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Type {task.latestReview.type}
                </span>
                <span className="shadow-sharp-sm border border-border bg-background/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Decision {task.latestReview.decision}
                </span>
              </div>
              <div className="border border-border/70 px-2.5 py-2 text-sm text-foreground">
                {task.latestReview.summary}
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  )
}
