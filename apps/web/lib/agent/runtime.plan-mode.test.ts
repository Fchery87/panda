import { describe, expect, it } from 'bun:test'
import type { CompletionOptions, LLMProvider, ProviderConfig, StreamChunk } from '../llm/types'
import { AgentRuntime } from './runtime'
import { shouldRewriteDiscussResponse } from './runtime/rewrite-guardrails'

function makeFinish(): StreamChunk {
  return {
    type: 'finish',
    finishReason: 'stop',
    usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
  }
}

describe('Plan Mode rewrite guardrails', () => {
  it('detects implementation output in plan responses', () => {
    expect(shouldRewriteDiscussResponse('no code here')).toBe(false)
    expect(shouldRewriteDiscussResponse('```js\nconsole.log(1)\n```')).toBe(true)
    expect(shouldRewriteDiscussResponse('```tsx\nexport function X() {}\n```')).toBe(true)
  })

  it('filters fenced code blocks inline without triggering a rewrite', async () => {
    // Architect mode uses inline filtering: fence content is dropped from the stream
    // without aborting and re-running the LLM. One LLM call, no reset event.
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
        yield {
          type: 'text',
          content:
            '## Plan\nHere is the approach:\n```ts\nconst x = 1\n```\n\nKey files: apps/web/app/auth/page.tsx',
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
      chatMode: 'plan',
      provider: 'zai',
      userMessage: 'help me plan',
    })) {
      events.push(evt)
    }

    expect(callCount).toBe(1)
    expect(events.some((e: any) => e.type === 'reset')).toBe(false)

    const streamedText = events
      .filter((e: any) => e.type === 'text')
      .map((e: any) => e.content ?? '')
      .join('')

    expect(streamedText).not.toContain('```')
    expect(streamedText).not.toContain('const x = 1')
    expect(streamedText).toContain('## Plan')
    expect(streamedText).toContain('Key files: apps/web/app/auth/page.tsx')
  })

  it('does not stream fenced code to the UI', async () => {
    // Architect mode uses inline filtering — no reset or second LLM call.
    // Text before the fence streams; the fence and its body are silently dropped.
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
        yield { type: 'text', content: "Ok. Here's the code:\n```js\nconsole.log(1)\n```" }
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
      chatMode: 'plan',
      provider: 'zai',
      userMessage: 'help me plan',
    })) {
      events.push(evt)
    }

    expect(callCount).toBe(1)
    expect(events.some((e) => e.type === 'reset')).toBe(false)

    const streamedText = events
      .filter((e) => e.type === 'text')
      .map((e) => e.content ?? '')
      .join('')

    expect(streamedText.includes('```')).toBe(false)
    expect(streamedText).not.toContain('console.log(1)')
    expect(streamedText).toContain("Ok. Here's the code:")
  })
})
