import { describe, expect, test } from 'bun:test'
import { bus } from './event-bus'
import { PermissionManager } from './permissions'

describe('PermissionManager', () => {
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
})
