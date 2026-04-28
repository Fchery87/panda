import type { WebContainer } from '@webcontainer/api'

interface BootWebcontainerWithTimeoutOptions {
  /** Async function that performs the full import + boot sequence. */
  boot: () => Promise<WebContainer>
  timeoutMs: number
}

type WebcontainerBootTelemetryStatus = 'ready' | 'error' | 'unsupported' | 'unavailable'
type WebcontainerExecutionPath = 'browser-webcontainer' | 'server-fallback'
type WebcontainerBootReasonCategory =
  | 'boot-success'
  | 'boot-error'
  | 'unsupported-runtime'
  | 'unavailable-runtime'

interface WebcontainerBootTelemetryInput {
  status: WebcontainerBootTelemetryStatus
  startedAt: number
  endedAt: number
  error?: unknown
}

interface WebcontainerBootTelemetry {
  status: WebcontainerBootTelemetryStatus
  executionPath: WebcontainerExecutionPath
  durationMs: number
  reasonCategory: WebcontainerBootReasonCategory
}

/**
 * Race a full WebContainer import+boot sequence against a hard timeout.
 *
 * The caller must pass the *entire* async chain (dynamic import → boot) as
 * `boot` so the timeout covers module resolution too — not just `WebContainer.boot()`.
 */
export function bootWebcontainerWithTimeout({
  boot,
  timeoutMs,
}: BootWebcontainerWithTimeoutOptions): Promise<WebContainer> {
  return Promise.race([
    boot(),
    new Promise<never>((_resolve, reject) =>
      setTimeout(
        () => reject(new Error(`WebContainer boot timed out after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ])
}

export function buildWebcontainerBootTelemetry({
  status,
  startedAt,
  endedAt,
}: WebcontainerBootTelemetryInput): WebcontainerBootTelemetry {
  const durationMs = Math.max(0, endedAt - startedAt)
  const executionPath: WebcontainerExecutionPath =
    status === 'ready' ? 'browser-webcontainer' : 'server-fallback'

  const reasonCategory: WebcontainerBootReasonCategory =
    status === 'ready'
      ? 'boot-success'
      : status === 'unsupported'
        ? 'unsupported-runtime'
        : status === 'unavailable'
          ? 'unavailable-runtime'
          : 'boot-error'

  return {
    status,
    executionPath,
    durationMs,
    reasonCategory,
  }
}
