import type { ChatMode } from '@/lib/agent/prompt-library'

export type DeliveryActivationInput = {
  mode: ChatMode
  content: string
  approvedPlanExecution?: boolean
}

type DeliveryTaskSeed = {
  title: string
  description: string
  rationale: string
  ownerRole: 'manager'
  status: 'in_progress'
  acceptanceCriteria: Array<{
    id: string
    text: string
    status: 'pending'
    verificationMethod: 'review'
  }>
}

type DeliveryLifecycleUpdate = {
  phase: 'execute' | 'review' | 'qa' | 'ship'
  taskStatus: 'in_progress' | 'in_review' | 'blocked' | 'qa_pending' | 'done'
  summary: {
    activeTaskTitle: string | null
    currentPhaseSummary: string
  }
  shipDecision?: 'ready' | 'ready_with_risk' | null
}

const NON_TRIVIAL_PATTERNS = [
  /implement/i,
  /build/i,
  /debug/i,
  /fix/i,
  /refactor/i,
  /wire/i,
  /review/i,
  /qa/i,
  /panel/i,
]

export function shouldActivateStructuredDelivery(input: DeliveryActivationInput): boolean {
  if (input.approvedPlanExecution) return true
  if (input.mode === 'build') return true
  if (
    input.mode === 'code' &&
    NON_TRIVIAL_PATTERNS.some((pattern) => pattern.test(input.content))
  ) {
    return true
  }
  return false
}

function compactTaskTitle(content: string): string {
  const normalized = content.trim().replace(/\s+/g, ' ')
  if (normalized.length <= 48) return normalized

  const truncated = normalized.slice(0, 48)
  const lastSpace = truncated.lastIndexOf(' ')
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated).trimEnd()
}

export function deriveDeliveryTaskSeed(input: DeliveryActivationInput): DeliveryTaskSeed {
  const normalizedContent = input.content.trim().replace(/\s+/g, ' ')
  const title = compactTaskTitle(normalizedContent)

  return {
    title,
    description: normalizedContent,
    rationale: 'Manager activated structured delivery for non-trivial implementation work.',
    ownerRole: 'manager',
    status: 'in_progress',
    acceptanceCriteria: [
      {
        id: 'manager-activation',
        text: `${title} is tracked in the delivery control plane.`,
        status: 'pending',
        verificationMethod: 'review',
      },
    ],
  }
}

export function deriveLifecycleUpdatesForRunStart(args: {
  activeTaskTitle: string | null
}): DeliveryLifecycleUpdate {
  return {
    phase: 'execute',
    taskStatus: 'in_progress',
    summary: {
      activeTaskTitle: args.activeTaskTitle,
      currentPhaseSummary: args.activeTaskTitle
        ? `Execution in progress for ${args.activeTaskTitle}.`
        : 'Execution in progress for structured delivery work.',
    },
  }
}

export function deriveLifecycleUpdatesForRunCompletion(args: {
  outcome: 'completed' | 'failed' | 'stopped'
  activeTaskTitle: string | null
}): DeliveryLifecycleUpdate {
  if (args.outcome === 'completed') {
    return {
      phase: 'review',
      taskStatus: 'in_review',
      summary: {
        activeTaskTitle: args.activeTaskTitle,
        currentPhaseSummary: args.activeTaskTitle
          ? `${args.activeTaskTitle} is awaiting review.`
          : 'Latest structured delivery work is awaiting review.',
      },
    }
  }

  return {
    phase: 'execute',
    taskStatus: 'blocked',
    summary: {
      activeTaskTitle: args.activeTaskTitle,
      currentPhaseSummary: args.activeTaskTitle
        ? `${args.activeTaskTitle} needs follow-up before review.`
        : 'Structured delivery work needs follow-up before review.',
    },
  }
}

export function deriveFinalLifecycleUpdatesFromQa(args: {
  qaDecision: 'pass' | 'concerns' | 'fail'
  activeTaskTitle: string | null
}): DeliveryLifecycleUpdate {
  if (args.qaDecision === 'pass') {
    return {
      phase: 'ship',
      taskStatus: 'done',
      shipDecision: 'ready',
      summary: {
        activeTaskTitle: args.activeTaskTitle,
        currentPhaseSummary: args.activeTaskTitle
          ? `${args.activeTaskTitle} is verified and ready to ship.`
          : 'Structured delivery work is verified and ready to ship.',
      },
    }
  }

  return {
    phase: 'qa',
    taskStatus: 'qa_pending',
    shipDecision: null,
    summary: {
      activeTaskTitle: args.activeTaskTitle,
      currentPhaseSummary: args.activeTaskTitle
        ? `${args.activeTaskTitle} requires QA follow-up before ship.`
        : 'Structured delivery work requires QA follow-up before ship.',
    },
  }
}
