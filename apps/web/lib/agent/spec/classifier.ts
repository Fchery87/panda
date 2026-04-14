/**
 * Intent Classifier - LLM-based classification for SpecNative tier detection
 *
 * Evaluates user messages to determine the appropriate spec tier:
 * - instant: No spec needed (simple Q&A, typo fixes)
 * - ambient: Spec generated silently (refactoring, error handling)
 * - explicit: Full spec surfaced (complex features, system design)
 *
 * Classification evaluates: scope, risk, and complexity
 */

import type { SpecTier } from './types'
import type { LLMProvider } from '../../llm/types'
import { appLog } from '@/lib/logger'

const LLM_CLASSIFIER_FLAG = 'PANDA_SPEC_LLM_CLASSIFIER'
function llmClassifierEnabled(): boolean {
  return process.env[LLM_CLASSIFIER_FLAG] !== '0'
}

/**
 * Context for intent classification
 */
export interface ClassificationContext {
  /** Current chat mode */
  mode?: string
  /** Project context (files, structure) */
  projectContext?: {
    fileCount?: number
    primaryLanguage?: string
    framework?: string
  }
  /** Previous message count in conversation */
  conversationDepth?: number
  /** Whether this is a follow-up to a previous request */
  isFollowUp?: boolean
  /** Optional LLM provider for classification */
  provider?: LLMProvider
}

/**
 * Classification result with confidence and reasoning
 */
export interface ClassificationResult {
  tier: SpecTier
  confidence: number // 0-1
  reasoning: string
  factors: {
    scope: 'single-file' | 'multi-file' | 'system-wide'
    risk: 'read-only' | 'write' | 'destructive'
    complexity: 'simple' | 'medium' | 'complex'
  }
}

/**
 * Classify user intent to determine spec tier
 *
 * Uses heuristics and LLM-based analysis to evaluate:
 * - Scope: How many files/systems are affected
 * - Risk: Read-only vs write vs destructive operations
 * - Complexity: Simple edit vs multi-step workflow
 */
export async function classifyIntent(
  message: string,
  context: ClassificationContext = {}
): Promise<ClassificationResult> {
  // First, apply heuristic rules for instant classification
  const heuristicResult = applyHeuristics(message, context)
  if (heuristicResult.confidence > 0.9) {
    return heuristicResult
  }

  // For ambiguous cases, use LLM-based classification
  return performLLMClassification(message, context, heuristicResult)
}

/**
 * Apply heuristic rules for quick classification
 */
function applyHeuristics(message: string, context: ClassificationContext): ClassificationResult {
  // Tier 1 (Instant) patterns - simple Q&A, explanations, small fixes
  const instantPatterns = [
    /^what\s+is\b/i,
    /^what\s+are\b/i,
    /^how\s+(do|does|can|should)\b/i,
    /^why\s+(is|are|does)\b/i,
    /^explain\b/i,
    /^describe\b/i,
    /^define\b/i,
    /^show\s+me\b/i,
    /^tell\s+me\b/i,
    /^can\s+you\s+explain\b/i,
    /^help\s+me\s+understand\b/i,
    /\b(typo|spelling|grammar)\s+(fix|error)\b/i,
    /^fix\s+(the\s+)?typo\b/i,
    /^rename\s+(this\s+)?variable\b/i,
    /^what\s+(does|is)\s+this\s+(function|method|class)\s+do\b/i,
    /^\?/,
  ]

  for (const pattern of instantPatterns) {
    if (pattern.test(message)) {
      return {
        tier: 'instant',
        confidence: 0.95,
        reasoning: `Message matches instant pattern: ${pattern.source}`,
        factors: {
          scope: 'single-file',
          risk: 'read-only',
          complexity: 'simple',
        },
      }
    }
  }

  // Check for explicit code snippets that suggest simple changes
  const isSimpleCodeChange =
    /^\s*`[^`]+`\s*$/m.test(message) || // Single backtick code
    (message.length < 100 && /\b(change|update|set)\s+\w+\s+to\s+/i.test(message))

  if (isSimpleCodeChange) {
    return {
      tier: 'instant',
      confidence: 0.85,
      reasoning: 'Simple code change with clear, limited scope',
      factors: {
        scope: 'single-file',
        risk: 'write',
        complexity: 'simple',
      },
    }
  }

  // Tier 3 (Explicit) patterns - complex system changes
  const explicitPatterns = [
    /\b(build|create|implement)\s+(a\s+|an\s+)?(new\s+)?(system|service|api|module|architecture)\b/i,
    /\b(redesign|refactor)\s+(the\s+)?(entire|whole|complete)\b/i,
    /\b(migrate|migration)\s+(to|from)\b/i,
    /\b(add\s+support\s+for)\b/i,
    /\b(integrate|integration)\s+(with|into)\b/i,
    /\b(websocket|real-time|streaming|queue|worker|microservice)\b/i,
    /\b(authentication|authorization|auth|security)\s+(system|flow|mechanism)\b/i,
    /\b(payment|billing|subscription)\s+(system|flow)\b/i,
    /\b(database|db)\s+(schema|migration|redesign)\b/i,
    /\b(design\s+pattern|architectural)\b/i,
    /\b(multi-tenant|scalable|distributed)\b/i,
  ]

  for (const pattern of explicitPatterns) {
    if (pattern.test(message)) {
      return {
        tier: 'explicit',
        confidence: 0.9,
        reasoning: `Message matches explicit pattern: ${pattern.source}`,
        factors: {
          scope: 'system-wide',
          risk: 'destructive',
          complexity: 'complex',
        },
      }
    }
  }

  // Analyze scope indicators
  const scopeIndicators = analyzeScope(message)
  const riskIndicators = analyzeRisk(message)
  const complexityIndicators = analyzeComplexity(message, context)

  // If any indicator is high, suggest explicit tier
  if (
    scopeIndicators === 'system-wide' ||
    riskIndicators === 'destructive' ||
    complexityIndicators === 'complex'
  ) {
    return {
      tier: 'explicit',
      confidence: 0.75,
      reasoning: `High ${scopeIndicators === 'system-wide' ? 'scope' : riskIndicators === 'destructive' ? 'risk' : 'complexity'} detected`,
      factors: {
        scope: scopeIndicators,
        risk: riskIndicators,
        complexity: complexityIndicators,
      },
    }
  }

  // Default to ambient for unclear cases (will be refined by LLM)
  return {
    tier: 'ambient',
    confidence: 0.5,
    reasoning: 'Ambiguous classification, requires LLM analysis',
    factors: {
      scope: scopeIndicators,
      risk: riskIndicators,
      complexity: complexityIndicators,
    },
  }
}

/**
 * Analyze scope from message content
 */
function analyzeScope(message: string): ClassificationResult['factors']['scope'] {
  const lowerMessage = message.toLowerCase()

  // System-wide indicators
  const systemWideIndicators = [
    /\b(all|every|entire|whole|system|app|application|project)\b/,
    /\b(globally|across|throughout)\b/,
    /\b(architecture|infrastructure|framework)\b/,
    /\b(multiple|many)\s+(files|components|modules)\b/,
  ]

  for (const pattern of systemWideIndicators) {
    if (pattern.test(lowerMessage)) {
      return 'system-wide'
    }
  }

  // Multi-file indicators
  const multiFileIndicators = [
    /\b(several|some|few)\s+(files|components)\b/,
    /\b(between|across)\s+(files|modules)\b/,
    /\b(import|export)\s+(from|to)\b/,
    /\b(share|common|utility)\b/,
  ]

  for (const pattern of multiFileIndicators) {
    if (pattern.test(lowerMessage)) {
      return 'multi-file'
    }
  }

  return 'single-file'
}

/**
 * Analyze risk level from message content
 */
function analyzeRisk(message: string): ClassificationResult['factors']['risk'] {
  const lowerMessage = message.toLowerCase()

  // Destructive indicators
  const destructiveIndicators = [
    /\b(delete|remove|drop|destroy|clean\s+up|purge)\b/,
    /\b(replace|rewrite|rebuild)\b/,
    /\b(migrate|migration)\b/,
    /\b(change\s+the\s+way|modify\s+how)\b/,
  ]

  for (const pattern of destructiveIndicators) {
    if (pattern.test(lowerMessage)) {
      return 'destructive'
    }
  }

  // Write indicators
  const writeIndicators = [
    /\b(add|create|implement|write|update|modify|change|fix)\b/,
    /\b(refactor|reorganize|restructure)\b/,
    /\b(extract|move|rename)\b/,
  ]

  for (const pattern of writeIndicators) {
    if (pattern.test(lowerMessage)) {
      return 'write'
    }
  }

  return 'read-only'
}

/**
 * Analyze complexity from message content and context
 */
function analyzeComplexity(
  message: string,
  _context: ClassificationContext
): ClassificationResult['factors']['complexity'] {
  const lowerMessage = message.toLowerCase()

  // Complex indicators
  const complexIndicators = [
    /\b(design|architect|pattern|strategy)\b/,
    /\b(algorithm|optimization|performance)\b/,
    /\b(state\s+management|data\s+flow)\b/,
    /\b(async|concurrent|parallel|threading)\b/,
    /\b(caching|cache|memoization)\b/,
    /\b(error\s+handling|retry|fallback)\b/,
    /\b(validation|sanitization|parsing)\b/,
    /\b(tests?\s+(for|coverage))\b/,
  ]

  for (const pattern of complexIndicators) {
    if (pattern.test(lowerMessage)) {
      return 'complex'
    }
  }

  // Medium complexity indicators
  const mediumIndicators = [
    /\b(refactor|improve|enhance|clean\s+up)\b/,
    /\b(extract|component|function|hook)\b/,
    /\b(style|css|theme|layout)\b/,
    /\b(props|interface|type|schema)\b/,
    /\b(form|input|validation)\b/,
  ]

  for (const pattern of mediumIndicators) {
    if (pattern.test(lowerMessage)) {
      return 'medium'
    }
  }

  // Check message length as a proxy for complexity
  if (message.length > 500) {
    return 'complex'
  }

  if (message.length > 200) {
    return 'medium'
  }

  return 'simple'
}

/**
 * Build classification prompt for LLM
 */
function buildClassificationPrompt(
  message: string,
  context: ClassificationContext,
  heuristicResult: ClassificationResult
): string {
  return `You are an expert software engineering intent classifier. Your job is to analyze user messages and classify them into one of three tiers based on scope, risk, and complexity.

## Classification Tiers

**instant**: No specification needed
- Simple Q&A, explanations, understanding code
- Single typo fixes, small variable renames
- Read-only operations

**ambient**: Specification generated silently
- Refactoring, error handling improvements
- Multi-file changes with clear patterns
- Low-risk modifications

**explicit**: Full specification surfaced for approval
- Complex features, system architecture changes
- Database migrations, API changes
- High-risk or destructive operations

## User Message
"""${message}"""

## Context
- Mode: ${context.mode || 'unknown'}
- Conversation depth: ${context.conversationDepth || 0}
- Is follow-up: ${context.isFollowUp ? 'yes' : 'no'}
${context.projectContext ? `- Project: ${context.projectContext.fileCount || 'unknown'} files, ${context.projectContext.primaryLanguage || 'unknown'} language` : ''}

## Initial Heuristic Analysis
- Scope: ${heuristicResult.factors.scope}
- Risk: ${heuristicResult.factors.risk}
- Complexity: ${heuristicResult.factors.complexity}

## Response Format
Respond with a JSON object containing:
{
  "tier": "instant" | "ambient" | "explicit",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of why this tier was chosen",
  "factors": {
    "scope": "single-file" | "multi-file" | "system-wide",
    "risk": "read-only" | "write" | "destructive",
    "complexity": "simple" | "medium" | "complex"
  }
}

Analyze carefully and provide your classification:`
}

/**
 * Perform LLM-based classification for ambiguous cases
 *
 * Uses LLM when provider is available, falls back to enhanced heuristics.
 */
async function performLLMClassification(
  message: string,
  context: ClassificationContext,
  heuristicResult: ClassificationResult
): Promise<ClassificationResult> {
  // If no provider available, fall back to heuristic scoring
  if (!context.provider) {
    return performHeuristicScoring(message, context, heuristicResult)
  }

  if (!llmClassifierEnabled()) {
    appLog.debug('[classifier] LLM path disabled by flag', { flag: LLM_CLASSIFIER_FLAG })
    return performHeuristicScoring(message, context, heuristicResult)
  }

  appLog.debug('[classifier] invoking LLM classifier', {
    model: context.provider.config.defaultModel,
  })

  try {
    const prompt = buildClassificationPrompt(message, context, heuristicResult)

    // Call LLM for classification
    const response = await context.provider.complete({
      model: context.provider.config.defaultModel || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1, // Low temperature for consistent results
      maxTokens: 500,
    })

    // Parse JSON response
    const content = response.message.content?.trim() || ''
    const jsonMatch = content.match(/\{[\s\S]*\}/)

    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]) as ClassificationResult

      // Validate the result
      if (
        result.tier &&
        ['instant', 'ambient', 'explicit'].includes(result.tier) &&
        typeof result.confidence === 'number' &&
        result.confidence >= 0 &&
        result.confidence <= 1
      ) {
        appLog.debug('[classifier] LLM classification result', {
          tier: result.tier,
          confidence: result.confidence,
        })
        return {
          tier: result.tier,
          confidence: result.confidence,
          reasoning: result.reasoning || `LLM classified as ${result.tier} tier`,
          factors: result.factors || heuristicResult.factors,
        }
      }
    }

    // If parsing fails, fall back to heuristics
    console.warn('[Classifier] Failed to parse LLM response, falling back to heuristics')
    return performHeuristicScoring(message, context, heuristicResult)
  } catch (error) {
    console.warn('[Classifier] LLM classification failed:', error)
    // Fall back to heuristic scoring on any error
    return performHeuristicScoring(message, context, heuristicResult)
  }
}

/**
 * Perform heuristic scoring when LLM is unavailable
 */
function performHeuristicScoring(
  message: string,
  context: ClassificationContext,
  heuristicResult: ClassificationResult
): ClassificationResult {
  // Enhanced analysis based on combined factors
  const factors = heuristicResult.factors

  // Scoring system
  let explicitScore = 0
  let ambientScore = 0
  let instantScore = 0

  // Scope scoring
  switch (factors.scope) {
    case 'system-wide':
      explicitScore += 3
      break
    case 'multi-file':
      ambientScore += 2
      explicitScore += 1
      break
    case 'single-file':
      instantScore += 1
      ambientScore += 1
      break
  }

  // Risk scoring
  switch (factors.risk) {
    case 'destructive':
      explicitScore += 3
      break
    case 'write':
      ambientScore += 2
      break
    case 'read-only':
      instantScore += 3
      break
  }

  // Complexity scoring
  switch (factors.complexity) {
    case 'complex':
      explicitScore += 3
      break
    case 'medium':
      ambientScore += 2
      break
    case 'simple':
      instantScore += 2
      break
  }

  // Mode-based adjustments
  if (context.mode) {
    switch (context.mode) {
      case 'ask':
      case 'discuss':
        instantScore += 2
        break
      case 'code':
      case 'debug':
        ambientScore += 1
        break
      case 'build':
      case 'architect':
        explicitScore += 2
        break
      case 'review':
        instantScore += 1
        break
    }
  }

  // Message length factor
  if (message.length < 50) {
    instantScore += 1
  } else if (message.length > 300) {
    explicitScore += 1
  }

  // Determine final tier
  let tier: SpecTier
  let confidence: number

  if (explicitScore >= Math.max(ambientScore, instantScore)) {
    tier = 'explicit'
    confidence = Math.min(0.95, 0.5 + explicitScore * 0.1)
  } else if (ambientScore >= instantScore) {
    tier = 'ambient'
    confidence = Math.min(0.9, 0.5 + ambientScore * 0.1)
  } else {
    tier = 'instant'
    confidence = Math.min(0.95, 0.5 + instantScore * 0.1)
  }

  // Generate reasoning
  const reasoning = generateReasoning(tier, factors, {
    explicitScore,
    ambientScore,
    instantScore,
  })

  return {
    tier,
    confidence,
    reasoning,
    factors,
  }
}

/**
 * Generate human-readable reasoning for classification
 */
function generateReasoning(
  tier: SpecTier,
  factors: ClassificationResult['factors'],
  scores: { explicitScore: number; ambientScore: number; instantScore: number }
): string {
  const parts: string[] = []

  parts.push(`Classified as ${tier} tier`)
  parts.push(
    `(scores: explicit=${scores.explicitScore}, ambient=${scores.ambientScore}, instant=${scores.instantScore})`
  )

  // Add factor explanations
  const factorExplanations: string[] = []

  if (factors.scope === 'system-wide') {
    factorExplanations.push('system-wide scope detected')
  } else if (factors.scope === 'multi-file') {
    factorExplanations.push('multi-file scope detected')
  }

  if (factors.risk === 'destructive') {
    factorExplanations.push('destructive operations identified')
  } else if (factors.risk === 'write') {
    factorExplanations.push('write operations required')
  } else {
    factorExplanations.push('read-only query')
  }

  if (factors.complexity === 'complex') {
    factorExplanations.push('complex implementation needed')
  } else if (factors.complexity === 'medium') {
    factorExplanations.push('moderate complexity')
  } else {
    factorExplanations.push('simple task')
  }

  if (factorExplanations.length > 0) {
    parts.push(`based on: ${factorExplanations.join(', ')}`)
  }

  return parts.join(' ')
}

/**
 * Batch classify multiple messages
 */
export async function classifyBatch(
  messages: Array<{ message: string; context?: ClassificationContext }>
): Promise<ClassificationResult[]> {
  return Promise.all(messages.map((m) => classifyIntent(m.message, m.context)))
}

/**
 * Get classification statistics for analysis
 */
export function getClassificationStats(results: ClassificationResult[]): {
  instant: number
  ambient: number
  explicit: number
  averageConfidence: number
} {
  const counts = {
    instant: 0,
    ambient: 0,
    explicit: 0,
  }

  let totalConfidence = 0

  for (const result of results) {
    counts[result.tier]++
    totalConfidence += result.confidence
  }

  return {
    ...counts,
    averageConfidence: results.length > 0 ? totalConfidence / results.length : 0,
  }
}
