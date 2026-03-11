/**
 * Build Mode Template - Full implementation specification
 *
 * Generates comprehensive specifications for building new features,
 * systems, or substantial implementations. This is the most detailed
 * template with full requirements, constraints, and verification.
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
import { hashString } from '../../utils/hash'

/**
 * Generate a build-mode specification
 *
 * @param userMessage - The user's original message
 * @param context - Additional context about the project/state
 * @returns A complete formal specification for building
 */
export function generateBuildSpec(
  _userMessage: string,
  _context: {
    projectId?: string
    chatId?: string
    existingFiles?: string[]
    techStack?: string[]
    model?: string
  }
): Omit<FormalSpecification, 'id' | 'version' | 'tier' | 'status' | 'createdAt' | 'updatedAt'> {
  const now = Date.now()

  // Generate intent
  const intent = generateBuildIntent(_userMessage, _context)

  // Generate plan
  const plan = generateBuildPlan(_userMessage, _context)

  // Generate validation criteria
  const validation = generateBuildValidation(_userMessage, _context)

  // Generate provenance
  const provenance: SpecProvenance = {
    model: _context.model || 'unknown',
    promptHash: hashString(_userMessage),
    timestamp: now,
    chatId: _context.chatId || '',
  }

  return {
    intent,
    plan,
    validation,
    provenance,
  }
}

/**
 * Generate intent section for build mode
 */
function generateBuildIntent(
  userMessage: string,
  context: {
    techStack?: string[]
  }
): SpecIntent {
  // Extract implied goal from message
  const goal = extractGoal(userMessage)

  // Generate constraints based on context
  const constraints: Constraint[] = [
    createStructuralConstraint('Follow existing project structure and conventions', 'all files'),
    createStructuralConstraint('No breaking changes to existing APIs', 'public interfaces'),
    {
      type: 'behavioral',
      rule: 'All new functionality must have error handling',
      assertion: 'try-catch blocks or error boundaries present',
    },
    {
      type: 'compatibility',
      requirement: 'Maintain compatibility with existing dependencies',
      scope: 'package.json',
    },
  ]

  // Add tech-stack specific constraints
  if (context.techStack?.includes('typescript')) {
    constraints.push(
      createStructuralConstraint('All new code must be TypeScript with proper types', '*.ts, *.tsx')
    )
  }

  if (context.techStack?.includes('react')) {
    constraints.push({
      type: 'behavioral',
      rule: 'Follow React best practices (hooks rules, key props)',
      assertion: 'eslint-plugin-react-hooks compliance',
    })
  }

  // Generate acceptance criteria using EARS syntax
  const acceptanceCriteria: AcceptanceCriterion[] = [
    createAcceptanceCriterion(
      'ac-1',
      'the feature is implemented',
      'the system provides the requested functionality',
      'automated'
    ),
    createAcceptanceCriterion(
      'ac-2',
      'a user interacts with the feature',
      'the system responds according to specifications',
      'llm-judge'
    ),
    createAcceptanceCriterion(
      'ac-3',
      'an error condition occurs',
      'the system handles the error gracefully without crashing',
      'automated'
    ),
  ]

  return {
    goal,
    rawMessage: userMessage,
    constraints,
    acceptanceCriteria,
  }
}

/**
 * Generate plan section for build mode
 */
function generateBuildPlan(
  userMessage: string,
  _context: {
    existingFiles?: string[]
  }
): SpecPlan {
  // Analyze the request to determine appropriate steps
  const steps = generateStepsFromMessage(userMessage)

  // Estimate file dependencies
  const dependencies: FileDependency[] = [
    { path: 'src/', access: 'read', reason: 'Understand existing patterns' },
    { path: 'package.json', access: 'read', reason: 'Check dependencies' },
  ]

  // Add implied file dependencies based on message content
  if (userMessage.toLowerCase().includes('api') || userMessage.toLowerCase().includes('endpoint')) {
    dependencies.push(
      { path: 'src/api/', access: 'create', reason: 'New API endpoints' },
      { path: 'src/types/', access: 'write', reason: 'Shared type definitions' }
    )
  }

  if (userMessage.toLowerCase().includes('component') || userMessage.toLowerCase().includes('ui')) {
    dependencies.push(
      { path: 'src/components/', access: 'create', reason: 'New UI components' },
      { path: 'src/styles/', access: 'write', reason: 'Styling updates' }
    )
  }

  if (userMessage.toLowerCase().includes('test')) {
    dependencies.push(
      { path: 'src/__tests__/', access: 'create', reason: 'Unit tests' },
      { path: 'e2e/', access: 'create', reason: 'E2E tests' }
    )
  }

  // Identify risks
  const risks: Risk[] = [
    {
      description: 'Integration with existing code may reveal unexpected dependencies',
      severity: 'medium',
      mitigation: 'Start with minimal implementation and iterate',
    },
    {
      description: 'Scope creep during implementation',
      severity: 'medium',
      mitigation: 'Stick to core requirements, document extensions for future',
    },
  ]

  return {
    steps,
    dependencies,
    risks,
    estimatedTools: ['read_files', 'write_files', 'search_code', 'run_command'],
  }
}

/**
 * Generate validation section for build mode
 */
function generateBuildValidation(
  userMessage: string,
  _context: Record<string, unknown>
): SpecValidation {
  const preConditions: Condition[] = [
    {
      description: 'Project builds successfully before changes',
      check: 'npm run build passes',
      type: 'command-passes',
    },
    {
      description: 'Existing tests pass',
      check: 'npm test passes',
      type: 'command-passes',
    },
  ]

  const postConditions: Condition[] = [
    {
      description: 'Project builds successfully after changes',
      check: 'npm run build passes',
      type: 'command-passes',
    },
    {
      description: 'New functionality is accessible/usable',
      check: 'Feature can be invoked/accessed',
      type: 'llm-assert',
    },
    {
      description: 'No TypeScript errors introduced',
      check: 'tsc --noEmit passes',
      type: 'command-passes',
    },
  ]

  // Add test-related post-condition if tests are mentioned
  if (userMessage.toLowerCase().includes('test')) {
    postConditions.push({
      description: 'New tests pass',
      check: 'New test files execute successfully',
      type: 'command-passes',
    })
  }

  const invariants: Invariant[] = [
    {
      description: 'Existing functionality remains intact',
      scope: 'all existing files',
      rule: 'No regressions in existing test suite',
    },
    {
      description: 'Code quality standards maintained',
      scope: 'all modified and new files',
      rule: 'Linting passes, no console errors',
    },
  ]

  return {
    preConditions,
    postConditions,
    invariants,
  }
}

/**
 * Generate implementation steps from message analysis
 */
function generateStepsFromMessage(userMessage: string): SpecStep[] {
  const steps: SpecStep[] = []
  const lowerMessage = userMessage.toLowerCase()

  // Always start with analysis
  steps.push({
    id: 'step-1',
    description: 'Analyze existing codebase structure and patterns',
    tools: ['read_files', 'list_directory', 'search_code'],
    targetFiles: ['src/', 'package.json'],
    status: 'pending',
  })

  let stepNum = 2

  // Design phase for complex features
  if (
    lowerMessage.includes('system') ||
    lowerMessage.includes('architecture') ||
    lowerMessage.includes('design')
  ) {
    steps.push({
      id: `step-${stepNum}`,
      description: 'Design the system architecture and define interfaces',
      tools: ['read_files', 'search_code'],
      targetFiles: ['src/types/', 'src/interfaces/'],
      status: 'pending',
    })
    stepNum++
  }

  // Core implementation
  steps.push({
    id: `step-${stepNum}`,
    description: 'Implement core functionality',
    tools: ['write_files'],
    targetFiles: ['src/'],
    status: 'pending',
  })
  stepNum++

  // Integration if needed
  if (lowerMessage.includes('integrate') || lowerMessage.includes('connect')) {
    steps.push({
      id: `step-${stepNum}`,
      description: 'Integrate with existing systems/components',
      tools: ['write_files', 'read_files'],
      targetFiles: ['src/'],
      status: 'pending',
    })
    stepNum++
  }

  // Tests
  steps.push({
    id: `step-${stepNum}`,
    description: 'Add tests for new functionality',
    tools: ['write_files', 'run_command'],
    targetFiles: ['src/__tests__/', '__tests__/'],
    status: 'pending',
  })
  stepNum++

  // Verification
  steps.push({
    id: `step-${stepNum}`,
    description: 'Verify implementation against acceptance criteria',
    tools: ['run_command', 'read_files'],
    targetFiles: ['src/'],
    status: 'pending',
  })

  return steps
}

/**
 * Extract goal from user message
 */
function extractGoal(message: string): string {
  // Remove filler words and extract core intent
  const patterns = [
    /(?:build|create|implement|add)\s+(?:a\s+|an\s+|the\s+)?(.+?)(?:\.|$)/i,
    /(?:make|develop)\s+(?:a\s+|an\s+|the\s+)?(.+?)(?:\.|$)/i,
  ]

  for (const pattern of patterns) {
    const match = message.match(pattern)
    if (match?.[1]) {
      return match[1].trim()
    }
  }

  // Fallback: use first sentence or first 100 chars
  const firstSentence = message.split(/[.!?]/)[0] || message
  return firstSentence.slice(0, 100).trim()
}
