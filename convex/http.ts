/// <reference types="node" />

/**
 * Convex HTTP Actions Router
 *
 * HTTP actions are exposed at https://<deployment>.convex.site
 * This file defines all HTTP action routes for the application.
 *
 * @file convex/http.ts
 */

import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import { auth } from './auth'
import {
  getApiKeyFromAuthorizationHeader,
  sanitizeInternalErrorMessage,
  sanitizeUpstreamLlmError,
} from './lib/http_security'
import { serverLog } from './lib/logger'

/**
 * CORS headers for cross-origin requests
 */
function getAllowedOrigins(): string[] {
  const configured = [
    process.env.NEXT_PUBLIC_APP_URL,
    'https://panda.ai',
    'https://www.panda.ai',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ]

  return configured.filter(
    (value): value is string => typeof value === 'string' && value.length > 0
  )
}

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin')
  const allowedOrigins = getAllowedOrigins()
  const allowOrigin =
    origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || 'null'

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

const ALLOWED_PROVIDERS = new Set(['openai', 'openrouter', 'together', 'zai', 'anthropic'])

async function requireHttpAuth(ctx: { auth: { getUserIdentity: () => Promise<unknown> } }) {
  const identity = await ctx.auth.getUserIdentity()
  return identity !== null
}

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
  mode?: 'plan' | 'build'
  temperature?: number
  maxTokens?: number
  provider?: 'openai' | 'openrouter' | 'together' | 'zai' | 'anthropic'
  apiKey?: string
}

/**
 * Get system prompt based on mode
 */
function getSystemPrompt(mode: 'plan' | 'build' = 'build'): string {
  if (mode === 'plan') {
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
    anthropic: {
      baseURL: 'https://api.anthropic.com/v1',
      defaultModel: 'claude-sonnet-4-5',
    },
  }

  if (!ALLOWED_PROVIDERS.has(provider)) {
    throw new Error(`Invalid provider: ${provider}`)
  }

  // For Z.ai, determine if using Coding Plan or regular API
  let zaiApiKey = ''
  let baseURL = configs.zai.baseURL

  if (provider === 'zai') {
    // Check if using Coding Plan key (different endpoint)
    const codingPlanKey = process.env.ZAI_CODING_PLAN_KEY
    const regularKey = apiKey || process.env.ZAI_API_KEY

    if (codingPlanKey) {
      // Using Coding Plan - use coding endpoint
      zaiApiKey = codingPlanKey
      baseURL = 'https://api.z.ai/api/coding/paas/v4'
    } else if (regularKey) {
      // Using regular API key
      zaiApiKey = regularKey
    }
  }

  return {
    baseURL: provider === 'zai' ? baseURL : configs[provider]?.baseURL || configs.openai.baseURL,
    defaultModel: configs[provider]?.defaultModel || configs.openai.defaultModel,
    apiKey: zaiApiKey || apiKey || process.env.OPENAI_API_KEY || '',
  }
}

// Create HTTP router
const http = httpRouter()

/**
 * Health check endpoint - CORS preflight
 * OPTIONS /health
 */
http.route({
  path: '/health',
  method: 'OPTIONS',
  handler: httpAction(async (_ctx, request): Promise<Response> => {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(request),
    })
  }),
})

/**
 * Health check endpoint
 * GET /health
 */
http.route({
  path: '/health',
  method: 'GET',
  handler: httpAction(async (_ctx, request): Promise<Response> => {
    return new Response(JSON.stringify({ status: 'ok', timestamp: Date.now() }), {
      headers: { ...getCorsHeaders(request), 'Content-Type': 'application/json' },
    })
  }),
})

/**
 * Stream chat completion - CORS preflight
 * OPTIONS /api/llm/streamChat
 */
http.route({
  path: '/api/llm/streamChat',
  method: 'OPTIONS',
  handler: httpAction(async (_ctx, request): Promise<Response> => {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(request),
    })
  }),
})

/**
 * Stream chat completion
 * POST /api/llm/streamChat
 */
http.route({
  path: '/api/llm/streamChat',
  method: 'POST',
  handler: httpAction(async (ctx, request): Promise<Response> => {
    let abortUpstream: (() => void) | undefined
    try {
      const responseCorsHeaders = getCorsHeaders(request)
      if (!(await requireHttpAuth(ctx))) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...responseCorsHeaders, 'Content-Type': 'application/json' },
        })
      }

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

      // Validate required fields
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return new Response(JSON.stringify({ error: 'Missing or invalid messages array' }), {
          status: 400,
          headers: { ...responseCorsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Get provider configuration
      const config = getProviderConfig(provider, apiKey)

      // Check if API key is configured
      if (!config.apiKey) {
        return new Response(
          JSON.stringify({ error: `No API key configured for provider: ${provider}` }),
          { status: 400, headers: { ...responseCorsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      const selectedModel = model || config.defaultModel
      const upstreamAbortController = new AbortController()
      abortUpstream = () => upstreamAbortController.abort()
      request.signal.addEventListener('abort', abortUpstream)

      // Build request and endpoint based on provider.
      let response: Response
      if (provider === 'anthropic') {
        const systemPrompt = getSystemPrompt(mode)
        const anthropicMessages = messages
          .filter((m) => m.role !== 'system')
          .map((m) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
          }))

        response = await fetch(`${config.baseURL}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': config.apiKey,
            'anthropic-version': '2023-06-01',
          },
          signal: upstreamAbortController.signal,
          body: JSON.stringify({
            model: selectedModel,
            max_tokens: maxTokens,
            temperature,
            system: systemPrompt,
            messages: anthropicMessages,
            stream: true,
          }),
        })
      } else {
        // Add system message (skip for Z.ai as it doesn't support system role)
        const systemMessage: ChatMessage | null =
          provider === 'zai' ? null : { role: 'system', content: getSystemPrompt(mode) }

        const fullMessages = systemMessage ? [systemMessage, ...messages] : messages

        response = await fetch(`${config.baseURL}/chat/completions`, {
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
          signal: upstreamAbortController.signal,
          body: JSON.stringify({
            model: selectedModel,
            messages: fullMessages,
            temperature,
            max_tokens: maxTokens,
            stream: true,
          }),
        })
      }

      if (!response.ok) {
        const errorText = await response.text()
        serverLog.error('LLM API error', {
          provider,
          status: response.status,
          bodyPreview: errorText.slice(0, 500),
        })
        return new Response(
          JSON.stringify({
            error: sanitizeUpstreamLlmError({
              status: response.status,
              bodyPreview: errorText.slice(0, 500),
            }),
          }),
          {
            status: 502,
            headers: { ...responseCorsHeaders, 'Content-Type': 'application/json' },
          }
        )
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
          let controllerClosed = false
          const safeClose = () => {
            if (controllerClosed) return
            controllerClosed = true
            try {
              controller.close()
            } catch (error) {
              void error
              // no-op if already closed/errored
            }
          }
          const abortHandler = () => {
            void reader.cancel().catch(() => undefined)
            safeClose()
          }
          request.signal.addEventListener('abort', abortHandler)

          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break

              // Parse SSE chunks and forward as canonical events.
              const chunk = new TextDecoder().decode(value)
              const lines = chunk.split('\n')

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6)
                  if (data === '[DONE]') {
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ type: 'finish' })}\n\n`)
                    )
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                    continue
                  }

                  try {
                    const parsed = JSON.parse(data)

                    // Anthropic streaming events
                    if (provider === 'anthropic') {
                      const eventType = parsed.type
                      if (eventType === 'content_block_delta') {
                        const delta = parsed.delta
                        if (delta?.type === 'thinking_delta' && delta?.thinking) {
                          controller.enqueue(
                            encoder.encode(
                              `data: ${JSON.stringify({ type: 'reasoning', reasoningContent: delta.thinking })}\n\n`
                            )
                          )
                        }
                        if (delta?.type === 'text_delta' && delta?.text) {
                          controller.enqueue(
                            encoder.encode(
                              `data: ${JSON.stringify({ type: 'text', content: delta.text })}\n\n`
                            )
                          )
                        }
                      }
                      continue
                    }

                    // OpenAI-compatible streaming events
                    const delta = parsed.choices?.[0]?.delta
                    const content = delta?.content
                    const reasoning =
                      delta?.reasoning_content ??
                      delta?.reasoning ??
                      (typeof parsed.reasoning === 'string' ? parsed.reasoning : undefined)

                    if (reasoning) {
                      controller.enqueue(
                        encoder.encode(
                          `data: ${JSON.stringify({ type: 'reasoning', reasoningContent: reasoning })}\n\n`
                        )
                      )
                    }
                    if (content) {
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ type: 'text', content })}\n\n`)
                      )
                    }
                  } catch (error) {
                    void error
                    // Skip malformed JSON
                  }
                }
              }
            }
          } catch (error) {
            if (!request.signal.aborted) {
              controller.error(error instanceof Error ? error : new Error('Stream failed'))
            }
          } finally {
            request.signal.removeEventListener('abort', abortHandler)
            reader.releaseLock()
            if (abortUpstream) {
              request.signal.removeEventListener('abort', abortUpstream)
            }
            safeClose()
          }
        },
      })

      return new Response(stream, {
        headers: {
          ...responseCorsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      })
    } catch (error) {
      if (abortUpstream) {
        request.signal.removeEventListener('abort', abortUpstream)
      }
      serverLog.error('LLM stream request failed', { error })
      return new Response(
        JSON.stringify({
          error: sanitizeInternalErrorMessage(error),
        }),
        { status: 500, headers: { ...getCorsHeaders(request), 'Content-Type': 'application/json' } }
      )
    }
  }),
})

/**
 * List available models - CORS preflight
 * OPTIONS /api/llm/listModels
 */
http.route({
  path: '/api/llm/listModels',
  method: 'OPTIONS',
  handler: httpAction(async (_ctx, request): Promise<Response> => {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(request),
    })
  }),
})

/**
 * List available models
 * GET /api/llm/listModels
 */
http.route({
  path: '/api/llm/listModels',
  method: 'GET',
  handler: httpAction(async (ctx, request): Promise<Response> => {
    try {
      const responseCorsHeaders = getCorsHeaders(request)
      if (!(await requireHttpAuth(ctx))) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...responseCorsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const url = new URL(request.url)
      const provider = url.searchParams.get('provider') || 'openai'
      const bearerToken = getApiKeyFromAuthorizationHeader(request.headers.get('Authorization'))
      const apiKey = bearerToken || process.env.OPENAI_API_KEY

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
          headers: { ...responseCorsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const data = await response.json()
      return new Response(JSON.stringify(data), {
        headers: { ...responseCorsHeaders, 'Content-Type': 'application/json' },
      })
    } catch (error) {
      serverLog.error('listModels request failed', { error })
      return new Response(
        JSON.stringify({
          error: sanitizeInternalErrorMessage(error),
        }),
        { status: 500, headers: { ...getCorsHeaders(request), 'Content-Type': 'application/json' } }
      )
    }
  }),
})

// Register auth routes
auth.addHttpRoutes(http)

// Export the HTTP router as default
export default http
