import { describe, expect, it } from 'bun:test'
import type { CompletionOptions, LLMProvider, ProviderConfig, StreamChunk } from '../llm/types'
import { AgentRuntime, shouldRewriteDiscussResponse } from './runtime'

function makeFinish(): StreamChunk {
  return {
    type: 'finish',
    finishReason: 'stop',
    usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
  }
}

describe('Plan Mode rewrite guardrails', () => {
  it('detects implementation output in discuss responses', () => {
    expect(shouldRewriteDiscussResponse('no code here')).toBe(false)
    expect(shouldRewriteDiscussResponse('```js\nconsole.log(1)\n```')).toBe(true)
    expect(shouldRewriteDiscussResponse('```tsx\nexport function X() {}\n```')).toBe(true)
  })

  it('retries once when discuss output contains code fences', async () => {
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
          content:
            '## Outcome\nPlan auth migration\n\n## Constraints To Confirm\n- Use Better Auth\n\n## Affected Areas\n- apps/web/app/auth/page.tsx\n\n## Execution Steps\n1. Update auth route\n\n## Risks\n- Session migration edge cases\n\n## Checks\n- Run auth tests\n',
        }
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
        applyPatch: async () => ({ success: true, appliedHunks: 1, fuzzyMatches: 0 }),
        writeFiles: async () => [],
        runCommand: async () => ({ stdout: '', stderr: '', exitCode: 0, durationMs: 0 }),
        updateMemoryBank: async () => ({ success: true }),
      }
    )

    const events = []
    for await (const evt of runtime.run({
      projectId: 'p',
      chatId: 'c',
      userId: 'u',
      chatMode: 'architect',
      provider: 'zai',
      userMessage: 'help me plan',
    })) {
      events.push(evt)
    }

    expect(callCount).toBe(2)
    expect(events.some((e: any) => e.type === 'reset')).toBe(true)
    const complete = events.find((e: any) => e.type === 'complete')
    expect(complete?.content).toContain('apps/web/app/auth/page.tsx')
    expect(complete?.content).toContain('Run auth tests')
    expect(complete?.content).not.toContain('```')
  })

  it('does not stream fenced code to the UI before rewrite', async () => {
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
          // Simulate model starting to output an implementation.
          yield { type: 'text', content: "Ok. Here's the code:\n```js\nconsole.log(1)\n```" }
          yield makeFinish()
          return
        }
        // Rewrite: plan only.
        yield {
          type: 'text',
          content:
            '## Outcome\nPlan auth migration\n\n## Constraints To Confirm\n- Use Better Auth\n\n## Affected Areas\n- apps/web/app/auth/page.tsx\n\n## Execution Steps\n1. Update auth route\n\n## Risks\n- Session migration edge cases\n\n## Checks\n- Run auth tests\n',
        }
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
        applyPatch: async () => ({ success: true, appliedHunks: 1, fuzzyMatches: 0 }),
        writeFiles: async () => [],
        runCommand: async () => ({ stdout: '', stderr: '', exitCode: 0, durationMs: 0 }),
        updateMemoryBank: async () => ({ success: true }),
      }
    )

    const events: any[] = []
    for await (const evt of runtime.run({
      projectId: 'p',
      chatId: 'c',
      userId: 'u',
      chatMode: 'architect',
      provider: 'zai',
      userMessage: 'help me plan',
    })) {
      events.push(evt)
    }

    expect(callCount).toBe(2)
    expect(events.some((e) => e.type === 'reset')).toBe(true)

    // The user should not see any code fences stream in plan mode.
    const streamedText = events
      .filter((e) => e.type === 'text')
      .map((e) => e.content ?? '')
      .join('')
    expect(streamedText.includes('```')).toBe(false)
    expect(streamedText).toContain('apps/web/app/auth/page.tsx')
    expect(streamedText).toContain('Run auth tests')
  })
})
