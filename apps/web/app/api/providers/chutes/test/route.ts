import { NextResponse } from 'next/server'
import { isAuthenticatedNextjs } from '@convex-dev/auth/nextjs/server'

function normalizeBaseUrl(baseUrl?: string): string {
  return (baseUrl || 'https://llm.chutes.ai/v1').replace(/\/+$/, '')
}

type TestMode = 'models' | 'completion' | 'both'
const ALLOWED_CHUTES_HOSTS = new Set(['llm.chutes.ai'])

function buildHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }
}

export async function POST(request: Request) {
  try {
    if (!(await isAuthenticatedNextjs())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as {
      apiKey?: string
      baseUrl?: string
      model?: string
      mode?: TestMode
    }

    const apiKey = body.apiKey?.trim()
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 400 })
    }

    const mode: TestMode = body.mode || 'both'
    const baseUrl = normalizeBaseUrl(body.baseUrl)
    let parsedBaseUrl: URL
    try {
      parsedBaseUrl = new URL(baseUrl)
    } catch {
      return NextResponse.json({ error: 'Invalid base URL' }, { status: 400 })
    }

    if (parsedBaseUrl.protocol !== 'https:' || !ALLOWED_CHUTES_HOSTS.has(parsedBaseUrl.hostname)) {
      return NextResponse.json({ error: 'Unsupported base URL' }, { status: 400 })
    }

    const headers = buildHeaders(apiKey)

    let models: string[] = []
    let selectedModel = body.model?.trim()

    if (mode === 'models' || mode === 'both' || (mode === 'completion' && !selectedModel)) {
      const modelsRes = await fetch(`${baseUrl}/models`, { headers })
      if (!modelsRes.ok) {
        const detail = await modelsRes.text()
        return NextResponse.json(
          {
            error: `Failed to fetch models (${modelsRes.status})`,
            detail: detail.slice(0, 800),
          },
          { status: modelsRes.status }
        )
      }

      const modelsPayload = await modelsRes.json()
      const modelEntries = modelsPayload?.data || modelsPayload || []
      models = Array.isArray(modelEntries)
        ? modelEntries
            .map((entry: any) => entry?.id || entry?.name)
            .filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0)
        : []

      if (!selectedModel && models.length > 0) {
        selectedModel = models[0]
      }
    }

    if (mode === 'models') {
      return NextResponse.json({ ok: true, models })
    }

    if (!selectedModel) {
      return NextResponse.json(
        { error: 'No model available for completion test. Configure a model first.' },
        { status: 400 }
      )
    }

    const completionPayload = JSON.stringify({
      model: selectedModel,
      messages: [{ role: 'user', content: 'Reply with exactly: pong' }],
      max_tokens: 1,
      temperature: 0,
      stream: false,
    })

    let completionRes = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: completionPayload,
    })

    // Compatibility fallback for deployments that expect X-API-Key auth.
    if (completionRes.status === 401 || completionRes.status === 403) {
      completionRes = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          ...headers,
          'X-API-Key': apiKey,
        },
        body: completionPayload,
      })
    }

    if (!completionRes.ok) {
      const detail = await completionRes.text()
      const retryAfter = completionRes.headers.get('retry-after')
      const isRateLimited = completionRes.status === 429
      return NextResponse.json(
        {
          error: isRateLimited
            ? `Rate limited by Chutes (${completionRes.status})`
            : `Completion test failed (${completionRes.status})`,
          detail: detail.slice(0, 800),
          model: selectedModel,
          models,
          ...(retryAfter ? { retryAfter } : {}),
          ...(isRateLimited
            ? {
                guidance:
                  'Your Chutes plan/key is valid, but completion throughput/quota is currently limited. Retry later, use a lower-demand model, or increase plan limits.',
              }
            : {}),
        },
        { status: completionRes.status }
      )
    }

    const completionJson = await completionRes.json()
    const assistantText = completionJson?.choices?.[0]?.message?.content

    return NextResponse.json({
      ok: true,
      model: selectedModel,
      models,
      completionPreview:
        typeof assistantText === 'string' ? assistantText.slice(0, 200) : 'Completion succeeded',
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to test Chutes provider',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
