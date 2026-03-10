import { NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'

const DEFAULT_FIXTURE_NAME = 'Workbench E2E Fixture'
const DEFAULT_FIXTURE_DESCRIPTION = 'Deterministic browser E2E fixture project'

function isE2EFixtureModeEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.E2E_AUTH_BYPASS === 'true'
}

export async function GET(request: Request) {
  if (!isE2EFixtureModeEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!convexUrl) {
    return NextResponse.json({ error: 'Convex URL not configured' }, { status: 500 })
  }

  const url = new URL(request.url)
  const fixtureName = url.searchParams.get('name')?.trim() || DEFAULT_FIXTURE_NAME

  const convex = new ConvexHttpClient(convexUrl)
  const projects = await convex.query(api.projects.list, {})
  const existing = projects.find((project) => project.name === fixtureName)

  if (existing) {
    return NextResponse.json({ projectId: existing._id, created: false })
  }

  const projectId = await convex.mutation(api.projects.create, {
    name: fixtureName,
    description: DEFAULT_FIXTURE_DESCRIPTION,
  })

  return NextResponse.json({ projectId, created: true })
}
