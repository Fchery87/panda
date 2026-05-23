import { describe, expect, test } from 'bun:test'
import type {
  CompletionOptions,
  CompletionResponse,
  LLMProvider,
  ModelInfo,
  StreamChunk,
} from '../../llm/types'
import { Runtime } from './runtime'
import { InMemoryCheckpointStore } from './checkpoint-store'
import type { UserMessage } from './types'
import { resolveRulesForPhase } from '../permission/mode-rulesets'

function createUserMessage(sessionID: string, agent: string): UserMessage {
  return {
    id: 'msg-user',
    sessionID,
    role: 'user',
    time: { created: Date.now() },
    parts: [
      {
        id: 'part-user',
        messageID: 'msg-user',
        sessionID,
        type: 'text',
        text: 'hello',
      },
    ],
    agent,
  }
}

describe('Runtime tool availability', () => {
  test('does not advertise question when no executor is registered', async () => {
    let observedTools: string[] = []

    const provider: LLMProvider = {
      name: 'test-provider',
      config: {
        provider: 'openai',
        auth: { apiKey: 'test' },
        defaultModel: 'test-model',
      },
      async listModels(): Promise<ModelInfo[]> {
        return []
      },
      async complete(_options: CompletionOptions): Promise<CompletionResponse> {
        return {
          message: { role: 'assistant', content: 'ok' },
          usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
          finishReason: 'stop',
          model: 'test-model',
        }
      },
      async *completionStream(options: CompletionOptions): AsyncGenerator<StreamChunk> {
        observedTools = (options.tools ?? []).map((tool) => tool.function.name)
        yield { type: 'text' as const, content: 'ok' }
        yield {
          type: 'finish' as const,
          finishReason: 'stop',
          usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        }
      },
    }

    const runtime = new Runtime(provider, new Map(), {
      checkpointStore: new InMemoryCheckpointStore(),
      specEngine: { enabled: false },
    })

    for await (const event of runtime.run(
      'session-question-filter',
      createUserMessage('session-question-filter', 'build')
    )) {
      void event
    }

    expect(observedTools).not.toContain('question')
    expect(observedTools).toContain('task')
  })

  test('plan mode does not advertise or execute write tools even if the model hallucinates one', async () => {
    let observedTools: string[] = []
    let writeExecutorCalled = false
    let streamCallCount = 0

    const provider: LLMProvider = {
      name: 'test-provider',
      config: {
        provider: 'openai',
        auth: { apiKey: 'test' },
        defaultModel: 'test-model',
      },
      async listModels(): Promise<ModelInfo[]> {
        return []
      },
      async complete(_options: CompletionOptions): Promise<CompletionResponse> {
        return {
          message: { role: 'assistant', content: 'ok' },
          usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
          finishReason: 'stop',
          model: 'test-model',
        }
      },
      async *completionStream(options: CompletionOptions): AsyncGenerator<StreamChunk> {
        streamCallCount += 1
        observedTools = (options.tools ?? []).map((tool) => tool.function.name)
        if (streamCallCount === 1) {
          yield {
            type: 'tool_call' as const,
            toolCall: {
              id: 'tool-write-files',
              type: 'function' as const,
              function: {
                name: 'write_files',
                arguments: JSON.stringify({ files: [{ path: 'docs/.gitkeep', content: '' }] }),
              },
            },
          }
          yield {
            type: 'finish' as const,
            finishReason: 'tool_calls',
            usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
          }
          return
        }

        yield { type: 'text' as const, content: 'I will not be allowed to write in plan mode.' }
        yield {
          type: 'finish' as const,
          finishReason: 'stop',
          usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        }
      },
    }

    const runtime = new Runtime(
      provider,
      new Map([
        [
          'write_files',
          async () => {
            writeExecutorCalled = true
            return { output: 'should not run' }
          },
        ],
      ]),
      {
        checkpointStore: new InMemoryCheckpointStore(),
        specEngine: { enabled: false },
        chatMode: 'plan',
        permissionRules: resolveRulesForPhase('plan'),
      }
    )

    const events: any[] = []
    for await (const event of runtime.run(
      'session-plan-write-filter',
      createUserMessage('session-plan-write-filter', 'plan')
    )) {
      events.push(event)
    }

    expect(observedTools).not.toContain('write_files')
    expect(writeExecutorCalled).toBe(false)
    const deniedResult = events.find(
      (event) => event.type === 'tool_result' && event.toolResult?.toolName === 'write_files'
    )
    expect(deniedResult?.toolResult?.error).toContain('plan mode is read-only')
  })
})
