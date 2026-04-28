import { describe, expect, test } from 'bun:test'

import { OpenAICompatibleProvider } from './openai-compatible'

const originalFetch = globalThis.fetch
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')

function restoreGlobals() {
  globalThis.fetch = originalFetch
  if (originalWindow) {
    Object.defineProperty(globalThis, 'window', originalWindow)
  } else {
    delete (globalThis as { window?: unknown }).window
  }
}

describe('OpenAICompatibleProvider browser transport', () => {
  test('streams through the same-origin proxy instead of calling upstream APIs from the browser', async () => {
    Object.defineProperty(globalThis, 'window', {
      value: {},
      configurable: true,
    })

    const requestedUrls: string[] = []
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      requestedUrls.push(String(input))
      return new Response(
        [
          'data: {"type":"text","content":"proxied"}\n\n',
          'data: {"type":"finish","finishReason":"stop","usage":{"promptTokens":1,"completionTokens":1,"totalTokens":2}}\n\n',
          'data: [DONE]\n\n',
        ].join(''),
        {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
        }
      )
    }) as typeof fetch

    try {
      const provider = new OpenAICompatibleProvider({
        provider: 'crofai',
        auth: { apiKey: 'test-key', baseUrl: 'https://crof.ai/v1' },
        defaultModel: 'kimi-k2.5',
      })

      const chunks = []
      for await (const chunk of provider.completionStream({
        model: 'kimi-k2.5',
        messages: [{ role: 'user', content: 'hello' }],
        stream: true,
      })) {
        chunks.push(chunk)
      }

      expect(requestedUrls).toEqual(['/api/llm/openai-compatible'])
      expect(chunks[0]).toEqual({ type: 'text', content: 'proxied' })
      expect(chunks.at(-1)).toEqual({
        type: 'finish',
        finishReason: 'stop',
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      })
    } finally {
      restoreGlobals()
    }
  })
})
