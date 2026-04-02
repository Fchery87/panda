import { describe, expect, it } from 'bun:test'
import {
  buildDefaultPlanningQuestions,
  formatQuestionChoices,
  getCurrentPlanningQuestion,
  isPlanningIntakeComplete,
  resolvePlanningAnswer,
  type PlanningSessionQuestionState,
} from './question-engine'
import type { PlanningAnswer, PlanningQuestion } from './types'

function buildSession(
  questions: PlanningQuestion[],
  answers: PlanningAnswer[] = []
): PlanningSessionQuestionState {
  return { questions, answers }
}

describe('planning question engine', () => {
  it('builds questions in a deterministic order', () => {
    const questions = buildDefaultPlanningQuestions({
      taskSummary: 'add structured planning intake',
      projectName: 'Panda',
    })

    expect(questions.map((question) => question.id)).toEqual([
      'outcome',
      'scope',
      'approach',
      'validation',
    ])
    expect(questions.map((question) => question.order)).toEqual([10, 20, 30, 40])
  })

  it('formats suggested answers as numbered choices', () => {
    const question = buildDefaultPlanningQuestions()[0]
    const choices = formatQuestionChoices(question)

    expect(choices).toEqual([
      {
        index: 1,
        optionId: 'smallest-viable-change',
        label: 'Ship the smallest viable change',
        description: 'Keep the scope tight and preserve the current workflow.',
        recommended: true,
        displayLabel: '1. Ship the smallest viable change',
      },
      {
        index: 2,
        optionId: 'full-workflow',
        label: 'Deliver the full workflow end to end',
        description: 'Include the full experience, wiring, and follow-through.',
        recommended: false,
        displayLabel: '2. Deliver the full workflow end to end',
      },
      {
        index: 3,
        optionId: 'surgical-fix',
        label: 'Make a surgical fix only',
        description: 'Limit the work to the narrowest safe change.',
        recommended: false,
        displayLabel: '3. Make a surgical fix only',
      },
      {
        index: 4,
        optionId: 'refactor-first',
        label: 'Refactor first, then layer the feature',
        description: 'Prioritize maintainability and clean seams.',
        recommended: false,
        displayLabel: '4. Refactor first, then layer the feature',
      },
    ])
  })

  it('accepts freeform answers when a question allows them', () => {
    const question = buildDefaultPlanningQuestions()[1]
    const answer = resolvePlanningAnswer(question, '  preserve the current UI and state mirror  ')

    expect(answer).toEqual({
      questionId: question.id,
      freeformValue: 'preserve the current UI and state mirror',
      source: 'freeform',
      answeredAt: answer.answeredAt,
    })
    expect(answer.selectedOptionId).toBeUndefined()
  })

  it('accepts numbered suggestion input in explicit suggestion mode', () => {
    const question = buildDefaultPlanningQuestions()[0]
    const answer = resolvePlanningAnswer(question, {
      source: 'suggestion',
      rawValue: '2',
    })

    expect(answer).toEqual({
      questionId: question.id,
      selectedOptionId: 'full-workflow',
      source: 'suggestion',
      answeredAt: answer.answeredAt,
    })
  })

  it('advances to the next unanswered question', () => {
    const questions = buildDefaultPlanningQuestions()
    const firstQuestion = questions[0]
    const session = buildSession(questions, [resolvePlanningAnswer(firstQuestion, '1')])

    expect(getCurrentPlanningQuestion(session)).toEqual(questions[1])
  })

  it('respects question order even when the session stores questions out of order', () => {
    const orderedQuestions = buildDefaultPlanningQuestions()
    const scrambled = [
      orderedQuestions[3],
      orderedQuestions[0],
      orderedQuestions[2],
      orderedQuestions[1],
    ]
    const session = buildSession(scrambled)

    expect(getCurrentPlanningQuestion(session)).toEqual(orderedQuestions[0])
  })

  it('reports completion when every question has an answer', () => {
    const questions = buildDefaultPlanningQuestions()
    const answers = questions.map((question, index) =>
      resolvePlanningAnswer(question, String(index + 1))
    )
    const session = buildSession(questions, answers)

    expect(getCurrentPlanningQuestion(session)).toBeNull()
    expect(isPlanningIntakeComplete(session)).toBe(true)
  })
})
