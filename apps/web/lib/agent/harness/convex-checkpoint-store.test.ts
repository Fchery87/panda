import { describe, expect, test } from 'bun:test'

import type { RuntimeCheckpoint } from './checkpoint-store'
import { ConvexCheckpointStore } from './convex-checkpoint-store'

function createCheckpoint(sessionID = 'session-1'): RuntimeCheckpoint {
  return {
    version: 1,
    sessionID,
    agentName: 'build',
    reason: 'step',
    savedAt: 123,
    state: {
      sessionID,
      messages: [],
      step: 1,
      isComplete: false,
      isLastStep: false,
      pendingSubtasks: [],
      cost: 0,
      tokens: { input: 1, output: 2, reasoning: 3 },
      lastToolLoopSignature: null,
      toolLoopStreak: 0,
    },
  }
}

describe('ConvexCheckpointStore', () => {
  test('loads only valid runtime checkpoint payloads from Convex', async () => {
    const store = new ConvexCheckpointStore(
      {
        async mutation() {
          return null
        },
        async query() {
          return {
            version: 1,
            sessionID: 'session-1',
            agentName: 'build',
            reason: 'step',
            savedAt: 123,
            state: {
              sessionID: 'session-1',
            },
          }
        },
      },
      { chatId: 'chat-1' as never }
    )

    await expect(store.load('session-1')).resolves.toEqual(
      expect.objectContaining({ sessionID: 'session-1', agentName: 'build' })
    )
  })

  test('accepts checkpoints that omit optional spec state', async () => {
    const store = new ConvexCheckpointStore(
      {
        async mutation() {
          return null
        },
        async query() {
          return {
            version: 1,
            sessionID: 'session-legacy',
            agentName: 'build',
            reason: 'step',
            savedAt: 456,
            state: {
              sessionID: 'session-legacy',
              messages: [],
              step: 1,
              isComplete: false,
              isLastStep: false,
              pendingSubtasks: [],
              cost: 0,
              tokens: { input: 1, output: 2, reasoning: 3 },
              lastToolLoopSignature: null,
              toolLoopStreak: 0,
            },
          }
        },
      },
      { chatId: 'chat-legacy' as never }
    )

    await expect(store.load('session-legacy')).resolves.toEqual(
      expect.objectContaining({ sessionID: 'session-legacy', agentName: 'build' })
    )
  })

  test('rejects malformed runtime checkpoint payloads returned from Convex', async () => {
    const store = new ConvexCheckpointStore(
      {
        async mutation() {
          return null
        },
        async query() {
          return {
            version: 2,
            sessionID: 'session-1',
          }
        },
      },
      { runId: 'run-1' as never }
    )

    await expect(store.load('session-1')).rejects.toThrow(
      'Invalid runtime checkpoint payload returned from Convex'
    )
  })

  test('saves runtime checkpoints with the provided run or chat scope', async () => {
    const mutationCalls: Array<{
      checkpoint: RuntimeCheckpoint
      runId?: string
      chatId?: string
    }> = []
    const store = new ConvexCheckpointStore(
      {
        async mutation(_func, args) {
          mutationCalls.push(args)
          return null
        },
        async query() {
          return null
        },
      },
      { runId: 'run-1' as never, chatId: 'chat-1' as never }
    )

    await store.save(createCheckpoint())

    expect(mutationCalls).toEqual([
      expect.objectContaining({
        runId: 'run-1',
        chatId: 'chat-1',
        checkpoint: expect.objectContaining({ version: 1, sessionID: 'session-1' }),
      }),
    ])
  })
})
