import { describe, expect, test } from 'bun:test'
import { mapToolResultToProgressStep } from './runtime-progress'

describe('runtime progress mapping', () => {
  test('carries verified write_files target paths from tool output into progress events', () => {
    const event = mapToolResultToProgressStep({
      toolResult: {
        toolCallId: 'tool-1',
        toolName: 'write_files',
        args: {},
        output: JSON.stringify({
          files: [
            { path: 'src/created.ts', success: true },
            { path: 'src/failed.ts', success: false },
          ],
        }),
      },
    })

    expect(event.targetFilePaths).toEqual(['src/created.ts'])
    expect(event.progressHasArtifactTarget).toBe(true)
  })
})
