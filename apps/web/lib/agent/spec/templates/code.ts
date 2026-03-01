/**
 * Code Mode Template - Change-scoped specification
 *
 * Generates focused specifications for code changes, refactoring,
 * and feature additions within existing codebases. More lightweight
 * than build mode but still maintains structure and verification.
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
import { createAcceptanceCriterion, createStructuralConstraint } from '../types'

/**
 * Generate a code-mode specification
 *
 * @param userMessage - The user's original message
 * @param context - Additional context about the project/state
 * @returns A complete formal specification for code changes
 */
export function generateCodeSpec(
  userMessage: string,
  context: {
    projectId?: string
    chatId?: string
    existingFiles?: string[]
    targetFiles?: string[]
  }
): Omit<FormalSpecification, 'id' | 'version' | 'tier' | 'status' | 'createdAt' | 'updatedAt'> {
  const now = Date.now()

  const intent = generateCodeIntent(userMessage, context)
  const plan = generateCodePlan(userMessage, context)
  const validation = generateCodeValidation(userMessage, context)

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

/**
 * Generate intent section for code mode
 */
function generateCodeIntent(
  userMessage: string,
  context: {
    targetFiles?: string[]
  }
): SpecIntent {
  const goal = extractCodeGoal(userMessage)

  const constraints: Constraint[] = [
    createStructuralConstraint('Maintain existing code style and patterns', 'modified files'),
    {
      type: 'behavioral',
      rule: 'Preserve existing functionality unless explicitly changing it',
      assertion: 'Existing tests still pass',
    },
    {
      type: 'compatibility',
      requirement: 'Changes must not break public APIs without versioning',
      scope: 'public interfaces',
    },
  ]

  // Add constraints based on change type
  const lowerMessage = userMessage.toLowerCase()

  if (lowerMessage.includes('refactor')) {
    constraints.push({
      type: 'behavioral',
      rule: 'Refactoring must preserve external behavior',
      assertion: 'All existing tests pass without modification',
    })
  }

  if (lowerMessage.includes('fix') || lowerMessage.includes('bug')) {
    constraints.push({
      type: 'behavioral',
      rule: 'Fix must address root cause, not just symptoms',
      assertion: 'Bug scenario is tested and passes',
    })
  }

  if (lowerMessage.includes('type') || lowerMessage.includes('typescript')) {
    constraints.push(
      createStructuralConstraint('TypeScript types must be accurate and complete', '*.ts, *.tsx')
    )
  }

  // Target file constraint if specified
  if (context.targetFiles && context.targetFiles.length > 0) {
    constraints.push({
      type: 'structural',
      rule: `Changes limited to: ${context.targetFiles.join(', ')}`,
      target: context.targetFiles.join(', '),
    })
  }

  const acceptanceCriteria: AcceptanceCriterion[] = [
    createAcceptanceCriterion(
      'ac-1',
      'the code changes are applied',
      'the modified code implements the requested changes',
      'automated'
    ),
    createAcceptanceCriterion(
      'ac-2',
      'the code is reviewed',
      'the changes follow project conventions and best practices',
      'llm-judge'
    ),
  ]

  // Add specific criteria based on change type
  if (lowerMessage.includes('fix')) {
    acceptanceCriteria.push(
      createAcceptanceCriterion(
        'ac-3',
        'the bug scenario is tested',
        'the previously failing case now passes',
        'automated'
      )
    )
  }

  if (lowerMessage.includes('refactor')) {
    acceptanceCriteria.push(
      createAcceptanceCriterion(
        'ac-3',
        'refactoring is complete',
        'all existing tests pass without modification',
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
 * Generate plan section for code mode
 */
function generateCodePlan(
  userMessage: string,
  context: {
    targetFiles?: string[]
    existingFiles?: string[]
  }
): SpecPlan {
  const steps = generateCodeSteps(userMessage, context)

  const dependencies: FileDependency[] = []

  // Add target files as write dependencies
  if (context.targetFiles) {
    for (const file of context.targetFiles) {
      dependencies.push({
        path: file,
        access: 'write',
        reason: 'Primary target for changes',
      })
    }
  }

  // Always include project context
  dependencies.push(
    { path: 'package.json', access: 'read', reason: 'Check dependencies and scripts' },
    { path: 'tsconfig.json', access: 'read', reason: 'TypeScript configuration' }
  )

  const risks: Risk[] = [
    {
      description: 'Changes may have unintended side effects in dependent code',
      severity: 'medium',
      mitigation: 'Search for usages before modifying public APIs',
    },
    {
      description: 'Edge cases may not be covered',
      severity: 'low',
      mitigation: 'Consider boundary conditions and error paths',
    },
  ]

  if (userMessage.toLowerCase().includes('refactor')) {
    risks.push({
      description: 'Refactoring may introduce subtle behavior changes',
      severity: 'medium',
      mitigation: 'Make small, incremental changes and verify after each',
    })
  }

  return {
    steps,
    dependencies,
    risks,
    estimatedTools: ['read_files', 'write_files', 'search_files', 'edit_file'],
  }
}

/**
 * Generate validation section for code mode
 */
function generateCodeValidation(
  userMessage: string,
  _context: Record<string, unknown>
): SpecValidation {
  const preConditions: Condition[] = [
    {
      description: 'Target files exist and are readable',
      check: 'Files can be read successfully',
      type: 'file-exists',
    },
    {
      description: 'Project is in a buildable state',
      check: 'npm run build passes or equivalent',
      type: 'command-passes',
    },
  ]

  const postConditions: Condition[] = [
    {
      description: 'Changes compile without errors',
      check: 'TypeScript compilation succeeds',
      type: 'command-passes',
    },
    {
      description: 'Linting passes',
      check: 'eslint passes for modified files',
      type: 'command-passes',
    },
    {
      description: 'Requested changes are implemented',
      check: 'Code review confirms requirements met',
      type: 'llm-assert',
    },
  ]

  // Add test condition if tests mentioned
  if (userMessage.toLowerCase().includes('test')) {
    postConditions.push({
      description: 'Tests pass for modified code',
      check: 'Test suite passes',
      type: 'command-passes',
    })
  }

  const invariants: Invariant[] = [
    {
      description: 'Public API signatures remain stable (unless intentionally changed)',
      scope: 'public exports',
      rule: 'No breaking changes to function signatures',
    },
    {
      description: 'No console errors or warnings introduced',
      scope: 'modified files',
      rule: 'Clean console output',
    },
  ]

  return {
    preConditions,
    postConditions,
    invariants,
  }
}

/**
 * Generate code change steps
 */
function generateCodeSteps(
  userMessage: string,
  context: {
    targetFiles?: string[]
  }
): SpecStep[] {
  const steps: SpecStep[] = []
  const lowerMessage = userMessage.toLowerCase()

  // Step 1: Understand current state
  steps.push({
    id: 'step-1',
    description: 'Read and understand the current code',
    tools: ['read_files', 'search_files'],
    targetFiles: context.targetFiles || ['src/'],
    status: 'pending',
  })

  // Step 2: Search for related code if refactoring or modifying
  if (lowerMessage.includes('refactor') || lowerMessage.includes('rename')) {
    steps.push({
      id: 'step-2',
      description: 'Search for all usages and references',
      tools: ['search_files'],
      targetFiles: ['src/'],
      status: 'pending',
    })
  }

  // Step 3: Apply changes
  const changeStep: SpecStep = {
    id: `step-${steps.length + 1}`,
    description: 'Apply the requested changes',
    tools: ['write_files', 'edit_file'],
    targetFiles: context.targetFiles || ['src/'],
    status: 'pending',
  }

  if (lowerMessage.includes('fix')) {
    changeStep.description = 'Fix the identified issue'
  } else if (lowerMessage.includes('refactor')) {
    changeStep.description = 'Refactor the code according to requirements'
  } else if (lowerMessage.includes('add')) {
    changeStep.description = 'Add the new functionality'
  } else if (lowerMessage.includes('update')) {
    changeStep.description = 'Update the existing code'
  }

  steps.push(changeStep)

  // Step 4: Verify changes
  steps.push({
    id: `step-${steps.length + 1}`,
    description: 'Verify the changes work as expected',
    tools: ['run_command', 'read_files'],
    targetFiles: context.targetFiles || ['src/'],
    status: 'pending',
  })

  return steps
}

/**
 * Extract goal from code-related message
 */
function extractCodeGoal(message: string): string {
  // Common code action patterns
  const patterns = [
    /(?:fix|bug)\s+(?:the\s+)?(.+?)(?:\.|$)/i,
    /(?:refactor|improve|clean\s+up)\s+(?:the\s+)?(.+?)(?:\.|$)/i,
    /(?:add|implement)\s+(?:a\s+|an\s+)?(.+?)(?:\.|$)/i,
    /(?:update|change|modify)\s+(?:the\s+)?(.+?)(?:\.|$)/i,
    /(?:remove|delete)\s+(?:the\s+)?(.+?)(?:\.|$)/i,
  ]

  for (const pattern of patterns) {
    const match = message.match(pattern)
    if (match?.[1]) {
      return match[1].trim()
    }
  }

  // Fallback
  const firstSentence = message.split(/[.!?]/)[0] || message
  return firstSentence.slice(0, 100).trim()
}

/**
 * Simple string hash
 */
function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36).slice(0, 8)
}
