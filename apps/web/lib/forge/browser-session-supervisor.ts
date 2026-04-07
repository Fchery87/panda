export function shouldReuseBrowserSession(args: {
  session: {
    browserSessionKey: string
    status: 'ready' | 'stale' | 'leased' | 'failed'
    leaseExpiresAt?: number
    updatedAt: number
  } | null
  now: number
}): boolean {
  if (!args.session) return false
  if (args.session.status !== 'ready' && args.session.status !== 'leased') return false
  if (typeof args.session.leaseExpiresAt === 'number' && args.session.leaseExpiresAt < args.now) {
    return false
  }
  return true
}

export function buildSessionLease(args: { owner: string; now: number; ttlMs: number }) {
  return {
    leaseOwner: args.owner,
    leaseExpiresAt: args.now + args.ttlMs,
  }
}

export function createBrowserSessionSupervisor() {
  return {
    resolveRunStrategy(args: {
      projectId: string
      environment: string
      now: number
      existingSession: {
        browserSessionKey: string
        status: 'ready' | 'stale' | 'leased' | 'failed'
        leaseExpiresAt?: number
        updatedAt: number
      } | null
    }): {
      strategy: 'reuse' | 'fresh'
      browserSessionKey: string
    } {
      const strategy: 'reuse' | 'fresh' = shouldReuseBrowserSession({
        session: args.existingSession,
        now: args.now,
      })
        ? 'reuse'
        : 'fresh'

      return {
        strategy,
        browserSessionKey:
          args.existingSession?.browserSessionKey ??
          `browser-session::${args.projectId}::${args.environment}`,
      }
    },
  }
}
