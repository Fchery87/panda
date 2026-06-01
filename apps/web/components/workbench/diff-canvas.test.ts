import { describe, expect, test } from 'bun:test'
import { buildDiffCanvasGroups, classifyDiffFile } from './diff-canvas'
import type { DiffFileEntry } from './DiffTab'

function file(path: string, added = 1, removed = 0): DiffFileEntry {
  return {
    path,
    status: 'modified',
    reviewStatus: 'pending',
    hunks: [
      {
        id: path,
        startLine: 1,
        endLine: 1,
        added: Array.from({ length: added }, (_, index) => `add ${index}`),
        removed: Array.from({ length: removed }, (_, index) => `remove ${index}`),
        context: [],
        status: 'pending',
      },
    ],
  }
}

describe('diff canvas classifier', () => {
  test('classifies core high-churn and config changes as critical', () => {
    expect(classifyDiffFile(file('apps/web/lib/runtime.ts', 25), 0).importance).toBe('critical')
    expect(classifyDiffFile(file('package.json', 1), 1).importance).toBe('critical')
  })

  test('groups docs, tests, and generated files without reading full content', () => {
    const groups = buildDiffCanvasGroups([
      file('apps/web/lib/runtime.ts', 25),
      file('apps/web/lib/runtime.test.ts', 2),
      file('convex/_generated/api.d.ts', 100),
      file('docs/WORKBENCH.md', 3),
    ])

    expect(groups.map((group) => group.id)).toEqual(['critical', 'important', 'routine'])
    expect(groups.find((group) => group.id === 'routine')?.files[0].role).toBe('generated')
  })
})
