/**
 * Chutes OAuth Callback Route
 *
 * Handles the OAuth callback from Chutes.ai
 * Exchanges authorization code for access tokens
 */

import { NextRequest, NextResponse } from 'next/server'

const CHUTES_TOKEN_URL = 'https://chutes.ai/idp/token'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    const errorDescription = searchParams.get('error_description') || error
    return NextResponse.redirect(
      new URL(`/settings?error=${encodeURIComponent(errorDescription)}`, request.url)
    )
  }

  if (!code) {
    return NextResponse.redirect(new URL('/settings?error=missing_authorization_code', request.url))
  }

  try {
    const clientId = process.env.CHUTES_CLIENT_ID
    const clientSecret = process.env.CHUTES_CLIENT_SECRET
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/api/auth/chutes/callback`

    if (!clientId || !clientSecret) {
      console.error('Chutes OAuth credentials not configured')
      return NextResponse.redirect(new URL('/settings?error=oauth_not_configured', request.url))
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
      console.error('Chutes token exchange failed:', errorText)
      return NextResponse.redirect(new URL('/settings?error=token_exchange_failed', request.url))
    }

    const tokens = await tokenResponse.json()

    // Calculate expiration time
    const expiresAt = tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : undefined

    // Store tokens via Convex mutation (client will handle this)
    // For now, redirect with tokens in URL fragment (more secure than query params)
    const tokenData = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
      scope: tokens.scope,
    }

    const encodedTokens = encodeURIComponent(JSON.stringify(tokenData))

    return NextResponse.redirect(
      new URL(`/settings?connected=chutes&tokens=${encodedTokens}`, request.url)
    )
  } catch (error) {
    console.error('Chutes OAuth callback error:', error)
    return NextResponse.redirect(new URL('/settings?error=oauth_callback_failed', request.url))
  }
}
