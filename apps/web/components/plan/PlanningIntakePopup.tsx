'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  buildDefaultPlanningQuestions,
  formatQuestionChoices,
  resolvePlanningAnswer,
  type PlanningAnswerInput,
  type PlanningQuestionChoiceView,
} from '@/lib/planning/question-engine'
import type { PlanningAnswer, PlanningQuestion } from '@/lib/planning/types'
import {
  closePlanningPopup,
  openPlanningPopup,
  useProjectWorkspaceUi,
} from '@/hooks/useProjectWorkspaceUi'

export interface PlanningIntakeFlowState {
  currentQuestionIndex: number
  answers: PlanningAnswer[]
  isGenerating: boolean
}

export interface PlanningIntakePopupProps {
  isOpen: boolean
  planningSessionId: string | null
  onClose: () => void
  className?: string
}

export interface PlanningIntakeSurfaceProps {
  className?: string
}

const DEFAULT_CONTEXT = { projectName: 'Panda' }

export function createPlanningIntakeFlowState(): PlanningIntakeFlowState {
  return {
    currentQuestionIndex: 0,
    answers: [],
    isGenerating: false,
  }
}

export function advancePlanningIntakeFlow(
  state: PlanningIntakeFlowState,
  questions: PlanningQuestion[],
  question: PlanningQuestion,
  input: string | PlanningAnswerInput,
  answeredAt = Date.now()
): PlanningIntakeFlowState {
  const nextAnswer = resolvePlanningAnswer(question, input, answeredAt)
  const nextAnswers = [
    ...state.answers.filter((answer) => answer.questionId !== question.id),
    nextAnswer,
  ]
  const nextQuestionIndex = Math.min(state.currentQuestionIndex + 1, questions.length)

  return {
    currentQuestionIndex: nextQuestionIndex,
    answers: nextAnswers,
    isGenerating: nextQuestionIndex >= questions.length,
  }
}

export function rewindPlanningIntakeFlow(state: PlanningIntakeFlowState): PlanningIntakeFlowState {
  return {
    currentQuestionIndex: Math.max(0, state.currentQuestionIndex - 1),
    answers: state.answers.slice(0, -1),
    isGenerating: false,
  }
}

export function PlanningIntakeSurface({ className }: PlanningIntakeSurfaceProps) {
  const { isPlanningPopupOpen, planningSessionId } = useProjectWorkspaceUi()

  function handleStart() {
    const nextSessionId = `planning_${Date.now().toString(36)}`
    openPlanningPopup(nextSessionId)
  }

  function handleClose() {
    closePlanningPopup()
  }

  return (
    <div className={cn('space-y-3', className)}>
      {isPlanningPopupOpen ? (
        <PlanningIntakePopup
          isOpen={isPlanningPopupOpen}
          planningSessionId={planningSessionId}
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
              onClick={handleStart}
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

function summarizeSessionId(sessionId: string | null): string {
  if (!sessionId) return 'pending'
  return sessionId.length > 12 ? `${sessionId.slice(0, 8)}…${sessionId.slice(-4)}` : sessionId
}

function getQuestionLabel(index: number, total: number): string {
  return `Question ${index + 1} of ${total}`
}

function PlanningChoiceButton({
  choice,
  onSelect,
}: {
  choice: PlanningQuestionChoiceView
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

export function PlanningIntakePopup({
  isOpen,
  planningSessionId,
  onClose,
  className,
}: PlanningIntakePopupProps) {
  const questions = useMemo(() => buildDefaultPlanningQuestions(DEFAULT_CONTEXT), [])
  const [flow, setFlow] = useState<PlanningIntakeFlowState>(() => createPlanningIntakeFlowState())
  const [freeformValue, setFreeformValue] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setFlow(createPlanningIntakeFlowState())
    setFreeformValue('')
  }, [isOpen, planningSessionId])

  const currentQuestion =
    !flow.isGenerating && flow.currentQuestionIndex < questions.length
      ? questions[flow.currentQuestionIndex]
      : null
  const currentChoices = currentQuestion ? formatQuestionChoices(currentQuestion) : []

  function submitAnswer(input: string | PlanningAnswerInput) {
    if (!currentQuestion) return
    setFlow((currentState) =>
      advancePlanningIntakeFlow(currentState, questions, currentQuestion, input)
    )
    setFreeformValue('')
  }

  function handleBack() {
    if (flow.currentQuestionIndex === 0 || flow.isGenerating) return
    setFlow((currentState) => rewindPlanningIntakeFlow(currentState))
    setFreeformValue('')
  }

  if (!isOpen) return null

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
              Session {summarizeSessionId(planningSessionId)}
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
        {flow.isGenerating ? (
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
                onClick={handleBack}
                disabled
                className="rounded-none font-mono text-xs uppercase tracking-[0.2em]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
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
                {getQuestionLabel(flow.currentQuestionIndex, questions.length)}
              </div>
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
                  onSelect={(optionId) =>
                    submitAnswer({ selectedOptionId: optionId, source: 'suggestion' })
                  }
                />
              ))}
            </div>

            <form
              className="space-y-2 border-t border-border pt-3"
              onSubmit={(event) => {
                event.preventDefault()
                const value = freeformValue.trim()
                if (!value) return
                submitAnswer({ freeformValue: value, rawValue: value, source: 'freeform' })
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
                  onClick={handleBack}
                  disabled={flow.currentQuestionIndex === 0}
                  className="rounded-none font-mono text-xs uppercase tracking-[0.2em]"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back
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
          </>
        ) : null}
      </div>
    </section>
  )
}
