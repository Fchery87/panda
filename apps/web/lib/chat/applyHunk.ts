// apps/web/lib/chat/applyHunk.ts
import type { GitDiffHunk } from './parseGitDiff'

/**
 * Applies a single hunk to the given file content.
 * Returns the modified content.
 */
export function applyHunk(content: string, hunk: GitDiffHunk): string {
  const lines = content.split('\n')
  // oldStart is 1-indexed
  const startIdx = hunk.oldStart - 1

  // Remove old lines, insert new lines
  const oldLines = hunk.lines
    .filter((l) => l.type === 'remove' || l.type === 'context')
    .map((l) => l.content)
  const newLines = hunk.lines
    .filter((l) => l.type === 'add' || l.type === 'context')
    .map((l) => l.content)

  lines.splice(startIdx, oldLines.length, ...newLines)
  return lines.join('\n')
}
