import { describe, expect, test } from 'bun:test'
import {
  buildSessionLease,
  createBrowserSessionSupervisor,
  shouldReuseBrowserSession,
} from './browser-session-supervisor'

describe('browser session supervisor', () => {
  test('reuses a healthy existing browser session', () => {
    const now = 1_000
    expect(
      shouldReuseBrowserSession({
        session: {
          browserSessionKey: 'browser-session::project_1::local',
          status: 'ready',
          leaseExpiresAt: now + 60_000,
          updatedAt: now - 5_000,
        },
        now,
      })
    ).toBe(true)
  })

  test('does not reuse stale or expired browser sessions', () => {
    const now = 1_000
    expect(
      shouldReuseBrowserSession({
        session: {
          browserSessionKey: 'browser-session::project_1::local',
          status: 'stale',
          leaseExpiresAt: now + 60_000,
          updatedAt: now - 5_000,
        },
        now,
      })
    ).toBe(false)

    expect(
      shouldReuseBrowserSession({
        session: {
          browserSessionKey: 'browser-session::project_1::local',
          status: 'ready',
          leaseExpiresAt: now - 1,
          updatedAt: now - 5_000,
        },
        now,
      })
    ).toBe(false)
  })

  test('creates deterministic lease metadata', () => {
    const lease = buildSessionLease({
      owner: 'qa-worker',
      now: 1_000,
      ttlMs: 30_000,
    })

    expect(lease.leaseOwner).toBe('qa-worker')
    expect(lease.leaseExpiresAt).toBe(31_000)
  })

  test('supervisor resolves reuse versus fresh-session strategy', () => {
    const supervisor = createBrowserSessionSupervisor()
    const reused = supervisor.resolveRunStrategy({
      projectId: 'project_1',
      environment: 'local',
      now: 1_000,
      existingSession: {
        browserSessionKey: 'browser-session::project_1::local',
        status: 'ready',
        leaseExpiresAt: 2_000,
        updatedAt: 900,
      },
    })

    const fresh = supervisor.resolveRunStrategy({
      projectId: 'project_1',
      environment: 'local',
      now: 1_000,
      existingSession: {
        browserSessionKey: 'browser-session::project_1::local',
        status: 'failed',
        leaseExpiresAt: 2_000,
        updatedAt: 900,
      },
    })

    expect(reused.strategy).toBe('reuse')
    expect(fresh.strategy).toBe('fresh')
  })
})
