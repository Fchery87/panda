import { describe, expect, it } from 'bun:test'
import type {
  CompletionOptions,
  LLMProvider,
  ProviderConfig,
  StreamChunk,
  ToolCall,
} from '../llm/types'
import { streamAgent } from './runtime'
import type { ToolContext } from './tools'

function makeFinish(): StreamChunk {
  return {
    type: 'finish',
    finishReason: 'stop',
    usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
  }
}

function makeToolCall(name: string, args: Record<string, unknown>): ToolCall {
  return {
    id: `tool-${name}-${Math.random().toString(36).slice(2, 8)}`,
    type: 'function',
    function: {
      name,
      arguments: JSON.stringify(args),
    },
  }
}

function makeToolContext(): ToolContext {
  return {
    projectId: 'p',
    chatId: 'c',
    userId: 'u',
    readFiles: async () => [],
    listDirectory: async () => [],
    writeFiles: async () => [{ path: 'x.ts', success: true }],
    runCommand: async () => ({ stdout: '', stderr: '', exitCode: 0, durationMs: 0 }),
    updateMemoryBank: async () => ({ success: true }),
  }
}

describe('Harness adapter guardrail parity', () => {
  it('falls back to legacy rewrite behavior in build mode and does not leak fenced code', async () => {
    process.env.NEXT_PUBLIC_PANDA_AGENT_HARNESS = '1'

    let callCount = 0
    const config: ProviderConfig = { provider: 'openai', auth: { apiKey: 'x' } }
    const provider: LLMProvider = {
      name: 'fake',
      config,
      async listModels() {
        return []
      },
      async complete() {
        throw new Error('not used')
      },
      async *completionStream(_options: CompletionOptions): AsyncGenerator<StreamChunk> {
        callCount += 1
        if (callCount === 1) {
          yield { type: 'text', content: 'Here is code:\n```ts\nexport const x = 1\n```\n' }
          yield makeFinish()
          return
        }
        if (callCount === 2) {
          yield { type: 'text', content: 'Queued changes via artifacts.\n' }
          yield {
            type: 'tool_call',
            toolCall: makeToolCall('write_files', {
              files: [{ path: 'x.ts', content: 'export const x = 1\n' }],
            }),
          }
          yield makeFinish()
          return
        }
        yield { type: 'text', content: 'Done. Review artifacts and apply.\n' }
        yield makeFinish()
      },
    }

    const events: any[] = []
    for await (const evt of streamAgent(
      provider,
      {
        projectId: 'p',
        chatId: 'c',
        userId: 'u',
        chatMode: 'build',
        provider: 'openai',
        userMessage: 'please implement',
      },
      makeToolContext()
    )) {
      events.push(evt)
    }

    expect(callCount).toBe(3)
    expect(events.some((e) => e.type === 'reset')).toBe(true)

    const streamedText = events
      .filter((e) => e.type === 'text')
      .map((e) => e.content ?? '')
      .join('')
    expect(streamedText.includes('```')).toBe(false)
    expect(events.some((e) => e.type === 'tool_result')).toBe(true)
    const complete = events.find((e) => e.type === 'complete')
    expect(complete?.content).toContain('Done.')
    delete process.env.NEXT_PUBLIC_PANDA_AGENT_HARNESS
  })

  it('executes task tool through the harness adapter and emits subagent progress', async () => {
    process.env.NEXT_PUBLIC_PANDA_AGENT_HARNESS = '1'

    let callCount = 0
    const config: ProviderConfig = { provider: 'openai', auth: { apiKey: 'x' } }
    const provider: LLMProvider = {
      name: 'fake',
      config,
      async listModels() {
        return []
      },
      async complete() {
        throw new Error('not used')
      },
      async *completionStream(_options: CompletionOptions): AsyncGenerator<StreamChunk> {
        callCount += 1
        if (callCount === 1) {
          yield {
            type: 'tool_call',
            toolCall: makeToolCall('task', {
              subagent_type: 'explore',
              prompt: 'Inspect and summarize.',
              description: 'Explore codebase',
            }),
          }
          yield makeFinish()
          return
        }
        if (callCount === 2) {
          yield { type: 'text', content: 'Subagent summary: found files.' }
          yield makeFinish()
          return
        }
        yield { type: 'text', content: 'Parent done.' }
        yield makeFinish()
      },
    }

    const events: any[] = []
    for await (const evt of streamAgent(
      provider,
      {
        projectId: 'p',
        chatId: 'c',
        userId: 'u',
        chatMode: 'build',
        provider: 'openai',
        userMessage: 'delegate this',
      },
      makeToolContext()
    )) {
      events.push(evt)
    }

    expect(callCount).toBe(3)
    const taskResult = events.find(
      (e) => e.type === 'tool_result' && e.toolResult?.toolName === 'task'
    )
    expect(taskResult?.toolResult?.error).toBeUndefined()
    expect(taskResult?.toolResult?.output).toContain('Subagent summary')
    expect(
      events.some(
        (e) => e.type === 'progress_step' && String(e.content ?? '').includes('Subagent started')
      )
    ).toBe(true)
    expect(
      events.some(
        (e) => e.type === 'progress_step' && String(e.content ?? '').includes('Subagent completed')
      )
    ).toBe(true)
    delete process.env.NEXT_PUBLIC_PANDA_AGENT_HARNESS
  })

  it('falls back to legacy rewrite behavior in architect mode and does not leak fenced code', async () => {
    process.env.NEXT_PUBLIC_PANDA_AGENT_HARNESS = '1'

    let callCount = 0
    const config: ProviderConfig = { provider: 'openai', auth: { apiKey: 'x' } }
    const provider: LLMProvider = {
      name: 'fake',
      config,
      async listModels() {
        return []
      },
      async complete() {
        throw new Error('not used')
      },
      async *completionStream(_options: CompletionOptions): AsyncGenerator<StreamChunk> {
        callCount += 1
        if (callCount === 1) {
          yield { type: 'text', content: 'Here is code:\n```js\nconsole.log(1)\n```' }
          yield makeFinish()
          return
        }
        yield {
          type: 'text',
          content: '1) Clarifying questions\n2) Proposed plan\n3) Risks\n4) Next step\n',
        }
        yield makeFinish()
      },
    }

    const events: any[] = []
    for await (const evt of streamAgent(
      provider,
      {
        projectId: 'p',
        chatId: 'c',
        userId: 'u',
        chatMode: 'architect',
        provider: 'openai',
        userMessage: 'plan this change',
      },
      makeToolContext()
    )) {
      events.push(evt)
    }

    expect(callCount).toBe(2)
    expect(events.some((e) => e.type === 'reset')).toBe(true)
    const streamedText = events
      .filter((e) => e.type === 'text')
      .map((e) => e.content ?? '')
      .join('')
    expect(streamedText.includes('```')).toBe(false)
    const complete = events.find((e) => e.type === 'complete')
    expect(complete?.content).toContain('Proposed plan')
    delete process.env.NEXT_PUBLIC_PANDA_AGENT_HARNESS
  })

  it('emits subagent failure progress from core runtime events with error details', async () => {
    process.env.NEXT_PUBLIC_PANDA_AGENT_HARNESS = '1'

    let callCount = 0
    const config: ProviderConfig = { provider: 'openai', auth: { apiKey: 'x' } }
    const provider: LLMProvider = {
      name: 'fake',
      config,
      async listModels() {
        return []
      },
      async complete() {
        throw new Error('not used')
      },
      async *completionStream(_options: CompletionOptions): AsyncGenerator<StreamChunk> {
        callCount += 1
        if (callCount === 1) {
          yield {
            type: 'tool_call',
            toolCall: makeToolCall('task', {
              subagent_type: 'missing-subagent',
              prompt: 'Inspect and summarize.',
              description: 'Missing agent',
            }),
          }
          yield makeFinish()
          return
        }
        yield { type: 'text', content: 'Parent done after failed subagent.' }
        yield makeFinish()
      },
    }

    const events: any[] = []
    for await (const evt of streamAgent(
      provider,
      {
        projectId: 'p',
        chatId: 'c',
        userId: 'u',
        chatMode: 'build',
        provider: 'openai',
        userMessage: 'delegate this',
      },
      makeToolContext()
    )) {
      events.push(evt)
    }

    const failedSubagentProgress = events.find(
      (e) =>
        e.type === 'progress_step' &&
        String(e.content ?? '').includes('Subagent completed') &&
        e.progressStatus === 'error'
    )

    expect(failedSubagentProgress).toBeDefined()
    expect(String(failedSubagentProgress?.progressError ?? '')).toContain('Unknown subagent type')
    delete process.env.NEXT_PUBLIC_PANDA_AGENT_HARNESS
  })
})
