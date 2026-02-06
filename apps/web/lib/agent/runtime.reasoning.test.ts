import { describe, expect, it } from 'bun:test'
import type {
  CompletionOptions,
  LLMProvider,
  ProviderCapabilities,
  ProviderConfig,
  StreamChunk,
} from '../llm/types'
import { AgentRuntime } from './runtime'

const TOOL_CONTEXT = {
  projectId: 'p',
  chatId: 'c',
  userId: 'u',
  readFiles: async () => [],
  writeFiles: async () => [],
  runCommand: async () => ({ stdout: '', stderr: '', exitCode: 0, durationMs: 0 }),
}

function makeProvider(args: {
  config: ProviderConfig
  stream: (options: CompletionOptions) => AsyncGenerator<StreamChunk>
}): LLMProvider {
  return {
    name: 'fake',
    config: args.config,
    async listModels() {
      return []
    },
    async complete() {
      throw new Error('not used')
    },
    completionStream: args.stream,
  }
}

function makeCapabilities(overrides: Partial<ProviderCapabilities>): ProviderCapabilities {
  return {
    supportsReasoning: false,
    supportsInterleavedReasoning: false,
    supportsReasoningSummary: false,
    supportsToolStreaming: true,
    reasoningControl: 'none',
    ...overrides,
  }
}

describe('AgentRuntime reasoning events', () => {
  it('forwards interleaved reasoning chunks', async () => {
    const provider = makeProvider({
      config: { provider: 'anthropic', auth: { apiKey: 'x' } },
      async *stream() {
        yield { type: 'reasoning', reasoningContent: 'Inspecting files...' }
        yield {
          type: 'tool_call',
          toolCall: {
            id: 'tc1',
            type: 'function',
            function: { name: 'read_files', arguments: JSON.stringify({ paths: ['a.ts'] }) },
          },
        }
        yield { type: 'reasoning', reasoningContent: 'Applying edits...' }
        yield { type: 'text', content: 'Done.' }
        yield {
          type: 'finish',
          finishReason: 'stop',
          usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        }
      },
    })

    const runtime = new AgentRuntime(
      { provider, model: 'claude-sonnet-4-5', maxIterations: 1 },
      TOOL_CONTEXT
    )
    const events: any[] = []

    for await (const event of runtime.run({
      projectId: 'p',
      chatId: 'c',
      userId: 'u',
      chatMode: 'discuss',
      provider: 'anthropic',
      userMessage: 'Plan this change',
    })) {
      events.push(event)
    }

    expect(events.some((e) => e.type === 'status_thinking')).toBe(true)
    const reasoning = events.filter((e) => e.type === 'reasoning').map((e) => e.reasoningContent)
    expect(reasoning.slice(0, 2)).toEqual(['Inspecting files...', 'Applying edits...'])
  })

  it('does not send reasoning options when provider capabilities disable reasoning', async () => {
    let capturedOptions: any = null
    const provider = makeProvider({
      config: {
        provider: 'openai',
        auth: { apiKey: 'x' },
        capabilities: makeCapabilities({ supportsReasoning: false, reasoningControl: 'none' }),
      },
      async *stream(options) {
        capturedOptions = options
        yield { type: 'text', content: 'ok' }
        yield { type: 'finish', finishReason: 'stop' }
      },
    })

    const runtime = new AgentRuntime(
      { provider, model: 'gpt-4o', reasoning: { enabled: true, budgetTokens: 5000 } },
      TOOL_CONTEXT
    )

    for await (const _event of runtime.run({
      projectId: 'p',
      chatId: 'c',
      userId: 'u',
      chatMode: 'discuss',
      provider: 'openai',
      userMessage: 'Hi',
    })) {
      void _event
    }

    if (capturedOptions === null) {
      throw new Error('Expected captured options to be set')
    }
    expect(capturedOptions.reasoning).toBeUndefined()
  })

  it('sends reasoning options when provider capabilities enable reasoning', async () => {
    let capturedOptions: any = null
    const provider = makeProvider({
      config: {
        provider: 'anthropic',
        auth: { apiKey: 'x' },
        capabilities: makeCapabilities({ supportsReasoning: true, reasoningControl: 'budget' }),
      },
      async *stream(options) {
        capturedOptions = options
        yield { type: 'text', content: 'ok' }
        yield { type: 'finish', finishReason: 'stop' }
      },
    })

    const runtime = new AgentRuntime(
      { provider, model: 'claude-sonnet-4-5', reasoning: { enabled: true, budgetTokens: 7000 } },
      TOOL_CONTEXT
    )

    for await (const _event of runtime.run({
      projectId: 'p',
      chatId: 'c',
      userId: 'u',
      chatMode: 'discuss',
      provider: 'anthropic',
      userMessage: 'Hi',
    })) {
      void _event
    }

    if (capturedOptions === null) {
      throw new Error('Expected captured options to be set')
    }
    expect(capturedOptions.reasoning).toEqual({
      enabled: true,
      budgetTokens: 7000,
    })
  })
})
