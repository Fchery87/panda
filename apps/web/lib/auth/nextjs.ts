export async function isAuthenticatedNextjs(): Promise<boolean> {
  const authServer = await import('@convex-dev/auth/nextjs/server')
  return await authServer.isAuthenticatedNextjs()
}

export async function convexAuthNextjsToken(): Promise<string | undefined> {
  const authServer = await import('@convex-dev/auth/nextjs/server')
  return await authServer.convexAuthNextjsToken()
}
