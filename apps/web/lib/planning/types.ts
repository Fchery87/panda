export type PlanningSessionStatus =
  | 'intake'
  | 'generating'
  | 'ready_for_review'
  | 'accepted'
  | 'executing'
  | 'completed'
  | 'failed'

export type PlanningChatId = string
export type PlanningSessionId = string
export type PlanningTabId = PlanningSessionId
export type PlanningQuestionId = string
export type PlanningOptionId = string
export type PlanningAnswerQuestionId = string
export type PlanningSectionId = string

export interface PlanningOption {
  id: PlanningOptionId
  label: string
  description?: string
  recommended?: boolean
}

export interface PlanningQuestion {
  id: PlanningQuestionId
  title: string
  prompt: string
  suggestions: PlanningOption[]
  allowFreeform: boolean
  order: number
}

export type PlanningAnswerSource = 'suggestion' | 'freeform'

export interface PlanningAnswer {
  questionId: PlanningAnswerQuestionId
  selectedOptionId?: PlanningOptionId
  freeformValue?: string
  source: PlanningAnswerSource
  answeredAt: number
}

export interface GeneratedPlanSection {
  id: PlanningSectionId
  title: string
  content: string
  order: number
}

export interface GeneratedPlanArtifact {
  chatId: PlanningChatId
  sessionId: PlanningSessionId
  title: string
  summary: string
  markdown: string
  sections: GeneratedPlanSection[]
  acceptanceChecks: string[]
  status: 'ready_for_review' | 'accepted' | 'executing' | 'completed' | 'failed'
  generatedAt: number
}

export interface WorkspacePlanTabRef {
  kind: 'plan'
  id: PlanningTabId
  chatId: PlanningChatId
  sessionId: PlanningSessionId
  title: string
  status: GeneratedPlanArtifact['status']
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object'
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isGeneratedPlanSection(value: unknown): value is GeneratedPlanSection {
  if (!isRecord(value)) return false
  return (
    isString(value.id) && isString(value.title) && isString(value.content) && isNumber(value.order)
  )
}

export function isGeneratedPlanArtifact(value: unknown): value is GeneratedPlanArtifact {
  if (!isRecord(value)) return false

  const record = value
  return (
    isString(record.chatId) &&
    isString(record.sessionId) &&
    isString(record.title) &&
    isString(record.summary) &&
    isString(record.markdown) &&
    Array.isArray(record.sections) &&
    record.sections.every(isGeneratedPlanSection) &&
    Array.isArray(record.acceptanceChecks) &&
    record.acceptanceChecks.every(isString) &&
    (record.status === 'ready_for_review' ||
      record.status === 'accepted' ||
      record.status === 'executing' ||
      record.status === 'completed' ||
      record.status === 'failed') &&
    isNumber(record.generatedAt)
  )
}

export function createWorkspacePlanTabRef(artifact: GeneratedPlanArtifact): WorkspacePlanTabRef {
  return {
    kind: 'plan',
    id: artifact.sessionId,
    chatId: artifact.chatId,
    sessionId: artifact.sessionId,
    title: artifact.title,
    status: artifact.status,
  }
}

export function serializeGeneratedPlanArtifact(artifact: GeneratedPlanArtifact): string {
  const markdown = artifact.markdown.trim()
  if (markdown) return markdown

  const sections = [...artifact.sections].sort(
    (a, b) => a.order - b.order || a.id.localeCompare(b.id)
  )
  const lines = [`# ${artifact.title}`]

  if (artifact.summary.trim()) {
    lines.push('', artifact.summary.trim())
  }

  for (const section of sections) {
    lines.push('', `## ${section.title}`, section.content.trim())
  }

  if (artifact.acceptanceChecks.length > 0) {
    lines.push('', '## Acceptance Checks')
    for (const check of artifact.acceptanceChecks) {
      lines.push(`- ${check}`)
    }
  }

  return lines.join('\n').trim()
}
