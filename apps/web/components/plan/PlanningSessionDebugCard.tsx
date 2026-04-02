'use client'

import { cn } from '@/lib/utils'
import type { PlanningAnswer, PlanningQuestion, GeneratedPlanArtifact } from '@/lib/planning/types'

export interface PlanningSessionDebugSummary {
  sessionId: string
  answeredCount: number
  totalQuestions: number
  currentQuestionTitle: string | null
  lastAnswerSource: PlanningAnswer['source'] | null
  generatedPlanPath: string | null
  generatedPlanStatus: GeneratedPlanArtifact['status'] | null
  workspacePlanTabOpen: boolean
  isExecutingAcceptedPlan: boolean
}

export function derivePlanningSessionDebugSummary(args: {
  sessionId: string
  questions: PlanningQuestion[]
  answers: PlanningAnswer[]
  generatedPlan?: GeneratedPlanArtifact | null
  openTabPaths?: string[]
}): PlanningSessionDebugSummary {
  const orderedQuestions = [...args.questions].sort(
    (left, right) => left.order - right.order || left.id.localeCompare(right.id)
  )
  const answeredQuestionIds = new Set(args.answers.map((answer) => answer.questionId))
  const currentQuestion =
    orderedQuestions.find((question) => !answeredQuestionIds.has(question.id)) ?? null
  const lastAnswer =
    args.answers.length > 0
      ? [...args.answers].sort((left, right) => right.answeredAt - left.answeredAt)[0]
      : null
  const generatedPlanPath = args.generatedPlan ? `plan:${args.generatedPlan.sessionId}` : null

  return {
    sessionId: args.sessionId,
    answeredCount: answeredQuestionIds.size,
    totalQuestions: orderedQuestions.length,
    currentQuestionTitle: currentQuestion?.title ?? null,
    lastAnswerSource: lastAnswer?.source ?? null,
    generatedPlanPath,
    generatedPlanStatus: args.generatedPlan?.status ?? null,
    workspacePlanTabOpen: generatedPlanPath
      ? (args.openTabPaths ?? []).includes(generatedPlanPath)
      : false,
    isExecutingAcceptedPlan: args.generatedPlan?.status === 'executing',
  }
}

interface PlanningSessionDebugCardProps {
  summary: PlanningSessionDebugSummary
  className?: string
}

function formatAnswerSource(source: PlanningAnswer['source'] | null): string {
  if (!source) return 'None'
  return source === 'freeform' ? 'Freeform' : 'Suggestion'
}

function formatPlanStatus(status: GeneratedPlanArtifact['status'] | null): string {
  if (!status) return 'None'
  return status.replace(/_/g, ' ')
}

export function PlanningSessionDebugCard({ summary, className }: PlanningSessionDebugCardProps) {
  return (
    <section
      className={cn('border border-dashed border-border bg-background/80 px-3 py-2', className)}
      aria-label="Planning session debug"
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        Planning Debug
      </div>
      <div className="mt-2 grid gap-2 font-mono text-xs text-foreground md:grid-cols-2">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Session
          </div>
          <div>{summary.sessionId}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Answers
          </div>
          <div>
            {summary.answeredCount}/{summary.totalQuestions}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Current Question
          </div>
          <div>{summary.currentQuestionTitle ?? 'Complete'}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Last Answer
          </div>
          <div>{formatAnswerSource(summary.lastAnswerSource)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Plan Status
          </div>
          <div>{formatPlanStatus(summary.generatedPlanStatus)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Workspace Tab
          </div>
          <div>{summary.workspacePlanTabOpen ? 'Open' : 'Closed'}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Plan Tab Id
          </div>
          <div>{summary.generatedPlanPath ?? 'None'}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Build State
          </div>
          <div>{summary.isExecutingAcceptedPlan ? 'Executing accepted plan' : 'Idle'}</div>
        </div>
      </div>
    </section>
  )
}
