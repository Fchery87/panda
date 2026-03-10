import type { ChildProcessWithoutNullStreams } from 'node:child_process'

interface RegisteredProcess {
  child: ChildProcessWithoutNullStreams
  timeout: NodeJS.Timeout
}

const globalRegistry = globalThis as typeof globalThis & {
  __pandaJobProcessRegistry?: Map<string, RegisteredProcess>
}

const registry = globalRegistry.__pandaJobProcessRegistry ?? new Map<string, RegisteredProcess>()
globalRegistry.__pandaJobProcessRegistry = registry

export function registerJobProcess(
  jobId: string,
  child: ChildProcessWithoutNullStreams,
  timeout: NodeJS.Timeout
) {
  registry.set(jobId, { child, timeout })
}

export function cleanupJobProcess(jobId: string) {
  const entry = registry.get(jobId)
  if (!entry) return false
  clearTimeout(entry.timeout)
  registry.delete(jobId)
  return true
}

export function cancelJobProcess(jobId: string) {
  const entry = registry.get(jobId)
  if (!entry) return false

  clearTimeout(entry.timeout)
  entry.child.kill('SIGTERM')

  setTimeout(() => {
    if (!entry.child.killed) {
      entry.child.kill('SIGKILL')
    }
  }, 2000)

  return true
}
