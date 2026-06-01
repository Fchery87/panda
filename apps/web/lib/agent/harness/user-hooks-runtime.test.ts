import { describe, expect, test } from 'bun:test'
import type { CompletionOptions, CompletionResponse, LLMProvider, ModelInfo } from '../../llm/types'
import { InMemoryCheckpointStore } from './checkpoint-store'
import { plugins } from './plugins'
import { Runtime } from './runtime'
import type { RuntimeEvent, ToolExecutor } from './runtime-types'
import type { UserMessage } from './types'

function createUserMessage(): UserMessage {
  return {
    id: 'msg-user-1',
    sessionID: 'session-hooks',
    role: 'user',
    time: { created: Date.now() },
    parts: [
      {
        id: 'part-user-1',
        messageID: 'msg-user-1',
        sessionID: 'session-hooks',
        type: 'text',
        text: 'read the file',
      },
    ],
    agent: 'ask',
  }
}

function createToolCallProvider(args: Record<string, unknown>): LLMProvider {
  return {
    name: 'test-provider',
    config: { provider: 'openai', auth: { apiKey: 'test' }, defaultModel: 'test-model' },
    async listModels(): Promise<ModelInfo[]> {
      return []
    },
    async complete(): Promise<CompletionResponse> {
      return {
        message: { role: 'assistant', content: 'summary' },
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        finishReason: 'stop',
        model: 'test-model',
      }
    },
    async *completionStream(_options: CompletionOptions) {
      yield {
        type: 'tool_call' as const,
        toolCall: {
          id: 'tool-call-1',
          type: 'function' as const,
          function: { name: 'read_files', arguments: JSON.stringify(args) },
        },
      }
      yield {
        type: 'finish' as const,
        finishReason: 'tool_calls',
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      }
    },
  }
}

function resetPlugins(): void {
  for (const plugin of plugins.listPlugins()) {
    plugins.unregister(plugin.name)
  }
}

describe('runtime user hooks', () => {
  test('denies matching tool.execute.before hooks before executor invocation', async () => {
    resetPlugins()
    let executorCalled = false
    const readFilesExecutor: ToolExecutor = async () => {
      executorCalled = true
      return { output: 'secret' }
    }

    const runtime = new Runtime(
      createToolCallProvider({ paths: ['secrets/api-key.txt'] }),
      new Map([['read_files', readFilesExecutor]]),
      {
        checkpointStore: new InMemoryCheckpointStore(),
        maxSteps: 1,
        userHooks: {
          version: 1,
          hooks: [
            {
              id: 'deny-secret-read',
              hook: 'tool.execute.before',
              action: 'deny',
              match: { toolName: 'read_files', path: 'secrets/**' },
              reason: 'Secrets must stay out of agent context.',
            },
          ],
        },
      }
    )

    const events: RuntimeEvent[] = []
    for await (const event of runtime.run('session-hooks', createUserMessage())) {
      events.push(event)
    }

    expect(executorCalled).toBe(false)
    expect(events.some((event) => event.type === 'interrupt_decision')).toBe(true)
    expect(
      events.some((event) => event.type === 'tool_result' && Boolean(event.toolResult?.error))
    ).toBe(true)
  })

  test('asks through the existing interrupt path for matching hooks', async () => {
    resetPlugins()
    let interrupted = false
    let executorCalled = false
    const runtime = new Runtime(
      createToolCallProvider({ paths: ['src/index.ts'] }),
      new Map([
        [
          'read_files',
          async () => {
            executorCalled = true
            return { output: 'ok' }
          },
        ],
      ]),
      {
        checkpointStore: new InMemoryCheckpointStore(),
        maxSteps: 1,
        onToolInterrupt: async () => {
          interrupted = true
          return { decision: 'approve', reason: 'test approved' }
        },
        userHooks: {
          version: 1,
          hooks: [
            {
              id: 'ask-before-src-read',
              hook: 'tool.execute.before',
              action: 'ask',
              match: { toolName: 'read_files', path: 'src/**' },
              reason: 'Review source reads.',
            },
          ],
        },
      }
    )

    const events: RuntimeEvent[] = []
    for await (const event of runtime.run('session-hooks', createUserMessage())) {
      events.push(event)
    }

    expect(interrupted).toBe(true)
    expect(executorCalled).toBe(true)
    expect(events.some((event) => event.type === 'interrupt_request')).toBe(true)
  })
})
