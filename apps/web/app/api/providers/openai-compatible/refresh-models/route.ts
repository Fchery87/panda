import { NextRequest, NextResponse } from 'next/server'

import {
  buildModelsUrl,
  requireAuthenticatedProviderRoute,
  validateOpenAICompatibleBaseUrl,
} from '../security'

export async function POST(request: NextRequest) {
  try {
    const authError = await requireAuthenticatedProviderRoute()
    if (authError) return authError

    const body = await request.json()
    const { apiKey, baseUrl } = body

    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json({ error: 'API key required' }, { status: 400 })
    }

    const baseUrlValidation = validateOpenAICompatibleBaseUrl(baseUrl)
    if (!baseUrlValidation.ok) return baseUrlValidation.response

    const modelsPath = buildModelsUrl(baseUrlValidation.url)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    try {
      const response = await fetch(modelsPath, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (!response.ok) {
        const text = await response.text().catch(() => '')
        return NextResponse.json(
          { error: `Provider returned ${response.status}`, detail: text.slice(0, 200) },
          { status: 502 }
        )
      }

      const data = await response.json()
      return NextResponse.json(data)
    } finally {
      clearTimeout(timeout)
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ error: 'Request timed out' }, { status: 504 })
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
