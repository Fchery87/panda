import type { WorkflowStage } from './stages'

export type WorkflowChainStepProgress = {
  id: string
  stage: WorkflowStage
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  artifactId?: string
  startedAt?: number
  completedAt?: number
}

export type WorkflowChainProgress = {
  steps: WorkflowChainStepProgress[]
  currentStepId?: string
  status: 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'
  completedAt?: number
}

export function advanceWorkflowChainForArtifact(args: {
  chain: WorkflowChainProgress
  sourceStage: WorkflowStage
  artifactId: string
  now: number
}): WorkflowChainProgress {
  let advanced = false
  const steps = args.chain.steps.map((step) => {
    if (advanced) return step
    if (step.stage !== args.sourceStage) return step
    if (step.status !== 'pending' && step.status !== 'running') return step
    advanced = true
    return {
      ...step,
      status: 'completed' as const,
      artifactId: args.artifactId,
      startedAt: step.startedAt ?? args.now,
      completedAt: args.now,
    }
  })

  if (!advanced) return args.chain

  const next = steps.find((step) => step.status === 'pending')
  const allDone = steps.every((step) => step.status === 'completed' || step.status === 'skipped')
  return {
    ...args.chain,
    steps,
    currentStepId: next?.id,
    status: allDone ? 'completed' : args.chain.status,
    ...(allDone ? { completedAt: args.now } : {}),
  }
}
