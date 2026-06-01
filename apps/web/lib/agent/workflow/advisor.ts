export type AdvisorGate =
  | 'large_diff'
  | 'destructive_command'
  | 'dependency_change'
  | 'auth_or_security_change'
  | 'database_schema_change'
  | 'autopilot_checkpoint'

export interface AdvisorPolicy {
  enabled: boolean
  requiredFor: AdvisorGate[]
  model?: string
  reasoningEffort: 'low' | 'medium' | 'high'
}

export interface AdvisorReviewFinding {
  severity: 'low' | 'medium' | 'high'
  file?: string
  finding: string
  recommendation: string
}

export interface AdvisorReview {
  status: 'approved' | 'needs_changes' | 'blocked'
  summary: string
  risks: AdvisorReviewFinding[]
}

export interface AdvisorGateInput {
  changedFiles?: string[]
  commands?: string[]
  autonomy?: 'guided' | 'autopilot'
  diffFileCount?: number
}

const SECURITY_PATTERN =
  /(^|\/)(auth|security|proxy)|oauth|token|secret|password|permission|policy/i
const CONVEX_SCHEMA_PATTERN = /^convex\/schema\.ts$|^convex\/.*\.(ts|tsx)$/i
const DEPENDENCY_PATTERN =
  /(^|\/)(package\.json|bun\.lock|package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$/i
const DESTRUCTIVE_COMMAND_PATTERN =
  /\b(rm\s+-rf|git\s+reset\s+--hard|drop\s+table|truncate\s+table|delete\s+from|chmod\s+-R|chown\s+-R)\b/i

export function resolveAdvisorGates(input: AdvisorGateInput): AdvisorGate[] {
  const gates = new Set<AdvisorGate>()
  const files = input.changedFiles ?? []
  const commands = input.commands ?? []

  if ((input.diffFileCount ?? files.length) >= 8) gates.add('large_diff')
  if (files.some((file) => DEPENDENCY_PATTERN.test(file))) gates.add('dependency_change')
  if (files.some((file) => SECURITY_PATTERN.test(file))) gates.add('auth_or_security_change')
  if (files.some((file) => CONVEX_SCHEMA_PATTERN.test(file))) gates.add('database_schema_change')
  if (commands.some((command) => DESTRUCTIVE_COMMAND_PATTERN.test(command)))
    gates.add('destructive_command')
  if (input.autonomy === 'autopilot') gates.add('autopilot_checkpoint')

  return [...gates]
}

export function isAdvisorRequired(policy: AdvisorPolicy, gates: AdvisorGate[]): boolean {
  if (!policy.enabled) return false
  const required = new Set(policy.requiredFor)
  return gates.some((gate) => required.has(gate))
}

export function summarizeAdvisorRequirement(
  policy: AdvisorPolicy,
  input: AdvisorGateInput
): {
  required: boolean
  gates: AdvisorGate[]
} {
  const gates = resolveAdvisorGates(input)
  return { gates, required: isAdvisorRequired(policy, gates) }
}
