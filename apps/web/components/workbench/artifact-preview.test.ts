import { describe, expect, test } from 'bun:test'
import { derivePreviewDiffEntries, deriveWorkspaceArtifactPreviews } from './artifact-preview'

describe('artifact preview helpers', () => {
  test('derives active workspace previews only from pending file-write artifacts', () => {
    const previews = deriveWorkspaceArtifactPreviews([
      {
        _id: 'artifact-1',
        status: 'pending',
        createdAt: 10,
        actions: [
          {
            type: 'file_write',
            payload: {
              filePath: 'src/app.ts',
              content: 'console.log("next")\n',
              originalContent: 'console.log("prev")\n',
            },
          },
        ],
      },
      {
        _id: 'artifact-2',
        status: 'completed',
        createdAt: 20,
        actions: [
          {
            type: 'file_write',
            payload: {
              filePath: 'src/ignored.ts',
              content: 'done',
              originalContent: 'before',
            },
          },
        ],
      },
      {
        _id: 'artifact-3',
        status: 'in_progress',
        createdAt: 30,
        actions: [
          {
            type: 'command_run',
            payload: {
              command: 'bun test',
            },
          },
        ],
      },
      {
        _id: 'artifact-4',
        status: 'in_progress',
        createdAt: 40,
        actions: [
          {
            type: 'file_write',
            payload: {
              filePath: 'src/new.ts',
              content: 'export const value = 1\n',
            },
          },
        ],
      },
    ])

    expect(previews).toEqual([
      {
        artifactId: 'artifact-4',
        createdAt: 40,
        filePath: 'src/new.ts',
        pendingContent: 'export const value = 1\n',
        originalContent: '',
        status: 'in_progress',
      },
      {
        artifactId: 'artifact-1',
        createdAt: 10,
        filePath: 'src/app.ts',
        pendingContent: 'console.log("next")\n',
        originalContent: 'console.log("prev")\n',
        status: 'pending',
      },
    ])
  })

  test('keeps generated file previews as review data instead of navigation decisions', () => {
    const previews = deriveWorkspaceArtifactPreviews([
      {
        _id: 'artifact-4',
        status: 'pending',
        createdAt: 40,
        actions: [
          {
            type: 'file_write',
            payload: {
              filePath: 'src/new.ts',
              content: 'export const value = 1\n',
            },
          },
        ],
      },
    ])

    expect(previews).toHaveLength(1)
    expect(previews[0]?.filePath).toBe('src/new.ts')
    expect('shouldOpenTab' in previews[0]!).toBe(false)
    expect('shouldSelectFile' in previews[0]!).toBe(false)
  })

  test('derives diff entries from pending previews for the center diff surface', () => {
    const entries = derivePreviewDiffEntries([
      {
        artifactId: 'artifact-1',
        createdAt: 10,
        filePath: 'src/app.ts',
        pendingContent: 'console.log("next")\n',
        originalContent: 'console.log("prev")\n',
        status: 'pending',
      },
    ])

    expect(entries).toEqual([
      {
        artifactId: 'artifact-1',
        path: 'src/app.ts',
        status: 'modified',
        reviewStatus: 'pending',
        hunks: [
          {
            id: 'artifact-1:0',
            startLine: 1,
            endLine: 1,
            added: ['console.log("next")'],
            removed: ['console.log("prev")'],
            context: [''],
            status: 'pending',
          },
        ],
      },
    ])
  })
})
