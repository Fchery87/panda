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

export interface GeneratedPlanTodo {
  id: string
  content: string
  status: 'pending' | 'in-progress' | 'completed' | 'error'
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
  workspacePath?: string
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

function escapeYamlString(value: string): string {
  return JSON.stringify(value)
}

function planStatusToTodoStatus(
  status: GeneratedPlanArtifact['status']
): GeneratedPlanTodo['status'] {
  switch (status) {
    case 'completed':
      return 'completed'
    case 'executing':
      return 'in-progress'
    case 'failed':
      return 'error'
    default:
      return 'pending'
  }
}

function slugifyPlanId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function deriveGeneratedPlanTodos(artifact: GeneratedPlanArtifact): GeneratedPlanTodo[] {
  const sectionTodos = [...artifact.sections]
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    .map((section) => ({
      id: section.id || slugifyPlanId(section.title),
      content: section.title,
      status: planStatusToTodoStatus(artifact.status),
    }))

  if (sectionTodos.length > 0) return sectionTodos

  return artifact.acceptanceChecks.map((check, index) => ({
    id: `acceptance-${index + 1}`,
    content: check,
    status: 'pending',
  }))
}

export function serializeGeneratedPlanFrontmatter(artifact: GeneratedPlanArtifact): string {
  const todos = deriveGeneratedPlanTodos(artifact)
  const lines = [
    '---',
    `name: ${escapeYamlString(artifact.title)}`,
    `overview: ${escapeYamlString(artifact.summary)}`,
    `status: ${escapeYamlString(artifact.status)}`,
    `sessionId: ${escapeYamlString(artifact.sessionId)}`,
  ]

  if (artifact.workspacePath) {
    lines.push(`workspacePath: ${escapeYamlString(artifact.workspacePath)}`)
  }

  lines.push('todos:')
  if (todos.length === 0) {
    lines.push('  []')
  } else {
    for (const todo of todos) {
      lines.push(`  - id: ${escapeYamlString(todo.id)}`)
      lines.push(`    content: ${escapeYamlString(todo.content)}`)
      lines.push(`    status: ${escapeYamlString(todo.status)}`)
    }
  }
  lines.push('isProject: false', '---')
  return lines.join('\n')
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
    isNumber(record.generatedAt) &&
    (record.workspacePath === undefined || isString(record.workspacePath))
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

function hasYamlFrontmatter(markdown: string): boolean {
  return markdown.startsWith('---\n') && markdown.indexOf('\n---', 4) > 0
}

export function serializeGeneratedPlanArtifact(artifact: GeneratedPlanArtifact): string {
  const markdown = artifact.markdown.trim()
  if (markdown) {
    if (hasYamlFrontmatter(markdown)) return markdown
    return `${serializeGeneratedPlanFrontmatter(artifact)}\n\n${markdown}`
  }

  const sections = [...artifact.sections].sort(
    (a, b) => a.order - b.order || a.id.localeCompare(b.id)
  )
  const lines = [serializeGeneratedPlanFrontmatter(artifact), '', `# ${artifact.title}`]

  if (artifact.summary.trim()) {
    lines.push('', artifact.summary.trim())
  }

  for (const section of sections) {
    lines.push('', `## ${section.title}`, section.content.trim())
  }

  if (artifact.acceptanceChecks.length > 0) {
    lines.push('', '## Validation')
    for (const check of artifact.acceptanceChecks) {
      lines.push(`- [ ] ${check}`)
    }
  }

  return lines.join('\n').trim()
}
