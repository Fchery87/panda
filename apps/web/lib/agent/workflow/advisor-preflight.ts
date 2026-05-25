import { summarizeAdvisorRequirement, type AdvisorGate, type AdvisorPolicy } from './advisor'

export interface AdvisorPreflightInput {
  policy: AdvisorPolicy
  changedFiles?: string[]
  commands?: string[]
  autonomy?: 'guided' | 'autopilot'
  diffFileCount?: number
}

export interface AdvisorPreflightResult {
  required: boolean
  gates: AdvisorGate[]
  status: 'clear' | 'needs_advisor'
  message: string
}

export function buildAdvisorPreflight(input: AdvisorPreflightInput): AdvisorPreflightResult {
  const { required, gates } = summarizeAdvisorRequirement(input.policy, input)
  if (!required) {
    return {
      required: false,
      gates,
      status: 'clear',
      message: gates.length > 0 ? `Advisor gates detected but not required by policy: ${gates.join(', ')}` : 'No advisor gates detected.',
    }
  }

  return {
    required: true,
    gates,
    status: 'needs_advisor',
    message: `Advisor review required before continuing: ${gates.join(', ')}`,
  }
}

export function advisorPreflightRunEvent(result: AdvisorPreflightResult) {
  return {
    type: 'advisor_preflight',
    content: result.message,
    status: result.status,
    progressCategory: 'analysis',
  } as const
}
