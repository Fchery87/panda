import type { PlanningAnswer, PlanningOption, PlanningQuestion } from './types'

export interface PlanningSessionQuestionState {
  questions: PlanningQuestion[]
  answers: PlanningAnswer[]
}

export interface PlanningQuestionChoiceView {
  index: number
  optionId: string
  label: string
  description?: string
  recommended: boolean
  displayLabel: string
}

export interface BuildDefaultPlanningQuestionsInput {
  taskSummary?: string
  projectName?: string
}

export interface PlanningAnswerInput {
  selectedOptionId?: string
  freeformValue?: string
  rawValue?: string
  source?: PlanningAnswer['source']
  answeredAt?: number
}

const DEFAULT_QUESTION_ORDER = ['outcome', 'scope', 'approach', 'validation'] as const

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function normalizeKey(value: string): string {
  return normalizeText(value).toLowerCase()
}

function sortQuestions(questions: PlanningQuestion[]): PlanningQuestion[] {
  return [...questions].sort(
    (left, right) => left.order - right.order || left.id.localeCompare(right.id)
  )
}

function findQuestionAnswer(
  session: PlanningSessionQuestionState,
  questionId: string
): PlanningAnswer | undefined {
  let latest: PlanningAnswer | undefined

  for (const answer of session.answers) {
    if (answer.questionId !== questionId) continue
    if (!latest || answer.answeredAt >= latest.answeredAt) {
      latest = answer
    }
  }

  return latest
}

function buildQuestion(
  id: string,
  order: number,
  title: string,
  prompt: string,
  suggestions: PlanningOption[]
): PlanningQuestion {
  return {
    id,
    order,
    title,
    prompt,
    suggestions,
    allowFreeform: true,
  }
}

export function buildDefaultPlanningQuestions(
  input: BuildDefaultPlanningQuestionsInput = {}
): PlanningQuestion[] {
  const taskSummary = input.taskSummary?.trim()
  const projectName = input.projectName?.trim()
  const contextLabel = taskSummary ?? projectName ?? 'this request'

  return sortQuestions([
    buildQuestion(
      DEFAULT_QUESTION_ORDER[0],
      10,
      'Outcome',
      `What outcome should Panda deliver for ${contextLabel}?`,
      [
        {
          id: 'smallest-viable-change',
          label: 'Ship the smallest viable change',
          description: 'Keep the scope tight and preserve the current workflow.',
          recommended: true,
        },
        {
          id: 'full-workflow',
          label: 'Deliver the full workflow end to end',
          description: 'Include the full experience, wiring, and follow-through.',
        },
        {
          id: 'surgical-fix',
          label: 'Make a surgical fix only',
          description: 'Limit the work to the narrowest safe change.',
        },
        {
          id: 'refactor-first',
          label: 'Refactor first, then layer the feature',
          description: 'Prioritize maintainability and clean seams.',
        },
      ]
    ),
    buildQuestion(
      DEFAULT_QUESTION_ORDER[1],
      20,
      'Scope',
      `Which part of the system should this planning session focus on for ${contextLabel}?`,
      [
        {
          id: 'ui-only',
          label: 'UI only',
          description: 'Change the visible flow without touching backend state.',
          recommended: true,
        },
        {
          id: 'ui-and-data',
          label: 'UI and data model',
          description: 'Update the interface and the persistent planning state.',
        },
        {
          id: 'full-stack',
          label: 'Full stack',
          description: 'Touch UI, Convex, and execution wiring together.',
        },
        {
          id: 'compatibility-layer',
          label: 'Add a compatibility layer',
          description: 'Preserve existing behavior while introducing the new path.',
        },
      ]
    ),
    buildQuestion(
      DEFAULT_QUESTION_ORDER[2],
      30,
      'Approach',
      'How should the agent approach the implementation?',
      [
        {
          id: 'incremental',
          label: 'Implement it incrementally',
          description: 'Add the new path in small steps with compatibility preserved.',
          recommended: true,
        },
        {
          id: 'new-contract',
          label: 'Introduce a new typed contract',
          description: 'Make the workflow explicit with new data structures.',
        },
        {
          id: 'refactor-existing',
          label: 'Refactor the existing flow',
          description: 'Reuse the current structure but make it cleaner and stricter.',
        },
        {
          id: 'prototype-first',
          label: 'Prototype first, harden second',
          description: 'Move fast on the UI and tighten the edges afterward.',
        },
      ]
    ),
    buildQuestion(
      DEFAULT_QUESTION_ORDER[3],
      40,
      'Validation',
      'How should we verify the result before accepting the plan?',
      [
        {
          id: 'unit-tests',
          label: 'Run unit tests only',
          description: 'Validate the new helpers and data flow in isolation.',
          recommended: true,
        },
        {
          id: 'unit-and-e2e',
          label: 'Run unit tests and E2E coverage',
          description: 'Use the narrowest useful automated verification set.',
        },
        {
          id: 'manual-review',
          label: 'Review manually first',
          description: 'Inspect the workspace behavior before expanding test coverage.',
        },
        {
          id: 'full-pass',
          label: 'Run the full verification pass',
          description: 'Require the strongest available confidence gate.',
        },
      ]
    ),
  ])
}

export function formatQuestionChoices(question: PlanningQuestion): PlanningQuestionChoiceView[] {
  return question.suggestions.map((option, index) => ({
    index: index + 1,
    optionId: option.id,
    label: option.label,
    description: option.description,
    recommended: option.recommended ?? false,
    displayLabel: `${index + 1}. ${option.label}`,
  }))
}

export function getCurrentPlanningQuestion(
  session: PlanningSessionQuestionState
): PlanningQuestion | null {
  const orderedQuestions = sortQuestions(session.questions)

  for (const question of orderedQuestions) {
    if (!findQuestionAnswer(session, question.id)) {
      return question
    }
  }

  return null
}

export function isPlanningIntakeComplete(session: PlanningSessionQuestionState): boolean {
  return getCurrentPlanningQuestion(session) === null
}

function resolveOptionFromRawValue(
  question: PlanningQuestion,
  rawValue: string
): PlanningOption | null {
  const normalizedValue = normalizeKey(rawValue)
  if (!normalizedValue) return null

  const numericMatch = normalizedValue.match(/^(\d+)(?:[.)]|$)/)
  if (numericMatch) {
    const choiceIndex = Number(numericMatch[1])
    if (choiceIndex >= 1 && choiceIndex <= question.suggestions.length) {
      return question.suggestions[choiceIndex - 1] ?? null
    }
  }

  return (
    question.suggestions.find((option) => normalizeKey(option.id) === normalizedValue) ??
    question.suggestions.find((option) => normalizeKey(option.label) === normalizedValue) ??
    question.suggestions.find(
      (option) => normalizeKey(`${option.label} ${option.description ?? ''}`) === normalizedValue
    ) ??
    null
  )
}

export function resolvePlanningAnswer(
  question: PlanningQuestion,
  input: string | PlanningAnswerInput,
  answeredAt = Date.now()
): PlanningAnswer {
  const normalizedInput =
    typeof input === 'string' ? { rawValue: input } : { ...input, rawValue: input.rawValue }

  const rawValue = normalizedInput.rawValue?.trim() ?? ''

  if (normalizedInput.source === 'suggestion' || normalizedInput.selectedOptionId) {
    const directOptionId = normalizedInput.selectedOptionId ?? rawValue
    const resolvedOption =
      question.suggestions.find((option) => option.id === directOptionId) ??
      resolveOptionFromRawValue(question, rawValue)

    if (!resolvedOption) {
      throw new Error(`A suggestion selection is required for question "${question.id}"`)
    }

    return {
      questionId: question.id,
      selectedOptionId: resolvedOption.id,
      source: 'suggestion',
      answeredAt: normalizedInput.answeredAt ?? answeredAt,
    }
  }

  const resolvedOption = resolveOptionFromRawValue(question, rawValue)
  if (resolvedOption) {
    return {
      questionId: question.id,
      selectedOptionId: resolvedOption.id,
      source: 'suggestion',
      answeredAt: normalizedInput.answeredAt ?? answeredAt,
    }
  }

  if (!question.allowFreeform) {
    throw new Error(`Question "${question.id}" does not allow freeform answers`)
  }
  if (!rawValue) {
    throw new Error(`A freeform answer is required for question "${question.id}"`)
  }

  return {
    questionId: question.id,
    freeformValue: normalizeText(rawValue),
    source: 'freeform',
    answeredAt: normalizedInput.answeredAt ?? answeredAt,
  }
}
