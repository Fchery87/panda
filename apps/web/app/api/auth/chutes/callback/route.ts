/**
 * Chutes OAuth Callback Route
 *
 * Handles the OAuth callback from Chutes.ai
 * Exchanges authorization code for access tokens
 */

import { appLog } from '@/lib/logger'
import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { api } from '@convex/_generated/api'

const CHUTES_TOKEN_URL = 'https://chutes.ai/idp/token'
const CHUTES_OAUTH_STATE_COOKIE = 'chutes_oauth_state'

function redirectWithClearedStateCookie(request: NextRequest, path: string): NextResponse {
  const response = NextResponse.redirect(new URL(path, request.url))
  response.cookies.set(CHUTES_OAUTH_STATE_COOKIE, '', {
    path: '/',
    maxAge: 0,
    sameSite: 'lax',
  })
  return response
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const state = searchParams.get('state')
  const expectedState = request.cookies.get(CHUTES_OAUTH_STATE_COOKIE)?.value

  if (error) {
    const errorDescription = searchParams.get('error_description') || error
    return redirectWithClearedStateCookie(
      request,
      `/settings?error=${encodeURIComponent(errorDescription)}`
    )
  }

  if (!code) {
    return redirectWithClearedStateCookie(request, '/settings?error=missing_authorization_code')
  }

  if (!state || !expectedState || state !== expectedState) {
    return redirectWithClearedStateCookie(request, '/settings?error=oauth_state_mismatch')
  }

  try {
    const clientId = process.env.CHUTES_CLIENT_ID
    const clientSecret = process.env.CHUTES_CLIENT_SECRET
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/api/auth/chutes/callback`

    if (!clientId || !clientSecret) {
      appLog.error('Chutes OAuth credentials not configured')
      return redirectWithClearedStateCookie(request, '/settings?error=oauth_not_configured')
    }

    // Exchange code for tokens
    const tokenResponse = await fetch(CHUTES_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      appLog.error('Chutes token exchange failed:', errorText)
      return redirectWithClearedStateCookie(request, '/settings?error=token_exchange_failed')
    }

    const tokens = await tokenResponse.json()
    if (typeof tokens.access_token !== 'string' || tokens.access_token.length === 0) {
      appLog.error('Chutes token exchange returned no access token')
      return redirectWithClearedStateCookie(request, '/settings?error=token_exchange_failed')
    }

    // Calculate expiration time
    const expiresAt = tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : undefined

    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
    const convexToken = await convexAuthNextjsToken()
    if (!convexUrl || !convexToken) {
      return redirectWithClearedStateCookie(request, '/settings?error=oauth_session_required')
    }

    const convex = new ConvexHttpClient(convexUrl)
    convex.setAuth(convexToken)
    await convex.mutation(api.providers.storeProviderTokens, {
      provider: 'chutes',
      accessToken: tokens.access_token,
      refreshToken: typeof tokens.refresh_token === 'string' ? tokens.refresh_token : undefined,
      expiresAt,
      scope: typeof tokens.scope === 'string' ? tokens.scope : undefined,
    })

    const response = NextResponse.redirect(new URL('/settings?connected=chutes', request.url))
    response.cookies.set(CHUTES_OAUTH_STATE_COOKIE, '', {
      path: '/',
      maxAge: 0,
      sameSite: 'lax',
    })
    return response
  } catch (error) {
    appLog.error('Chutes OAuth callback error:', error)
    return redirectWithClearedStateCookie(request, '/settings?error=oauth_callback_failed')
  }
}
