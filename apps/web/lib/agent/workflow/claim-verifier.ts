import { safeJSONParse } from '../harness/tool-repair'

export type ClaimKind = 'file_write' | 'command_run' | 'test_result'
export type ClaimStatus = 'verified' | 'attempted' | 'unverified' | 'failed'

export interface ClaimVerificationInput {
  kind: ClaimKind
  target: string
  runEvents: Array<{
    type: string
    toolName?: string
    args?: Record<string, unknown>
    output?: string
    error?: string
    targetFilePaths?: string[]
    status?: string
  }>
  fileExists?: (path: string) => boolean
}

export interface ClaimVerificationResult {
  kind: ClaimKind
  target: string
  status: ClaimStatus
  evidence: string[]
  errors: string[]
}

function parseOutput(output: string | undefined): Record<string, unknown> | null {
  if (!output) return null
  return safeJSONParse<Record<string, unknown>>(output, null)
}

function getWriteFilePaths(payload: Record<string, unknown> | null): Array<{ path: string; success: boolean }> {
  const files = payload?.files
  if (!Array.isArray(files)) return []
  return files.flatMap((file) => {
    if (!file || typeof file !== 'object') return []
    const record = file as Record<string, unknown>
    return typeof record.path === 'string'
      ? [{ path: record.path, success: record.success !== false }]
      : []
  })
}

export function verifyClaim(input: ClaimVerificationInput): ClaimVerificationResult {
  const evidence: string[] = []
  const errors: string[] = []

  if (input.kind === 'file_write') {
    const writeResults = input.runEvents
      .filter((event) => event.toolName === 'write_files')
      .flatMap((event) => getWriteFilePaths(parseOutput(event.output)))
      .filter((file) => file.path === input.target)

    if (writeResults.some((file) => file.success)) {
      evidence.push(`write_files queued ${input.target}`)
      if (input.fileExists?.(input.target)) {
        evidence.push(`project filesystem contains ${input.target}`)
        return { kind: input.kind, target: input.target, status: 'verified', evidence, errors }
      }
      errors.push(`project filesystem has not verified ${input.target}`)
      return { kind: input.kind, target: input.target, status: 'attempted', evidence, errors }
    }

    errors.push(`no successful write_files receipt for ${input.target}`)
    return { kind: input.kind, target: input.target, status: 'unverified', evidence, errors }
  }

  if (input.kind === 'command_run' || input.kind === 'test_result') {
    const commandEvents = input.runEvents.filter((event) => event.toolName === 'run_command')
    const matching = commandEvents.find((event) => String(event.args?.command ?? '') === input.target)
    if (!matching) {
      errors.push(`no run_command receipt for ${input.target}`)
      return { kind: input.kind, target: input.target, status: 'unverified', evidence, errors }
    }

    evidence.push(`run_command executed ${input.target}`)
    const output = parseOutput(matching.output)
    const exitCode = output?.exitCode
    if (matching.error || exitCode !== 0) {
      errors.push(matching.error ?? `command exited with ${String(exitCode)}`)
      return { kind: input.kind, target: input.target, status: 'failed', evidence, errors }
    }
    evidence.push('command exitCode was 0')
    return { kind: input.kind, target: input.target, status: 'verified', evidence, errors }
  }

  return { kind: input.kind, target: input.target, status: 'unverified', evidence, errors }
}

export function successVerbForClaim(result: ClaimVerificationResult): 'created' | 'attempted' | 'unverified' | 'failed' {
  if (result.status === 'verified') return 'created'
  if (result.status === 'attempted') return 'attempted'
  if (result.status === 'failed') return 'failed'
  return 'unverified'
}
