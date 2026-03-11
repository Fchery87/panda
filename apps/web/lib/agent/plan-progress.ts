function normalizePlanText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[`*_#:-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenizePlanText(value: string): string[] {
  return normalizePlanText(value)
    .split(' ')
    .map((token) => token.replace(/(ed|ing|es|s)$/i, ''))
    .filter((token) => token.length >= 4)
}

function hasMeaningfulTokenOverlap(a: string, b: string): boolean {
  const aTokens = tokenizePlanText(a)
  const bTokens = new Set(tokenizePlanText(b))
  return aTokens.filter((token) => bTokens.has(token)).length >= 2
}

export interface PlanProgressMetadata {
  planStepIndex?: number
  planStepTitle?: string
  planTotalSteps: number
  completedPlanStepIndexes: number[]
}

export function parsePlanSteps(planDraft: string | null | undefined): string[] {
  const content = planDraft?.trim()
  if (!content) return []

  const implementationMatch = content.match(/##\s+Implementation Plan\s*\n([\s\S]*?)(?:\n##\s+|$)/i)
  const section = implementationMatch?.[1] ?? content

  return section
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^\d+\.\s+/.test(line))
    .map((line) => line.replace(/^\d+\.\s+/, '').trim())
    .filter(Boolean)
}

function findMatchingPlanStepIndex(
  planSteps: string[],
  progressContent: string,
  completedStepIndexes: number[]
): number {
  const normalizedProgress = normalizePlanText(progressContent)
  if (!normalizedProgress) return -1

  const candidateIndexes = planSteps
    .map((step, index) => ({ step, index }))
    .filter(({ index }) => !completedStepIndexes.includes(index))

  const exactCandidate = candidateIndexes.find(({ step }) => {
    const normalizedPlanStep = normalizePlanText(step)
    return (
      normalizedProgress.includes(normalizedPlanStep) ||
      normalizedPlanStep.includes(normalizedProgress) ||
      hasMeaningfulTokenOverlap(normalizedProgress, normalizedPlanStep)
    )
  })

  return exactCandidate?.index ?? -1
}

export function derivePlanProgressMetadata(
  planSteps: string[],
  progressContent: string,
  progressStatus: 'running' | 'completed' | 'error',
  completedStepIndexes: number[]
): PlanProgressMetadata | null {
  if (planSteps.length === 0) return null

  const matchedStepIndex = findMatchingPlanStepIndex(
    planSteps,
    progressContent,
    completedStepIndexes
  )
  const nextCompletedStepIndexes =
    matchedStepIndex >= 0 && progressStatus === 'completed'
      ? [...new Set([...completedStepIndexes, matchedStepIndex])].sort((a, b) => a - b)
      : completedStepIndexes.slice().sort((a, b) => a - b)

  return {
    ...(matchedStepIndex >= 0
      ? {
          planStepIndex: matchedStepIndex,
          planStepTitle: planSteps[matchedStepIndex],
        }
      : {}),
    planTotalSteps: planSteps.length,
    completedPlanStepIndexes: nextCompletedStepIndexes,
  }
}
