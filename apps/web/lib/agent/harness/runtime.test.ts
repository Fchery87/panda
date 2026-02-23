import { describe, expect, test } from 'bun:test'
import type { CompletionOptions, CompletionResponse, LLMProvider, ModelInfo } from '../../llm/types'
import { bus } from './event-bus'
import { createPlugin, plugins } from './plugins'
import { Runtime } from './runtime'
import type { Message, UserMessage } from './types'
import { agents } from './agents'

function createUserMessage(args: {
  id: string
  sessionID: string
  text: string
  agent?: string
}): UserMessage {
  return {
    id: args.id,
    sessionID: args.sessionID,
    role: 'user',
    time: { created: Date.now() },
    parts: [
      {
        id: `${args.id}-part`,
        messageID: args.id,
        sessionID: args.sessionID,
        type: 'text',
        text: args.text,
      },
    ],
    agent: args.agent ?? 'build',
  }
}

function createProvider(
  onStream: (options: CompletionOptions) => void,
  finishReason: 'stop' | 'length' | 'tool_calls' | 'error' = 'stop'
): LLMProvider {
  return {
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
      throw new Error('Not implemented in test')
    },
    async *completionStream(options: CompletionOptions) {
      onStream(options)
      yield { type: 'text' as const, content: 'ok' }
      yield {
        type: 'finish' as const,
        finishReason,
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      }
    },
  }
}

function resetHarnessTestState(): void {
  bus.clearHistory()
  for (const plugin of plugins.listPlugins()) {
    plugins.unregister(plugin.name)
  }
}

describe('harness Runtime', () => {
  test('applies llm.request hook mutations to completion options', async () => {
    resetHarnessTestState()
    let observedModel: string | null = null
    let sawBuiltinReadFilesTool = false
    const provider = createProvider((options) => {
      observedModel = options.model
      sawBuiltinReadFilesTool =
        options.tools?.some((tool) => tool.function.name === 'read_files') === true
    })

    const plugin = createPlugin('runtime-test-llm-request-mutation', {
      hooks: {
        'llm.request': async (_ctx, data) => {
          const options = data as CompletionOptions
          return { ...options, model: 'hook-mutated-model' }
        },
      },
    })
    plugins.register(plugin)

    const runtime = new Runtime(provider, new Map())
    const userMessage = createUserMessage({
      id: 'msg-user-1',
      sessionID: 'session-1',
      text: 'hello',
      agent: 'ask',
    })

    const events = []
    for await (const event of runtime.run('session-1', userMessage)) {
      events.push(event)
    }

    expect(events.some((event) => event.type === 'complete')).toBe(true)
    expect(observedModel).toBe('hook-mutated-model')
    expect(sawBuiltinReadFilesTool).toBe(true)
  })

  test('applies compaction results and still reaches the provider', async () => {
    resetHarnessTestState()
    let streamCalls = 0
    let sawCompactionSummary = false
    const provider = createProvider((options) => {
      streamCalls++
      sawCompactionSummary = options.messages.some(
        (msg) =>
          msg.role === 'user' &&
          typeof msg.content === 'string' &&
          msg.content.includes('[Previous conversation summary]')
      )
    })

    const runtime = new Runtime(provider, new Map(), { maxSteps: 3 })
    const sessionID = 'session-compaction'
    const initialMessages: Message[] = Array.from({ length: 8 }, (_, index) =>
      createUserMessage({
        id: `msg-old-${index}`,
        sessionID,
        text: index < 4 ? 'x'.repeat(180_000) : `small-${index}`,
        agent: 'build',
      })
    )
    const userMessage = createUserMessage({
      id: 'msg-new',
      sessionID,
      text: 'Summarize',
      agent: 'ask',
    })

    const events = []
    for await (const event of runtime.run(sessionID, userMessage, initialMessages)) {
      events.push(event)
    }

    expect(streamCalls).toBeGreaterThan(0)
    expect(sawCompactionSummary).toBe(true)
    expect(
      events.some((event) => event.type === 'error' && event.error?.includes('maximum steps'))
    ).toBe(false)
  })

  test('checks write_files permissions per target path', async () => {
    resetHarnessTestState()
    const agentName = 'runtime-per-target-perms'
    agents.register({
      name: agentName,
      mode: 'primary',
      permission: {
        write_files: 'ask',
        'write_files:src/allowed.ts': 'allow',
        'write_files:src/blocked.ts': 'deny',
      },
      steps: 3,
      prompt: 'test',
    })

    let writeExecutorCalls = 0
    let streamCalls = 0
    const provider: LLMProvider = {
      ...createProvider(() => {}, 'tool_calls'),
      async *completionStream(_options: CompletionOptions) {
        streamCalls++
        if (streamCalls === 1) {
          yield {
            type: 'tool_call',
            toolCall: {
              id: 'tc-1',
              type: 'function',
              function: {
                name: 'write_files',
                arguments: JSON.stringify({
                  files: [
                    { path: 'src/allowed.ts', content: 'ok' },
                    { path: 'src/blocked.ts', content: 'nope' },
                  ],
                }),
              },
            },
          }
          yield {
            type: 'finish',
            finishReason: 'tool_calls',
            usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
          }
          return
        }
        yield {
          type: 'finish',
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
            writeExecutorCalls++
            return { output: 'should not run' }
          },
        ],
      ])
    )
    const userMessage = createUserMessage({
      id: 'msg-user-perms',
      sessionID: 'session-perms',
      text: 'write files',
      agent: agentName,
    })

    const events = []
    for await (const event of runtime.run('session-perms', userMessage)) {
      events.push(event)
    }

    expect(writeExecutorCalls).toBe(0)
    const toolResults = events.filter((event) => event.type === 'tool_result')
    expect(toolResults.length).toBeGreaterThan(0)
    expect(
      toolResults.some((event) => event.toolResult?.error?.includes('Permission denied'))
    ).toBe(true)

    agents.unregister(agentName)
  })

  test('executes task tool via core subtask queue and replays result into next step', async () => {
    resetHarnessTestState()
    let streamCalls = 0
    let sawTaskResultInFollowupStep = false

    const provider: LLMProvider = {
      ...createProvider(() => {}, 'tool_calls'),
      async *completionStream(options: CompletionOptions) {
        streamCalls++

        if (streamCalls === 1) {
          yield {
            type: 'tool_call',
            toolCall: {
              id: 'tc-task-1',
              type: 'function',
              function: {
                name: 'task',
                arguments: JSON.stringify({
                  subagent_type: 'explore',
                  prompt: 'Inspect runtime',
                  description: 'inspect runtime',
                }),
              },
            },
          }
          yield {
            type: 'finish',
            finishReason: 'tool_calls',
            usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
          }
          return
        }

        sawTaskResultInFollowupStep = options.messages.some(
          (msg) =>
            msg.role === 'tool' &&
            typeof msg.content === 'string' &&
            msg.content.includes('child-result')
        )
        yield { type: 'text', content: 'done' }
        yield {
          type: 'finish',
          finishReason: 'stop',
          usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        }
      },
    }

    const runtime = new Runtime(provider, new Map(), {
      maxSteps: 5,
      runSubagent: async (_subagent, _prompt, childSessionID) => ({
        sessionID: childSessionID,
        output: 'child-result',
        parts: [],
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      }),
    })
    const userMessage = createUserMessage({
      id: 'msg-user-task',
      sessionID: 'session-task',
      text: 'Delegate this',
      agent: 'build',
    })

    const events = []
    for await (const event of runtime.run('session-task', userMessage)) {
      events.push(event)
    }

    expect(streamCalls).toBe(2)
    expect(sawTaskResultInFollowupStep).toBe(true)
    expect(events.some((event) => event.type === 'subagent_start')).toBe(true)
    expect(events.some((event) => event.type === 'subagent_complete')).toBe(true)
    expect(
      events.some(
        (event) =>
          event.type === 'tool_result' &&
          event.toolResult?.toolName === 'task' &&
          event.toolResult.output.includes('child-result')
      )
    ).toBe(true)
  })

  test('enforces core subagent depth guard for task tool execution', async () => {
    resetHarnessTestState()
    let streamCalls = 0
    const provider: LLMProvider = {
      ...createProvider(() => {}, 'tool_calls'),
      async *completionStream(_options: CompletionOptions) {
        streamCalls++
        if (streamCalls === 1) {
          yield {
            type: 'tool_call',
            toolCall: {
              id: 'tc-task-depth',
              type: 'function',
              function: {
                name: 'task',
                arguments: JSON.stringify({
                  subagent_type: 'explore',
                  prompt: 'Inspect runtime',
                  description: 'inspect runtime',
                }),
              },
            },
          }
          yield {
            type: 'finish',
            finishReason: 'tool_calls',
            usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
          }
          return
        }
        yield {
          type: 'finish',
          finishReason: 'stop',
          usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        }
      },
    }

    const runtime = new Runtime(provider, new Map(), {
      maxSteps: 4,
      maxSubagentDepth: 0,
    })
    const userMessage = createUserMessage({
      id: 'msg-user-depth',
      sessionID: 'session-depth',
      text: 'Delegate this',
      agent: 'build',
    })

    const events = []
    for await (const event of runtime.run('session-depth', userMessage)) {
      events.push(event)
    }

    const taskToolResult = events.find(
      (event) => event.type === 'tool_result' && event.toolResult?.toolName === 'task'
    )
    expect(taskToolResult?.toolResult?.error).toContain('Maximum subagent depth reached')
  })

  test('propagates parent abort to in-flight child subagent tool execution', async () => {
    resetHarnessTestState()
    let streamCalls = 0
    let childToolAbortObserved = false
    let resolveChildToolStarted: (() => void) | null = null
    const childToolStarted = new Promise<void>((resolve) => {
      resolveChildToolStarted = resolve
    })

    const provider: LLMProvider = {
      ...createProvider(() => {}, 'tool_calls'),
      async *completionStream(_options: CompletionOptions) {
        streamCalls++
        if (streamCalls === 1) {
          yield {
            type: 'tool_call',
            toolCall: {
              id: 'tc-parent-task',
              type: 'function',
              function: {
                name: 'task',
                arguments: JSON.stringify({
                  subagent_type: 'explore',
                  prompt: 'Inspect runtime',
                  description: 'inspect runtime',
                }),
              },
            },
          }
          yield {
            type: 'finish',
            finishReason: 'tool_calls',
            usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
          }
          return
        }

        if (streamCalls === 2) {
          yield {
            type: 'tool_call',
            toolCall: {
              id: 'tc-child-read',
              type: 'function',
              function: {
                name: 'read_files',
                arguments: JSON.stringify({ paths: ['apps/web/lib/agent/harness/runtime.ts'] }),
              },
            },
          }
          yield {
            type: 'finish',
            finishReason: 'tool_calls',
            usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
          }
          return
        }

        yield {
          type: 'finish',
          finishReason: 'stop',
          usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        }
      },
    }

    const runtime = new Runtime(
      provider,
      new Map([
        [
          'read_files',
          async (_args, ctx) =>
            await new Promise<{ output: string; error?: string }>((resolve) => {
              const onAbort = () => {
                childToolAbortObserved = true
                resolve({ output: '', error: 'aborted' })
              }

              resolveChildToolStarted?.()

              if (ctx.abortSignal.aborted) {
                onAbort()
                return
              }

              ctx.abortSignal.addEventListener('abort', onAbort, { once: true })
            }),
        ],
      ]),
      { maxSteps: 5 }
    )

    const userMessage = createUserMessage({
      id: 'msg-user-abort',
      sessionID: 'session-abort',
      text: 'Delegate this',
      agent: 'build',
    })

    const events = [] as Array<{ type: string; error?: string }>
    const runPromise = (async () => {
      for await (const event of runtime.run('session-abort', userMessage)) {
        events.push({ type: event.type, ...(event.type === 'error' ? { error: event.error } : {}) })
      }
    })()

    await childToolStarted
    runtime.abort()

    await Promise.race([
      runPromise,
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('Timed out waiting for runtime to stop after abort')),
          1000
        )
      ),
    ])

    expect(childToolAbortObserved).toBe(true)
    expect(events.some((event) => event.type === 'subagent_start')).toBe(true)
  })
})
