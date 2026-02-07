import { describe, expect, it } from 'bun:test'
import type {
  CompletionOptions,
  LLMProvider,
  ProviderConfig,
  StreamChunk,
  ToolCall,
} from '../llm/types'
import { AgentRuntime } from './runtime'

describe('AgentRuntime progress steps', () => {
  it('emits progress_step events while processing a run', async () => {
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
        yield { type: 'text', content: 'Plan output' }
        yield {
          type: 'finish',
          finishReason: 'stop',
          usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        }
      },
    }

    const runtime = new AgentRuntime(
      { provider, model: 'fake-model' },
      {
        projectId: 'p',
        chatId: 'c',
        userId: 'u',
        readFiles: async () => [],
        writeFiles: async () => [],
        runCommand: async () => ({ stdout: '', stderr: '', exitCode: 0, durationMs: 0 }),
      }
    )

    const events: Array<{ type: string; content?: string; progressCategory?: string }> = []
    for await (const evt of runtime.run({
      projectId: 'p',
      chatId: 'c',
      userId: 'u',
      chatMode: 'discuss',
      provider: 'openai',
      userMessage: 'help me plan',
    })) {
      events.push(evt as { type: string; content?: string; progressCategory?: string })
    }

    expect(events.some((e) => e.type === 'progress_step')).toBe(true)
    expect(
      events.some((e) => e.type === 'progress_step' && e.progressCategory === 'analysis')
    ).toBe(true)
  })

  it('includes tool metadata in progress steps', async () => {
    const config: ProviderConfig = { provider: 'openai', auth: { apiKey: 'x' } }

    const toolCall: ToolCall = {
      id: 'tc-1',
      type: 'function',
      function: {
        name: 'read_files',
        arguments: JSON.stringify({ paths: ['a.ts'] }),
      },
    }

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
        yield { type: 'tool_call', toolCall }
        yield {
          type: 'finish',
          finishReason: 'tool_calls',
          usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        }
      },
    }

    const runtime = new AgentRuntime(
      { provider, model: 'fake-model', maxIterations: 2 },
      {
        projectId: 'p',
        chatId: 'c',
        userId: 'u',
        readFiles: async () => [{ path: 'a.ts', content: 'const a = 1' }],
        writeFiles: async () => [],
        runCommand: async () => ({ stdout: '', stderr: '', exitCode: 0, durationMs: 0 }),
      }
    )

    const events: Array<{
      type: string
      progressToolName?: string
      progressDurationMs?: number
      progressCategory?: string
    }> = []
    for await (const evt of runtime.run({
      projectId: 'p',
      chatId: 'c',
      userId: 'u',
      chatMode: 'build',
      provider: 'openai',
      userMessage: 'inspect file',
    })) {
      events.push(evt as (typeof events)[number])
    }

    expect(
      events.some(
        (e) =>
          e.type === 'progress_step' &&
          e.progressCategory === 'tool' &&
          e.progressToolName === 'read_files'
      )
    ).toBe(true)
    expect(
      events.some(
        (e) =>
          e.type === 'progress_step' &&
          e.progressCategory === 'tool' &&
          typeof e.progressDurationMs === 'number'
      )
    ).toBe(true)
    expect(
      events.some(
        (e) =>
          e.type === 'progress_step' &&
          e.progressCategory === 'tool' &&
          typeof (e as { progressHasArtifactTarget?: unknown }).progressHasArtifactTarget ===
            'boolean'
      )
    ).toBe(true)
  })
})
