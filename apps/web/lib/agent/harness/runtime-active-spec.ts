import type { FormalSpecification } from '../spec/types'

export function buildActiveSpecSystemContent(spec: FormalSpecification): string {
  const lines: string[] = [
    '## Active Specification',
    `**Goal:** ${spec.intent.goal}`,
    `**Status:** ${spec.status} (Tier: ${spec.tier})`,
    '',
  ]

  if (spec.intent.constraints.length > 0) {
    lines.push('**Constraints:**')
    for (const c of spec.intent.constraints) {
      lines.push(
        `- [${c.type}] ${'requirement' in c ? c.requirement : 'rule' in c ? c.rule : 'assertion' in c ? c.assertion : JSON.stringify(c)}`
      )
    }
    lines.push('')
  }

  if (spec.intent.acceptanceCriteria.length > 0) {
    lines.push('**Acceptance Criteria:**')
    for (const a of spec.intent.acceptanceCriteria) {
      lines.push(`- ${a.behavior}`)
    }
    lines.push('')
  }

  if (spec.plan.steps.length > 0) {
    lines.push('**Execution Plan:**')
    for (let i = 0; i < spec.plan.steps.length; i++) {
      lines.push(`${i + 1}. ${spec.plan.steps[i].description}`)
    }
    lines.push('')
  }

  lines.push(
    '**Scope Rule:** Only modify files in plan scope. Out-of-scope writes will be flagged.'
  )

  return lines.join('\n')
}
