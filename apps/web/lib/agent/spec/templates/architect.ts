/**
 * Architect Mode Template - Design specification
 *
 * Generates design-focused specifications for system architecture,
 * API design, and high-level technical decisions. Emphasizes
 * patterns, trade-offs, and structural decisions over implementation.
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
 * Generate an architect-mode specification
 *
 * @param userMessage - The user's original message
 * @param context - Additional context about the project/state
 * @returns A complete formal specification for design/architecture
 */
export function generateArchitectSpec(
  _userMessage: string,
  _context: {
    projectId?: string
    chatId?: string
    existingFiles?: string[]
    techStack?: string[]
  }
): Omit<FormalSpecification, 'id' | 'version' | 'tier' | 'status' | 'createdAt' | 'updatedAt'> {
  const now = Date.now()

  const intent = generateArchitectIntent(_userMessage, _context)
  const plan = generateArchitectPlan(_userMessage, _context)
  const validation = generateArchitectValidation(_userMessage, _context)

  const provenance: SpecProvenance = {
    model: 'gpt-4o',
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
 * Generate intent section for architect mode
 */
function generateArchitectIntent(
  userMessage: string,
  context: {
    techStack?: string[]
  }
): SpecIntent {
  const goal = extractDesignGoal(userMessage)

  const constraints: Constraint[] = [
    {
      type: 'structural',
      rule: 'Design must align with existing architecture patterns',
      target: 'system-wide',
    },
    {
      type: 'behavioral',
      rule: 'Design must consider scalability and maintainability',
      assertion: 'Design review addresses scale concerns',
    },
    {
      type: 'compatibility',
      requirement: 'Design must integrate with existing systems',
      scope: 'integration points',
    },
  ]

  // Add tech-specific constraints
  if (context.techStack) {
    constraints.push({
      type: 'structural',
      rule: `Design must leverage ${context.techStack.join(', ')} effectively`,
      target: 'architecture',
    })
  }

  // Add constraints based on design type
  const lowerMessage = userMessage.toLowerCase()

  if (lowerMessage.includes('api') || lowerMessage.includes('endpoint')) {
    constraints.push({
      type: 'behavioral',
      rule: 'API design must follow REST/GraphQL best practices',
      assertion: 'Consistent naming, proper HTTP methods, clear error responses',
    })
  }

  if (lowerMessage.includes('database') || lowerMessage.includes('schema')) {
    constraints.push({
      type: 'structural',
      rule: 'Database design must follow normalization principles',
      target: 'schema',
    })
  }

  if (lowerMessage.includes('security') || lowerMessage.includes('auth')) {
    constraints.push({
      type: 'security',
      requirement: 'Design must address security considerations',
      standard: 'OWASP guidelines',
    })
  }

  const acceptanceCriteria: AcceptanceCriterion[] = [
    createAcceptanceCriterion(
      'ac-1',
      'the design is complete',
      'the architecture addresses all requirements and constraints',
      'llm-judge'
    ),
    createAcceptanceCriterion(
      'ac-2',
      'the design is reviewed',
      'trade-offs are documented and justified',
      'manual'
    ),
    createAcceptanceCriterion(
      'ac-3',
      'the design is approved',
      'stakeholders agree the design is sound',
      'manual'
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
 * Generate plan section for architect mode
 */
function generateArchitectPlan(
  userMessage: string,
  context: {
    existingFiles?: string[]
  }
): SpecPlan {
  const steps: SpecStep[] = [
    {
      id: 'step-1',
      description: 'Analyze existing system architecture and patterns',
      tools: ['read_files', 'list_directory'],
      targetFiles: ['src/', 'docs/', 'README.md'],
      status: 'pending',
    },
    {
      id: 'step-2',
      description: 'Identify requirements and constraints',
      tools: ['read_files', 'search_files'],
      targetFiles: context.existingFiles || ['src/'],
      status: 'pending',
    },
    {
      id: 'step-3',
      description: 'Research and evaluate design options',
      tools: ['read_files', 'search_files'],
      targetFiles: ['src/', 'docs/'],
      status: 'pending',
    },
    {
      id: 'step-4',
      description: 'Document the proposed architecture',
      tools: ['write_files'],
      targetFiles: ['docs/', 'src/types/'],
      status: 'pending',
    },
    {
      id: 'step-5',
      description: 'Define interfaces and contracts',
      tools: ['write_files'],
      targetFiles: ['src/interfaces/', 'src/types/'],
      status: 'pending',
    },
  ]

  const dependencies: FileDependency[] = [
    { path: 'src/', access: 'read', reason: 'Understand existing patterns' },
    { path: 'docs/', access: 'read', reason: 'Review existing documentation' },
    { path: 'package.json', access: 'read', reason: 'Check dependencies and constraints' },
    { path: 'docs/architecture/', access: 'create', reason: 'Document design decisions' },
  ]

  const risks: Risk[] = [
    {
      description: 'Design may not account for all edge cases',
      severity: 'medium',
      mitigation: 'Include review phase and iterate based on feedback',
    },
    {
      description: 'Implementation complexity may exceed estimates',
      severity: 'medium',
      mitigation: 'Break design into phases, prioritize core functionality',
    },
    {
      description: 'Existing technical debt may complicate integration',
      severity: 'high',
      mitigation: 'Document integration points and migration strategy',
    },
  ]

  return {
    steps,
    dependencies,
    risks,
    estimatedTools: ['read_files', 'write_files', 'search_files'],
  }
}

/**
 * Generate validation section for architect mode
 */
function generateArchitectValidation(
  _userMessage: string,
  _context: Record<string, unknown>
): SpecValidation {
  const preConditions: Condition[] = [
    {
      description: 'Existing architecture is understood',
      check: 'Key system components identified',
      type: 'llm-assert',
    },
    {
      description: 'Requirements are clear',
      check: 'Design goals documented',
      type: 'llm-assert',
    },
  ]

  const postConditions: Condition[] = [
    {
      description: 'Design document is complete',
      check: 'Architecture documented with diagrams/decisions',
      type: 'file-exists',
    },
    {
      description: 'Interfaces are defined',
      check: 'Type definitions or interface contracts created',
      type: 'file-exists',
    },
    {
      description: 'Trade-offs are documented',
      check: 'ADR or design doc includes decision rationale',
      type: 'llm-assert',
    },
  ]

  const invariants: Invariant[] = [
    {
      description: 'Design maintains system consistency',
      scope: 'architecture',
      rule: 'New components follow established patterns',
    },
    {
      description: 'Design is implementation-agnostic where appropriate',
      scope: 'interfaces',
      rule: 'Contracts define what, not how',
    },
  ]

  return {
    preConditions,
    postConditions,
    invariants,
  }
}

/**
 * Extract design goal from message
 */
function extractDesignGoal(message: string): string {
  const patterns = [
    /(?:design|architect)\s+(?:a\s+|an\s+|the\s+)?(.+?)(?:\.|$)/i,
    /(?:how\s+should\s+we)\s+(.+?)(?:\.|$)/i,
    /(?:what\s+is\s+the\s+best\s+way\s+to)\s+(.+?)(?:\.|$)/i,
    /(?:propose|suggest)\s+(?:a\s+|an\s+)?(.+?)(?:\.|$)/i,
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
