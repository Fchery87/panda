import type { ChatMode } from '@/lib/agent/prompt-library'

export const WORKFLOW_STAGES = [
  'intake',
  'clarify',
  'research',
  'explore',
  'design',
  'plan',
  'implement',
  'validate',
  'review',
  'handoff',
] as const

export type WorkflowStage = (typeof WORKFLOW_STAGES)[number]

export const MODE_ALLOWED_WORKFLOW_STAGES: Record<ChatMode, WorkflowStage[]> = {
  ask: ['intake', 'clarify', 'research', 'explore'],
  plan: ['clarify', 'research', 'explore', 'design', 'plan'],
  code: ['implement', 'validate', 'review'],
  build: ['implement', 'validate', 'review', 'handoff'],
}

const DEFAULT_STAGE_BY_MODE: Record<ChatMode, WorkflowStage> = {
  ask: 'research',
  plan: 'plan',
  code: 'implement',
  build: 'implement',
}

export function isWorkflowStage(value: unknown): value is WorkflowStage {
  return typeof value === 'string' && (WORKFLOW_STAGES as readonly string[]).includes(value)
}

export function isStageAllowedForMode(mode: ChatMode, stage: WorkflowStage): boolean {
  return MODE_ALLOWED_WORKFLOW_STAGES[mode].includes(stage)
}

export function resolveWorkflowStage(args: {
  mode: ChatMode
  requestedStage?: WorkflowStage | string | null
}): WorkflowStage {
  if (isWorkflowStage(args.requestedStage) && isStageAllowedForMode(args.mode, args.requestedStage)) {
    return args.requestedStage
  }
  return DEFAULT_STAGE_BY_MODE[args.mode]
}

export function describeWorkflowStage(stage: WorkflowStage): string {
  switch (stage) {
    case 'intake':
      return 'Capture the user intent and success criteria.'
    case 'clarify':
      return 'Ask focused questions before making assumptions.'
    case 'research':
      return 'Gather codebase or external context without changing files.'
    case 'explore':
      return 'Compare viable approaches and trade-offs.'
    case 'design':
      return 'Define architecture and integration boundaries.'
    case 'plan':
      return 'Produce an implementation-ready plan.'
    case 'implement':
      return 'Apply approved changes through Panda tools.'
    case 'validate':
      return 'Verify changes with receipts, commands, and checks.'
    case 'review':
      return 'Review diffs, claims, and risks before completion.'
    case 'handoff':
      return 'Summarize state for a future session.'
  }
}
