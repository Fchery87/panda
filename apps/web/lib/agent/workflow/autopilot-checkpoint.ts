import { buildAdvisorPreflight, type AdvisorPreflightResult } from './advisor-preflight'
import type { AdvisorPolicy } from './advisor'

export interface AutopilotCheckpointInput {
  enabled: boolean
  policy: AdvisorPolicy
  changedFiles?: string[]
  commands?: string[]
  diffFileCount?: number
}

export interface AutopilotCheckpointResult {
  allowed: boolean
  preflight: AdvisorPreflightResult
}

export function evaluateAutopilotCheckpoint(input: AutopilotCheckpointInput): AutopilotCheckpointResult {
  const preflight = buildAdvisorPreflight({
    policy: input.policy,
    changedFiles: input.changedFiles,
    commands: input.commands,
    diffFileCount: input.diffFileCount,
    autonomy: input.enabled ? 'autopilot' : 'guided',
  })

  return {
    allowed: !preflight.required,
    preflight,
  }
}

export function autopilotCheckpointRunEvent(result: AutopilotCheckpointResult) {
  return {
    type: 'autopilot_checkpoint',
    content: result.preflight.message,
    status: result.allowed ? 'clear' : 'needs_advisor',
    progressCategory: 'analysis',
  } as const
}
