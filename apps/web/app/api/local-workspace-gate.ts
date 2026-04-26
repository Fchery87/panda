export function requireLocalWorkspaceApiEnabled(): Response | null {
  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.PANDA_ENABLE_LOCAL_WORKSPACE_API === 'true'
  ) {
    return null
  }

  return Response.json({ error: 'Local workspace API is not available' }, { status: 404 })
}
