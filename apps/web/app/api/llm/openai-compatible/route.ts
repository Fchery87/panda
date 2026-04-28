import { NextRequest, NextResponse } from 'next/server'

import { OpenAICompatibleProvider } from '@/lib/llm/providers/openai-compatible'
import type { CompletionOptions, ProviderConfig, ProviderType } from '@/lib/llm/types'
import {
  requireAuthenticatedProviderRoute,
  validateOpenAICompatibleBaseUrl,
} from '../../providers/openai-compatible/security'

export const runtime = 'nodejs'

type ProxyRequestBody = {
  mode?: 'complete' | 'stream'
  config?: ProviderConfig
  options?: CompletionOptions
}

const DEFAULT_BASE_URLS: Partial<Record<ProviderType, string>> = {
  openai: 'https://api.openai.com/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  together: 'https://api.together.xyz/v1',
  zai: 'https://api.z.ai/api/paas/v4',
  deepseek: 'https://api.deepseek.com/v1',
  groq: 'https://api.groq.com/openai/v1',
  fireworks: 'https://api.fireworks.ai/inference/v1',
  chutes: 'https://llm.chutes.ai/v1',
  crofai: 'https://crof.ai/v1',
}

export async function POST(request: NextRequest) {
  const authError = await requireAuthenticatedProviderRoute()
  if (authError) return authError

  let body: ProxyRequestBody
  try {
    body = (await request.json()) as ProxyRequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const mode = body.mode ?? 'stream'
  if (mode !== 'complete' && mode !== 'stream') {
    return NextResponse.json({ error: 'Invalid proxy mode' }, { status: 400 })
  }
  if (!body.config || !body.options) {
    return NextResponse.json(
      { error: 'Missing provider config or completion options' },
      { status: 400 }
    )
  }
  if (!body.config.auth?.apiKey) {
    return NextResponse.json({ error: 'Missing provider API key' }, { status: 400 })
  }

  const normalizedConfig = normalizeProviderConfig(body.config)
  const baseUrlValidation = validateOpenAICompatibleBaseUrl(normalizedConfig.auth.baseUrl)
  if (!baseUrlValidation.ok) return baseUrlValidation.response

  const provider = new OpenAICompatibleProvider(normalizedConfig)

  if (mode === 'complete') {
    try {
      return NextResponse.json(await provider.complete(body.options))
    } catch (error) {
      return NextResponse.json({ error: formatProxyError(error) }, { status: 502 })
    }
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      try {
        for await (const chunk of provider.completionStream(body.options!)) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: 'error', error: formatProxyError(error) })}\n\n`
          )
        )
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
}

function normalizeProviderConfig(config: ProviderConfig): ProviderConfig {
  return {
    ...config,
    auth: {
      ...config.auth,
      baseUrl: config.auth.baseUrl || DEFAULT_BASE_URLS[config.provider],
    },
  }
}

function formatProxyError(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'LLM proxy request failed'
}
