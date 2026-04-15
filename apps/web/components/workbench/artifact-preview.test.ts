import { describe, expect, test } from 'bun:test'
import {
  derivePreviewDiffEntries,
  deriveWorkspaceArtifactPreviews,
  resolveArtifactPreviewNavigation,
} from './artifact-preview'

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

  test('opens and selects a new preview target when there is no conflicting dirty tab', () => {
    const decision = resolveArtifactPreviewNavigation({
      preview: {
        artifactId: 'artifact-4',
        createdAt: 40,
        filePath: 'src/new.ts',
        pendingContent: 'export const value = 1\n',
        originalContent: '',
        status: 'pending',
      },
      openTabs: [{ path: 'src/other.ts', isDirty: false }],
      selectedFilePath: 'src/other.ts',
    })

    expect(decision).toEqual({
      shouldOpenTab: true,
      shouldSelectFile: true,
    })
  })

  test('avoids stealing focus from a different dirty tab while still opening the preview tab', () => {
    const decision = resolveArtifactPreviewNavigation({
      preview: {
        artifactId: 'artifact-4',
        createdAt: 40,
        filePath: 'src/new.ts',
        pendingContent: 'export const value = 1\n',
        originalContent: '',
        status: 'pending',
      },
      openTabs: [{ path: 'src/other.ts', isDirty: true }],
      selectedFilePath: 'src/other.ts',
    })

    expect(decision).toEqual({
      shouldOpenTab: true,
      shouldSelectFile: false,
    })
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
        path: 'src/app.ts',
        status: 'modified',
        reviewStatus: 'pending',
        hunks: [
          {
            id: 'artifact-1',
            startLine: 1,
            endLine: 2,
            added: ['console.log("next")', ''],
            removed: ['console.log("prev")', ''],
            context: [],
            status: 'pending',
          },
        ],
      },
    ])
  })
})
