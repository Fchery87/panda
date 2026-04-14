import { describe, expect, test } from 'bun:test'
import type { AgentRuntimeLike } from './runtime'
import { spawnVariants } from './parallelVariants'

describe('spawnVariants', () => {
  test('runs N runtimes and returns an array of completions', async () => {
    const makeRuntime = (): AgentRuntimeLike => ({
      async *run() {
        yield { type: 'text' as const, content: 'hello' }
        yield {
          type: 'complete' as const,
          usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        }
      },
      async runSync() {
        return { content: 'hello', toolResults: [] }
      },
      abort() {},
    })

    const results = await spawnVariants({
      count: 2,
      makeRuntime,
      promptContext: {} as never,
      runtimeConfig: {},
    })

    expect(results).toHaveLength(2)
    expect(results[0]?.content).toBe('hello')
    expect(results[1]?.content).toBe('hello')
  })
})
