// apps/web/lib/chat/applyHunk.test.ts
import { describe, it, expect } from 'bun:test'
import { applyHunk } from './applyHunk'
import type { GitDiffHunk } from './parseGitDiff'

describe('applyHunk', () => {
  it('applies an addition hunk', () => {
    const content = 'line1\nline2\nline3'
    const hunk: GitDiffHunk = {
      oldStart: 2,
      oldCount: 1,
      newStart: 2,
      newCount: 2,
      lines: [
        { type: 'context', content: 'line2' },
        { type: 'add', content: 'inserted' },
      ],
    }
    const result = applyHunk(content, hunk)
    expect(result).toBe('line1\nline2\ninserted\nline3')
  })

  it('applies a removal hunk', () => {
    const content = 'line1\nline2\nline3'
    const hunk: GitDiffHunk = {
      oldStart: 2,
      oldCount: 1,
      newStart: 2,
      newCount: 0,
      lines: [{ type: 'remove', content: 'line2' }],
    }
    const result = applyHunk(content, hunk)
    expect(result).toBe('line1\nline3')
  })
})
