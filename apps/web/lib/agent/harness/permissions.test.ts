import { describe, expect, test } from 'bun:test'
import { bus } from './event-bus'
import {
  DEFAULT_PERMISSIONS,
  PermissionManager,
  intersectPermissions,
  checkPermission,
} from './permissions'

describe('PermissionManager', () => {
  test('defaults ask mode task delegation to deny', () => {
    expect(DEFAULT_PERMISSIONS.ask.task).toBe('deny')
  })

  test('intersectPermissions respects parent tool-level deny over child path-specific allow', () => {
    const parent = {
      write_files: 'deny',
    } as const
    const child = {
      write_files: 'allow',
      'write_files:src/allowed.ts': 'allow',
    } as const

    const delegated = intersectPermissions(parent, child)

    expect(checkPermission(delegated, 'write_files')).toBe('deny')
    expect(checkPermission(delegated, 'write_files', 'src/allowed.ts')).toBe('deny')
  })

  test('scopes cached always decisions to a session and emits timeout decisions', async () => {
    const manager = new PermissionManager({ timeoutMs: 100, pollIntervalMs: 1 })
    bus.clearHistory()

    let firstRequestID = ''
    const unsubscribe = bus.on(['permission.requested', 'permission.decided'], (event) => {
      const payload = event.payload as {
        id?: string
        request?: { sessionID: string }
        decision?: 'allow' | 'deny' | 'ask'
        reason?: string
      }
      if (event.type === 'permission.requested' && payload.request?.sessionID === 'session-a') {
        firstRequestID = String(payload.id ?? '')
      }
    })

    const firstPromise = manager.request('session-a', 'msg-a', 'run_command', 'npm test')
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(firstRequestID.length).toBeGreaterThan(0)
    expect(manager.respond(firstRequestID, 'allow', 'always')).toBe(true)
    const first = await firstPromise
    expect(first.granted).toBe(true)
    expect(first.reason).toBe('always')

    // Same tool/pattern in a different session should not reuse session-a's cached decision.
    const secondPromise = manager.request('session-b', 'msg-b', 'run_command', 'npm test')
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(manager.getPendingRequests().length).toBeGreaterThan(0)

    const second = await secondPromise
    expect(second.granted).toBe(false)
    expect(second.reason).toBe('Timeout')

    const decidedEvents = bus
      .getHistory({ types: ['permission.decided'] })
      .map((event) => event.payload as { reason?: string })
    expect(decidedEvents.some((payload) => payload.reason === 'Timeout')).toBe(true)

    unsubscribe()
  })

  test('calls onAuditLog for each permission decision', async () => {
    const auditEntries: Array<{ tool: string; decision: string }> = []
    const manager = new PermissionManager({
      timeoutMs: 100,
      onAuditLog: (entry) => auditEntries.push({ tool: entry.tool, decision: entry.decision }),
    })
    manager.setSessionPermissions('session-audit', { read_files: 'allow' })
    await manager.request('session-audit', 'msg-1', 'read_files', '*')
    expect(auditEntries.length).toBe(1)
    expect(auditEntries[0].tool).toBe('read_files')
    expect(auditEntries[0].decision).toBe('allow')
  })
})
