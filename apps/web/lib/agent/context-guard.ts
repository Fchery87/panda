export type ContextGuardClass = 'small' | 'medium' | 'large' | 'huge'

export interface ContextGuardThresholds {
  smallBytes: number
  mediumBytes: number
  largeBytes: number
  mediumPreviewChars: number
  largePreviewChars: number
  hugePreviewChars: number
}

export interface ContextGuardEvidenceHandle {
  sourceType: 'run_event'
  sourceId: string
  chunksWritten?: number
  retrievalHint?: string
}

export interface GuardedOutputMetadata {
  guarded: boolean
  reason?: 'output_size'
  classification: ContextGuardClass
  rawBytes: number
  rawChars: number
  returnedBytes: number
  bytesAvoided: number
  stdoutBytes: number
  stderrBytes: number
  truncated: boolean
  evidence?: ContextGuardEvidenceHandle
}

export interface GuardCommandOutputResult {
  modelFacing: {
    stdout: string
    stderr: string
    exitCode: number
    contextGuard?: GuardedOutputMetadata
  }
  metadata: GuardedOutputMetadata
}

export const DEFAULT_CONTEXT_GUARD_THRESHOLDS: ContextGuardThresholds = {
  smallBytes: 8 * 1024,
  mediumBytes: 32 * 1024,
  largeBytes: 256 * 1024,
  mediumPreviewChars: 12_000,
  largePreviewChars: 6_000,
  hugePreviewChars: 2_000,
}

const encoder = new TextEncoder()

export function byteLength(value: string): number {
  return encoder.encode(value).byteLength
}

export function isContextGuardEnabled(env: Pick<NodeJS.ProcessEnv, string> = process.env): boolean {
  return env.PANDA_CONTEXT_GUARD_ENABLED === '1'
}

export function classifyOutput(bytes: number, thresholds = DEFAULT_CONTEXT_GUARD_THRESHOLDS): ContextGuardClass {
  if (bytes <= thresholds.smallBytes) return 'small'
  if (bytes <= thresholds.mediumBytes) return 'medium'
  if (bytes <= thresholds.largeBytes) return 'large'
  return 'huge'
}

export function safeTruncate(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value
  if (maxChars <= 0) return ''

  const segmenterCtor = (Intl as unknown as { Segmenter?: new (locale?: string, options?: { granularity: 'grapheme' }) => Intl.Segmenter }).Segmenter
  if (segmenterCtor) {
    const segmenter = new segmenterCtor(undefined, { granularity: 'grapheme' })
    let out = ''
    for (const part of segmenter.segment(value) as Iterable<{ segment: string }>) {
      if (out.length + part.segment.length > maxChars) break
      out += part.segment
    }
    return out
  }

  const codePoints = Array.from(value)
  let out = ''
  for (const cp of codePoints) {
    if (out.length + cp.length > maxChars) break
    out += cp
  }
  return out
}

function preview(value: string, maxChars: number): string {
  if (!value) return ''
  const truncated = safeTruncate(value, maxChars)
  if (truncated.length === value.length) return truncated
  return `${truncated}\n\n[Context Guard: output preview truncated; full output is preserved in the command evidence.]`
}

export function guardCommandOutput(args: {
  stdout: string
  stderr: string
  exitCode: number
  thresholds?: ContextGuardThresholds
  evidence?: ContextGuardEvidenceHandle
}): GuardCommandOutputResult {
  const thresholds = args.thresholds ?? DEFAULT_CONTEXT_GUARD_THRESHOLDS
  const stdout = args.stdout ?? ''
  const stderr = args.stderr ?? ''
  const rawChars = stdout.length + stderr.length
  const stdoutBytes = byteLength(stdout)
  const stderrBytes = byteLength(stderr)
  const rawBytes = stdoutBytes + stderrBytes
  const classification = classifyOutput(rawBytes, thresholds)

  const maxChars =
    classification === 'small'
      ? Number.POSITIVE_INFINITY
      : classification === 'medium'
        ? thresholds.mediumPreviewChars
        : classification === 'large'
          ? thresholds.largePreviewChars
          : thresholds.hugePreviewChars

  const guarded = classification !== 'small'
  const nextStdout = guarded ? preview(stdout, Math.floor(maxChars * 0.75)) : stdout
  const nextStderr = guarded ? preview(stderr, Math.floor(maxChars * 0.25)) : stderr
  const returnedBytes = byteLength(nextStdout) + byteLength(nextStderr)
  const metadata: GuardedOutputMetadata = {
    guarded,
    ...(guarded ? { reason: 'output_size' as const } : {}),
    classification,
    rawBytes,
    rawChars,
    returnedBytes,
    bytesAvoided: Math.max(0, rawBytes - returnedBytes),
    stdoutBytes,
    stderrBytes,
    truncated: guarded,
    ...(guarded && args.evidence ? { evidence: args.evidence } : {}),
  }

  return {
    modelFacing: {
      stdout: nextStdout,
      stderr: nextStderr,
      exitCode: args.exitCode,
      ...(guarded ? { contextGuard: metadata } : {}),
    },
    metadata,
  }
}
