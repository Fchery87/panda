import type { FormalSpecification } from './types'
import { registerActiveSpec } from './drift-detection'

export function buildSpecSystemMessage(spec: FormalSpecification): string {
  const lines: string[] = [
    '## Active Specification',
    '',
    `**Goal:** ${spec.intent.goal}`,
    `**Status:** ${spec.status} (Tier: ${spec.tier})`,
    '',
    '### Constraints (must not violate)',
    ...spec.intent.constraints.map((c) => {
      switch (c.type) {
        case 'structural':
          return `- [structural] ${c.rule} (${c.target})`
        case 'behavioral':
          return `- [behavioral] ${c.rule} (${c.assertion})`
        case 'performance':
          return `- [performance] ${c.metric} <= ${c.threshold} ${c.unit}`
        case 'compatibility':
          return `- [compatibility] ${c.requirement} (${c.scope})`
        case 'security':
          return `- [security] ${c.requirement}${c.standard ? ` (${c.standard})` : ''}`
      }
    }),
    '',
    '### Acceptance Criteria (must satisfy)',
    ...spec.intent.acceptanceCriteria.map((c) => `- ${c.behavior} [${c.verificationMethod}]`),
    '',
    '### Execution Plan',
    ...spec.plan.steps.map((s, i) => `${i + 1}. ${s.description}`),
    '',
    'Every action you take must advance this spec. Do not modify files that conflict with the constraints above.',
  ]
  return lines.join('\n')
}

export function registerActiveSpecForDrift(spec: FormalSpecification): void {
  registerActiveSpec(spec)
}
