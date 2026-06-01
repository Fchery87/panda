import type { ChatMode } from '@/lib/agent/chat-modes'

import { buildManualRoutingDecision, type RoutingDecision, type RoutingInput } from './types'

type IntentSignal = {
  mode: ChatMode
  weight: number
  rationale: string
}

type IntentRule = {
  mode: ChatMode
  weight: number
  rationale: string
  patterns: RegExp[]
}

const ROUTING_RULES: IntentRule[] = [
  {
    mode: 'build',
    weight: 12,
    rationale: 'The request asks Panda to execute a broad build or verification run.',
    patterns: [
      /\bfull implementation\b/iu,
      /\bbuild (it|this|the|out|the whole|everything)\b/iu,
      /\bimplement (everything|the whole|end-to-end|the full|all of)\b/iu,
      /\b(execute|implement|start|run) (the|this|that|approved) plan\b/iu,
      /\bship (it|this|the)\b/iu,
      /\bmake it so\b/iu,
      /\bkeep going until (ci|the build|tests?) (is|are) green\b/iu,
      /\brun .*\b(full|all|entire)\b.*\b(verify|validation|test)\b/iu,
    ],
  },
  {
    mode: 'build',
    weight: 14,
    rationale: 'The request asks Panda to execute an existing or approved plan.',
    patterns: [
      /\b(implement|execute|start|build|run)\b.*\b(the|this|that|approved)\s+plan\b/iu,
      /\bstart (implementing|building|executing) (it|this|that)\b/iu,
    ],
  },
  {
    mode: 'plan',
    weight: 11,
    rationale:
      'The request asks for an implementation plan, design, architecture, or execution strategy.',
    patterns: [
      /\bimplementation\s+plan?\b/iu,
      /\bcomprehensive\s+implementation\s+plan?\b/iu,
      /\b(create|draft|write|make|produce|generate)\b.*\b(implementation\s+)?plan?\b/iu,
      /\b(plan|design|architect|scope|roadmap|strategy)\b/iu,
      /\bbreak (this|that|it|the work) down\b/iu,
      /\bturn (these|this|those|your) findings into\b.*\b(plan|roadmap|steps)\b/iu,
      /\bwhat(?:'s| is) the approach\b/iu,
    ],
  },
  {
    mode: 'plan',
    weight: 11,
    rationale: 'The request asks for implementation advice or an approach before making changes.',
    patterns: [
      /\bhow (would|should|could) (you|we|i)\b.*\b(fix|change|update|implement|build|refactor)\b/iu,
      /\bwhat should (i|we|you)\b.*\b(fix|change|update|implement|build|refactor)\b/iu,
      /\bwhat would (you|we)\b.*\b(change|update|fix|refactor)\b/iu,
      /\bwhat(?:'s| is) the best way to\b.*\b(fix|change|update|implement|build|refactor)\b/iu,
    ],
  },
  {
    mode: 'ask',
    weight: 12,
    rationale: 'The request asks Panda to review and report recommendations without editing files.',
    patterns: [
      /\btell me what to (change|update|fix|refactor)\b/iu,
      /\b(can you |please )?review\b.*\b(tell me|show me|explain)\b/iu,
      /\blook (at|over)\b.*\b(tell me|what should|recommend)\b/iu,
    ],
  },
  {
    mode: 'code',
    weight: 12,
    rationale: 'The request asks Panda to inspect and then apply concrete fixes.',
    patterns: [
      /\b(review|inspect|find|look (?:at|over))\b.*\b(?:and|then)\s+(fix|patch|update|change)\b/iu,
      /\bfix\b.*\b(any|all)\b.*\b(issues|bugs|failures|errors)\b/iu,
    ],
  },
  {
    mode: 'code',
    weight: 9,
    rationale: 'The request asks for a concrete code change, edit, or bug fix.',
    patterns: [
      /\bfix\b/iu,
      /\bdebug\b/iu,
      /\bchange\b/iu,
      /\bupdate\b/iu,
      /\badd\b/iu,
      /\bcreate\b/iu,
      /\bmkdir\b/iu,
      /\bnew\s+(?:file|folder|directory)\b/iu,
      /\bremove\b/iu,
      /\bwrite\b/iu,
      /\bedit\b/iu,
      /\bpatch\b/iu,
      /\brefactor\b/iu,
      /\brename\b/iu,
      /\bmake .*\b(work|pass|compile)\b/iu,
    ],
  },
  {
    mode: 'ask',
    weight: 7,
    rationale:
      'The request asks for explanation, research, analysis, or understanding without changing code.',
    patterns: [
      /\bexplain\b/iu,
      /\bresearch\b/iu,
      /\binvestigate\b/iu,
      /\banaly[sz]e\b/iu,
      /\breview\b/iu,
      /\bwhat\b/iu,
      /\bwhy\b/iu,
      /\bhow\b/iu,
      /\bshow me\b/iu,
      /\bfind out\b/iu,
      /\bcompare\b/iu,
    ],
  },
]

const DIRECT_MODE_REQUESTS: Array<{ mode: ChatMode; patterns: RegExp[] }> = [
  { mode: 'ask', patterns: [/\b(?:switch|route|go|move) to ask\b/iu, /\bin ask mode\b/iu] },
  { mode: 'plan', patterns: [/\b(?:switch|route|go|move) to plan\b/iu, /\bin plan mode\b/iu] },
  { mode: 'code', patterns: [/\b(?:switch|route|go|move) to code\b/iu, /\bin code mode\b/iu] },
  { mode: 'build', patterns: [/\b(?:switch|route|go|move) to build\b/iu, /\bin build mode\b/iu] },
]

const MODE_STICKINESS: Record<ChatMode, number> = {
  ask: 1,
  plan: 1,
  code: 1,
  build: 1,
}

function normalizeMessage(message: string): string {
  return message
    .replace(/\[Editor Context\][\s\S]*?\n\n/iu, ' ')
    .replace(/```[\s\S]*?```/gu, ' ')
    .replace(/[“”]/gu, '"')
    .replace(/[‘’]/gu, "'")
    .replace(/\s+/gu, ' ')
    .trim()
}

function collectRuleSignals(message: string): IntentSignal[] {
  return ROUTING_RULES.flatMap((rule) => {
    const matched = rule.patterns.some((pattern) => pattern.test(message))
    return matched
      ? [
          {
            mode: rule.mode,
            weight: rule.weight,
            rationale: rule.rationale,
          },
        ]
      : []
  })
}

function collectContextSignals(input: RoutingInput, message: string): IntentSignal[] {
  const signals: IntentSignal[] = []

  if (
    input.threadState.hasApprovedPlan &&
    /\b(implement|execute|start|build|continue|run)\b/iu.test(message)
  ) {
    signals.push({
      mode: 'build',
      weight: 8,
      rationale: 'An approved plan exists and the request asks to execute it.',
    })
  }

  if (
    input.threadState.hasActivePlanningSession &&
    /\b(continue|refine|revise|finish|finali[sz]e|update)\b.*\b(plan|scope|design|requirements?)\b/iu.test(
      message
    )
  ) {
    signals.push({
      mode: 'plan',
      weight: 6,
      rationale: 'An active planning session exists and the request continues planning work.',
    })
  }

  if (input.threadState.hasRunningAgentRun) {
    signals.push({
      mode: input.requestedMode,
      weight: 3,
      rationale: 'A run is already active, so Panda should avoid surprising mode changes.',
    })
  }

  return signals
}

function collectSuggestedSkills(message: string): string[] {
  const skills = new Set<string>()
  if (
    /\b(debug|stack trace|traceback|crash|exception|reproduce|logs?|not working|fails?|failing|failure|runtime error)\b/iu.test(
      message
    )
  ) {
    skills.add('debug')
  }
  if (/\b(review|audit|diff|recommendations?)\b/iu.test(message)) {
    skills.add('review')
  }
  if (/\b(docs?|documentation|readme|changelog|guide)\b/iu.test(message)) {
    skills.add('docs')
  }
  return [...skills]
}

function findDirectModeRequest(message: string): ChatMode | null {
  return (
    DIRECT_MODE_REQUESTS.find((request) =>
      request.patterns.some((pattern) => pattern.test(message))
    )?.mode ?? null
  )
}

function scoreSignals(input: RoutingInput, signals: IntentSignal[]) {
  const scores = new Map<ChatMode, number>([
    ['ask', 0],
    ['plan', 0],
    ['code', 0],
    ['build', 0],
  ])

  scores.set(
    input.requestedMode,
    (scores.get(input.requestedMode) ?? 0) + MODE_STICKINESS[input.requestedMode]
  )

  for (const signal of signals) {
    scores.set(signal.mode, (scores.get(signal.mode) ?? 0) + signal.weight)
  }

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1])
  const [winnerMode, winnerScore] = ranked[0] ?? [input.requestedMode, 0]
  const [, runnerUpScore] = ranked[1] ?? [input.requestedMode, 0]

  return {
    winnerMode,
    winnerScore,
    runnerUpScore,
    rationale:
      signals.filter((signal) => signal.mode === winnerMode).sort((a, b) => b.weight - a.weight)[0]
        ?.rationale ?? 'No deterministic routing rule matched the request.',
  }
}

function confidenceFor(args: {
  winnerScore: number
  runnerUpScore: number
  resolvedMode: ChatMode
  requestedMode: ChatMode
}): RoutingDecision['confidence'] {
  if (args.winnerScore <= MODE_STICKINESS[args.requestedMode]) return 'low'
  const margin = args.winnerScore - args.runnerUpScore

  if (args.winnerScore >= 11 && margin >= 2) return 'high'
  if (args.resolvedMode !== args.requestedMode && margin < 4) return 'medium'
  if (args.winnerScore >= 10 || margin >= 5) return 'high'
  return 'medium'
}

export function decideRouting(input: RoutingInput): RoutingDecision {
  if (input.manualOverride) {
    return buildManualRoutingDecision(input)
  }

  const message = normalizeMessage(input.message)
  const directModeRequest = findDirectModeRequest(message)

  if (directModeRequest) {
    return {
      requestedMode: input.requestedMode,
      resolvedMode: directModeRequest,
      agent: directModeRequest,
      confidence: 'high',
      rationale: `The user explicitly asked to use ${directModeRequest} mode.`,
      requiresApproval: false,
      webcontainerRequired: false,
      suggestedSkills: collectSuggestedSkills(message),
      source: 'deterministic_rules',
    }
  }

  const signals = [...collectRuleSignals(message), ...collectContextSignals(input, message)]
  const scored = scoreSignals(input, signals)
  const confidence = confidenceFor({
    winnerScore: scored.winnerScore,
    runnerUpScore: scored.runnerUpScore,
    resolvedMode: scored.winnerMode,
    requestedMode: input.requestedMode,
  })

  return {
    requestedMode: input.requestedMode,
    resolvedMode: scored.winnerMode,
    agent: scored.winnerMode,
    confidence,
    rationale: scored.rationale,
    requiresApproval: confidence !== 'high' && input.oversightLevel === 'review',
    webcontainerRequired: false,
    suggestedSkills: collectSuggestedSkills(message),
    source: 'deterministic_rules',
  }
}
