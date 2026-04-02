import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  derivePlanningSessionDebugSummary,
  PlanningSessionDebugCard,
} from './PlanningSessionDebugCard'
import type { GeneratedPlanArtifact, PlanningAnswer, PlanningQuestion } from '@/lib/planning/types'

const questions: PlanningQuestion[] = [
  {
    id: 'outcome',
    title: 'Outcome',
    prompt: 'What should Panda deliver?',
    suggestions: [],
    allowFreeform: true,
    order: 10,
  },
  {
    id: 'scope',
    title: 'Scope',
    prompt: 'What should the plan cover?',
    suggestions: [],
    allowFreeform: true,
    order: 20,
  },
]

const answers: PlanningAnswer[] = [
  {
    questionId: 'outcome',
    source: 'suggestion',
    selectedOptionId: 'smallest-viable-change',
    answeredAt: 10,
  },
]

const generatedPlan: GeneratedPlanArtifact = {
  chatId: 'chat_1',
  sessionId: 'planning_session_debug',
  title: 'Planning debug plan',
  summary: 'A synthetic generated plan for diagnostics.',
  markdown: '# Planning debug plan',
  sections: [],
  acceptanceChecks: ['Accept the plan'],
  status: 'accepted',
  generatedAt: 20,
}

describe('PlanningSessionDebugCard', () => {
  test('current question, selected answer source, and generated plan status are visible', () => {
    const summary = derivePlanningSessionDebugSummary({
      sessionId: generatedPlan.sessionId,
      questions,
      answers,
      generatedPlan,
      openTabPaths: [],
    })
    const html = renderToStaticMarkup(<PlanningSessionDebugCard summary={summary} />)

    expect(html).toContain('Current Question')
    expect(html).toContain('Scope')
    expect(html).toContain('Last Answer')
    expect(html).toContain('Suggestion')
    expect(html).toContain('Plan Status')
    expect(html).toContain('accepted')
  })

  test('accepted plan id and session id are visible in debug mode', () => {
    const summary = derivePlanningSessionDebugSummary({
      sessionId: generatedPlan.sessionId,
      questions,
      answers,
      generatedPlan,
      openTabPaths: ['plan:planning_session_debug'],
    })
    const html = renderToStaticMarkup(<PlanningSessionDebugCard summary={summary} />)

    expect(html).toContain('planning_session_debug')
    expect(html).toContain('plan:planning_session_debug')
    expect(html).toContain('Open')
  })

  test('build state is visible after acceptance and execution starts', () => {
    const summary = derivePlanningSessionDebugSummary({
      sessionId: generatedPlan.sessionId,
      questions,
      answers: [
        ...answers,
        {
          questionId: 'scope',
          source: 'freeform',
          freeformValue: 'full stack',
          answeredAt: 11,
        },
      ],
      generatedPlan: {
        ...generatedPlan,
        status: 'executing',
      },
      openTabPaths: ['plan:planning_session_debug'],
    })
    const html = renderToStaticMarkup(<PlanningSessionDebugCard summary={summary} />)

    expect(html).toContain('Executing accepted plan')
    expect(html).toContain('2/2')
    expect(html).toContain('Complete')
  })
})
