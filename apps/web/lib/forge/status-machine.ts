import type { ForgePhase, ForgeTaskRecord, ForgeTaskStatus } from './types'

export const FORGE_TASK_TRANSITIONS: Record<ForgeTaskStatus, ForgeTaskStatus[]> = {
  draft: ['planned'],
  planned: ['ready'],
  ready: ['in_progress'],
  in_progress: ['blocked', 'in_review'],
  blocked: ['ready'],
  in_review: ['qa_pending', 'rejected'],
  qa_pending: ['done', 'rejected'],
  done: [],
  rejected: ['ready'],
}

export const FORGE_PHASE_TRANSITIONS: Record<ForgePhase, ForgePhase[]> = {
  intake: ['plan'],
  plan: ['execute'],
  execute: ['review'],
  review: ['qa'],
  qa: ['ship'],
  ship: ['execute'],
}

export function canTransitionForgeTask(from: ForgeTaskStatus, to: ForgeTaskStatus): boolean {
  return FORGE_TASK_TRANSITIONS[from]?.includes(to) ?? false
}

export function canTransitionForgePhase(from: ForgePhase, to: ForgePhase): boolean {
  return FORGE_PHASE_TRANSITIONS[from]?.includes(to) ?? false
}

export function assertTaskReadyForTransition(task: ForgeTaskRecord, to: ForgeTaskStatus): void {
  if (!canTransitionForgeTask(task.status, to) && task.status !== to) {
    throw new Error(`Invalid forge task transition from ${task.status} to ${to}`)
  }

  if (to === 'ready') {
    if (task.acceptanceCriteria.length === 0) {
      throw new Error('Forge task requires acceptance criteria before entering ready')
    }
    if (task.testRequirements.length === 0) {
      throw new Error('Forge task requires test requirements before entering ready')
    }
    if (task.reviewRequirements.length === 0) {
      throw new Error('Forge task requires review requirements before entering ready')
    }
    if (task.qaRequirements.length === 0) {
      throw new Error('Forge task requires QA requirements before entering ready')
    }
  }
}
