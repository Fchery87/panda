import { applyBudget, rankFiles, type FileToRank } from './file-ranker'

interface PlanContextOptions {
  files: FileToRank[]
  userMessage: string
  openTabs?: string[]
}

function scorePlanningPath(path: string): number {
  const normalized = path.toLowerCase()

  if (
    normalized.includes('/app/') ||
    normalized.includes('/pages/') ||
    normalized.includes('schema') ||
    normalized.includes('/api/') ||
    normalized.includes('/components/') ||
    normalized.includes('/hooks/') ||
    normalized.includes('/e2e/') ||
    normalized.endsWith('.test.ts') ||
    normalized.endsWith('.spec.ts')
  ) {
    return 1
  }

  if (normalized.includes('/lib/') || normalized.includes('/convex/')) {
    return 0.6
  }

  return 0
}

export function buildPlanContext({
  files,
  userMessage,
  openTabs = [],
}: PlanContextOptions): string | null {
  if (!userMessage.trim() || files.length === 0) return null

  const ranked = rankFiles({ files, userMessage, openTabs }).map((file) => ({
    ...file,
    planningPathScore: scorePlanningPath(file.path),
    boostedScore: file.score + scorePlanningPath(file.path) * 0.35,
  }))

  const prioritized = [...ranked]
    .sort((a, b) => b.boostedScore - a.boostedScore)
    .filter(
      (file) =>
        file.planningPathScore > 0 ||
        file.scores.mentionedInMessage > 0 ||
        file.scores.openInTab > 0 ||
        file.scores.recentlyModified > 0
    )

  if (prioritized.length === 0) return null

  const budgeted = applyBudget(
    prioritized.map((file) => ({
      path: file.path,
      content: file.content,
      score: file.boostedScore,
      scores: file.scores,
      updatedAt: file.updatedAt,
    })),
    1200,
    {
      fullContentLimit: 2,
      signatureLimit: 6,
    }
  ).slice(0, 6)

  const lines = ['## Likely Relevant Files']

  for (const file of budgeted) {
    if (file.contentLevel === 'path') {
      lines.push(`- ${file.path}`)
      continue
    }

    lines.push(`- ${file.path}`)
    if (file.content) {
      lines.push('```')
      lines.push(file.content)
      lines.push('```')
    }
  }

  return lines.join('\n')
}
