import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('./projects.ts', import.meta.url), 'utf8')

describe('projects.remove cascade coverage', () => {
  test('cleans up first-order project and chat child data', () => {
    const removeStart = source.indexOf('export const remove = mutation({')
    expect(removeStart).toBeGreaterThan(-1)
    const removeSource = source.slice(removeStart)

    for (const table of [
      'files',
      'fileSnapshots',
      'chats',
      'messages',
      'artifacts',
      'planningSessions',
      'checkpoints',
      'sharedChats',
      'agentRuns',
      'agentRunEvents',
      'harnessRuntimeCheckpoints',
      'sessionSummaries',
      'specifications',
      'chatAttachments',
      'jobs',
      'evalSuites',
      'evalRuns',
      'evalRunResults',
    ]) {
      expect(source).toContain(`'${table}'`)
    }

    expect(removeSource).toContain('deleteFileWithSnapshots')
    expect(removeSource).toContain('deleteChatChildren')
  })
})
