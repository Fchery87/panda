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
