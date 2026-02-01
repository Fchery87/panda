/// <reference types="node" />

/**
 * Convex LLM HTTP Action
 *
 * HTTP action for streaming chat completions.
 * Streams responses from OpenAI-compatible APIs.
 *
 * @file convex/llm.ts
 */

import { httpAction } from './_generated/server'

/**
 * Message type for chat requests
 */
interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  name?: string
  tool_call_id?: string
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: {
      name: string
      arguments: string
    }
  }>
}

/**
 * Chat request body
 */
interface ChatRequest {
  messages: ChatMessage[]
  model?: string
  mode?: 'discuss' | 'build'
  temperature?: number
  maxTokens?: number
  provider?: 'openai' | 'openrouter' | 'together' | 'zai'
  apiKey?: string
}

/**
 * Get system prompt based on mode
 */
function getSystemPrompt(mode: 'discuss' | 'build' = 'build'): string {
  if (mode === 'discuss') {
    return `You are an expert software architect and planning assistant. 
Help users think through their approach, suggest best practices, and break down complex tasks.
Be thoughtful and thorough. Don't write code unless specifically asked.`
  }

  return `You are an expert software engineer. Write complete, working code.
Follow existing code style and patterns. Add comments for complex logic.
When modifying files, provide the complete new content.`
}

/**
 * Get provider configuration
 */
function getProviderConfig(provider: string, apiKey?: string) {
  const configs: Record<string, { baseURL: string; defaultModel: string }> = {
    openai: {
      baseURL: 'https://api.openai.com/v1',
      defaultModel: 'gpt-4o-mini',
    },
    openrouter: {
      baseURL: 'https://openrouter.ai/api/v1',
      defaultModel: 'openai/gpt-4o-mini',
    },
    together: {
      baseURL: 'https://api.together.xyz/v1',
      defaultModel: 'meta-llama/Llama-3.1-8B-Instruct-Turbo',
    },
    zai: {
      baseURL: 'https://api.z.ai/api/paas/v4',
      defaultModel: 'glm-4.7',
    },
  }

  // For Z.ai, check both API key and coding plan key
  const zaiApiKey =
    provider === 'zai'
      ? apiKey || process.env.ZAI_API_KEY || process.env.ZAI_CODING_PLAN_KEY || ''
      : ''

  return {
    ...(configs[provider] || configs.openai),
    apiKey: zaiApiKey || apiKey || process.env.OPENAI_API_KEY || '',
  }
}

/**
 * Stream chat completion
 *
 * HTTP Action that streams LLM responses using Server-Sent Events (SSE).
 */
export const streamChat = httpAction(async (ctx, request): Promise<Response> => {
  try {
    // Parse request body
    const body = (await request.json()) as ChatRequest
    const {
      messages,
      model,
      mode = 'build',
      temperature = 0.7,
      maxTokens = 4096,
      provider = 'openai',
      apiKey,
    } = body

    // Get provider configuration
    const config = getProviderConfig(provider, apiKey)
    const selectedModel = model || config.defaultModel

    // Add system message (skip for Z.ai as it doesn't support system role)
    const systemMessage: ChatMessage | null =
      provider === 'zai' ? null : { role: 'system', content: getSystemPrompt(mode) }

    const fullMessages = systemMessage ? [systemMessage, ...messages] : messages

    // Make request to LLM API
    const response = await fetch(`${config.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
        ...(provider === 'openrouter'
          ? {
              'HTTP-Referer': 'https://panda.ai',
              'X-Title': 'Panda.ai',
            }
          : {}),
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: fullMessages,
        temperature,
        max_tokens: maxTokens,
        stream: true,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      return new Response(JSON.stringify({ error: `LLM API error: ${error}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Create SSE response
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader()
        if (!reader) {
          controller.close()
          return
        }

        const encoder = new TextEncoder()

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            // Parse SSE chunks and forward
            const chunk = new TextDecoder().decode(value)
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') {
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                  continue
                }

                try {
                  const parsed = JSON.parse(data)
                  const content = parsed.choices?.[0]?.delta?.content
                  if (content) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`))
                  }
                } catch {
                  // Skip malformed JSON
                }
              }
            }
          }
        } finally {
          reader.releaseLock()
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Stream chat error:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

/**
 * Health check endpoint
 */
export const health = httpAction(async (_ctx, _request): Promise<Response> => {
  return new Response(JSON.stringify({ status: 'ok', timestamp: Date.now() }), {
    headers: { 'Content-Type': 'application/json' },
  })
})

/**
 * List available models
 */
export const listModels = httpAction(async (ctx, request): Promise<Response> => {
  try {
    const url = new URL(request.url)
    const provider = url.searchParams.get('provider') || 'openai'
    const apiKey = url.searchParams.get('apiKey') || process.env.OPENAI_API_KEY

    const config = getProviderConfig(provider, apiKey || undefined)

    const response = await fetch(`${config.baseURL}/models`, {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
    })

    if (!response.ok) {
      // Return default models if API doesn't support listing
      const defaultModels = [
        { id: 'gpt-4o', name: 'GPT-4o' },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
      ]

      return new Response(JSON.stringify({ models: defaultModels }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const data = await response.json()
    return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
