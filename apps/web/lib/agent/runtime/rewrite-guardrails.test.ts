import { describe, expect, test } from 'bun:test'
import {
  inferPendingToolCallsFromText,
  shouldRetryBuildForToolUse,
  shouldTriggerRewrite,
} from './rewrite-guardrails'
import type { PromptContext } from '../prompt-library'

function createPromptContext(overrides: Partial<PromptContext>): PromptContext {
  return {
    chatMode: 'build',
    userMessage: 'Implement the approved plan',
    projectName: 'Panda',
    projectDescription: undefined,
    files: [],
    messages: [],
    memoryBank: undefined,
    architectBrainstormEnabled: false,
    ...overrides,
  } as PromptContext
}

describe('runtime rewrite guardrails', () => {
  test('retries build output that looks like planning when execution was requested', () => {
    expect(
      shouldRetryBuildForToolUse({
        promptContext: createPromptContext({}),
        content: '### Proposed Plan\n\nI will begin by inspecting the files.',
        pendingToolCalls: [],
      })
    ).toBe(true)
  })

  test('does not retry build planning text once tool calls are pending', () => {
    expect(
      shouldRetryBuildForToolUse({
        promptContext: createPromptContext({}),
        content: '### Proposed Plan\n\nI will begin by inspecting the files.',
        pendingToolCalls: [
          {
            id: 'call_1',
            type: 'function',
            function: { name: 'read_files', arguments: '{}' },
          },
        ],
      })
    ).toBe(false)
  })

  test('detects valid inline tool calls and ignores unsupported or invalid calls', () => {
    const calls = inferPendingToolCallsFromText(`
      {"name":"read_files","arguments":{"paths":["apps/web/app/page.tsx"]}}
      {"name":"unknown_tool","arguments":{"x":1}}
      {"name":"write_files","arguments":not-json}
    `)

    expect(calls).toHaveLength(1)
    expect(calls[0]?.function.name).toBe('read_files')
  })

  test('triggers rewrite for build fenced output and plan fenced output', () => {
    expect(
      shouldTriggerRewrite({
        promptContext: createPromptContext({ chatMode: 'build' }),
        content: '```ts\nexport const x = 1\n```',
        sawToolCall: false,
      })
    ).toBe(true)

    expect(
      shouldTriggerRewrite({
        promptContext: createPromptContext({ chatMode: 'plan' }),
        content: '```ts\nexport const x = 1\n```',
        sawToolCall: false,
      })
    ).toBe(true)
  })
})
