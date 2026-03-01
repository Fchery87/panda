/**
 * Review Mode Template - Quality specification
 *
 * Generates specifications for code review, quality assessment,
 * and improvement suggestions. Focuses on analysis, feedback,
 * and recommendations rather than direct changes.
 */

import type {
  FormalSpecification,
  SpecIntent,
  SpecPlan,
  SpecValidation,
  SpecProvenance,
  Constraint,
  AcceptanceCriterion,
  SpecStep,
  FileDependency,
  Risk,
  Condition,
  Invariant,
} from '../types'
import { createAcceptanceCriterion } from '../types'

/**
 * Generate a review-mode specification
 */
export function generateReviewSpec(
  userMessage: string,
  context: {
    projectId?: string
    chatId?: string
    targetFiles?: string[]
    reviewType?: 'general' | 'security' | 'performance' | 'accessibility'
  }
): Omit<FormalSpecification, 'id' | 'version' | 'tier' | 'status' | 'createdAt' | 'updatedAt'> {
  const now = Date.now()

  const intent = generateReviewIntent(userMessage, context)
  const plan = generateReviewPlan(userMessage, context)
  const validation = generateReviewValidation(userMessage, context)

  const provenance: SpecProvenance = {
    model: 'gpt-4o',
    promptHash: hashString(userMessage),
    timestamp: now,
    chatId: context.chatId || '',
  }

  return {
    intent,
    plan,
    validation,
    provenance,
  }
}

function generateReviewIntent(
  userMessage: string,
  context: {
    targetFiles?: string[]
    reviewType?: 'general' | 'security' | 'performance' | 'accessibility'
  }
): SpecIntent {
  const goal = extractReviewGoal(userMessage)
  const reviewType = context.reviewType || detectReviewType(userMessage)

  const constraints: Constraint[] = [
    {
      type: 'behavioral',
      rule: 'Review must be objective and evidence-based',
      assertion: 'Feedback references specific code patterns',
    },
    {
      type: 'structural',
      rule: 'No direct code changes during review phase',
      target: 'target files',
    },
    {
      type: 'behavioral',
      rule: 'Review must cover all specified aspects',
      assertion: 'All review categories addressed',
    },
  ]

  switch (reviewType) {
    case 'security':
      constraints.push({
        type: 'security',
        requirement: 'Identify security vulnerabilities and risks',
        standard: 'OWASP Top 10',
      })
      break
    case 'performance':
      constraints.push({
        type: 'performance',
        metric: 'response time',
        threshold: 1000,
        unit: 'ms',
      })
      break
    case 'accessibility':
      constraints.push({
        type: 'behavioral',
        rule: 'Review must check WCAG compliance',
        assertion: 'Accessibility standards met',
      })
      break
  }

  if (context.targetFiles && context.targetFiles.length > 0) {
    constraints.push({
      type: 'structural',
      rule: `Review limited to: ${context.targetFiles.join(', ')}`,
      target: context.targetFiles.join(', '),
    })
  }

  const acceptanceCriteria: AcceptanceCriterion[] = [
    createAcceptanceCriterion(
      'ac-1',
      'the review is complete',
      'all target files have been analyzed',
      'automated'
    ),
    createAcceptanceCriterion(
      'ac-2',
      'findings are documented',
      'issues and recommendations are clearly listed',
      'llm-judge'
    ),
    createAcceptanceCriterion(
      'ac-3',
      'priorities are assigned',
      'each finding has a severity/priority level',
      'llm-judge'
    ),
  ]

  return {
    goal,
    rawMessage: userMessage,
    constraints,
    acceptanceCriteria,
  }
}

function generateReviewPlan(
  userMessage: string,
  context: {
    targetFiles?: string[]
    reviewType?: 'general' | 'security' | 'performance' | 'accessibility'
  }
): SpecPlan {
  const reviewType = context.reviewType || detectReviewType(userMessage)

  const steps: SpecStep[] = [
    {
      id: 'step-1',
      description: 'Read and understand the target code',
      tools: ['read_files'],
      targetFiles: context.targetFiles || ['src/'],
      status: 'pending',
    },
    {
      id: 'step-2',
      description: `${reviewType.charAt(0).toUpperCase() + reviewType.slice(1)} analysis`,
      tools: ['read_files', 'search_files'],
      targetFiles: context.targetFiles || ['src/'],
      status: 'pending',
    },
    {
      id: 'step-3',
      description: 'Identify issues and areas for improvement',
      tools: ['read_files'],
      targetFiles: context.targetFiles || ['src/'],
      status: 'pending',
    },
    {
      id: 'step-4',
      description: 'Document findings with recommendations',
      tools: ['write_files'],
      targetFiles: ['docs/review/', 'REVIEW.md'],
      status: 'pending',
    },
  ]

  if (!context.targetFiles || context.targetFiles.length > 5) {
    steps.push({
      id: 'step-5',
      description: 'Prioritize findings by impact and effort',
      tools: ['read_files'],
      targetFiles: ['docs/review/'],
      status: 'pending',
    })
  }

  const dependencies: FileDependency[] = [
    { path: 'src/', access: 'read', reason: 'Review target code' },
    { path: 'package.json', access: 'read', reason: 'Check dependencies' },
  ]

  if (context.targetFiles) {
    for (const file of context.targetFiles) {
      dependencies.push({
        path: file,
        access: 'read',
        reason: 'Primary review target',
      })
    }
  }

  const risks: Risk[] = [
    {
      description: 'Review may miss subtle issues',
      severity: 'medium',
      mitigation: 'Use checklists and systematic approach',
    },
    {
      description: 'Recommendations may not account for all constraints',
      severity: 'low',
      mitigation: 'Note assumptions and request clarification if needed',
    },
  ]

  return {
    steps,
    dependencies,
    risks,
    estimatedTools: ['read_files', 'search_files', 'write_files'],
  }
}

function generateReviewValidation(
  _userMessage: string,
  context: {
    targetFiles?: string[]
  }
): SpecValidation {
  const preConditions: Condition[] = [
    {
      description: 'Target files exist and are readable',
      check: 'Files can be accessed',
      type: 'file-exists',
    },
    {
      description: 'Review scope is clear',
      check: 'Target files or directories specified',
      type: 'llm-assert',
    },
  ]

  const postConditions: Condition[] = [
    {
      description: 'Review document is created',
      check: 'Findings documented in review file',
      type: 'file-exists',
    },
    {
      description: 'All target files reviewed',
      check: 'Each file has associated feedback',
      type: 'llm-assert',
    },
    {
      description: 'Recommendations are actionable',
      check: 'Each issue has a suggested fix or improvement',
      type: 'llm-assert',
    },
  ]

  if (context.targetFiles) {
    postConditions.push({
      description: `Specifically reviewed: ${context.targetFiles.join(', ')}`,
      check: 'All specified files covered',
      type: 'llm-assert',
    })
  }

  const invariants: Invariant[] = [
    {
      description: 'Review remains objective and constructive',
      scope: 'review document',
      rule: 'Feedback is professional and actionable',
    },
    {
      description: 'No code changes made during review',
      scope: 'target files',
      rule: 'Files remain unchanged (read-only)',
    },
  ]

  return {
    preConditions,
    postConditions,
    invariants,
  }
}

function extractReviewGoal(message: string): string {
  const patterns = [
    /(?:review|audit|analyze)\s+(?:the\s+)?(.+?)(?:\.|$)/i,
    /(?:check|evaluate)\s+(?:the\s+)?(.+?)(?:\.|$)/i,
    /(?:what\s+do\s+you\s+think\s+(?:of|about))\s+(.+?)(?:\.|$)/i,
    /(?:assess|inspect)\s+(?:the\s+)?(.+?)(?:\.|$)/i,
  ]

  for (const pattern of patterns) {
    const match = message.match(pattern)
    if (match?.[1]) {
      return match[1].trim()
    }
  }

  const firstSentence = message.split(/[.!?]/)[0] || message
  return firstSentence.slice(0, 100).trim()
}

function detectReviewType(
  message: string
): 'general' | 'security' | 'performance' | 'accessibility' {
  const lowerMessage = message.toLowerCase()

  if (
    lowerMessage.includes('security') ||
    lowerMessage.includes('vulnerability') ||
    lowerMessage.includes('safe')
  ) {
    return 'security'
  }

  if (
    lowerMessage.includes('performance') ||
    lowerMessage.includes('speed') ||
    lowerMessage.includes('slow') ||
    lowerMessage.includes('optimize')
  ) {
    return 'performance'
  }

  if (
    lowerMessage.includes('accessibility') ||
    lowerMessage.includes('a11y') ||
    lowerMessage.includes('aria') ||
    lowerMessage.includes('screen reader')
  ) {
    return 'accessibility'
  }

  return 'general'
}

function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36).slice(0, 8)
}
