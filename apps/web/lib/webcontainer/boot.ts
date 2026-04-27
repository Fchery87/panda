import type { WebContainer } from '@webcontainer/api'

interface BootWebcontainerWithTimeoutOptions {
  /** Async function that performs the full import + boot sequence. */
  boot: () => Promise<WebContainer>
  timeoutMs: number
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
