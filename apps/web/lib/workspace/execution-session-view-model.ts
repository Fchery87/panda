import type { RuntimeAvailability } from './runtime-availability'

export type ExecutionSessionPhase =
  | 'idle'
  | 'planning'
  | 'approval'
  | 'ready_to_build'
  | 'executing'
  | 'review'
  | 'complete'
  | 'blocked'

export type ExecutionSessionTone = 'neutral' | 'progress' | 'attention' | 'success'

export type ExecutionSessionNextActionId =
  | 'continue_planning'
  | 'review_plan'
  | 'build_from_plan'
  | 'open_run'
  | 'review_changes'
  | 'open_preview'
  | 'start_session'

export interface ExecutionSessionAction {
  id: ExecutionSessionNextActionId
  label: string
}

export interface ExecutionSessionChangedWorkSummary {
  count: number
  label: string
  needsReview: boolean
}

export interface ExecutionSessionProofSummary {
  label: string
  detail: string
  hasActiveRun: boolean
}

export interface ExecutionSessionPreviewSummary {
  label: string
  available: boolean
  detail: string
}

export interface ExecutionSessionBranchSummary {
  running: number
  blocked: number
  complete: number
  label: string
  outcomes: ExecutionSessionBranchOutcome[]
}

export interface ExecutionSessionBranchOutcome {
  label: string
  status: 'queued' | 'running' | 'blocked' | 'complete' | 'failed'
  outcome: string
}

export interface ExecutionSessionViewModel {
  phase: ExecutionSessionPhase
  title: string
  statusLabel: string
  tone: ExecutionSessionTone
  summary: string
  nextStep: string
  primaryAction?: ExecutionSessionAction
  secondaryAction?: ExecutionSessionAction
  changedWork: ExecutionSessionChangedWorkSummary
  proof: ExecutionSessionProofSummary
  preview: ExecutionSessionPreviewSummary
  branches: ExecutionSessionBranchSummary
}

export interface ExecutionSessionViewModelInput {
  chatTitle?: string | null
  latestUserPrompt?: string | null
  planningQuestion?: { prompt: string } | null
  generatedPlan?: { title?: string | null } | null
  canApprovePlan: boolean
  canBuildPlan: boolean
  isExecuting: boolean
  latestRunStep?: string | null
  changedFilesCount: number
  runtimeAvailability: RuntimeAvailability
  parallelBranches?: Array<{ status: 'queued' | 'running' | 'blocked' | 'complete' | 'failed' }>
}

export function buildExecutionSessionViewModel(
  input: ExecutionSessionViewModelInput
): ExecutionSessionViewModel | null {
  const changedWork = summarizeChangedWork(input.changedFilesCount)
  const proof = summarizeProof(input)
  const preview = summarizePreview(input.runtimeAvailability)
  const branches = summarizeBranches(input.parallelBranches ?? [])

  if (input.isExecuting) {
    return {
      phase: 'executing',
      title: resolveTitle(input, 'Executing current session'),
      statusLabel: 'Executing',
      tone: 'progress',
      summary: input.latestRunStep?.trim() || 'Panda is working through this execution session.',
      nextStep: 'Monitor progress, inspect proof, or stop the run if it needs intervention.',
      primaryAction: { id: 'open_run', label: 'Open Run' },
      changedWork,
      proof,
      preview,
      branches,
    }
  }

  if (input.planningQuestion) {
    return {
      phase: 'planning',
      title: resolveTitle(input, 'Define the execution session'),
      statusLabel: 'Planning intake',
      tone: 'attention',
      summary: input.planningQuestion.prompt,
      nextStep: 'Answer the next planning question so Panda can draft a grounded plan.',
      primaryAction: { id: 'continue_planning', label: 'Continue Planning' },
      changedWork,
      proof,
      preview,
      branches,
    }
  }

  if (input.canApprovePlan && input.generatedPlan) {
    return {
      phase: 'approval',
      title: input.generatedPlan.title?.trim() || resolveTitle(input, 'Review generated plan'),
      statusLabel: 'Plan ready',
      tone: 'attention',
      summary: 'A generated plan is ready to review before execution starts.',
      nextStep: 'Review scope and risks, then approve the plan when it matches the goal.',
      primaryAction: { id: 'review_plan', label: 'Review Plan' },
      changedWork,
      proof,
      preview,
      branches,
    }
  }

  if (input.canBuildPlan && input.generatedPlan) {
    return {
      phase: 'ready_to_build',
      title: input.generatedPlan.title?.trim() || resolveTitle(input, 'Build approved plan'),
      statusLabel: 'Ready to build',
      tone: 'progress',
      summary: 'The approved plan is ready to execute in this session.',
      nextStep: 'Start the build when you are ready for Panda to make changes.',
      primaryAction: { id: 'build_from_plan', label: 'Build from Plan' },
      secondaryAction: { id: 'review_plan', label: 'Open Plan' },
      changedWork,
      proof,
      preview,
      branches,
    }
  }

  if (input.changedFilesCount > 0) {
    return {
      phase: 'review',
      title: resolveTitle(input, 'Review session changes'),
      statusLabel: 'Changes ready',
      tone: 'success',
      summary: changedWork.label,
      nextStep: 'Inspect the changed work and proof before continuing or finishing this session.',
      primaryAction: { id: 'review_changes', label: 'Inspect Changes' },
      changedWork,
      proof,
      preview,
      branches,
    }
  }

  return null
}

function resolveTitle(input: ExecutionSessionViewModelInput, fallback: string) {
  return (
    input.latestUserPrompt?.trim() ||
    input.chatTitle?.trim() ||
    input.generatedPlan?.title?.trim() ||
    fallback
  )
}

function summarizeChangedWork(count: number): ExecutionSessionChangedWorkSummary {
  if (count <= 0) {
    return { count: 0, label: 'No changed files in this session yet.', needsReview: false }
  }

  return {
    count,
    label: `${count} changed file${count === 1 ? '' : 's'} ready for review.`,
    needsReview: true,
  }
}

function summarizeProof(input: ExecutionSessionViewModelInput): ExecutionSessionProofSummary {
  if (input.isExecuting) {
    return {
      label: 'Run active',
      detail: input.latestRunStep?.trim() || 'Execution evidence is being collected.',
      hasActiveRun: true,
    }
  }

  if (input.changedFilesCount > 0) {
    return {
      label: 'Proof ready',
      detail: 'Review run evidence, receipts, and validation before continuing.',
      hasActiveRun: false,
    }
  }

  return {
    label: 'No run proof yet',
    detail: 'Proof appears after Panda executes work in this session.',
    hasActiveRun: false,
  }
}

function summarizePreview(runtime: RuntimeAvailability): ExecutionSessionPreviewSummary {
  if (runtime.canUseBrowserRuntime) {
    return {
      label: 'Browser runtime ready',
      available: true,
      detail: 'Preview can use the browser runtime for this session.',
    }
  }

  return {
    label: runtime.label,
    available: runtime.canUseServerFallback,
    detail: runtime.detail || 'Server fallback remains available for execution.',
  }
}

function summarizeBranches(
  branches: Array<{
    label?: string | null
    status: 'queued' | 'running' | 'blocked' | 'complete' | 'failed'
    outcome?: string | null
  }>
): ExecutionSessionBranchSummary {
  const running = branches.filter(
    (branch) => branch.status === 'running' || branch.status === 'queued'
  ).length
  const blocked = branches.filter(
    (branch) => branch.status === 'blocked' || branch.status === 'failed'
  ).length
  const complete = branches.filter((branch) => branch.status === 'complete').length

  if (branches.length === 0) {
    return {
      running: 0,
      blocked: 0,
      complete: 0,
      label: 'No parallel branches active.',
      outcomes: [],
    }
  }

  return {
    running,
    blocked,
    complete,
    label: `${running} running, ${blocked} blocked, ${complete} complete.`,
    outcomes: branches.map((branch, index) => ({
      label: branch.label?.trim() || `Branch ${index + 1}`,
      status: branch.status,
      outcome: branch.outcome?.trim() || defaultBranchOutcome(branch.status),
    })),
  }
}

function defaultBranchOutcome(
  status: 'queued' | 'running' | 'blocked' | 'complete' | 'failed'
): string {
  if (status === 'queued') return 'Branch is queued.'
  if (status === 'running') return 'Branch still running.'
  if (status === 'blocked') return 'Branch needs attention.'
  if (status === 'failed') return 'Branch needs repair.'
  return 'Branch completed.'
}
