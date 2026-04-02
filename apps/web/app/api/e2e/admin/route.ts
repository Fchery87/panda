import { NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'

const E2E_ADMIN_EMAIL = 'e2e@example.com'
const E2E_ADMIN_TOKEN_IDENTIFIER = 'e2e-admin-token'

function isE2EFixtureModeEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.E2E_AUTH_BYPASS === 'true'
}

function getConvexClient(): ConvexHttpClient {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!convexUrl) {
    throw new Error('NEXT_PUBLIC_CONVEX_URL is required for E2E admin setup')
  }

  return new ConvexHttpClient(convexUrl)
}

export async function POST(_request: Request) {
  if (!isE2EFixtureModeEnabled()) {
    return NextResponse.json({ error: 'Not available' }, { status: 404 })
  }

  try {
    const client = getConvexClient()

    await client.mutation((api as any)['lib/auth'].getOrCreateUser, {
      email: E2E_ADMIN_EMAIL,
      name: 'E2E Admin',
      tokenIdentifier: E2E_ADMIN_TOKEN_IDENTIFIER,
    })

    const promotionResult = (await client.mutation(api.seed.makeFirstAdmin, {
      email: E2E_ADMIN_EMAIL,
    })) as { success: boolean; userId: string }

    return NextResponse.json({
      success: true,
      email: E2E_ADMIN_EMAIL,
      userId: promotionResult.userId,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to seed admin access',
      },
      { status: 500 }
    )
  }
}
