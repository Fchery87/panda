/**
 * Simple line-by-line diff algorithm
 * Compares two strings line by line and returns the differences
 */

export interface DiffLine {
  type: 'unchanged' | 'added' | 'removed'
  oldLine: number | null
  newLine: number | null
  content: string
}

/**
 * Compute the diff between two content strings
 * Uses a simple line-by-line comparison algorithm
 * @param oldContent - The original content
 * @param newContent - The new content
 * @returns Array of DiffLine objects representing the differences
 */
export function computeDiff(oldContent: string, newContent: string): DiffLine[] {
  const oldLines = oldContent.split('\n')
  const newLines = newContent.split('\n')
  const result: DiffLine[] = []

  let oldIndex = 0
  let newIndex = 0

  while (oldIndex < oldLines.length || newIndex < newLines.length) {
    const oldLine = oldLines[oldIndex]
    const newLine = newLines[newIndex]

    // Both lines exist and match
    if (oldIndex < oldLines.length && newIndex < newLines.length && oldLine === newLine) {
      result.push({
        type: 'unchanged',
        oldLine: oldIndex + 1,
        newLine: newIndex + 1,
        content: oldLine,
      })
      oldIndex++
      newIndex++
    }
    // Line was removed (exists in old but not in new, or different)
    else if (oldIndex < oldLines.length && (newIndex >= newLines.length || oldLine !== newLine)) {
      // Check if this line appears later in new (would be a move, treat as removal + addition)
      const newIndexOfOld = newLines.slice(newIndex).indexOf(oldLine)

      if (newIndexOfOld === -1 || newIndexOfOld > 5) {
        // Line not found in new (or too far), mark as removed
        result.push({
          type: 'removed',
          oldLine: oldIndex + 1,
          newLine: null,
          content: oldLine,
        })
        oldIndex++
      } else {
        // Found later, add the intervening new lines first
        for (let i = 0; i < newIndexOfOld; i++) {
          result.push({
            type: 'added',
            oldLine: null,
            newLine: newIndex + i + 1,
            content: newLines[newIndex + i],
          })
        }
        newIndex += newIndexOfOld
      }
    }
    // Line was added (exists in new but not in old)
    else if (newIndex < newLines.length) {
      result.push({
        type: 'added',
        oldLine: null,
        newLine: newIndex + 1,
        content: newLine,
      })
      newIndex++
    }
  }

  return result
}

/**
 * Compute a side-by-side diff representation
 * Returns two arrays representing the left (old) and right (new) sides
 * This is useful for side-by-side diff viewers
 */
export function computeSideBySideDiff(
  oldContent: string,
  newContent: string
): { left: DiffLine[]; right: DiffLine[] } {
  const diff = computeDiff(oldContent, newContent)
  const left: DiffLine[] = []
  const right: DiffLine[] = []

  for (const line of diff) {
    if (line.type === 'unchanged') {
      left.push(line)
      right.push(line)
    } else if (line.type === 'removed') {
      left.push(line)
      // Add a spacer on the right side
      right.push({
        type: 'unchanged',
        oldLine: null,
        newLine: null,
        content: '',
      })
    } else if (line.type === 'added') {
      // Add a spacer on the left side
      left.push({
        type: 'unchanged',
        oldLine: null,
        newLine: null,
        content: '',
      })
      right.push(line)
    }
  }

  return { left, right }
}
