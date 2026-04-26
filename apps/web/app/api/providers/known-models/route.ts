import { NextResponse } from 'next/server'

/**
 * Known providers that aren't in models.dev but have env var API keys.
 * Returns live model lists fetched from their /models endpoints.
 */
interface KnownProviderEnv {
  key: string
  label: string
  baseUrl: string
  envKey: string
  envBaseUrl?: string
}

const KNOWN_PROVIDERS_WITH_ENV: KnownProviderEnv[] = [
  {
    key: 'crofai',
    label: 'crof.ai',
    baseUrl: 'https://crof.ai/v1',
    envKey: 'CROFAI_API_KEY',
    envBaseUrl: 'CROFAI_BASE_URL',
  },
]

async function fetchModelsForProvider(
  apiKey: string,
  baseUrl: string
): Promise<string[]> {
  const modelsPath = `${baseUrl.replace(/\/+$/, '')}/models`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

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
    if (!response.ok) return []

    const data = await response.json()
    const models = data.data || data || []
    return models
      .map((m: { id?: string }) => m.id)
      .filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0)
  } catch {
    return []
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * GET /api/providers/known-models
 *
 * Fetches live model lists for known providers (crof.ai, etc.)
 * using server-side environment variable API keys.
 * Returns: { [providerKey]: string[] }
 */
export async function GET() {
  const results: Record<string, string[]> = {}

  const fetches = KNOWN_PROVIDERS_WITH_ENV.map(async (provider) => {
    const apiKey = process.env[provider.envKey]
    if (!apiKey) return

    const baseUrl = (provider.envBaseUrl && process.env[provider.envBaseUrl]) || provider.baseUrl
    const models = await fetchModelsForProvider(apiKey, baseUrl)
    if (models.length > 0) {
      results[provider.key] = models
    }
  })

  await Promise.all(fetches)

  return NextResponse.json(results, {
    headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' },
  })
}
