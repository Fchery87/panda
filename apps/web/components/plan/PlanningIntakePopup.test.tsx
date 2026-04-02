import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  advancePlanningIntakeFlow,
  createPlanningIntakeFlowState,
  PlanningIntakePopup,
  PlanningIntakeSurface,
  rewindPlanningIntakeFlow,
} from './PlanningIntakePopup'
import {
  closePlanningPopupState,
  createPlanningPopupState,
  closePlanningPopup,
  openPlanningPopupState,
  openPlanningPopup,
} from '@/hooks/useProjectWorkspaceUi'
import { buildDefaultPlanningQuestions } from '@/lib/planning/question-engine'

describe('PlanningIntakePopup', () => {
  test('renders closed as nothing', () => {
    const html = renderToStaticMarkup(
      <PlanningIntakePopup isOpen={false} planningSessionId={null} onClose={() => {}} />
    )

    expect(html).toBe('')
  })

  test('renders one question at a time with numbered choices and freeform input', () => {
    const html = renderToStaticMarkup(
      <PlanningIntakePopup isOpen planningSessionId="planning_session_test" onClose={() => {}} />
    )

    expect(html).toContain('Planning intake')
    expect(html).toContain('Question 1 of 4')
    expect(html).toContain('Outcome')
    expect(html).toContain('1. Ship the smallest viable change')
    expect(html).toContain('2. Deliver the full workflow end to end')
    expect(html).toContain('<textarea')
    expect(html).toContain('Back')
    expect(html).toContain('Cancel')
    expect(html).not.toContain('Approach')
    expect(html).not.toContain('Validation')
  })

  test('advances to the next question when a suggestion is selected', () => {
    const questions = buildDefaultPlanningQuestions()
    const firstQuestion = questions[0]
    const nextState = advancePlanningIntakeFlow(
      createPlanningIntakeFlowState(),
      questions,
      firstQuestion,
      '1',
      1234
    )

    expect(nextState.currentQuestionIndex).toBe(1)
    expect(nextState.answers).toHaveLength(1)
    expect(nextState.answers[0]).toEqual({
      questionId: firstQuestion.id,
      selectedOptionId: firstQuestion.suggestions[0]?.id,
      source: 'suggestion',
      answeredAt: 1234,
    })
    expect(nextState.isGenerating).toBe(false)
  })

  test('accepts custom freeform text and advances', () => {
    const questions = buildDefaultPlanningQuestions()
    const question = questions[1]
    const nextState = advancePlanningIntakeFlow(
      createPlanningIntakeFlowState(),
      questions,
      question,
      ' preserve the current UI and state mirror ',
      9876
    )

    expect(nextState.currentQuestionIndex).toBe(1)
    expect(nextState.answers).toHaveLength(1)
    expect(nextState.answers[0]).toEqual({
      questionId: question.id,
      freeformValue: 'preserve the current UI and state mirror',
      source: 'freeform',
      answeredAt: 9876,
    })
    expect(nextState.isGenerating).toBe(false)
  })

  test('enters the generating state after the final answer', () => {
    const questions = buildDefaultPlanningQuestions()
    const finalQuestion = questions[questions.length - 1]
    const nextState = advancePlanningIntakeFlow(
      {
        currentQuestionIndex: questions.length - 1,
        answers: questions.slice(0, -1).map((question, index) => ({
          questionId: question.id,
          selectedOptionId: question.suggestions[0]?.id,
          source: 'suggestion',
          answeredAt: index + 1,
        })),
        isGenerating: false,
      },
      questions,
      finalQuestion,
      '1',
      2468
    )

    expect(nextState.currentQuestionIndex).toBe(questions.length)
    expect(nextState.answers).toHaveLength(questions.length)
    expect(nextState.isGenerating).toBe(true)
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

  test('shared planning intake surface launches and renders the popup', () => {
    try {
      openPlanningPopup('planning_surface_test')
      const openHtml = renderToStaticMarkup(<PlanningIntakeSurface />)

      expect(openHtml).toContain('Planning intake')
      expect(openHtml).toContain('Question 1 of 4')
      expect(openHtml).not.toContain('Guided intake')
    } finally {
      closePlanningPopup()
    }

    const closedHtml = renderToStaticMarkup(<PlanningIntakeSurface />)
    expect(closedHtml).toContain('Planning intake')
    expect(closedHtml).toContain('Start intake')
  })

  test('rewind helper steps back without reopening generation', () => {
    const questions = buildDefaultPlanningQuestions()
    const firstQuestion = questions[0]
    const secondState = advancePlanningIntakeFlow(
      createPlanningIntakeFlowState(),
      questions,
      firstQuestion,
      '1',
      42
    )
    const previousState = rewindPlanningIntakeFlow(secondState)

    expect(previousState.currentQuestionIndex).toBe(0)
    expect(previousState.answers).toHaveLength(0)
    expect(previousState.isGenerating).toBe(false)
  })
})
