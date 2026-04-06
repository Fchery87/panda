import { describe, expect, it } from 'bun:test'

process.env.NEXT_PUBLIC_LOG_LEVEL = 'debug'

const { appLog, createSessionLogger } = await import('./logger')

function captureConsole<K extends 'error' | 'warn' | 'info' | 'debug'>(method: K) {
  const original = console[method]
  const calls: unknown[][] = []

  console[method] = ((...args: unknown[]) => {
    calls.push(args)
  }) as (typeof console)[K]

  return {
    calls,
    restore() {
      console[method] = original
    },
  }
}

describe('appLog', () => {
  it('exports error, warn, info, debug methods', () => {
    expect(typeof appLog.error).toBe('function')
    expect(typeof appLog.warn).toBe('function')
    expect(typeof appLog.info).toBe('function')
    expect(typeof appLog.debug).toBe('function')
  })

  it('error outputs valid JSON with level, msg, ts', () => {
    const consoleSpy = captureConsole('error')
    try {
      appLog.error('something broke')
      expect(consoleSpy.calls).toHaveLength(1)
      const output = consoleSpy.calls[0][0] as string
      const parsed = JSON.parse(output)
      expect(parsed.level).toBe('error')
      expect(parsed.msg).toBe('something broke')
      expect(parsed.ts).toBeDefined()
    } finally {
      consoleSpy.restore()
    }
  })

  it('warn outputs valid JSON with level, msg, ts', () => {
    const consoleSpy = captureConsole('warn')
    try {
      appLog.warn('watch out')
      expect(consoleSpy.calls).toHaveLength(1)
      const output = consoleSpy.calls[0][0] as string
      const parsed = JSON.parse(output)
      expect(parsed.level).toBe('warn')
      expect(parsed.msg).toBe('watch out')
      expect(parsed.ts).toBeDefined()
    } finally {
      consoleSpy.restore()
    }
  })

  it('accepts a second arg as context fields in JSON output', () => {
    const consoleSpy = captureConsole('error')
    try {
      appLog.error('failed', { code: 42, detail: 'timeout' })
      const parsed = JSON.parse(consoleSpy.calls[0][0] as string)
      expect(parsed.code).toBe(42)
      expect(parsed.detail).toBe('timeout')
    } finally {
      consoleSpy.restore()
    }
  })

  it('handles non-object second arg gracefully', () => {
    const consoleSpy = captureConsole('error')
    try {
      appLog.error('failed', 'some string context')
      const parsed = JSON.parse(consoleSpy.calls[0][0] as string)
      expect(parsed.msg).toBe('failed')
      expect(parsed.context).toBe('some string context')
    } finally {
      consoleSpy.restore()
    }
  })

  it('serializes Error passed as second argument', () => {
    const consoleSpy = captureConsole('error')
    try {
      const err = new TypeError('bad input')
      appLog.error('Failed:', err)
      const parsed = JSON.parse(consoleSpy.calls[0][0] as string)
      expect(parsed.msg).toBe('Failed:')
      expect(parsed.error).toBe('TypeError')
      expect(parsed.errorMessage).toBe('bad input')
      expect(parsed.stack).toBeDefined()
    } finally {
      consoleSpy.restore()
    }
  })

  it('serializes Error passed as first argument', () => {
    const consoleSpy = captureConsole('error')
    try {
      const err = new RangeError('out of bounds')
      appLog.error(err)
      const parsed = JSON.parse(consoleSpy.calls[0][0] as string)
      expect(parsed.msg).toBe('out of bounds')
      expect(parsed.error).toBe('RangeError')
      expect(parsed.errorMessage).toBe('out of bounds')
      expect(parsed.stack).toBeDefined()
    } finally {
      consoleSpy.restore()
    }
  })

  it('info outputs valid JSON with level, msg, ts', () => {
    const consoleSpy = captureConsole('info')
    try {
      appLog.info('hello info')
      expect(consoleSpy.calls).toHaveLength(1)
      const parsed = JSON.parse(consoleSpy.calls[0][0] as string)
      expect(parsed.level).toBe('info')
      expect(parsed.msg).toBe('hello info')
      expect(parsed.ts).toBeDefined()
    } finally {
      consoleSpy.restore()
    }
  })

  it('debug outputs valid JSON with level, msg, ts', () => {
    const consoleSpy = captureConsole('debug')
    try {
      appLog.debug('hello debug')
      expect(consoleSpy.calls).toHaveLength(1)
      const parsed = JSON.parse(consoleSpy.calls[0][0] as string)
      expect(parsed.level).toBe('debug')
      expect(parsed.msg).toBe('hello debug')
      expect(parsed.ts).toBeDefined()
    } finally {
      consoleSpy.restore()
    }
  })
})

describe('createSessionLogger', () => {
  it('returns a logger with error, warn, info, debug methods', () => {
    const logger = createSessionLogger('sess-123')
    expect(typeof logger.error).toBe('function')
    expect(typeof logger.warn).toBe('function')
    expect(typeof logger.info).toBe('function')
    expect(typeof logger.debug).toBe('function')
  })

  it('includes sessionID in every JSON entry', () => {
    const logger = createSessionLogger('sess-abc')
    const consoleSpy = captureConsole('warn')
    try {
      logger.warn('test message')
      const parsed = JSON.parse(consoleSpy.calls[0][0] as string)
      expect(parsed.sessionID).toBe('sess-abc')
      expect(parsed.level).toBe('warn')
      expect(parsed.msg).toBe('test message')
    } finally {
      consoleSpy.restore()
    }
  })

  it('includes extra context passed at creation time', () => {
    const logger = createSessionLogger('sess-xyz', { projectId: 'p-1' })
    const consoleSpy = captureConsole('error')
    try {
      logger.error('boom')
      const parsed = JSON.parse(consoleSpy.calls[0][0] as string)
      expect(parsed.sessionID).toBe('sess-xyz')
      expect(parsed.projectId).toBe('p-1')
    } finally {
      consoleSpy.restore()
    }
  })
})

describe('log level filtering', () => {
  it('suppresses debug messages when minimum level is warn', () => {
    process.env.NEXT_PUBLIC_LOG_LEVEL = 'warn'
    const warnLogger = createSessionLogger('level-test')
    const debugSpy = captureConsole('debug')
    const errorSpy = captureConsole('error')

    try {
      warnLogger.debug('should not appear')
      expect(debugSpy.calls).toHaveLength(0)

      warnLogger.error('should appear')
      expect(errorSpy.calls).toHaveLength(1)
    } finally {
      process.env.NEXT_PUBLIC_LOG_LEVEL = 'debug'
      debugSpy.restore()
      errorSpy.restore()
    }
  })
})
