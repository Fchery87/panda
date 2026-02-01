import { describe, expect, it } from 'bun:test'
import type {
  CompletionOptions,
  LLMProvider,
  ProviderConfig,
  StreamChunk,
  ToolCall,
} from '../llm/types'
import { AgentRuntime, shouldRewriteBuildResponse } from './runtime'

function makeFinish(): StreamChunk {
  return {
    type: 'finish',
    finishReason: 'stop',
    usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
  }
}

function makeToolCall(name: string, args: Record<string, unknown>): ToolCall {
  return {
    id: `tool-${name}`,
    type: 'function',
    function: {
      name,
      arguments: JSON.stringify(args),
    },
  }
}

describe('Build Mode no-code guardrails', () => {
  it('detects fenced code blocks in build responses', () => {
    expect(shouldRewriteBuildResponse('no code here')).toBe(false)
    expect(shouldRewriteBuildResponse('```ts\nexport const x = 1\n```')).toBe(true)
  })

  it('retries once when build output contains code fences, and uses tools instead', async () => {
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

        // First attempt: violates build output rules by dumping code in chat.
        if (callCount === 1) {
          yield { type: 'text', content: 'Here is the code:\n```ts\nexport const x = 1\n```\n' }
          yield makeFinish()
          return
        }

        // Second attempt (rewrite): uses tools instead of dumping code.
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

        // Third call: after tool execution, the assistant wraps up without code blocks.
        yield { type: 'text', content: 'Done. Review artifacts and apply.\n' }
        yield makeFinish()
      },
    }

    const runtime = new AgentRuntime(
      { provider, model: 'fake-model' },
      {
        projectId: 'p',
        chatId: 'c',
        userId: 'u',
        readFiles: async () => [],
        writeFiles: async () => [{ path: 'x.ts', success: true }],
        runCommand: async () => ({ stdout: '', stderr: '', exitCode: 0, durationMs: 0 }),
      }
    )

    const events: any[] = []
    for await (const evt of runtime.run({
      projectId: 'p',
      chatId: 'c',
      userId: 'u',
      chatMode: 'build',
      provider: 'openai',
      userMessage: 'please implement',
    })) {
      events.push(evt)
    }

    expect(callCount).toBe(3)
    expect(events.some((e) => e.type === 'reset')).toBe(true)

    // Ensure we never streamed the fenced block into the UI before rewriting.
    const streamedText = events
      .filter((e) => e.type === 'text')
      .map((e) => e.content ?? '')
      .join('')
    expect(streamedText.includes('```')).toBe(false)

    // Ensure tool execution happened.
    expect(events.some((e) => e.type === 'tool_result')).toBe(true)

    const complete = events.find((e) => e.type === 'complete')
    expect(complete?.content).toContain('Done.')
    expect(complete?.content?.includes('```')).toBe(false)
  })

  it('retries once when build output is just a plan with no tool calls', async () => {
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
          // First attempt: does not call tools, only restates a plan.
          yield {
            type: 'text',
            content:
              '### Proposed Plan\n1) Do thing\n### Next Step\nI will begin by writing files.\n',
          }
          yield makeFinish()
          return
        }

        if (callCount === 2) {
          // Second attempt: uses tools (artifact pipeline).
          yield { type: 'text', content: 'Queued changes via artifacts.\n' }
          yield {
            type: 'tool_call',
            toolCall: makeToolCall('write_files', {
              files: [{ path: 'index.html', content: '<!doctype html>\n' }],
            }),
          }
          yield makeFinish()
          return
        }

        yield { type: 'text', content: 'Done.\n' }
        yield makeFinish()
      },
    }

    const runtime = new AgentRuntime(
      { provider, model: 'fake-model' },
      {
        projectId: 'p',
        chatId: 'c',
        userId: 'u',
        readFiles: async () => [],
        writeFiles: async () => [{ path: 'index.html', success: true }],
        runCommand: async () => ({ stdout: '', stderr: '', exitCode: 0, durationMs: 0 }),
      }
    )

    const events: any[] = []
    for await (const evt of runtime.run({
      projectId: 'p',
      chatId: 'c',
      userId: 'u',
      chatMode: 'build',
      provider: 'openai',
      userMessage: 'lets do it, build it now',
    })) {
      events.push(evt)
    }

    expect(callCount).toBe(3)
    expect(events.some((e) => e.type === 'reset')).toBe(true)
    expect(events.some((e) => e.type === 'tool_result')).toBe(true)
    const complete = events.find((e) => e.type === 'complete')
    expect(complete?.content).toContain('Done.')
  })
})
