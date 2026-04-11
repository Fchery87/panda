import { describe, expect, test } from 'bun:test'
import type { CompletionOptions, CompletionResponse, LLMProvider, ModelInfo } from '../../llm/types'
import { Runtime } from './runtime'
import { InMemoryCheckpointStore } from './checkpoint-store'
import type { UserMessage } from './types'

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
      async *completionStream(options: CompletionOptions) {
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
      createUserMessage('session-question-filter', 'manager')
    )) {
      void event
    }

    expect(observedTools).not.toContain('question')
    expect(observedTools).toContain('task')
  })
})
