export interface GitDiffLine {
  type: 'add' | 'remove' | 'context'
  content: string
}

export interface GitDiffHunk {
  oldStart: number
  oldCount: number
  newStart: number
  newCount: number
  lines: GitDiffLine[]
}

export interface GitDiffFile {
  filePath: string
  hunks: GitDiffHunk[]
}

const HUNK_HEADER_RE = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/

export function parseGitDiff(diffText: string): GitDiffFile[] {
  if (!diffText || !diffText.trim()) return []

  const lines = diffText.split('\n')
  const files: GitDiffFile[] = []
  let currentFile: GitDiffFile | null = null
  let currentHunk: GitDiffHunk | null = null

  const pushHunk = () => {
    if (currentFile && currentHunk) {
      currentFile.hunks.push(currentHunk)
      currentHunk = null
    }
  }

  const pushFile = () => {
    pushHunk()
    if (currentFile) {
      files.push(currentFile)
      currentFile = null
    }
  }

  for (const line of lines) {
    // Start of a new file diff
    if (line.startsWith('diff --git ')) {
      pushFile()
      // Extract file path from "diff --git a/path b/path"
      const match = line.match(/^diff --git a\/.+ b\/(.+)$/)
      const filePath = match ? match[1] : line.slice('diff --git '.length)
      currentFile = { filePath, hunks: [] }
      continue
    }

    // Skip binary file notices
    if (line.startsWith('Binary files ')) {
      continue
    }

    // Skip --- and +++ header lines (they precede hunks)
    if (line.startsWith('--- ') || line.startsWith('+++ ')) {
      continue
    }

    // Skip index / mode lines
    if (
      line.startsWith('index ') ||
      line.startsWith('new file mode') ||
      line.startsWith('deleted file mode') ||
      line.startsWith('old mode') ||
      line.startsWith('new mode')
    ) {
      continue
    }

    // Hunk header
    const hunkMatch = HUNK_HEADER_RE.exec(line)
    if (hunkMatch) {
      pushHunk()
      if (!currentFile) {
        // Diff without a "diff --git" header — create a file entry
        currentFile = { filePath: 'unknown', hunks: [] }
      }
      currentHunk = {
        oldStart: parseInt(hunkMatch[1], 10),
        oldCount: hunkMatch[2] !== undefined ? parseInt(hunkMatch[2], 10) : 1,
        newStart: parseInt(hunkMatch[3], 10),
        newCount: hunkMatch[4] !== undefined ? parseInt(hunkMatch[4], 10) : 1,
        lines: [],
      }
      continue
    }

    if (!currentHunk) continue

    if (line.startsWith('+')) {
      currentHunk.lines.push({ type: 'add', content: line.slice(1) })
    } else if (line.startsWith('-')) {
      currentHunk.lines.push({ type: 'remove', content: line.slice(1) })
    } else if (line.startsWith(' ') || line === '') {
      currentHunk.lines.push({ type: 'context', content: line.slice(1) })
    }
    // else: "\ No newline at end of file" and other meta lines — skip
  }

  pushFile()

  return files
}
