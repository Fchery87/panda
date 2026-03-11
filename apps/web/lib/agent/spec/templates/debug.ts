/**
 * Debug Mode Template - Diagnostic specification
 *
 * Generates specifications for debugging issues, investigating bugs,
 * and diagnosing problems. Focuses on reproduction, root cause analysis,
 * and verification of fixes.
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
import { hashString } from '../../utils/hash'

/**
 * Generate a debug-mode specification
 *
 * @param userMessage - The user's original message
 * @param context - Additional context about the project/state
 * @returns A complete formal specification for debugging
 */
export function generateDebugSpec(
  userMessage: string,
  context: {
    projectId?: string
    chatId?: string
    errorMessage?: string
    stackTrace?: string
    model?: string
  }
): Omit<FormalSpecification, 'id' | 'version' | 'tier' | 'status' | 'createdAt' | 'updatedAt'> {
  const now = Date.now()

  const intent = generateDebugIntent(userMessage, context)
  const plan = generateDebugPlan(userMessage, context)
  const validation = generateDebugValidation(userMessage, context)

  const provenance: SpecProvenance = {
    model: context.model || 'unknown',
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

/**
 * Generate intent section for debug mode
 */
function generateDebugIntent(
  userMessage: string,
  context: {
    errorMessage?: string
  }
): SpecIntent {
  const goal = extractDebugGoal(userMessage, context.errorMessage)

  const constraints: Constraint[] = [
    {
      type: 'behavioral',
      rule: 'Investigation must be systematic and evidence-based',
      assertion: 'Each hypothesis is tested before conclusions drawn',
    },
    {
      type: 'structural',
      rule: 'Changes during debugging must be minimal and targeted',
      target: 'modified files',
    },
    {
      type: 'behavioral',
      rule: 'Root cause must be identified, not just symptoms fixed',
      assertion: 'Explanation of why the bug occurred',
    },
  ]

  // Add constraints based on error type
  const lowerMessage = userMessage.toLowerCase()

  if (context.errorMessage) {
    constraints.push({
      type: 'behavioral',
      rule: 'Fix must address the specific error reported',
      assertion: `Error "${context.errorMessage.slice(0, 50)}..." is resolved`,
    })
  }

  if (lowerMessage.includes('test') || lowerMessage.includes('failing')) {
    constraints.push({
      type: 'behavioral',
      rule: 'All tests must pass after the fix',
      assertion: 'Test suite passes',
    })
  }

  if (lowerMessage.includes('performance') || lowerMessage.includes('slow')) {
    constraints.push({
      type: 'performance',
      metric: 'response time',
      threshold: 1000,
      unit: 'ms',
    })
  }

  const acceptanceCriteria: AcceptanceCriterion[] = [
    createAcceptanceCriterion(
      'ac-1',
      'the issue is reproduced',
      'the bug can be consistently reproduced or explained',
      'automated'
    ),
    createAcceptanceCriterion(
      'ac-2',
      'the root cause is identified',
      'the underlying cause of the issue is documented',
      'llm-judge'
    ),
    createAcceptanceCriterion(
      'ac-3',
      'the fix is applied',
      'the issue is resolved without introducing new problems',
      'automated'
    ),
  ]

  // Add verification criterion if tests exist
  if (lowerMessage.includes('test')) {
    acceptanceCriteria.push(
      createAcceptanceCriterion(
        'ac-4',
        'regression test is added',
        'a test exists to prevent this bug from recurring',
        'automated'
      )
    )
  }

  return {
    goal,
    rawMessage: userMessage,
    constraints,
    acceptanceCriteria,
  }
}

/**
 * Generate plan section for debug mode
 */
function generateDebugPlan(
  userMessage: string,
  context: {
    errorMessage?: string
    stackTrace?: string
  }
): SpecPlan {
  const steps: SpecStep[] = [
    {
      id: 'step-1',
      description: 'Gather information about the issue',
      tools: ['read_files', 'search_code'],
      targetFiles: ['src/', 'logs/', 'tests/'],
      status: 'pending',
    },
    {
      id: 'step-2',
      description: 'Analyze error messages and stack traces',
      tools: ['read_files'],
      targetFiles: context.stackTrace ? ['src/'] : ['src/'],
      status: 'pending',
    },
    {
      id: 'step-3',
      description: 'Reproduce the issue',
      tools: ['run_command', 'read_files'],
      targetFiles: ['src/', 'tests/'],
      status: 'pending',
    },
    {
      id: 'step-4',
      description: 'Identify root cause through systematic investigation',
      tools: ['read_files', 'search_code'],
      targetFiles: ['src/'],
      status: 'pending',
    },
    {
      id: 'step-5',
      description: 'Implement the fix',
      tools: ['write_files'],
      targetFiles: ['src/'],
      status: 'pending',
    },
    {
      id: 'step-6',
      description: 'Verify the fix resolves the issue',
      tools: ['run_command', 'read_files'],
      targetFiles: ['src/', 'tests/'],
      status: 'pending',
    },
  ]

  // Add regression test step if appropriate
  if (userMessage.toLowerCase().includes('test')) {
    steps.push({
      id: 'step-7',
      description: 'Add regression test to prevent recurrence',
      tools: ['write_files'],
      targetFiles: ['src/__tests__/', '__tests__/'],
      status: 'pending',
    })
  }

  const dependencies: FileDependency[] = [
    { path: 'src/', access: 'read', reason: 'Investigate issue source' },
    { path: 'src/', access: 'write', reason: 'Apply fixes' },
  ]

  // Add error-specific dependencies
  if (context.errorMessage) {
    dependencies.push({
      path: 'logs/',
      access: 'read',
      reason: 'Review error logs',
    })
  }

  const risks: Risk[] = [
    {
      description: 'Root cause may be in a different location than symptoms suggest',
      severity: 'high',
      mitigation: 'Follow the error chain, check call stack thoroughly',
    },
    {
      description: 'Fix may introduce new bugs',
      severity: 'medium',
      mitigation: 'Make minimal changes, verify existing tests pass',
    },
    {
      description: 'Issue may be intermittent or environment-specific',
      severity: 'medium',
      mitigation: 'Test fix in multiple scenarios if possible',
    },
  ]

  return {
    steps,
    dependencies,
    risks,
    estimatedTools: ['read_files', 'search_code', 'run_command'],
  }
}

/**
 * Generate validation section for debug mode
 */
function generateDebugValidation(
  userMessage: string,
  context: {
    errorMessage?: string
  }
): SpecValidation {
  const preConditions: Condition[] = [
    {
      description: 'Error information is available',
      check: context.errorMessage ? 'Error message provided' : 'Issue description clear',
      type: 'llm-assert',
    },
    {
      description: 'Relevant code is accessible',
      check: 'Source files can be read',
      type: 'file-exists',
    },
  ]

  const postConditions: Condition[] = [
    {
      description: 'Original error is resolved',
      check: context.errorMessage
        ? `Error "${context.errorMessage.slice(0, 30)}..." no longer occurs`
        : 'Reported issue is fixed',
      type: 'command-passes',
    },
    {
      description: 'Root cause is documented',
      check: 'Explanation of why the bug occurred',
      type: 'llm-assert',
    },
    {
      description: 'No new errors introduced',
      check: 'Application runs without new console errors',
      type: 'command-passes',
    },
  ]

  // Add test condition if tests mentioned
  if (userMessage.toLowerCase().includes('test')) {
    postConditions.push({
      description: 'All tests pass',
      check: 'Test suite passes',
      type: 'command-passes',
    })
  }

  const invariants: Invariant[] = [
    {
      description: 'Existing functionality is preserved',
      scope: 'all files',
      rule: 'No regressions in unrelated features',
    },
    {
      description: 'Fix is minimal and targeted',
      scope: 'modified files',
      rule: 'Only necessary changes made',
    },
  ]

  return {
    preConditions,
    postConditions,
    invariants,
  }
}

/**
 * Extract debug goal from message
 */
function extractDebugGoal(message: string, errorMessage?: string): string {
  // If we have an error message, use it
  if (errorMessage) {
    return `Debug and fix: ${errorMessage.slice(0, 100)}`
  }

  const patterns = [
    /(?:fix|debug|solve)\s+(?:the\s+)?(.+?)(?:\.|$)/i,
    /(?:why\s+(?:is|are))\s+(.+?)(?:\.|$)/i,
    /(?:investigate)\s+(?:the\s+)?(.+?)(?:\.|$)/i,
    /(?:error|bug|issue)\s+(?:with\s+)?(.+?)(?:\.|$)/i,
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
