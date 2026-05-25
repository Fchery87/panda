import type { WorkflowStage } from './stages'

export const WORKFLOW_ARTIFACT_KINDS = [
  'requirements',
  'research',
  'solution_comparison',
  'design',
  'implementation_plan',
  'validation_report',
  'review_report',
  'handoff',
] as const

export type WorkflowArtifactKind = (typeof WORKFLOW_ARTIFACT_KINDS)[number]
export type WorkflowArtifactStatus = 'draft' | 'approved' | 'superseded' | 'failed'

export interface WorkflowArtifactDraft {
  projectId: string
  chatId: string
  runId: string
  parentRunId?: string
  kind: WorkflowArtifactKind
  title: string
  content: string
  status: WorkflowArtifactStatus
  sourceStage: WorkflowStage
  receiptIds?: string[]
  createdAt: number
  updatedAt: number
}

export function isWorkflowArtifactKind(value: unknown): value is WorkflowArtifactKind {
  return typeof value === 'string' && (WORKFLOW_ARTIFACT_KINDS as readonly string[]).includes(value)
}

export function artifactKindForStage(stage: WorkflowStage): WorkflowArtifactKind | null {
  switch (stage) {
    case 'intake':
    case 'clarify':
      return 'requirements'
    case 'research':
      return 'research'
    case 'explore':
      return 'solution_comparison'
    case 'design':
      return 'design'
    case 'plan':
      return 'implementation_plan'
    case 'validate':
      return 'validation_report'
    case 'review':
      return 'review_report'
    case 'handoff':
      return 'handoff'
    case 'implement':
      return null
  }
}

export function buildWorkflowArtifactDraft(args: Omit<WorkflowArtifactDraft, 'createdAt' | 'updatedAt'> & { now?: number }): WorkflowArtifactDraft {
  const now = args.now ?? Date.now()
  return {
    ...args,
    title: args.title.trim(),
    content: args.content.trim(),
    createdAt: now,
    updatedAt: now,
  }
}
