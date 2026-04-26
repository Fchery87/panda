import { NextRequest } from 'next/server'
import { isAuthenticatedNextjs } from '@/lib/auth/nextjs'
import { executeSearch } from '@/lib/agent/search/service'
import type { SearchRequest } from '@/lib/agent/search/types'
import { requireLocalWorkspaceApiEnabled } from '../local-workspace-gate'

export async function POST(req: NextRequest) {
  if (!(await isAuthenticatedNextjs())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const workspaceApiGate = requireLocalWorkspaceApiEnabled()
  if (workspaceApiGate) return workspaceApiGate

  let body: SearchRequest & { workingDirectory?: string }
  try {
    body = (await req.json()) as SearchRequest & { workingDirectory?: string }
  } catch (error) {
    void error
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body || (body.type !== 'text' && body.type !== 'ast')) {
    return Response.json({ error: 'type must be "text" or "ast"' }, { status: 400 })
  }

  try {
    const result = await executeSearch(body, {
      workingDirectory: body.workingDirectory,
    })
    return Response.json(result)
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Search failed',
      },
      { status: 400 }
    )
  }
}
