import { NextResponse } from 'next/server'

import { isAuthenticatedNextjs } from '@/lib/auth/nextjs'

const RESTRICTED_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^10\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^\[?::1\]?$/,
]

export async function requireAuthenticatedProviderRoute(): Promise<NextResponse | null> {
  if (await isAuthenticatedNextjs()) return null
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export function validateOpenAICompatibleBaseUrl(
  baseUrl: unknown
): { ok: true; url: URL } | { ok: false; response: NextResponse } {
  if (!baseUrl || typeof baseUrl !== 'string') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Base URL required' }, { status: 400 }),
    }
  }

  let url: URL
  try {
    url = new URL(baseUrl)
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Invalid base URL' }, { status: 400 }),
    }
  }

  if (url.protocol !== 'https:') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Only HTTPS URLs allowed' }, { status: 400 }),
    }
  }

  if (RESTRICTED_HOST_PATTERNS.some((pattern) => pattern.test(url.hostname))) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Base URL cannot target private or local network hosts' },
        { status: 400 }
      ),
    }
  }

  return { ok: true, url }
}

export function buildModelsUrl(url: URL): string {
  const normalized = url.toString().replace(/\/+$/, '')
  return normalized.endsWith('/models') ? normalized : `${normalized}/models`
}
