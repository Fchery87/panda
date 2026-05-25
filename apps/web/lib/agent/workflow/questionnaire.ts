export interface WorkflowQuestionOption {
  value: string
  label: string
  description?: string
}

export interface WorkflowQuestion {
  id: string
  label?: string
  prompt: string
  options: WorkflowQuestionOption[]
  multiple?: boolean
  allowOther?: boolean
  recommended?: string | string[]
}

export interface AskUserQuestionRequest {
  questions: WorkflowQuestion[]
  rationale?: string
  blocking?: boolean
}

export interface WorkflowQuestionAnswer {
  questionId: string
  value: string | string[]
  source: 'option' | 'other'
  answeredAt: number
}

export function validateQuestionnaireRequest(request: AskUserQuestionRequest): string[] {
  const errors: string[] = []
  if (!Array.isArray(request.questions) || request.questions.length === 0) {
    errors.push('At least one question is required.')
    return errors
  }

  const ids = new Set<string>()
  for (const [index, question] of request.questions.entries()) {
    if (!question.id.trim()) errors.push(`Question ${index + 1} is missing an id.`)
    if (ids.has(question.id)) errors.push(`Question id "${question.id}" is duplicated.`)
    ids.add(question.id)
    if (!question.prompt.trim()) errors.push(`Question "${question.id}" is missing a prompt.`)
    if (!Array.isArray(question.options) || question.options.length < 2) {
      errors.push(`Question "${question.id}" needs at least two options.`)
    }
    const optionValues = new Set<string>()
    for (const option of question.options ?? []) {
      if (!option.value.trim()) errors.push(`Question "${question.id}" has an option without a value.`)
      if (!option.label.trim()) errors.push(`Question "${question.id}" has an option without a label.`)
      if (optionValues.has(option.value)) {
        errors.push(`Question "${question.id}" has duplicate option value "${option.value}".`)
      }
      optionValues.add(option.value)
    }
  }
  return errors
}

export function isRecommendedOption(question: WorkflowQuestion, value: string): boolean {
  const recommended = question.recommended
  if (Array.isArray(recommended)) return recommended.includes(value)
  return recommended === value
}
