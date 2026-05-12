import { buildDefaultPlanningQuestions } from './question-engine'
import type { PlanningQuestion } from './types'

export type PlanningIntakeSeedSource = 'github_issue' | 'manual'

export interface PlanningIntakeSeed {
  source: PlanningIntakeSeedSource
  taskSummary: string
}

export function createPlanningIntakeSeed(rawValue: string): PlanningIntakeSeed | null {
  const taskSummary = rawValue.trim()
  if (!taskSummary) return null

  const source = /github\.com\/[^\s/]+\/[^\s/]+\/issues\/\d+/iu.test(taskSummary)
    ? 'github_issue'
    : 'manual'

  return { source, taskSummary }
}

export function buildPlanningIntakeQuestions(args: {
  seed: PlanningIntakeSeed | null
  fallbackQuestions: PlanningQuestion[]
}): PlanningQuestion[] {
  if (!args.seed) return args.fallbackQuestions

  return buildDefaultPlanningQuestions({ taskSummary: args.seed.taskSummary })
}

export function buildPlanningIntakeMessage(seed: PlanningIntakeSeed | null): string {
  if (!seed) return 'Start planning intake'

  const sourceLabel = seed.source === 'github_issue' ? 'GitHub issue' : 'manual task'
  return `Start planning intake from ${sourceLabel}: ${seed.taskSummary}`
}
