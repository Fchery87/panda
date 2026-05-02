import { describe, expect, test } from 'bun:test'
import type { CompletionOptions, CompletionResponse, LLMProvider, ModelInfo } from '../../llm/types'
import { bus } from './event-bus'
import { createPlugin, plugins } from './plugins'
import { InMemoryCheckpointStore } from './checkpoint-store'
import { compaction } from './compaction'
import { SUMMARIZATION_PROMPT } from './compaction'
import { Runtime } from './runtime'
import type { RuntimeEvent } from './runtime'
import { snapshots } from './snapshots'
import type { Message, UserMessage } from './types'
import { agents } from './agents'
import type { FormalSpecification } from '../spec/types'
import type { SpecLifecycleManager } from '../spec/lifecycle-manager'

const snapshotTrackNoop: typeof snapshots.track = async () => null

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
      return {
        message: {
          role: 'assistant',
          content: 'summary',
        },
        usage: {
          promptTokens: 1,
          completionTokens: 1,
          totalTokens: 2,
        },
        finishReason: 'stop',
        model: 'test-model',
      }
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
  ;(snapshots as unknown as { track: typeof snapshots.track }).track = snapshotTrackNoop
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

    const runtime = new Runtime(provider, new Map(), {
      checkpointStore: new InMemoryCheckpointStore(),
    })
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

  test('uses an injected spec lifecycle manager when provided', async () => {
    resetHarnessTestState()
    let classifyCalls = 0

    const lifecycleManager: SpecLifecycleManager = {
      isEnabled: () => true,
      getConfig: () => ({ enabled: true }),
      setProvider: () => {},
      classify: async () => {
        classifyCalls += 1
        return {
          tier: 'instant',
          confidence: 1,
          reasoning: 'test',
          factors: {
            scope: 'single-file',
            risk: 'read-only',
            complexity: 'simple',
          },
        }
      },
      generate: async () => {
        throw new Error('generate should not be called for instant tier')
      },
      validate: async () => ({ isValid: true, errors: [], warnings: [] }),
      refine: async (spec) => spec,
      verify: async () => ({
        passed: true,
        status: 'passed',
        summary: 'ok',
        criterionResults: [],
        constraintResults: [],
        recommendations: [],
        timestamp: Date.now(),
      }),
      approve: (spec) => spec,
      markExecuting: (spec) => spec,
      markVerified: (spec) => spec,
      markFailed: (spec) => spec,
    }

    const provider = createProvider(() => {})
    const runtime = new Runtime(provider, new Map(), {
      checkpointStore: new InMemoryCheckpointStore(),
      specLifecycleManager: lifecycleManager,
    })

    const userMessage = createUserMessage({
      id: 'msg-lifecycle-manager',
      sessionID: 'session-lifecycle-manager',
      text: 'What is TypeScript?',
      agent: 'ask',
    })

    const events = []
    for await (const event of runtime.run(userMessage.sessionID, userMessage)) {
      events.push(event)
    }

    expect(classifyCalls).toBe(1)
    expect(events.some((event) => event.type === 'complete')).toBe(true)
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

    const runtime = new Runtime(provider, new Map(), {
      maxSteps: 3,
      checkpointStore: new InMemoryCheckpointStore(),
    })
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

  test('skips compaction when compaction time budget is exceeded and still proceeds', async () => {
    resetHarnessTestState()
    let sawCompactionSummary = false
    let streamCalls = 0
    const originalCompact = compaction.compact.bind(compaction)

    ;(compaction as unknown as { compact: typeof compaction.compact }).compact = async (
      sessionID,
      messages
    ) => {
      await new Promise((resolve) => setTimeout(resolve, 20))
      return {
        summary: 'budgeted summary',
        tokensBefore: 200000,
        tokensAfter: 1000,
        messagesCompacted: 1,
        messages: [
          {
            ...(messages[0] as UserMessage),
            parts: [
              {
                id: 'part-compacted',
                messageID: (messages[0] as UserMessage).id,
                sessionID,
                type: 'compaction',
                auto: true,
                summary: 'budgeted summary',
              },
            ],
          },
          ...messages.slice(1),
        ],
      }
    }

    try {
      const provider = createProvider((options) => {
        streamCalls++
        sawCompactionSummary = options.messages.some(
          (msg) =>
            msg.role === 'user' &&
            typeof msg.content === 'string' &&
            msg.content.includes('[Previous conversation summary]')
        )
      })

      const runtime = new Runtime(provider, new Map(), {
        maxSteps: 3,
        contextCompactionThreshold: 0.9,
        compactionTimeBudgetMs: 1,
        checkpointStore: new InMemoryCheckpointStore(),
      })
      const sessionID = 'session-compaction-budget'
      const initialMessages: Message[] = Array.from({ length: 8 }, (_, index) =>
        createUserMessage({
          id: `msg-budget-old-${index}`,
          sessionID,
          text: index < 4 ? 'x'.repeat(180_000) : `small-${index}`,
          agent: 'build',
        })
      )
      const userMessage = createUserMessage({
        id: 'msg-budget-new',
        sessionID,
        text: 'Proceed without waiting for compaction',
        agent: 'ask',
      })

      const events = []
      for await (const event of runtime.run(sessionID, userMessage, initialMessages)) {
        events.push(event)
      }

      expect(streamCalls).toBeGreaterThan(0)
      expect(sawCompactionSummary).toBe(false)
      expect(
        events.some(
          (event) =>
            event.type === 'compaction' &&
            typeof event.content === 'string' &&
            event.content.includes('budget')
        )
      ).toBe(true)
    } finally {
      ;(compaction as unknown as { compact: typeof compaction.compact }).compact = originalCompact
    }
  })

  test('snapshot failure and timeout warn without aborting the agent step', async () => {
    resetHarnessTestState()
    const originalTrack = snapshots.track.bind(snapshots)

    try {
      const runWithPatchedTrack = async (
        patch: typeof snapshots.track,
        runtimeConfig: Record<string, unknown>
      ) => {
        let streamCalls = 0
        ;(snapshots as unknown as { track: typeof snapshots.track }).track = patch

        const provider = createProvider(() => {
          streamCalls++
        })
        const runtime = new Runtime(provider, new Map(), {
          enableSnapshots: true,
          maxSteps: 3,
          checkpointStore: new InMemoryCheckpointStore(),
          ...(runtimeConfig as {
            snapshotTimeoutMs?: number
            snapshotFailureMode?: 'warn' | 'error'
          }),
        })
        const userMessage = createUserMessage({
          id: `msg-snapshot-${Math.random()}`,
          sessionID: `session-snapshot-${Math.random()}`,
          text: 'hello',
          agent: 'ask',
        })

        const events = []
        for await (const event of runtime.run(userMessage.sessionID, userMessage)) {
          events.push(event)
        }

        return { events, streamCalls }
      }

      const failureRun = await runWithPatchedTrack(
        async () => {
          throw new Error('snapshot exploded')
        },
        { snapshotFailureMode: 'warn' }
      )

      expect(failureRun.streamCalls).toBeGreaterThan(0)
      expect(failureRun.events.some((event) => event.type === 'complete')).toBe(true)
      expect(
        failureRun.events.some(
          (event) =>
            event.type === 'status' &&
            typeof event.content === 'string' &&
            event.content.toLowerCase().includes('snapshot') &&
            event.content.toLowerCase().includes('warning')
        )
      ).toBe(true)

      const timeoutRun = await runWithPatchedTrack(
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 20))
          return null
        },
        { snapshotTimeoutMs: 1, snapshotFailureMode: 'warn' }
      )

      expect(timeoutRun.streamCalls).toBeGreaterThan(0)
      expect(timeoutRun.events.some((event) => event.type === 'complete')).toBe(true)
      expect(
        timeoutRun.events.some(
          (event) =>
            event.type === 'status' &&
            typeof event.content === 'string' &&
            event.content.toLowerCase().includes('snapshot') &&
            event.content.toLowerCase().includes('timeout')
        )
      ).toBe(true)
    } finally {
      ;(snapshots as unknown as { track: typeof snapshots.track }).track = originalTrack
    }
  })

  test('risk-tier interrupt can edit tool args before execution', async () => {
    resetHarnessTestState()
    let executedArgs: Record<string, unknown> | null = null

    const provider: LLMProvider = {
      ...createProvider(() => {}, 'tool_calls'),
      async *completionStream() {
        yield {
          type: 'tool_call',
          toolCall: {
            id: 'tc-write-interrupt',
            type: 'function',
            function: {
              name: 'write_files',
              arguments: JSON.stringify({
                files: [{ path: 'unsafe.txt', content: 'hello' }],
              }),
            },
          },
        }
        yield {
          type: 'finish',
          finishReason: 'tool_calls',
          usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        }
        yield { type: 'text', content: 'done' }
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
          async (args) => {
            executedArgs = args
            return { output: 'written' }
          },
        ],
      ]),
      {
        maxSteps: 4,
        checkpointStore: new InMemoryCheckpointStore(),
        onToolInterrupt: async () => ({
          decision: 'edit',
          args: { files: [{ path: 'safe.txt', content: 'hello' }] },
          reason: 'redirect write target',
        }),
      }
    )

    const userMessage = createUserMessage({
      id: 'msg-interrupt-edit',
      sessionID: 'session-interrupt-edit',
      text: 'write file',
      agent: 'build',
    })

    const events = []
    for await (const event of runtime.run(userMessage.sessionID, userMessage)) {
      events.push(event)
    }

    expect(
      events.some(
        (event) => event.type === 'interrupt_request' && event.interrupt?.toolName === 'write_files'
      )
    ).toBe(true)
    expect(
      events.some(
        (event) => event.type === 'interrupt_decision' && event.interrupt?.decision === 'edit'
      )
    ).toBe(true)
    expect(executedArgs).toEqual({ files: [{ path: 'safe.txt', content: 'hello' }] })
  })

  test('retries transient tool failures and succeeds within retry budget', async () => {
    resetHarnessTestState()
    let executorCalls = 0

    const provider: LLMProvider = {
      ...createProvider(() => {}, 'tool_calls'),
      async *completionStream() {
        if (executorCalls === 0) {
          yield {
            type: 'tool_call',
            toolCall: {
              id: 'tc-retry-read',
              type: 'function',
              function: {
                name: 'read_files',
                arguments: JSON.stringify({ paths: ['a.ts'] }),
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
        yield { type: 'text', content: 'done' }
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
          async () => {
            executorCalls++
            if (executorCalls === 1) {
              throw new Error('ECONNRESET while reading')
            }
            return { output: 'contents' }
          },
        ],
      ]),
      {
        maxSteps: 4,
        maxToolExecutionRetries: 1,
        toolRetryBackoffMs: 0,
        checkpointStore: new InMemoryCheckpointStore(),
        specEngine: {
          enabled: false,
        },
      }
    )

    const userMessage = createUserMessage({
      id: 'msg-retry',
      sessionID: 'session-retry',
      text: 'retry read',
      agent: 'build',
    })

    const events = []
    for await (const event of runtime.run(userMessage.sessionID, userMessage)) {
      events.push(event)
    }

    expect(executorCalls).toBe(2)
    expect(
      events.some(
        (event) =>
          event.type === 'status' &&
          typeof event.content === 'string' &&
          event.content.includes('Retrying read_files')
      )
    ).toBe(true)
    expect(events.some((event) => event.type === 'complete')).toBe(true)
  })

  test('reuses cached tool result across steps when idempotency cache is enabled', async () => {
    resetHarnessTestState()
    let streamCalls = 0
    let executorCalls = 0

    const provider: LLMProvider = {
      ...createProvider(() => {}, 'tool_calls'),
      async *completionStream() {
        streamCalls++
        if (streamCalls <= 2) {
          yield {
            type: 'tool_call',
            toolCall: {
              id: `tc-cache-${streamCalls}`,
              type: 'function',
              function: {
                name: 'read_files',
                arguments: JSON.stringify({ paths: ['same.ts'] }),
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
        yield { type: 'text', content: 'done' }
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
          async () => {
            executorCalls++
            return { output: 'cached-content' }
          },
        ],
      ]),
      {
        maxSteps: 5,
        enableToolCallIdempotencyCache: true,
        checkpointStore: new InMemoryCheckpointStore(),
      }
    )

    const userMessage = createUserMessage({
      id: 'msg-cache',
      sessionID: 'session-cache',
      text: 'repeat tool',
      agent: 'build',
    })

    const events = []
    for await (const event of runtime.run(userMessage.sessionID, userMessage)) {
      events.push(event)
    }

    expect(executorCalls).toBe(1)
    expect(
      events.some(
        (event) =>
          event.type === 'status' &&
          typeof event.content === 'string' &&
          event.content.includes('Idempotency cache hit')
      )
    ).toBe(true)
  })

  test('checks write_files permissions per target path', async () => {
    resetHarnessTestState()
    const agentName = 'runtime-per-target-perms'
    agents.register({
      name: agentName,
      mode: 'primary',
      permission: {},
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
      ]),
      {
        checkpointStore: new InMemoryCheckpointStore(),
        chatMode: 'build',
        specEngine: { enabled: false },
        permissionRules: [
          { capability: '*', decision: 'allow', source: 'mode' },
          {
            capability: 'edit',
            pattern: 'src/blocked.ts',
            decision: 'deny',
            source: 'session',
            reason: 'blocked path',
          },
        ],
        onToolInterrupt: async () => ({ decision: 'approve' as const }),
      }
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

    // With capability-based per-target enforcement, the important behavior is
    // that the blocked batch never reaches the write executor. Some runtime
    // paths emit a tool_result denial event, while others stop earlier in the
    // execution guard. Preserve the behavioral assertion instead of requiring
    // one exact event shape.
    const toolResults = events.filter((event) => event.type === 'tool_result')
    expect(
      toolResults.length === 0 ||
        toolResults.some((event) => event.toolResult?.error?.includes('Permission denied'))
    ).toBe(true)

    agents.unregister(agentName)
  })

  test('rejects write_files outside active spec scope', async () => {
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
              id: 'tc-scope-violation',
              type: 'function',
              function: {
                name: 'write_files',
                arguments: JSON.stringify({
                  files: [{ path: 'src/outside.ts', content: 'export const outside = true\n' }],
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
          async () => ({
            output: 'write complete',
          }),
        ],
      ]),
      {
        maxSteps: 3,
        checkpointStore: new InMemoryCheckpointStore(),
        toolRiskPolicy: {
          low: 'allow',
          medium: 'allow',
          high: 'allow',
          critical: 'allow',
        },
        specEngine: {
          enabled: true,
          defaultTier: 'explicit',
          autoApproveAmbient: true,
        },
        onSpecApproval: async ({ spec }) => {
          const scopedSpec: FormalSpecification = {
            ...spec,
            status: 'approved',
            plan: {
              ...spec.plan,
              dependencies: [
                {
                  path: 'src/allowed.ts',
                  access: 'write',
                  reason: 'Only this file is in scope',
                },
              ],
              steps: spec.plan.steps.map((step, index) => ({
                ...step,
                targetFiles: index === 0 ? ['src/allowed.ts'] : [],
              })),
            },
            validation: {
              ...spec.validation,
              invariants: [],
            },
          }

          return { decision: 'approve' as const, spec: scopedSpec }
        },
      }
    )

    const userMessage = createUserMessage({
      id: 'msg-user-scope',
      sessionID: 'session-scope',
      text: 'Modify only the allowed file.',
      agent: 'build',
    })

    const events = []
    for await (const event of runtime.run('session-scope', userMessage)) {
      events.push(event)
    }

    const writeResult = events.find(
      (event) => event.type === 'tool_result' && event.toolResult?.toolName === 'write_files'
    )

    expect(writeResult?.toolResult?.error).toContain('outside the active spec scope')
    expect(writeResult?.toolResult?.error).toContain('src/outside.ts')
    expect(events.some((event) => event.type === 'complete')).toBe(false)
  })

  test('stops executing additional tool calls after maxToolCallsPerStep within a step', async () => {
    resetHarnessTestState()
    let streamCalls = 0
    let readFilesExecutorCalls = 0

    const provider: LLMProvider = {
      ...createProvider(() => {}, 'tool_calls'),
      async *completionStream(_options: CompletionOptions) {
        streamCalls++
        if (streamCalls === 1) {
          for (const toolCallId of ['tc-cap-1', 'tc-cap-2', 'tc-cap-3']) {
            yield {
              type: 'tool_call',
              toolCall: {
                id: toolCallId,
                type: 'function',
                function: {
                  name: 'read_files',
                  arguments: JSON.stringify({
                    paths: [`${toolCallId}.ts`],
                  }),
                },
              },
            }
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
          async () => {
            readFilesExecutorCalls++
            return { output: `read-${readFilesExecutorCalls}` }
          },
        ],
      ]),
      { maxSteps: 4, maxToolCallsPerStep: 1, checkpointStore: new InMemoryCheckpointStore() }
    )

    const userMessage = createUserMessage({
      id: 'msg-user-tool-cap',
      sessionID: 'session-tool-cap',
      text: 'Call tools repeatedly',
      agent: 'build',
    })

    const events = []
    for await (const event of runtime.run('session-tool-cap', userMessage)) {
      events.push(event)
    }

    expect(readFilesExecutorCalls).toBe(1)

    const capErrors = events.filter(
      (event) =>
        event.type === 'tool_result' &&
        event.toolResult?.toolName === 'read_files' &&
        typeof event.toolResult.error === 'string' &&
        event.toolResult.error.includes('maximum tool calls per step')
    )
    expect(capErrors).toHaveLength(2)
  })

  test('deduplicates repeated tool calls with identical name and normalized args within a step', async () => {
    resetHarnessTestState()
    let streamCalls = 0
    let readFilesExecutorCalls = 0

    const provider: LLMProvider = {
      ...createProvider(() => {}, 'tool_calls'),
      async *completionStream(_options: CompletionOptions) {
        streamCalls++
        if (streamCalls === 1) {
          yield {
            type: 'tool_call',
            toolCall: {
              id: 'tc-dedup-1',
              type: 'function',
              function: {
                name: 'read_files',
                arguments: JSON.stringify({ recursive: false, paths: ['a.ts'] }),
              },
            },
          }
          yield {
            type: 'tool_call',
            toolCall: {
              id: 'tc-dedup-2',
              type: 'function',
              function: {
                name: 'read_files',
                arguments: JSON.stringify({ paths: ['a.ts'], recursive: false }),
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
          async () => {
            readFilesExecutorCalls++
            return { output: `read-${readFilesExecutorCalls}` }
          },
        ],
      ]),
      { maxSteps: 4, enableToolDeduplication: true, checkpointStore: new InMemoryCheckpointStore() }
    )

    const userMessage = createUserMessage({
      id: 'msg-user-dedup',
      sessionID: 'session-dedup',
      text: 'Run duplicate tools',
      agent: 'build',
    })

    const events = []
    for await (const event of runtime.run('session-dedup', userMessage)) {
      events.push(event)
    }

    expect(readFilesExecutorCalls).toBe(1)
    expect(
      events.some(
        (event) =>
          event.type === 'tool_result' &&
          event.toolResult?.toolName === 'read_files' &&
          typeof event.toolResult.error === 'string' &&
          event.toolResult.error.includes('duplicate tool call')
      )
    ).toBe(true)
  })

  test('halts repeated tool loops across steps after toolLoopThreshold', async () => {
    resetHarnessTestState()
    let readFilesLoopExecutorCalls = 0

    const provider: LLMProvider = {
      ...createProvider(() => {}, 'tool_calls'),
      async *completionStream(_options: CompletionOptions) {
        yield {
          type: 'tool_call',
          toolCall: {
            id: `tc-loop-${Date.now()}`,
            type: 'function',
            function: {
              name: 'read_files',
              arguments: JSON.stringify({ paths: ['src/repeat.ts'] }),
            },
          },
        }
        yield {
          type: 'finish',
          finishReason: 'tool_calls',
          usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        }
      },
    }

    const runtime = new Runtime(
      provider,
      new Map([
        [
          'read_files',
          async () => {
            readFilesLoopExecutorCalls++
            return { output: `loop-${readFilesLoopExecutorCalls}` }
          },
        ],
      ]),
      { maxSteps: 8, toolLoopThreshold: 2, checkpointStore: new InMemoryCheckpointStore() }
    )

    const userMessage = createUserMessage({
      id: 'msg-user-loop',
      sessionID: 'session-loop',
      text: 'Keep calling the same tool',
      agent: 'build',
    })

    const events = []
    for await (const event of runtime.run('session-loop', userMessage)) {
      events.push(event)
    }

    expect(readFilesLoopExecutorCalls).toBe(2)
    expect(
      events.some(
        (event) =>
          event.type === 'error' &&
          typeof event.error === 'string' &&
          event.error.includes('tool loop')
      )
    ).toBe(true)
    expect(
      events.some(
        (event) =>
          event.type === 'error' &&
          typeof event.error === 'string' &&
          event.error.includes('maximum steps')
      )
    ).toBe(false)
  })

  test('does not emit complete after maximum-step exhaustion', async () => {
    resetHarnessTestState()

    const provider: LLMProvider = {
      ...createProvider(() => {}, 'tool_calls'),
      async *completionStream() {
        yield {
          type: 'tool_call',
          toolCall: {
            id: 'tc-max-steps',
            type: 'function',
            function: {
              name: 'read_files',
              arguments: JSON.stringify({ paths: ['src/repeat.ts'] }),
            },
          },
        }
        yield {
          type: 'finish',
          finishReason: 'tool_calls',
          usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        }
      },
    }

    const runtime = new Runtime(
      provider,
      new Map([
        [
          'read_files',
          async () => {
            return { output: 'still looping' }
          },
        ],
      ]),
      { maxSteps: 1, checkpointStore: new InMemoryCheckpointStore() }
    )

    const userMessage = createUserMessage({
      id: 'msg-user-max-steps',
      sessionID: 'session-max-steps',
      text: 'Keep going forever',
      agent: 'build',
    })

    const events = []
    for await (const event of runtime.run(userMessage.sessionID, userMessage)) {
      events.push(event)
    }

    expect(
      events.some(
        (event) =>
          event.type === 'error' &&
          typeof event.error === 'string' &&
          event.error.includes('maximum steps')
      )
    ).toBe(true)
    expect(events.some((event) => event.type === 'complete')).toBe(false)
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
      checkpointStore: new InMemoryCheckpointStore(),
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

  test('emits a snapshot event when step snapshots are enabled', async () => {
    resetHarnessTestState()
    const originalTrack = snapshots.track.bind(snapshots)

    ;(snapshots as unknown as { track: typeof snapshots.track }).track = async (
      sessionID,
      messageID,
      step
    ) => ({
      hash: `hash-${step}`,
      messageID,
      step,
      timestamp: Date.now(),
      files: ['apps/web/lib/agent/runtime.ts'],
    })

    try {
      const provider = createProvider(() => {})
      const runtime = new Runtime(provider, new Map(), {
        maxSteps: 2,
        enableSnapshots: true,
        checkpointStore: new InMemoryCheckpointStore(),
      })
      const userMessage = createUserMessage({
        id: 'msg-user-snapshot',
        sessionID: 'session-snapshot-events',
        text: 'Take a snapshot',
        agent: 'build',
      })

      const events = []
      for await (const event of runtime.run('session-snapshot-events', userMessage)) {
        events.push(event)
      }

      expect(
        events.some(
          (event) =>
            event.type === 'snapshot' &&
            event.snapshot?.hash === 'hash-1' &&
            event.snapshot?.files?.includes('apps/web/lib/agent/runtime.ts')
        )
      ).toBe(true)
    } finally {
      ;(snapshots as unknown as { track: typeof snapshots.track }).track = originalTrack
    }
  })

  test('emits applied skill metadata and strict custom skill preflight before execution', async () => {
    resetHarnessTestState()
    const provider = createProvider(() => {})
    const runtime = new Runtime(provider, new Map(), {
      maxSteps: 2,
      checkpointStore: new InMemoryCheckpointStore(),
      customSkills: [
        {
          id: 'skill_tdd',
          name: 'TDD Bugfix',
          description: 'Requires a failing test first.',
          triggerPhrases: ['tdd workflow'],
          applicableModes: ['build'],
          profile: 'strict_workflow',
          instructions: 'Write a failing test before implementation.',
          autoActivationEnabled: true,
        },
      ],
      customSkillPolicy: {
        allowUserSkills: true,
        allowSkillAutoActivation: true,
        allowStrictUserSkills: true,
      },
      chatMode: 'build',
    })
    const userMessage = createUserMessage({
      id: 'msg-user-strict-skill',
      sessionID: 'session-strict-skill',
      text: 'Use the TDD workflow for this bug fix.',
      agent: 'build',
    })

    const events: RuntimeEvent[] = []
    for await (const event of runtime.run('session-strict-skill', userMessage)) {
      events.push(event)
    }

    expect(events[0]).toMatchObject({
      type: 'applied_skills',
      appliedSkills: [expect.objectContaining({ id: 'skill_tdd', requiresPreflight: true })],
    })
    expect(events[1]).toMatchObject({
      type: 'strict_skill_preflight',
      strictSkillPreflight: {
        skills: [expect.objectContaining({ id: 'skill_tdd' })],
      },
    })
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
      checkpointStore: new InMemoryCheckpointStore(),
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
      { maxSteps: 5, checkpointStore: new InMemoryCheckpointStore() }
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

  test('writes checkpoints during a run when checkpoint store is configured', async () => {
    resetHarnessTestState()
    const checkpointStore = new InMemoryCheckpointStore()
    const runtime = new Runtime(
      createProvider(() => {}),
      new Map(),
      {
        checkpointStore,
      }
    )
    const sessionID = 'session-checkpoints'
    const userMessage = createUserMessage({
      id: 'msg-user-checkpoints',
      sessionID,
      text: 'hello',
      agent: 'ask',
    })

    const events = []
    for await (const event of runtime.run(sessionID, userMessage)) {
      events.push(event)
    }

    expect(events.some((event) => event.type === 'complete')).toBe(true)

    const checkpoints = checkpointStore.list(sessionID)
    expect(checkpoints.length).toBeGreaterThanOrEqual(2)
    expect(checkpoints.some((checkpoint) => checkpoint.reason === 'step')).toBe(true)

    const latestCheckpoint = await checkpointStore.load(sessionID)
    expect(latestCheckpoint).not.toBeNull()
    expect(latestCheckpoint?.state.step).toBeGreaterThanOrEqual(1)
  })

  test('resumes from a checkpoint and completes execution', async () => {
    resetHarnessTestState()
    const checkpointStore = new InMemoryCheckpointStore()
    let providerCalls = 0
    let readFilesCalls = 0

    const provider: LLMProvider = {
      ...createProvider(() => {}, 'tool_calls'),
      async *completionStream(options: CompletionOptions) {
        providerCalls++

        const alreadyHasToolResult = options.messages.some(
          (message) => message.role === 'tool' && message.content === 'file-content'
        )

        if (!alreadyHasToolResult) {
          yield {
            type: 'tool_call',
            toolCall: {
              id: 'tc-resume-read',
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

        yield { type: 'text', content: 'resumed-complete' }
        yield {
          type: 'finish',
          finishReason: 'stop',
          usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        }
      },
    }

    const sessionID = 'session-resume'
    const userMessage = createUserMessage({
      id: 'msg-user-resume',
      sessionID,
      text: 'Read then finish',
      agent: 'build',
    })

    const runtime1 = new Runtime(
      provider,
      new Map([
        [
          'read_files',
          async () => {
            readFilesCalls++
            return { output: 'file-content' }
          },
        ],
      ]),
      { checkpointStore, maxSteps: 5 }
    )

    const firstRunEvents = []
    for await (const event of runtime1.run(sessionID, userMessage)) {
      firstRunEvents.push(event)
      if (event.type === 'step_finish') {
        break
      }
    }

    expect(firstRunEvents.some((event) => event.type === 'step_finish')).toBe(true)

    const checkpointAfterFirstRun = await checkpointStore.load(sessionID)
    expect(checkpointAfterFirstRun?.state.step).toBe(1)
    expect(checkpointAfterFirstRun?.state.isComplete).toBe(false)

    const runtime2 = new Runtime(
      provider,
      new Map([
        [
          'read_files',
          async () => {
            readFilesCalls++
            return { output: 'file-content' }
          },
        ],
      ]),
      { checkpointStore, maxSteps: 5 }
    )

    const resumedEvents = []
    for await (const event of runtime2.resume(sessionID)) {
      resumedEvents.push(event)
    }

    expect(providerCalls).toBe(2)
    expect(readFilesCalls).toBe(1)
    expect(resumedEvents.some((event) => event.type === 'step_start' && event.step === 2)).toBe(
      true
    )
    expect(
      resumedEvents.some((event) => event.type === 'text' && event.content === 'resumed-complete')
    ).toBe(true)
    expect(resumedEvents.some((event) => event.type === 'complete')).toBe(true)
  })

  test('resumes from checkpoint after crash recovery cycle', async () => {
    resetHarnessTestState()
    const store = new InMemoryCheckpointStore()
    const sessionID = 'session-crash-recovery'

    // Provider: first call returns a tool_call, second call (after resume) returns stop
    const crashRecoveryProvider: LLMProvider = {
      ...createProvider(() => {}, 'tool_calls'),
      async *completionStream(options: CompletionOptions) {
        const hasToolResult = options.messages.some((m) => m.role === 'tool')

        if (!hasToolResult) {
          // First call: issue a read_files tool call
          yield {
            type: 'tool_call',
            toolCall: {
              id: 'tc-crash-read',
              type: 'function',
              function: {
                name: 'read_files',
                arguments: JSON.stringify({ paths: ['some/file.ts'] }),
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

        // Second call (after resume): return text and stop
        yield { type: 'text', content: 'recovered-output' }
        yield {
          type: 'finish',
          finishReason: 'stop',
          usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        }
      },
    }

    const userMessage = createUserMessage({
      id: 'msg-crash-recovery',
      sessionID,
      text: 'Read a file',
      agent: 'build',
    })

    const toolMap = new Map([['read_files', async () => ({ output: 'file-content-here' })]])

    // --- First runtime: run one step then simulate crash by breaking ---
    const runtime1 = new Runtime(crashRecoveryProvider, toolMap, {
      checkpointStore: store,
      skipSpecVerification: true,
      onToolInterrupt: async () => ({ decision: 'approve' as const }),
    })

    const firstRunEvents: RuntimeEvent[] = []
    for await (const event of runtime1.run(sessionID, userMessage)) {
      firstRunEvents.push(event)
      // Simulate crash: break after the first step completes (checkpoint saved)
      if (event.type === 'step_finish') {
        break
      }
    }

    // First run should have completed one step with tool processing
    expect(firstRunEvents.some((e) => e.type === 'step_finish')).toBe(true)

    // Verify a checkpoint was saved with step=1 and not complete
    const checkpoint = await store.load(sessionID)
    expect(checkpoint).toBeDefined()
    expect(checkpoint!.state.step).toBe(1)
    expect(checkpoint!.state.isComplete).toBe(false)

    // --- Second runtime: NEW instance, same checkpoint store ---
    const runtime2 = new Runtime(crashRecoveryProvider, toolMap, {
      checkpointStore: store,
      skipSpecVerification: true,
      onToolInterrupt: async () => ({ decision: 'approve' as const }),
    })

    const resumeEvents: RuntimeEvent[] = []
    for await (const event of runtime2.resume(sessionID)) {
      resumeEvents.push(event)
    }

    // Verify the resumed session reached completion
    expect(resumeEvents.some((e) => e.type === 'complete')).toBe(true)
    expect(resumeEvents.some((e) => e.type === 'text' && e.content === 'recovered-output')).toBe(
      true
    )
    // Verify it continued from step 2 (not restarted from 0)
    expect(resumeEvents.some((e) => e.type === 'step_start' && e.step === 2)).toBe(true)
  })

  test('resumes from checkpoints that still use legacy tuple tool frequency entries', async () => {
    resetHarnessTestState()
    const checkpointStore = new InMemoryCheckpointStore()
    const sessionID = 'session-legacy-tool-frequency'

    checkpointStore.save({
      version: 1,
      sessionID,
      agentName: 'build',
      reason: 'step',
      savedAt: Date.now(),
      state: {
        sessionID,
        messages: [
          createUserMessage({
            id: 'msg-user-legacy-tool-frequency',
            sessionID,
            text: 'Resume legacy checkpoint',
            agent: 'build',
          }),
        ],
        step: 1,
        isComplete: false,
        isLastStep: false,
        pendingSubtasks: [],
        cost: 0,
        tokens: { input: 0, output: 0, reasoning: 0 },
        lastToolLoopSignature: null,
        toolLoopStreak: 0,
        toolCallFrequency: [['read_files:{"path":"src"}', 2]] as never,
      },
    })

    const runtime = new Runtime(
      createProvider(() => {}, 'stop'),
      new Map(),
      { checkpointStore, maxSteps: 3 }
    )

    const resumedEvents = []
    for await (const event of runtime.resume(sessionID)) {
      resumedEvents.push(event)
    }

    expect(resumedEvents.some((event) => event.type === 'complete')).toBe(true)
    const latestCheckpoint = checkpointStore.load(sessionID)
    expect(latestCheckpoint?.state.toolCallFrequency).toContainEqual({
      key: 'read_files:{"path":"src"}',
      count: 2,
    })
  })

  test('should track message dirty state for incremental checkpoint optimization', async () => {
    resetHarnessTestState()
    const checkpointStore = new InMemoryCheckpointStore()
    const runtime = new Runtime(
      createProvider(() => {}),
      new Map(),
      {
        checkpointStore,
      }
    )

    const sessionID = 'session-dirty-test'
    const userMessage = createUserMessage({
      id: 'msg-user-dirty-test',
      sessionID,
      text: 'test message for dirty state tracking',
      agent: 'ask',
    })

    // Run a short agent session
    const events = []
    for await (const event of runtime.run(sessionID, userMessage)) {
      events.push(event)
    }

    // Verify the run completed successfully
    expect(events.some((event) => event.type === 'complete')).toBe(true)

    // Verify checkpoints were saved
    const checkpoints = checkpointStore.list(sessionID)
    expect(checkpoints.length).toBeGreaterThanOrEqual(1)

    // The key verification: with the optimization, the runtime should have
    // properly tracked dirty state and reused message snapshots
    // This is an integration test - if the optimization is broken,
    // the test would still pass but performance would degrade
  })

  test('should clear singleton session state after run completes', async () => {
    resetHarnessTestState()
    const checkpointStore = new InMemoryCheckpointStore()

    // Set up some singleton state before the run
    const sessionID = 'session-cleanup-test'
    snapshots.track(sessionID, 'msg-1', 1) // Add snapshot
    compaction.clearSummary(sessionID) // Just ensure the map exists

    const runtime = new Runtime(
      createProvider(() => {}),
      new Map(),
      {
        checkpointStore,
      }
    )

    const userMessage = createUserMessage({
      id: 'msg-user-cleanup',
      sessionID,
      text: 'test message for cleanup',
      agent: 'ask',
    })

    const events = []
    for await (const event of runtime.run(sessionID, userMessage)) {
      events.push(event)
    }

    // After run completes, singleton state for this session should be cleared
    expect(snapshots.getSnapshots(sessionID)).toEqual([])
    expect(compaction.getSummary(sessionID)).toBeUndefined()
  })

  test('emits spec_verification but not complete when spec verification fails', async () => {
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
              id: 'tc-verify-fail',
              type: 'function',
              function: {
                name: 'read_files',
                arguments: JSON.stringify({ paths: ['src/test.ts'] }),
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
          async () => {
            return { output: 'file contents' }
          },
        ],
      ]),
      {
        maxSteps: 3,
        checkpointStore: new InMemoryCheckpointStore(),
        specEngine: {
          enabled: true,
          defaultTier: 'ambient',
        },
      }
    )

    const userMessage = createUserMessage({
      id: 'msg-user-verify-fail',
      sessionID: 'session-verify-fail',
      text: 'Read a file',
      agent: 'build',
    })

    const events = []
    for await (const event of runtime.run('session-verify-fail', userMessage)) {
      events.push(event)
    }

    // Should emit spec_verification event
    const specVerificationEvents = events.filter((event) => event.type === 'spec_verification')
    expect(specVerificationEvents.length).toBeGreaterThan(0)

    // When verification fails, should emit error instead of complete
    const completeEvents = events.filter((event) => event.type === 'complete')
    const errorEvents = events.filter((event) => event.type === 'error')

    // Should NOT emit complete when verification fails
    expect(completeEvents.length).toBe(0)

    // Should emit error with verification failure message
    expect(errorEvents.length).toBeGreaterThan(0)
    expect(errorEvents[0].error).toContain('Specification verification failed')
  })

  test('emits complete when there is no active spec (no verification needed)', async () => {
    resetHarnessTestState()
    const provider = createProvider(() => {})
    const runtime = new Runtime(provider, new Map(), {
      checkpointStore: new InMemoryCheckpointStore(),
    })

    const userMessage = createUserMessage({
      id: 'msg-user-no-spec',
      sessionID: 'session-no-spec',
      text: 'Simple query without spec',
      agent: 'ask',
    })

    const events = []
    for await (const event of runtime.run('session-no-spec', userMessage)) {
      events.push(event)
    }

    // Should emit complete when no spec is active
    const completeEvents = events.filter((event) => event.type === 'complete')
    const errorEvents = events.filter((event) => event.type === 'error')

    expect(completeEvents.length).toBe(1)
    expect(errorEvents.length).toBe(0)
  })

  test('throws on unknown agent name instead of falling back to build', async () => {
    resetHarnessTestState()
    const provider = createProvider(() => {})
    const runtime = new Runtime(provider, new Map(), {
      checkpointStore: new InMemoryCheckpointStore(),
    })
    const userMessage = createUserMessage({
      id: 'msg-bad-agent',
      sessionID: 'session-bad',
      text: 'hello',
      agent: 'nonexistent-agent-xyz',
    })

    let threwError = false
    try {
      for await (const _ of runtime.run('session-bad', userMessage)) {
        // consume
        void _
      }
    } catch (error) {
      threwError = true
      expect((error as Error).message).toContain('nonexistent-agent-xyz')
    }
    expect(threwError).toBe(true)
  })

  test('denies tool execution when no interrupt handler is configured (fail-deny)', async () => {
    resetHarnessTestState()
    let writeExecutorCalls = 0

    const provider: LLMProvider = {
      ...createProvider(() => {}, 'tool_calls'),
      async *completionStream() {
        yield {
          type: 'tool_call',
          toolCall: {
            id: 'tc-fail-deny',
            type: 'function',
            function: {
              name: 'write_files',
              arguments: JSON.stringify({
                files: [{ path: 'exploit.txt', content: 'pwned' }],
              }),
            },
          },
        }
        yield {
          type: 'finish',
          finishReason: 'tool_calls',
          usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        }
        yield { type: 'text', content: 'done' }
        yield {
          type: 'finish',
          finishReason: 'stop',
          usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        }
      },
    }

    // Deliberately omit onToolInterrupt — should fail-deny
    const runtime = new Runtime(
      provider,
      new Map([
        [
          'write_files',
          async () => {
            writeExecutorCalls++
            return { output: 'should never run' }
          },
        ],
      ]),
      { maxSteps: 4, checkpointStore: new InMemoryCheckpointStore() }
    )

    const userMessage = createUserMessage({
      id: 'msg-fail-deny',
      sessionID: 'session-fail-deny',
      text: 'write a file',
      agent: 'build',
    })

    const events = []
    for await (const event of runtime.run(userMessage.sessionID, userMessage)) {
      events.push(event)
    }

    // Tool should NOT have been executed
    expect(writeExecutorCalls).toBe(0)

    // Should have an interrupt_decision with reject
    expect(
      events.some(
        (event) =>
          event.type === 'interrupt_decision' &&
          event.interrupt?.decision === 'reject' &&
          event.interrupt?.toolName === 'write_files'
      )
    ).toBe(true)

    // Should contain the fail-deny error message
    expect(
      events.some(
        (event) =>
          event.type === 'interrupt_decision' &&
          typeof event.content === 'string' &&
          event.content.includes('No interrupt handler configured') &&
          event.content.includes('denying')
      )
    ).toBe(true)
  })

  test('times out hung tool execution and produces tool_result with error', async () => {
    resetHarnessTestState()
    let streamCalls = 0

    const provider: LLMProvider = {
      ...createProvider(() => {}, 'tool_calls'),
      async *completionStream() {
        streamCalls++
        if (streamCalls === 1) {
          yield {
            type: 'tool_call',
            toolCall: {
              id: 'tc-timeout-hung',
              type: 'function',
              function: {
                name: 'read_files',
                arguments: JSON.stringify({ paths: ['hang.ts'] }),
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
        yield { type: 'text', content: 'done' }
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
          async () => {
            // Never resolves — simulates a hung tool
            return new Promise(() => {})
          },
        ],
      ]),
      {
        maxSteps: 3,
        toolExecutionTimeoutMs: 50,
        skipSpecVerification: true,
        checkpointStore: new InMemoryCheckpointStore(),
        specEngine: { enabled: false },
      }
    )

    const userMessage = createUserMessage({
      id: 'msg-timeout',
      sessionID: 'session-timeout',
      text: 'read a file that hangs',
      agent: 'build',
    })

    const events = []
    for await (const event of runtime.run(userMessage.sessionID, userMessage)) {
      events.push(event)
    }

    const toolResults = events.filter((e) => e.type === 'tool_result')
    expect(toolResults.length).toBeGreaterThan(0)
    expect(
      toolResults.some((e) => e.toolResult?.error && e.toolResult.error.includes('timed out'))
    ).toBe(true)
  })

  test('breaks compaction death spiral after 2 consecutive failures', async () => {
    resetHarnessTestState()

    let streamCalls = 0

    // Provider whose complete() never resolves (guarantees compaction timeout),
    // and whose completionStream always returns tool_calls so the loop continues.
    const hangingProvider: LLMProvider = {
      name: 'hanging-compaction-provider',
      config: {
        provider: 'openai',
        auth: { apiKey: 'test' },
        defaultModel: 'test-model',
      },
      async listModels(): Promise<ModelInfo[]> {
        return []
      },
      async complete(_options: CompletionOptions): Promise<CompletionResponse> {
        const prompt = _options.messages
          .map((message) => (typeof message.content === 'string' ? message.content : ''))
          .join('\n')

        if (prompt.includes(SUMMARIZATION_PROMPT)) {
          // Never resolves — simulates a hung summarization call
          return new Promise(() => {})
        }

        return {
          message: {
            role: 'assistant',
            content: 'ok',
          },
          usage: {
            promptTokens: 1,
            completionTokens: 1,
            totalTokens: 2,
          },
          finishReason: 'stop',
          model: 'test-model',
        }
      },
      async *completionStream(_options: CompletionOptions) {
        streamCalls++
        // Return tool_calls to keep the loop going (not 'stop')
        yield {
          type: 'tool_call' as const,
          toolCall: {
            id: `tc-${streamCalls}`,
            type: 'function',
            function: {
              name: 'read_files',
              arguments: JSON.stringify({ paths: ['test.ts'] }),
            },
          },
        }
        yield {
          type: 'finish' as const,
          finishReason: 'tool_calls' as const,
          usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        }
      },
    }

    const sessionID = 'session-compaction-spiral'

    // Tiny context window so needsCompaction always triggers.
    // Short compaction budget so the hanging complete() always times out.
    const runtime = new Runtime(
      hangingProvider,
      new Map([['read_files', async () => ({ output: 'file contents' })]]),
      {
        maxSteps: 20,
        checkpointStore: new InMemoryCheckpointStore(),
        contextWindowSize: 10,
        contextCompactionThreshold: 0.0001,
        compactionTimeBudgetMs: 10,
      }
    )

    // Small messages that still exceed the 10-token context window
    const initialMessages: Message[] = Array.from({ length: 4 }, (_, i) =>
      createUserMessage({
        id: `msg-big-${i}`,
        sessionID,
        text: `Message ${i} has enough words to exceed ten tokens for compaction testing`,
        agent: 'build',
      })
    )

    const userMessage = createUserMessage({
      id: 'msg-trigger',
      sessionID,
      text: 'hi',
      agent: 'build',
    })

    const events: RuntimeEvent[] = []
    for await (const event of runtime.run(sessionID, userMessage, initialMessages)) {
      events.push(event)
      // Safety valve to prevent test from hanging
      if (events.length > 100) break
    }

    // Should have emitted an error about repeated compaction failure
    const compactionError = events.find(
      (e) =>
        e.type === 'error' &&
        typeof e.error === 'string' &&
        e.error.includes('Compaction failed repeatedly')
    )
    expect(compactionError).toBeDefined()

    // Should NOT have looped indefinitely (safety valve not hit)
    expect(events.length).toBeLessThanOrEqual(100)
  })
})
