'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { formatQuestionChoices } from '@/lib/planning/question-engine'
import type { PlanningQuestion, GeneratedPlanArtifact, PlanningAnswer } from '@/lib/planning/types'
import {
  closePlanningPopup,
  openPlanningPopup,
  useProjectWorkspaceUi,
} from '@/hooks/useProjectWorkspaceUi'

type PlanningSessionView = {
  sessionId: string
  status: string
  questions: PlanningQuestion[]
  answers: PlanningAnswer[]
  generatedPlan?: GeneratedPlanArtifact
} | null

type AnswerQuestionInput = {
  questionId: string
  selectedOptionId?: string
  freeformValue?: string
  source: 'suggestion' | 'freeform'
}

export interface PlanningIntakePopupProps {
  isOpen: boolean
  session: PlanningSessionView
  currentQuestion: PlanningQuestion | null
  onAnswerQuestion: (input: AnswerQuestionInput) => Promise<unknown> | unknown
  onClearIntake: () => Promise<unknown> | unknown
  onClose: () => void
  className?: string
}

export interface PlanningIntakeSurfaceProps {
  session: PlanningSessionView
  currentQuestion: PlanningQuestion | null
  onStartIntake: () => Promise<unknown> | unknown
  onAnswerQuestion: (input: AnswerQuestionInput) => Promise<unknown> | unknown
  onClearIntake: () => Promise<unknown> | unknown
  className?: string
}

export function submitPlanningSuggestionAnswer(args: {
  currentQuestion: PlanningQuestion
  selectedOptionId: string
  onAnswerQuestion: (input: AnswerQuestionInput) => Promise<unknown> | unknown
}) {
  return args.onAnswerQuestion({
    questionId: args.currentQuestion.id,
    selectedOptionId: args.selectedOptionId,
    source: 'suggestion',
  })
}

export function submitPlanningFreeformAnswer(args: {
  currentQuestion: PlanningQuestion
  freeformValue: string
  onAnswerQuestion: (input: AnswerQuestionInput) => Promise<unknown> | unknown
}) {
  const value = args.freeformValue.trim()
  if (!value) return null

  return args.onAnswerQuestion({
    questionId: args.currentQuestion.id,
    freeformValue: value,
    source: 'freeform',
  })
}

function summarizeSessionId(sessionId: string | null): string {
  if (!sessionId) return 'pending'
  return sessionId.length > 12 ? `${sessionId.slice(0, 8)}…${sessionId.slice(-4)}` : sessionId
}

function getQuestionLabel(index: number, total: number): string {
  return `Question ${index + 1} of ${total}`
}

function getCurrentQuestionIndex(
  session: NonNullable<PlanningSessionView>,
  currentQuestion: PlanningQuestion | null
): number {
  if (!currentQuestion) return session.questions.length
  const index = session.questions.findIndex((question) => question.id === currentQuestion.id)
  return index >= 0 ? index : 0
}

function getAnsweredQuestionSummary(session: NonNullable<PlanningSessionView>): string[] {
  return session.answers
    .map((answer) => {
      const question = session.questions.find((entry) => entry.id === answer.questionId)
      if (!question) return null
      if (answer.source === 'suggestion' && answer.selectedOptionId) {
        const option = question.suggestions.find((entry) => entry.id === answer.selectedOptionId)
        return option ? `${question.title}: ${option.label}` : question.title
      }
      if (answer.source === 'freeform' && answer.freeformValue) {
        return `${question.title}: ${answer.freeformValue}`
      }
      return question.title
    })
    .filter((value): value is string => Boolean(value))
}

function PlanningChoiceButton({
  choice,
  onSelect,
}: {
  choice: ReturnType<typeof formatQuestionChoices>[number]
  onSelect: (optionId: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(choice.optionId)}
      className={cn(
        'group flex w-full items-start gap-3 border border-border bg-background px-3 py-2 text-left transition-colors',
        'hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        choice.recommended && 'border-primary/70 bg-primary/5'
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block font-mono text-sm uppercase tracking-[0.12em] text-foreground">
          {choice.displayLabel}
        </span>
        {choice.recommended ? (
          <span className="mt-1 inline-flex border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Recommended
          </span>
        ) : null}
        {choice.description ? (
          <span className="mt-1 block text-xs leading-5 text-muted-foreground">
            {choice.description}
          </span>
        ) : null}
      </span>
    </button>
  )
}

export function PlanningIntakeSurface({
  session,
  currentQuestion,
  onStartIntake,
  onAnswerQuestion,
  onClearIntake,
  className,
}: PlanningIntakeSurfaceProps) {
  const { isPlanningPopupOpen } = useProjectWorkspaceUi()

  function handleClose() {
    closePlanningPopup()
  }

  async function handleStart() {
    if (session?.sessionId) {
      openPlanningPopup(session.sessionId)
      return
    }

    const result = await onStartIntake()
    openPlanningPopup(typeof result === 'string' ? result : (session?.sessionId ?? undefined))
  }

  return (
    <div className={cn('space-y-3', className)}>
      {isPlanningPopupOpen ? (
        <PlanningIntakePopup
          isOpen={isPlanningPopupOpen}
          session={session}
          currentQuestion={currentQuestion}
          onAnswerQuestion={onAnswerQuestion}
          onClearIntake={onClearIntake}
          onClose={handleClose}
        />
      ) : (
        <div className="border border-dashed border-border bg-background px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Planning intake
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                Start the guided question flow before reviewing the plan.
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                void handleStart()
              }}
              className="rounded-none border-border px-3 font-mono text-[11px] uppercase tracking-[0.2em]"
            >
              Start intake
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export function PlanningIntakePopup({
  isOpen,
  session,
  currentQuestion,
  onAnswerQuestion,
  onClearIntake,
  onClose,
  className,
}: PlanningIntakePopupProps) {
  const [freeformValue, setFreeformValue] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setFreeformValue('')
  }, [isOpen, session?.sessionId, currentQuestion?.id])

  if (!isOpen) return null

  const sessionId = session?.sessionId ?? null
  const status = session?.status ?? null
  const totalQuestions = session?.questions.length ?? 0
  const currentQuestionIndex = session ? getCurrentQuestionIndex(session, currentQuestion) : 0
  const isGenerating = status === 'generating'
  const currentChoices = currentQuestion ? formatQuestionChoices(currentQuestion) : []
  const answeredSummaries = session ? getAnsweredQuestionSummary(session) : []
  const isPendingSession = !session

  return (
    <section
      aria-label="Planning intake popup"
      className={cn(
        'shadow-sharp-lg border border-border bg-[linear-gradient(180deg,rgba(250,204,21,0.08),transparent_26%),var(--background)]',
        className
      )}
    >
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Planning intake
            </div>
            <div className="mt-1 font-mono text-sm uppercase tracking-[0.14em] text-foreground">
              Session {summarizeSessionId(sessionId)}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-none"
            aria-label="Close planning intake"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {isPendingSession ? (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">
                Waiting for intake session
              </div>
              <p className="max-w-prose text-sm leading-6 text-muted-foreground">
                Start or resume a planning intake session to answer guided questions.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="rounded-none font-mono text-xs uppercase tracking-[0.2em]"
              >
                Close
              </Button>
            </div>
          </div>
        ) : isGenerating ? (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                Generating plan
              </div>
              <p className="max-w-prose text-sm leading-6 text-muted-foreground">
                The intake is complete. Panda is turning your answers into a workspace-ready plan in
                the background.
              </p>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  void onClearIntake()
                }}
                disabled
                className="rounded-none font-mono text-xs uppercase tracking-[0.2em]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Reset intake
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="rounded-none font-mono text-xs uppercase tracking-[0.2em]"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : currentQuestion ? (
          <>
            <div className="space-y-2">
              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                {getQuestionLabel(currentQuestionIndex, totalQuestions)}
              </div>
              {session ? (
                <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  <span className="border border-border px-1.5 py-0.5">
                    Answered {session.answers.length}/{totalQuestions}
                  </span>
                  {answeredSummaries.map((summary) => (
                    <span
                      key={summary}
                      className="border border-border px-1.5 py-0.5 normal-case tracking-normal"
                    >
                      {summary}
                    </span>
                  ))}
                </div>
              ) : null}
              <h3 className="font-mono text-base uppercase tracking-[0.14em] text-foreground">
                {currentQuestion.title}
              </h3>
              <p className="max-w-prose text-sm leading-6 text-muted-foreground">
                {currentQuestion.prompt}
              </p>
            </div>

            <div className="space-y-2">
              {currentChoices.map((choice) => (
                <PlanningChoiceButton
                  key={choice.optionId}
                  choice={choice}
                  onSelect={(optionId) => {
                    void submitPlanningSuggestionAnswer({
                      currentQuestion,
                      selectedOptionId: optionId,
                      onAnswerQuestion,
                    })
                  }}
                />
              ))}
            </div>

            {currentQuestion.allowFreeform ? (
              <form
                className="space-y-2 border-t border-border pt-3"
                onSubmit={(event) => {
                  event.preventDefault()
                  void submitPlanningFreeformAnswer({
                    currentQuestion,
                    freeformValue,
                    onAnswerQuestion,
                  })
                }}
              >
                <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  Freeform response
                </div>
                <Textarea
                  value={freeformValue}
                  onChange={(event) => setFreeformValue(event.target.value)}
                  placeholder="Type your own answer"
                  className="min-h-24 rounded-none border-border bg-background font-mono text-sm"
                />
                <div className="flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      void onClearIntake()
                    }}
                    disabled={currentQuestionIndex === 0}
                    className="rounded-none font-mono text-xs uppercase tracking-[0.2em]"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Reset intake
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={onClose}
                      className="rounded-none font-mono text-xs uppercase tracking-[0.2em]"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={!freeformValue.trim()}
                      className="rounded-none font-mono text-xs uppercase tracking-[0.2em]"
                    >
                      Submit answer
                    </Button>
                  </div>
                </div>
              </form>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  )
}
