'use client'

import type { WebContainer } from '@webcontainer/api'
import { spawnInContainer } from '@/lib/webcontainer/process-adapter'

export type RuntimeCommandExecutionPath = 'browser-webcontainer' | 'server-fallback'

export interface RuntimeCommandResult {
  stdout: string
  stderr: string
  exitCode: number
  durationMs: number
  timedOut: boolean
  executionPath: RuntimeCommandExecutionPath
}

export interface ExecuteRuntimeCommandOptions {
  command: string
  workingDirectory?: string
  webcontainer?: WebContainer | null
  onOutput?: (chunk: string) => void
  serverExecute: (request: { command: string; workingDirectory?: string }) => Promise<{
    stdout: string
    stderr: string
    exitCode: number
    durationMs: number
    timedOut: boolean
  }>
  now?: () => number
}

export async function executeRuntimeCommand({
  command,
  workingDirectory,
  webcontainer,
  onOutput,
  serverExecute,
  now = Date.now,
}: ExecuteRuntimeCommandOptions): Promise<RuntimeCommandResult> {
  if (webcontainer) {
    const startedAt = now()
    const result = await spawnInContainer(webcontainer, command, { onOutput })
    return {
      ...result,
      durationMs: now() - startedAt,
      timedOut: false,
      executionPath: 'browser-webcontainer',
    }
  }

  const result = await serverExecute({ command, workingDirectory })
  return { ...result, executionPath: 'server-fallback' }
}
