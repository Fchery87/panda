/**
 * File Ranker Tests
 *
 * Tests for the file-ranker.ts module
 */

import { describe, test, expect } from 'bun:test'
import { rankFiles, applyBudget, type FileToRank } from './file-ranker'

describe('rankFiles', () => {
  test('files mentioned in user message score highest', () => {
    const files: FileToRank[] = [
      { path: 'src/utils.ts', content: 'content' },
      { path: 'src/main.ts', content: 'content' },
      { path: 'src/app.ts', content: 'content' },
    ]

    const result = rankFiles({
      files,
      userMessage: 'Please check the main.ts file',
    })

    const mainFile = result.find((f) => f.path === 'src/main.ts')
    const otherFile = result.find((f) => f.path === 'src/utils.ts')

    expect(mainFile?.score).toBeGreaterThan(otherFile?.score ?? 0)
    expect(mainFile?.scores.mentionedInMessage).toBeGreaterThan(0)
  })

  test('filename mention scores high even without full path', () => {
    const files: FileToRank[] = [
      { path: 'src/utils.ts', content: 'content' },
      { path: 'src/deep/nested/main.ts', content: 'content' },
    ]

    const result = rankFiles({
      files,
      userMessage: 'Look at main.ts',
    })

    const mainFile = result.find((f) => f.path.includes('main.ts'))
    expect(mainFile?.scores.mentionedInMessage).toBeGreaterThan(0)
  })

  test('open tabs rank above closed files', () => {
    const files: FileToRank[] = [
      { path: 'closed.ts', content: 'content' },
      { path: 'open.ts', content: 'content' },
    ]

    const result = rankFiles({
      files,
      openTabs: ['open.ts'],
    })

    const openFile = result.find((f) => f.path === 'open.ts')
    expect(openFile?.scores.openInTab).toBe(1.0)
  })

  test('recently modified files rank above stale files', () => {
    const now = Date.now()
    const files: FileToRank[] = [
      { path: 'recent.ts', content: 'content', updatedAt: now - 5 * 60 * 1000 }, // 5 min ago
      { path: 'old.ts', content: 'content', updatedAt: now - 60 * 60 * 1000 }, // 1 hour ago
    ]

    const result = rankFiles({
      files,
      recentThresholdMinutes: 30,
    })

    const recentFile = result.find((f) => f.path === 'recent.ts')
    const oldFile = result.find((f) => f.path === 'old.ts')

    expect(recentFile?.scores.recentlyModified).toBeGreaterThan(
      oldFile?.scores.recentlyModified ?? 0
    )
  })

  test('structural importance scores root-level config files', () => {
    const files: FileToRank[] = [
      { path: 'src/nested/deep/file.ts', content: 'content' },
      { path: 'package.json', content: '{}' },
      { path: 'tsconfig.json', content: '{}' },
    ]

    const result = rankFiles({ files })

    const packageFile = result.find((f) => f.path === 'package.json')
    const tsconfigFile = result.find((f) => f.path === 'tsconfig.json')
    const deepFile = result.find((f) => f.path.includes('deep'))

    expect(packageFile?.scores.structuralImportance).toBeGreaterThan(0)
    expect(tsconfigFile?.scores.structuralImportance).toBeGreaterThan(0)
    expect(packageFile?.scores.structuralImportance).toBeGreaterThan(
      deepFile?.scores.structuralImportance ?? 0
    )
  })

  test('entry point files get structural importance', () => {
    const files: FileToRank[] = [
      { path: 'src/index.ts', content: 'content' },
      { path: 'src/main.ts', content: 'content' },
      { path: 'src/utils.ts', content: 'content' },
    ]

    const result = rankFiles({ files })

    const indexFile = result.find((f) => f.path === 'src/index.ts')
    const mainFile = result.find((f) => f.path === 'src/main.ts')
    const utilsFile = result.find((f) => f.path === 'src/utils.ts')

    expect(indexFile?.scores.structuralImportance).toBeGreaterThan(
      utilsFile?.scores.structuralImportance ?? 0
    )
    expect(mainFile?.scores.structuralImportance).toBeGreaterThan(
      utilsFile?.scores.structuralImportance ?? 0
    )
  })

  test('returns sorted list by score descending', () => {
    const files: FileToRank[] = [
      { path: 'low.ts', content: 'content' },
      { path: 'high.ts', content: 'content' },
      { path: 'medium.ts', content: 'content' },
    ]

    const result = rankFiles({
      files,
      userMessage: 'high.ts',
      openTabs: ['medium.ts'],
    })

    expect(result[0].path).toBe('high.ts')
    expect(result[1].path).toBe('medium.ts')
    expect(result[2].path).toBe('low.ts')
  })

  test('handles empty file list', () => {
    const result = rankFiles({ files: [] })
    expect(result).toHaveLength(0)
  })

  test('handles files without content', () => {
    const files: FileToRank[] = [
      { path: 'no-content.ts' },
      { path: 'with-content.ts', content: 'content' },
    ]

    const result = rankFiles({ files })

    expect(result).toHaveLength(2)
    expect(result[0].score).toBeDefined()
  })
})

describe('applyBudget', () => {
  const rankedFiles = [
    {
      path: 'file1.ts',
      content: 'content1',
      score: 1.0,
      scores: {
        mentionedInMessage: 0.4,
        openInTab: 0.25,
        recentlyModified: 0.2,
        structuralImportance: 0.15,
      },
    },
    {
      path: 'file2.ts',
      content: 'content2',
      score: 0.9,
      scores: {
        mentionedInMessage: 0.4,
        openInTab: 0.25,
        recentlyModified: 0.2,
        structuralImportance: 0.05,
      },
    },
    {
      path: 'file3.ts',
      content: 'content3',
      score: 0.8,
      scores: {
        mentionedInMessage: 0.4,
        openInTab: 0.25,
        recentlyModified: 0.15,
        structuralImportance: 0,
      },
    },
    {
      path: 'file4.ts',
      content: 'content4',
      score: 0.7,
      scores: {
        mentionedInMessage: 0.4,
        openInTab: 0.2,
        recentlyModified: 0.1,
        structuralImportance: 0,
      },
    },
    {
      path: 'file5.ts',
      content: 'content5',
      score: 0.6,
      scores: {
        mentionedInMessage: 0.3,
        openInTab: 0.25,
        recentlyModified: 0.05,
        structuralImportance: 0,
      },
    },
    {
      path: 'file6.ts',
      content: 'content6',
      score: 0.5,
      scores: {
        mentionedInMessage: 0.2,
        openInTab: 0.25,
        recentlyModified: 0.05,
        structuralImportance: 0,
      },
    },
    {
      path: 'file7.ts',
      content: 'content7',
      score: 0.4,
      scores: {
        mentionedInMessage: 0.1,
        openInTab: 0.25,
        recentlyModified: 0.05,
        structuralImportance: 0,
      },
    },
    {
      path: 'file8.ts',
      content: 'content8',
      score: 0.3,
      scores: {
        mentionedInMessage: 0,
        openInTab: 0.25,
        recentlyModified: 0.05,
        structuralImportance: 0,
      },
    },
    {
      path: 'file9.ts',
      content: 'content9',
      score: 0.2,
      scores: {
        mentionedInMessage: 0,
        openInTab: 0.15,
        recentlyModified: 0.05,
        structuralImportance: 0,
      },
    },
    {
      path: 'file10.ts',
      content: 'content10',
      score: 0.1,
      scores: {
        mentionedInMessage: 0,
        openInTab: 0.05,
        recentlyModified: 0.05,
        structuralImportance: 0,
      },
    },
  ]

  test('top-ranked files get full content', () => {
    const result = applyBudget(rankedFiles, 10000)

    expect(result[0].contentLevel).toBe('full')
    expect(result[0].content).toBe('content1')
    expect(result[1].contentLevel).toBe('full')
  })

  test('medium-ranked files get signatures', () => {
    // Create files with code that has signatures
    const codeFiles = [
      {
        path: 'file1.ts',
        content: 'export function test() {}',
        score: 1.0,
        scores: {
          mentionedInMessage: 0.4,
          openInTab: 0.25,
          recentlyModified: 0.2,
          structuralImportance: 0.15,
        },
      },
      {
        path: 'file2.ts',
        content: 'export function test() {}',
        score: 0.9,
        scores: {
          mentionedInMessage: 0.4,
          openInTab: 0.25,
          recentlyModified: 0.2,
          structuralImportance: 0.05,
        },
      },
      {
        path: 'file3.ts',
        content: 'export function test() {}',
        score: 0.8,
        scores: {
          mentionedInMessage: 0.4,
          openInTab: 0.25,
          recentlyModified: 0.15,
          structuralImportance: 0,
        },
      },
      {
        path: 'file4.ts',
        content: 'export function test() {}',
        score: 0.7,
        scores: {
          mentionedInMessage: 0.4,
          openInTab: 0.2,
          recentlyModified: 0.1,
          structuralImportance: 0,
        },
      },
      {
        path: 'file5.ts',
        content: 'export function test() {}',
        score: 0.6,
        scores: {
          mentionedInMessage: 0.3,
          openInTab: 0.25,
          recentlyModified: 0.05,
          structuralImportance: 0,
        },
      },
      {
        path: 'file6.ts',
        content: 'export function test() {}',
        score: 0.5,
        scores: {
          mentionedInMessage: 0.2,
          openInTab: 0.25,
          recentlyModified: 0.05,
          structuralImportance: 0,
        },
      },
    ]

    const result = applyBudget(codeFiles, 10000, {
      fullContentLimit: 2,
      signatureLimit: 4,
    })

    expect(result[2].contentLevel).toBe('signature')
    expect(result[3].contentLevel).toBe('signature')
  })

  test('low-ranked files get paths only', () => {
    const result = applyBudget(rankedFiles, 10000, {
      fullContentLimit: 2,
      signatureLimit: 5,
    })

    expect(result[8].contentLevel).toBe('path')
    expect(result[9].contentLevel).toBe('path')
    expect(result[9].content).toBeUndefined()
  })

  test('preserves scores in output', () => {
    const result = applyBudget(rankedFiles, 10000)

    expect(result[0].score).toBe(1.0)
    expect(result[9].score).toBe(0.1)
  })

  test('handles files without content', () => {
    const filesWithMissingContent = [
      {
        path: 'file1.ts',
        content: 'content',
        score: 1.0,
        scores: {
          mentionedInMessage: 0.4,
          openInTab: 0.25,
          recentlyModified: 0.2,
          structuralImportance: 0.15,
        },
      },
      {
        path: 'file2.ts',
        score: 0.5,
        scores: {
          mentionedInMessage: 0,
          openInTab: 0,
          recentlyModified: 0.5,
          structuralImportance: 0,
        },
      },
    ]

    const result = applyBudget(filesWithMissingContent, 10000)

    expect(result[0].contentLevel).toBe('full')
    expect(result[1].contentLevel).toBe('path')
  })

  test('custom limits work correctly', () => {
    const result = applyBudget(rankedFiles, 10000, {
      fullContentLimit: 1,
      signatureLimit: 2,
    })

    expect(result[0].contentLevel).toBe('full')
    expect(result[1].contentLevel).toBe('signature')
    expect(result[2].contentLevel).toBe('path')
  })
})
