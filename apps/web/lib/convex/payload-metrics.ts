export function estimateJsonBytes(value: unknown): number {
  try {
    const json = JSON.stringify(value)
    if (typeof json !== 'string') return 0
    return new TextEncoder().encode(json).length
  } catch {
    return 0
  }
}

export function logConvexPayload(label: string, value: unknown): void {
  if (process.env.NODE_ENV === 'production') return
  if (process.env.NEXT_PUBLIC_DEBUG_CONVEX_PAYLOADS !== '1') return

  const bytes = estimateJsonBytes(value)
  console.info(`[convex-payload] ${label}: ${bytes} bytes`)
}
