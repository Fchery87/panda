/**
 * File Relevance Scorer
 *
 * Ranks files by relevance to the current user query and context.
 */

export interface FileToRank {
  path: string
  content?: string
  updatedAt?: number
}

export interface ScoredFile extends FileToRank {
  score: number
  scores: {
    mentionedInMessage: number
    openInTab: number
    recentlyModified: number
    structuralImportance: number
  }
}

export interface RankFilesOptions {
  files: FileToRank[]
  userMessage?: string
  openTabs?: string[]
  recentThresholdMinutes?: number
}

// Scoring weights
const WEIGHTS = {
  mentionedInMessage: 0.4,
  openInTab: 0.25,
  recentlyModified: 0.2,
  structuralImportance: 0.15,
}

/**
 * Rank files by relevance to user context
 */
export function rankFiles(options: RankFilesOptions): ScoredFile[] {
  const { files, userMessage, openTabs = [], recentThresholdMinutes = 30 } = options
  const now = Date.now()
  const recentThresholdMs = recentThresholdMinutes * 60 * 1000

  const scored = files.map((file) => {
    const scores = {
      mentionedInMessage: scoreMentionedInMessage(file, userMessage),
      openInTab: scoreOpenInTab(file, openTabs),
      recentlyModified: scoreRecentlyModified(file, now, recentThresholdMs),
      structuralImportance: scoreStructuralImportance(file),
    }

    const totalScore =
      scores.mentionedInMessage * WEIGHTS.mentionedInMessage +
      scores.openInTab * WEIGHTS.openInTab +
      scores.recentlyModified * WEIGHTS.recentlyModified +
      scores.structuralImportance * WEIGHTS.structuralImportance

    return {
      ...file,
      score: totalScore,
      scores,
    }
  })

  return scored.sort((a, b) => b.score - a.score)
}

/**
 * Apply token budget to ranked files
 * Returns files with content level indicators
 */
export function applyBudget(
  rankedFiles: ScoredFile[],
  tokenBudget: number,
  options?: {
    fullContentLimit?: number
    signatureLimit?: number
  }
): Array<{
  path: string
  content?: string
  contentLevel: 'full' | 'signature' | 'path'
  score: number
}> {
  const fullContentLimit =
    options?.fullContentLimit ?? Math.max(5, Math.floor(rankedFiles.length * 0.1))
  const signatureLimit =
    options?.signatureLimit ?? Math.max(15, Math.floor(rankedFiles.length * 0.3))

  return rankedFiles.map((file, index) => {
    if (index < fullContentLimit && file.content) {
      return {
        path: file.path,
        content: file.content,
        contentLevel: 'full' as const,
        score: file.score,
      }
    } else if (index < signatureLimit && file.content) {
      return {
        path: file.path,
        content: extractSignatures(file.content),
        contentLevel: 'signature' as const,
        score: file.score,
      }
    } else {
      return {
        path: file.path,
        contentLevel: 'path' as const,
        score: file.score,
      }
    }
  })
}

/**
 * Score: File path appears in user message
 */
function scoreMentionedInMessage(file: FileToRank, userMessage?: string): number {
  if (!userMessage) return 0

  const normalizedMessage = userMessage.toLowerCase()
  const normalizedPath = file.path.toLowerCase()
  const filename = normalizedPath.split('/').pop() || ''

  // Direct path mention
  if (normalizedMessage.includes(normalizedPath)) return 1.0

  // Filename mention
  if (normalizedMessage.includes(filename)) return 0.9

  // Filename without extension
  const basename = filename.replace(/\.[^/.]+$/, '')
  if (basename && normalizedMessage.includes(basename)) return 0.8

  // Partial path match (directory mentioned)
  const parts = normalizedPath.split('/')
  for (const part of parts) {
    if (part.length > 2 && normalizedMessage.includes(part)) {
      return 0.5
    }
  }

  return 0
}

/**
 * Score: File is open in a workbench tab
 */
function scoreOpenInTab(file: FileToRank, openTabs: string[]): number {
  return openTabs.some((tab) => tab.toLowerCase() === file.path.toLowerCase()) ? 1.0 : 0
}

/**
 * Score: File was recently modified
 */
function scoreRecentlyModified(file: FileToRank, now: number, thresholdMs: number): number {
  if (!file.updatedAt) return 0

  const ageMs = now - file.updatedAt
  if (ageMs > thresholdMs) return 0

  // Linear decay: 1.0 at time 0, 0.0 at threshold
  return 1.0 - ageMs / thresholdMs
}

/**
 * Score: File has structural importance (root level, config, entry points)
 */
function scoreStructuralImportance(file: FileToRank): number {
  const path = file.path.toLowerCase()
  const filename = path.split('/').pop() || ''
  const depth = path.split('/').length - 1

  let score = 0

  // Root-level files
  if (depth === 0) score += 0.3

  // Config files
  const configPatterns = [
    /^package\.json$/,
    /^tsconfig\.json$/,
    /^next\.config\./,
    /^vite\.config\./,
    /^tailwind\.config\./,
    /^jest\.config\./,
    /^\.env/,
    /^dockerfile$/i,
    /^docker-compose/,
  ]
  if (configPatterns.some((pattern) => pattern.test(filename))) {
    score += 0.4
  }

  // Entry points
  const entryPatterns = [
    /^index\.(ts|tsx|js|jsx|py|rs|go)$/,
    /^main\.(ts|tsx|js|jsx|py|rs|go)$/,
    /^app\.(ts|tsx|js|jsx|py|rs|go)$/,
    /^server\.(ts|tsx|js|jsx|py|rs|go)$/,
    /^cli\.(ts|tsx|js|jsx|py|rs|go)$/,
  ]
  if (entryPatterns.some((pattern) => pattern.test(filename))) {
    score += 0.3
  }

  return Math.min(score, 1.0)
}

/**
 * Extract function/class signatures from code
 */
function extractSignatures(content: string): string | undefined {
  const signatures: string[] = []

  // Match exported functions
  const functionMatches = content.match(/^(export\s+)?(async\s+)?function\s+\w+\s*\([^)]*\)/gm)
  if (functionMatches) {
    signatures.push(...functionMatches.slice(0, 5))
  }

  // Match arrow function exports
  const arrowMatches = content.match(
    /^(export\s+)?(const|let|var)\s+\w+\s*=\s*(async\s*)?\([^)]*\)\s*=>/gm
  )
  if (arrowMatches) {
    signatures.push(...arrowMatches.slice(0, 5))
  }

  // Match class declarations
  const classMatches = content.match(/^(export\s+)?class\s+\w+/gm)
  if (classMatches) {
    signatures.push(...classMatches.slice(0, 3))
  }

  // Match interface/type declarations
  const typeMatches = content.match(/^(export\s+)?(interface|type)\s+\w+/gm)
  if (typeMatches) {
    signatures.push(...typeMatches.slice(0, 3))
  }

  return signatures.length > 0 ? signatures.join('\n') : undefined
}
