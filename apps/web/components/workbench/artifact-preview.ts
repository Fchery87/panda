import type { ArtifactAction, ArtifactRecordStatus } from '@/lib/artifacts/executeArtifact'
import type { DiffFileEntry } from './DiffTab'

type PreviewArtifactRecord = {
  _id: string
  actions: ArtifactAction[]
  status: ArtifactRecordStatus
  createdAt: number
}

export type WorkspaceArtifactPreview = {
  artifactId: string
  filePath: string
  originalContent: string
  pendingContent: string
  status: Extract<ArtifactRecordStatus, 'pending' | 'in_progress'>
  createdAt: number
}

export function deriveWorkspaceArtifactPreviews(
  records: PreviewArtifactRecord[]
): WorkspaceArtifactPreview[] {
  return records
    .flatMap((record) => {
      if (record.status !== 'pending' && record.status !== 'in_progress') {
        return []
      }

      const action = record.actions[0]
      if (!action || action.type !== 'file_write') {
        return []
      }

      return [
        {
          artifactId: record._id,
          createdAt: record.createdAt,
          filePath: action.payload.filePath,
          originalContent: action.payload.originalContent ?? '',
          pendingContent: action.payload.content,
          status: record.status,
        },
      ]
    })
    .sort((left, right) => right.createdAt - left.createdAt)
}

const DIFF_CONTEXT_LINES = 3

type DiffOperation =
  | { type: 'equal'; line: string; oldLine: number; newLine: number }
  | { type: 'remove'; line: string; oldLine: number; newLine: number }
  | { type: 'add'; line: string; oldLine: number; newLine: number }

function splitLines(content: string): string[] {
  return content.split('\n')
}

function buildLineOperations(originalLines: string[], pendingLines: string[]): DiffOperation[] {
  const rows = originalLines.length
  const columns = pendingLines.length
  const table: number[][] = Array.from({ length: rows + 1 }, () => Array(columns + 1).fill(0))

  for (let row = rows - 1; row >= 0; row -= 1) {
    for (let column = columns - 1; column >= 0; column -= 1) {
      table[row]![column] =
        originalLines[row] === pendingLines[column]
          ? table[row + 1]![column + 1]! + 1
          : Math.max(table[row + 1]![column]!, table[row]![column + 1]!)
    }
  }

  const operations: DiffOperation[] = []
  let oldIndex = 0
  let newIndex = 0

  while (oldIndex < rows && newIndex < columns) {
    if (originalLines[oldIndex] === pendingLines[newIndex]) {
      operations.push({
        type: 'equal',
        line: originalLines[oldIndex]!,
        oldLine: oldIndex + 1,
        newLine: newIndex + 1,
      })
      oldIndex += 1
      newIndex += 1
    } else if (table[oldIndex + 1]![newIndex]! >= table[oldIndex]![newIndex + 1]!) {
      operations.push({
        type: 'remove',
        line: originalLines[oldIndex]!,
        oldLine: oldIndex + 1,
        newLine: newIndex + 1,
      })
      oldIndex += 1
    } else {
      operations.push({
        type: 'add',
        line: pendingLines[newIndex]!,
        oldLine: oldIndex + 1,
        newLine: newIndex + 1,
      })
      newIndex += 1
    }
  }

  while (oldIndex < rows) {
    operations.push({
      type: 'remove',
      line: originalLines[oldIndex]!,
      oldLine: oldIndex + 1,
      newLine: newIndex + 1,
    })
    oldIndex += 1
  }

  while (newIndex < columns) {
    operations.push({
      type: 'add',
      line: pendingLines[newIndex]!,
      oldLine: oldIndex + 1,
      newLine: newIndex + 1,
    })
    newIndex += 1
  }

  return operations
}

function deriveFocusedHunks(preview: WorkspaceArtifactPreview): DiffFileEntry['hunks'] {
  const originalLines = splitLines(preview.originalContent)
  const pendingLines = splitLines(preview.pendingContent)

  if (!preview.originalContent) {
    return [
      {
        id: preview.artifactId,
        startLine: 1,
        endLine: Math.max(1, pendingLines.length),
        added: pendingLines,
        removed: [],
        context: [],
        status: 'pending',
      },
    ]
  }

  const operations = buildLineOperations(originalLines, pendingLines)
  const changeIndexes = operations
    .map((operation, index) => (operation.type === 'equal' ? -1 : index))
    .filter((index) => index >= 0)

  if (changeIndexes.length === 0) {
    return []
  }

  const ranges: Array<{ start: number; end: number }> = []
  for (const index of changeIndexes) {
    const start = Math.max(0, index - DIFF_CONTEXT_LINES)
    const end = Math.min(operations.length - 1, index + DIFF_CONTEXT_LINES)
    const previous = ranges.at(-1)
    if (previous && start <= previous.end + 1) {
      previous.end = Math.max(previous.end, end)
    } else {
      ranges.push({ start, end })
    }
  }

  return ranges.map((range, rangeIndex) => {
    const slice = operations.slice(range.start, range.end + 1)
    const changed = slice.filter((operation) => operation.type !== 'equal')
    const firstChanged = changed[0]
    const lastChanged = changed.at(-1)

    return {
      id: `${preview.artifactId}:${rangeIndex}`,
      startLine: firstChanged?.newLine ?? slice[0]?.newLine ?? 1,
      endLine: lastChanged?.newLine ?? slice.at(-1)?.newLine ?? 1,
      added: slice.filter((operation) => operation.type === 'add').map((operation) => operation.line),
      removed: slice
        .filter((operation) => operation.type === 'remove')
        .map((operation) => operation.line),
      context: slice
        .filter((operation) => operation.type === 'equal')
        .map((operation) => operation.line),
      status: 'pending',
    }
  })
}

export function derivePreviewDiffEntries(previews: WorkspaceArtifactPreview[]): DiffFileEntry[] {
  return previews.map((preview) => ({
    artifactId: preview.artifactId,
    path: preview.filePath,
    status: preview.originalContent ? 'modified' : 'added',
    reviewStatus: 'pending',
    hunks: deriveFocusedHunks(preview),
  }))
}
