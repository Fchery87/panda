import type { ChatMode } from '@/lib/agent/chat-modes'

import { buildManualRoutingDecision, type RoutingDecision, type RoutingInput } from './types'

type RoutingRule = {
  mode: ChatMode
  confidence: RoutingDecision['confidence']
  rationale: string
  patterns: RegExp[]
}

const ROUTING_RULES: RoutingRule[] = [
  {
    mode: 'build',
    confidence: 'high',
    rationale: 'The request asks Panda to execute a broad implementation or verification run.',
    patterns: [
      /\bfull implementation\b/iu,
      /\bbuild (it|this|the|out)\b/iu,
      /\bimplement (everything|the whole|end-to-end)\b/iu,
      /\brun .*\b(full|all|entire)\b.*\bverify\b/iu,
    ],
  },
  {
    mode: 'code',
    confidence: 'high',
    rationale: 'The request asks for a concrete code change or bug fix.',
    patterns: [
      /\bfix\b/iu,
      /\bdebug\b/iu,
      /\bchange\b/iu,
      /\bupdate\b/iu,
      /\badd\b/iu,
      /\bremove\b/iu,
      /\bwrite\b/iu,
    ],
  },
  {
    mode: 'plan',
    confidence: 'high',
    rationale: 'The request asks for design, planning, or architecture before implementation.',
    patterns: [/\bplan\b/iu, /\bdesign\b/iu, /\barchitecture\b/iu, /\bapproach\b/iu],
  },
  {
    mode: 'ask',
    confidence: 'high',
    rationale: 'The request asks for explanation or understanding without changing code.',
    patterns: [/\bexplain\b/iu, /\bwhat\b/iu, /\bwhy\b/iu, /\bhow\b/iu, /\bshow me\b/iu],
  },
]

export function decideRouting(input: RoutingInput): RoutingDecision {
  if (input.manualOverride) {
    return buildManualRoutingDecision(input)
  }

  const matchedRule = ROUTING_RULES.find((rule) =>
    rule.patterns.some((pattern) => pattern.test(input.message))
  )

  if (!matchedRule) {
    return {
      requestedMode: input.requestedMode,
      resolvedMode: input.requestedMode,
      agent: input.requestedMode,
      confidence: 'low',
      rationale: 'No deterministic routing rule matched the request.',
      requiresApproval: input.oversightLevel === 'review',
      webcontainerRequired: false,
      suggestedSkills: [],
      source: 'deterministic_rules',
    }
  }

  return {
    requestedMode: input.requestedMode,
    resolvedMode: matchedRule.mode,
    agent: matchedRule.mode,
    confidence: matchedRule.confidence,
    rationale: matchedRule.rationale,
    requiresApproval: matchedRule.confidence !== 'high' && input.oversightLevel === 'review',
    webcontainerRequired: false,
    suggestedSkills: [],
    source: 'deterministic_rules',
  }
}
