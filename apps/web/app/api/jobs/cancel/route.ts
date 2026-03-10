import { NextRequest } from 'next/server'
import { isAuthenticatedNextjs } from '@convex-dev/auth/nextjs/server'
import { cancelJobProcess } from '@/lib/jobs/processRegistry'

export async function POST(req: NextRequest) {
  if (!(await isAuthenticatedNextjs())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { jobId?: string }
  try {
    body = (await req.json()) as { jobId?: string }
  } catch (error) {
    void error
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.jobId) {
    return Response.json({ error: 'jobId is required' }, { status: 400 })
  }

  return Response.json({
    ok: cancelJobProcess(body.jobId),
  })
}
