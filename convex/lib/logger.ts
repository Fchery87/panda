export const serverLog = {
  error: (...args: unknown[]) => {
    console.error(...args)
  },
  warn: (...args: unknown[]) => {
    console.warn(...args)
  },
}
