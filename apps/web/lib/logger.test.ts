import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test'

// We need to set env before importing, so the logger picks up debug level
process.env.NEXT_PUBLIC_LOG_LEVEL = 'debug'

// Dynamic import so env is set first
const { appLog, createSessionLogger } = await import('./logger')

describe('appLog', () => {
  let consoleSpy: ReturnType<typeof spyOn>

  afterEach(() => {
    consoleSpy?.mockRestore()
  })

  it('exports error, warn, info, debug methods', () => {
    expect(typeof appLog.error).toBe('function')
    expect(typeof appLog.warn).toBe('function')
    expect(typeof appLog.info).toBe('function')
    expect(typeof appLog.debug).toBe('function')
  })

  it('error outputs valid JSON with level, msg, ts', () => {
    consoleSpy = spyOn(console, 'error').mockImplementation(() => {})
    appLog.error('something broke')
    expect(consoleSpy).toHaveBeenCalledTimes(1)
    const output = consoleSpy.mock.calls[0][0] as string
    const parsed = JSON.parse(output)
    expect(parsed.level).toBe('error')
    expect(parsed.msg).toBe('something broke')
    expect(parsed.ts).toBeDefined()
  })

  it('warn outputs valid JSON with level, msg, ts', () => {
    consoleSpy = spyOn(console, 'warn').mockImplementation(() => {})
    appLog.warn('watch out')
    expect(consoleSpy).toHaveBeenCalledTimes(1)
    const output = consoleSpy.mock.calls[0][0] as string
    const parsed = JSON.parse(output)
    expect(parsed.level).toBe('warn')
    expect(parsed.msg).toBe('watch out')
    expect(parsed.ts).toBeDefined()
  })

  it('accepts a second arg as context fields in JSON output', () => {
    consoleSpy = spyOn(console, 'error').mockImplementation(() => {})
    appLog.error('failed', { code: 42, detail: 'timeout' })
    const parsed = JSON.parse(consoleSpy.mock.calls[0][0] as string)
    expect(parsed.code).toBe(42)
    expect(parsed.detail).toBe('timeout')
  })

  it('handles non-object second arg gracefully', () => {
    consoleSpy = spyOn(console, 'error').mockImplementation(() => {})
    appLog.error('failed', 'some string context')
    const parsed = JSON.parse(consoleSpy.mock.calls[0][0] as string)
    expect(parsed.msg).toBe('failed')
    expect(parsed.context).toBe('some string context')
  })
})

describe('createSessionLogger', () => {
  let consoleSpy: ReturnType<typeof spyOn>

  afterEach(() => {
    consoleSpy?.mockRestore()
  })

  it('returns a logger with error, warn, info, debug methods', () => {
    const logger = createSessionLogger('sess-123')
    expect(typeof logger.error).toBe('function')
    expect(typeof logger.warn).toBe('function')
    expect(typeof logger.info).toBe('function')
    expect(typeof logger.debug).toBe('function')
  })

  it('includes sessionID in every JSON entry', () => {
    const logger = createSessionLogger('sess-abc')
    consoleSpy = spyOn(console, 'warn').mockImplementation(() => {})
    logger.warn('test message')
    const parsed = JSON.parse(consoleSpy.mock.calls[0][0] as string)
    expect(parsed.sessionID).toBe('sess-abc')
    expect(parsed.level).toBe('warn')
    expect(parsed.msg).toBe('test message')
  })

  it('includes extra context passed at creation time', () => {
    const logger = createSessionLogger('sess-xyz', { projectId: 'p-1' })
    consoleSpy = spyOn(console, 'error').mockImplementation(() => {})
    logger.error('boom')
    const parsed = JSON.parse(consoleSpy.mock.calls[0][0] as string)
    expect(parsed.sessionID).toBe('sess-xyz')
    expect(parsed.projectId).toBe('p-1')
  })
})
