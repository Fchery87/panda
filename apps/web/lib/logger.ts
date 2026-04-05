const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const
type LogLevel = keyof typeof LOG_LEVELS

function getMinLevel(): LogLevel {
  const env = process.env.NEXT_PUBLIC_LOG_LEVEL as string | undefined
  if (env && env in LOG_LEVELS) return env as LogLevel
  return process.env.NODE_ENV === 'production' ? 'warn' : 'debug'
}

type Logger = {
  error: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  info: (...args: unknown[]) => void
  debug: (...args: unknown[]) => void
}

function formatEntry(
  level: LogLevel,
  args: unknown[],
  baseContext?: Record<string, unknown>,
): string {
  const msg = typeof args[0] === 'string' ? args[0] : String(args[0])
  let context: Record<string, unknown> = {}

  if (args.length > 1) {
    const second = args[1]
    if (second && typeof second === 'object' && !Array.isArray(second)) {
      context = second as Record<string, unknown>
    } else {
      context = { context: second }
    }
  }

  return JSON.stringify({
    level,
    msg,
    ts: new Date().toISOString(),
    ...baseContext,
    ...context,
  })
}

function createLogger(baseContext?: Record<string, unknown>): Logger {
  const minLevel = getMinLevel()

  function emit(level: LogLevel, args: unknown[]) {
    if (LOG_LEVELS[level] < LOG_LEVELS[minLevel]) return
    const entry = formatEntry(level, args, baseContext)
    console[level](entry)
  }

  return {
    error: (...args: unknown[]) => emit('error', args),
    warn: (...args: unknown[]) => emit('warn', args),
    info: (...args: unknown[]) => emit('info', args),
    debug: (...args: unknown[]) => emit('debug', args),
  }
}

export const appLog: Logger = createLogger()

export function createSessionLogger(
  sessionID: string,
  extra?: Record<string, unknown>,
): Logger {
  return createLogger({ sessionID, ...extra })
}
