import type { WorkerResult } from './types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object'
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
}

export function parseWorkerResult(payload: string): WorkerResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(payload)
  } catch {
    throw new Error('Invalid worker result payload')
  }

  if (!isRecord(parsed)) {
    throw new Error('Invalid worker result payload')
  }

  const testsRun = parsed.testsRun
  if (
    (parsed.outcome !== 'completed' &&
      parsed.outcome !== 'blocked' &&
      parsed.outcome !== 'failed') ||
    typeof parsed.summary !== 'string' ||
    !isStringArray(parsed.filesTouched) ||
    !isStringArray(parsed.testsWritten) ||
    !Array.isArray(testsRun) ||
    !testsRun.every(
      (entry) =>
        isRecord(entry) &&
        typeof entry.command === 'string' &&
        (entry.status === 'passed' || entry.status === 'failed' || entry.status === 'skipped')
    ) ||
    !isStringArray(parsed.evidenceRefs) ||
    !isStringArray(parsed.unresolvedRisks) ||
    !isStringArray(parsed.followUpActions) ||
    (parsed.suggestedTaskStatus !== 'in_review' &&
      parsed.suggestedTaskStatus !== 'blocked' &&
      parsed.suggestedTaskStatus !== 'rejected')
  ) {
    throw new Error('Invalid worker result payload')
  }

  return parsed as unknown as WorkerResult
}
