import type { ArtifactAction } from '@/lib/artifacts/executeArtifact'
import type { AdvisorGate, AdvisorPolicy, AdvisorReview } from './advisor'
import { buildAdvisorReview, isValidAdvisorReview } from './advisor-review-builder'
import { buildAdvisorPreflight } from './advisor-preflight'

export interface AdvisorReviewRequest {
  artifactId?: string
  runId?: string
  workflowArtifactId?: string
  gates: AdvisorGate[]
  prompt: string
}

export function buildAdvisorReviewerPrompt(args: {
  gates: AdvisorGate[]
  action?: ArtifactAction
  context?: string
}): string {
  const actionSummary = args.action
    ? args.action.type === 'file_write'
      ? `file_write ${args.action.payload.filePath}`
      : `command_run ${args.action.payload.command}`
    : 'workflow checkpoint'

  return [
    'You are Panda advisor-reviewer. Review the gated workflow action for safety and correctness.',
    `Gates: ${args.gates.join(', ') || 'none'}`,
    `Action: ${actionSummary}`,
    args.context ? `Context: ${args.context}` : null,
    'Return strict JSON only with shape:',
    '{"status":"approved|needs_changes|blocked","summary":"short decision","risks":[{"severity":"low|medium|high","file":"optional path","finding":"issue","recommendation":"fix"}]}',
  ]
    .filter(Boolean)
    .join('\n')
}

export function parseAdvisorReviewerOutput(output: string): AdvisorReview {
  try {
    const jsonStart = output.indexOf('{')
    const jsonEnd = output.lastIndexOf('}')
    const jsonText = jsonStart >= 0 && jsonEnd >= jsonStart ? output.slice(jsonStart, jsonEnd + 1) : output
    const parsed = JSON.parse(jsonText)
    if (isValidAdvisorReview(parsed)) return parsed
  } catch {
    // fall through to conservative review
  }

  return buildAdvisorReview({
    gates: [],
    status: 'needs_changes',
    summary: 'Advisor reviewer output could not be parsed. Manual review is required before continuing.',
    risks: [
      {
        severity: 'medium',
        finding: 'Advisor output was missing or malformed.',
        recommendation: 'Re-run advisor review or inspect the gated action manually.',
      },
    ],
  })
}

export function buildArtifactAdvisorReviewRequest(args: {
  artifactId: string
  action: ArtifactAction
  policy: AdvisorPolicy
  context?: string
}): AdvisorReviewRequest | null {
  const preflight = buildAdvisorPreflight({
    policy: args.policy,
    changedFiles: args.action.type === 'file_write' ? [args.action.payload.filePath] : [],
    commands: args.action.type === 'command_run' ? [args.action.payload.command] : [],
  })

  if (!preflight.required) return null

  return {
    artifactId: args.artifactId,
    gates: preflight.gates,
    prompt: buildAdvisorReviewerPrompt({
      gates: preflight.gates,
      action: args.action,
      context: args.context,
    }),
  }
}
