import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  PlanningIntakePopup,
  PlanningIntakeSurface,
  submitPlanningFreeformAnswer,
  submitPlanningSuggestionAnswer,
} from './PlanningIntakePopup'
import {
  closePlanningPopup,
  closePlanningPopupState,
  createPlanningPopupState,
  openPlanningPopup,
  openPlanningPopupState,
} from '@/hooks/useProjectWorkspaceUi'
import { buildDefaultPlanningQuestions } from '@/lib/planning/question-engine'
import type { GeneratedPlanArtifact, PlanningAnswer, PlanningQuestion } from '@/lib/planning/types'

const questions = buildDefaultPlanningQuestions({ projectName: 'Panda' })

function createSession(
  args: {
    sessionId?: string
    status?:
      | 'intake'
      | 'generating'
      | 'ready_for_review'
      | 'accepted'
      | 'executing'
      | 'completed'
      | 'failed'
    answers?: PlanningAnswer[]
    generatedPlan?: GeneratedPlanArtifact
    sessionQuestions?: PlanningQuestion[]
  } = {}
) {
  return {
    sessionId: args.sessionId ?? 'planning_session_test',
    status: args.status ?? 'intake',
    questions: args.sessionQuestions ?? questions,
    answers: args.answers ?? [],
    generatedPlan: args.generatedPlan,
  }
}

describe('PlanningIntakePopup', () => {
  test('renders closed as nothing', () => {
    const html = renderToStaticMarkup(
      <PlanningIntakePopup
        isOpen={false}
        session={createSession()}
        currentQuestion={questions[0] ?? null}
        onAnswerQuestion={() => {}}
        onClearIntake={() => {}}
        onClose={() => {}}
      />
    )

    expect(html).toBe('')
  })

  test('fires the suggestion submit callback with the current question id', async () => {
    const calls: Array<unknown> = []
    const onAnswerQuestion = async (input: unknown) => {
      calls.push(input)
      return input
    }

    await submitPlanningSuggestionAnswer({
      currentQuestion: questions[0]!,
      selectedOptionId: questions[0]!.suggestions[1]!.id,
      onAnswerQuestion,
    })

    expect(calls).toEqual([
      {
        questionId: questions[0]!.id,
        selectedOptionId: questions[0]!.suggestions[1]!.id,
        source: 'suggestion',
      },
    ])
  })

  test('fires the freeform submit callback with trimmed text', async () => {
    const calls: Array<unknown> = []
    const onAnswerQuestion = async (input: unknown) => {
      calls.push(input)
      return input
    }

    await submitPlanningFreeformAnswer({
      currentQuestion: questions[1]!,
      freeformValue: '  preserve the current UI and mirror  ',
      onAnswerQuestion,
    })

    expect(calls).toEqual([
      {
        questionId: questions[1]!.id,
        freeformValue: 'preserve the current UI and mirror',
        source: 'freeform',
      },
    ])
  })

  test('renders current question suggestions on the surface', () => {
    const html = renderToStaticMarkup(
      <PlanningIntakePopup
        isOpen
        session={createSession()}
        currentQuestion={questions[0] ?? null}
        onAnswerQuestion={() => {}}
        onClearIntake={() => {}}
        onClose={() => {}}
      />
    )

    expect(html).toContain('1. Ship the smallest viable change')
    expect(html).toContain('2. Deliver the full workflow end to end')
    expect(html).toContain('3. Make a surgical fix only')
    expect(html).toContain('Recommended')
  })

  test('hides the freeform form when the current question disallows freeform answers', () => {
    const html = renderToStaticMarkup(
      <PlanningIntakePopup
        isOpen
        session={createSession()}
        currentQuestion={{
          ...questions[0]!,
          allowFreeform: false,
        }}
        onAnswerQuestion={() => {}}
        onClearIntake={() => {}}
        onClose={() => {}}
      />
    )

    expect(html).toContain('1. Ship the smallest viable change')
    expect(html).not.toContain('Freeform response')
    expect(html).not.toContain('Type your own answer')
    expect(html).not.toContain('Submit answer')
  })

  test('renders session-backed answer progress and answered summaries', () => {
    const html = renderToStaticMarkup(
      <PlanningIntakePopup
        isOpen
        session={createSession({
          answers: [
            {
              questionId: questions[0]!.id,
              selectedOptionId: questions[0]!.suggestions[0]!.id,
              source: 'suggestion',
              answeredAt: 1,
            },
            {
              questionId: questions[1]!.id,
              freeformValue: 'mirror the current plan review flow',
              source: 'freeform',
              answeredAt: 2,
            },
          ],
        })}
        currentQuestion={questions[2] ?? null}
        onAnswerQuestion={() => {}}
        onClearIntake={() => {}}
        onClose={() => {}}
      />
    )

    expect(html).toContain('Answered 2/4')
    expect(html).toContain('Outcome: Ship the smallest viable change')
    expect(html).toContain('Scope: mirror the current plan review flow')
    expect(html).toContain('Question 3 of 4')
  })

  test('advances when the session and current question props update', () => {
    const firstHtml = renderToStaticMarkup(
      <PlanningIntakePopup
        isOpen
        session={createSession()}
        currentQuestion={questions[0] ?? null}
        onAnswerQuestion={() => {}}
        onClearIntake={() => {}}
        onClose={() => {}}
      />
    )
    const nextHtml = renderToStaticMarkup(
      <PlanningIntakePopup
        isOpen
        session={createSession({
          answers: [
            {
              questionId: questions[0]!.id,
              selectedOptionId: questions[0]!.suggestions[0]!.id,
              source: 'suggestion',
              answeredAt: 1,
            },
          ],
        })}
        currentQuestion={questions[1] ?? null}
        onAnswerQuestion={() => {}}
        onClearIntake={() => {}}
        onClose={() => {}}
      />
    )

    expect(firstHtml).toContain('Question 1 of 4')
    expect(firstHtml).toContain('Outcome')
    expect(firstHtml).toContain('Answered 0/4')
    expect(nextHtml).toContain('Question 2 of 4')
    expect(nextHtml).toContain('Scope')
    expect(nextHtml).toContain('Answered 1/4')
    expect(nextHtml).toContain('Outcome: Ship the smallest viable change')
    expect(nextHtml).not.toContain('Question 1 of 4')
  })

  test('renders generating state from the session status', () => {
    const html = renderToStaticMarkup(
      <PlanningIntakePopup
        isOpen
        session={createSession({ status: 'generating' })}
        currentQuestion={null}
        onAnswerQuestion={() => {}}
        onClearIntake={() => {}}
        onClose={() => {}}
      />
    )

    expect(html).toContain('Generating plan')
    expect(html).toContain('workspace-ready plan')
    expect(html).toContain('Reset intake')
    expect(html).not.toContain('Submit answer')
  })

  test('renders a clean pending state when the popup opens without session data', () => {
    const html = renderToStaticMarkup(
      <PlanningIntakePopup
        isOpen
        session={null}
        currentQuestion={null}
        onAnswerQuestion={() => {}}
        onClearIntake={() => {}}
        onClose={() => {}}
      />
    )

    expect(html).toContain('Waiting for intake session')
    expect(html).toContain('Start or resume a planning intake session')
    expect(html).toContain('Close')
    expect(html).not.toContain('Question 1 of')
    expect(html).not.toContain('Submit answer')
  })

  test('labels the destructive reset action honestly instead of back', () => {
    const html = renderToStaticMarkup(
      <PlanningIntakePopup
        isOpen
        session={createSession({
          answers: [
            {
              questionId: questions[0]!.id,
              selectedOptionId: questions[0]!.suggestions[0]!.id,
              source: 'suggestion',
              answeredAt: 1,
            },
          ],
        })}
        currentQuestion={questions[1] ?? null}
        onAnswerQuestion={() => {}}
        onClearIntake={() => {}}
        onClose={() => {}}
      />
    )

    expect(html).toContain('Reset intake')
    expect(html).not.toContain('>Back<')
  })

  test('exposes explicit open and close lifecycle helpers', () => {
    const closedState = createPlanningPopupState()
    const openState = openPlanningPopupState(closedState, 'planning_custom')
    const reopenedState = openPlanningPopupState(openState)
    const nextClosedState = closePlanningPopupState(reopenedState)

    expect(closedState).toEqual({
      isPlanningPopupOpen: false,
      planningSessionId: null,
    })
    expect(openState).toEqual({
      isPlanningPopupOpen: true,
      planningSessionId: 'planning_custom',
    })
    expect(reopenedState.isPlanningPopupOpen).toBe(true)
    expect(reopenedState.planningSessionId).toBe('planning_custom')
    expect(nextClosedState).toEqual({
      isPlanningPopupOpen: false,
      planningSessionId: null,
    })
  })

  test('shared planning intake surface launches and renders the popup with session props', () => {
    try {
      openPlanningPopup('planning_surface_test')
      const openHtml = renderToStaticMarkup(
        <PlanningIntakeSurface
          session={createSession({ sessionId: 'planning_surface_test' })}
          currentQuestion={questions[0] ?? null}
          onStartIntake={() => 'planning_surface_test'}
          onAnswerQuestion={() => {}}
          onClearIntake={() => {}}
        />
      )

      expect(openHtml).toContain('Planning intake')
      expect(openHtml).toContain('Question 1 of 4')
      expect(openHtml).toContain('Answered 0/4')
      expect(openHtml).not.toContain('Waiting for intake session')
    } finally {
      closePlanningPopup()
    }

    const closedHtml = renderToStaticMarkup(
      <PlanningIntakeSurface
        session={createSession({ sessionId: 'planning_surface_test' })}
        currentQuestion={questions[0] ?? null}
        onStartIntake={() => 'planning_surface_test'}
        onAnswerQuestion={() => {}}
        onClearIntake={() => {}}
      />
    )
    expect(closedHtml).toContain('Planning intake')
    expect(closedHtml).toContain('Start intake')
  })

  test('closed surface with an existing session resumes without invoking new-session creation', async () => {
    const calls: string[] = []
    const onStartIntake = async () => {
      calls.push('start')
      return 'new_planning_session'
    }

    const closedHtml = renderToStaticMarkup(
      <PlanningIntakeSurface
        session={createSession({ sessionId: 'planning_surface_resume' })}
        currentQuestion={questions[1] ?? null}
        onStartIntake={onStartIntake}
        onAnswerQuestion={() => {}}
        onClearIntake={() => {}}
      />
    )

    expect(closedHtml).toContain('Planning intake')
    expect(closedHtml).toContain('Start intake')
    expect(calls).toEqual([])

    try {
      openPlanningPopup('planning_surface_resume')
      const reopenedHtml = renderToStaticMarkup(
        <PlanningIntakeSurface
          session={createSession({ sessionId: 'planning_surface_resume' })}
          currentQuestion={questions[1] ?? null}
          onStartIntake={onStartIntake}
          onAnswerQuestion={() => {}}
          onClearIntake={() => {}}
        />
      )

      expect(reopenedHtml).toContain('Question 2 of 4')
      expect(reopenedHtml).not.toContain('Waiting for intake session')
      expect(calls).toEqual([])
    } finally {
      closePlanningPopup()
    }
  })

  test('surface renders the popup pending state when the workspace popup is open before session data exists', () => {
    try {
      openPlanningPopup('planning_surface_pending')
      const html = renderToStaticMarkup(
        <PlanningIntakeSurface
          session={null}
          currentQuestion={null}
          onStartIntake={() => 'planning_surface_pending'}
          onAnswerQuestion={() => {}}
          onClearIntake={() => {}}
        />
      )

      expect(html).toContain('Waiting for intake session')
      expect(html).not.toContain('Start intake')
      expect(html).not.toContain('Question 1 of')
    } finally {
      closePlanningPopup()
    }
  })
})
