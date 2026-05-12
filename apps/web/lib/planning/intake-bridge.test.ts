import { describe, expect, test } from 'bun:test'
import { buildDefaultPlanningQuestions } from './question-engine'
import {
  buildPlanningIntakeMessage,
  buildPlanningIntakeQuestions,
  createPlanningIntakeSeed,
} from './intake-bridge'

describe('planning intake bridge', () => {
  test('classifies GitHub issue URLs and seeds canonical planning questions', () => {
    const seed = createPlanningIntakeSeed(
      'https://github.com/panda-ai/panda/issues/42 Add repository issue intake'
    )
    const fallbackQuestions = buildDefaultPlanningQuestions({ projectName: 'Panda' })
    const questions = buildPlanningIntakeQuestions({ seed, fallbackQuestions })

    expect(seed).toEqual({
      source: 'github_issue',
      taskSummary: 'https://github.com/panda-ai/panda/issues/42 Add repository issue intake',
    })
    expect(questions[0]?.prompt).toContain('github.com/panda-ai/panda/issues/42')
    expect(buildPlanningIntakeMessage(seed)).toContain('from GitHub issue')
  })

  test('keeps manual task descriptions on the same planning intake path', () => {
    const seed = createPlanningIntakeSeed('Add keyboard shortcuts to the command palette')

    expect(seed).toEqual({
      source: 'manual',
      taskSummary: 'Add keyboard shortcuts to the command palette',
    })
    expect(buildPlanningIntakeMessage(seed)).toContain('from manual task')
  })
})
