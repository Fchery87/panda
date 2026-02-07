import { NextRequest } from 'next/server'
import { executeSearch } from '@/lib/agent/search/service'
import type { SearchRequest } from '@/lib/agent/search/types'

export async function POST(req: NextRequest) {
  let body: SearchRequest & { workingDirectory?: string }
  try {
    body = (await req.json()) as SearchRequest & { workingDirectory?: string }
  } catch {
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
