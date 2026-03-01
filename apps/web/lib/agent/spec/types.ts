/**
 * SpecNative Type System - Formal specification types for the agentic harness
 *
 * Defines the core type system for specification-native development:
 * - SpecTier: Complexity-based interaction levels
 * - SpecStatus: Lifecycle states of specifications
 * - FormalSpecification: Core specification structure
 * - EARS-style acceptance criteria
 * - Typed constraint system
 *
 * @module lib/agent/spec/types
 */

/**
 * Complexity tier for automatic spec behavior
 * - instant: No spec generated (simple Q&A, typo fixes)
 * - ambient: Spec generated silently, stored but not shown
 * - explicit: Full spec surfaced for user review before execution
 */
export type SpecTier = 'instant' | 'ambient' | 'explicit'

/**
 * Lifecycle states of a specification
 */
export type SpecStatus =
  | 'draft' // Generated, awaiting validation
  | 'validated' // Passed structural + semantic checks
  | 'approved' // User approved (Tier 3 only)
  | 'executing' // Agent executing against spec
  | 'verified' // Post-execution verification passed
  | 'drifted' // Code changed, spec needs reconciliation
  | 'failed' // Verification failed
  | 'archived' // Superseded by newer version

/**
 * EARS-style requirement syntax
 * Easy Approach to Requirements Syntax - industry standard
 */
export interface AcceptanceCriterion {
  id: string
  /** WHEN <trigger> THE SYSTEM SHALL <behavior> */
  trigger: string
  behavior: string
  verificationMethod: 'automated' | 'llm-judge' | 'manual'
  status: 'pending' | 'passed' | 'failed' | 'skipped'
}

/**
 * Typed constraint system for specifications
 */
export type Constraint =
  | { type: 'structural'; rule: string; target: string }
  | { type: 'behavioral'; rule: string; assertion: string }
  | { type: 'performance'; metric: string; threshold: number; unit: string }
  | { type: 'compatibility'; requirement: string; scope: string }
  | { type: 'security'; requirement: string; standard?: string }

/**
 * Execution step within a specification plan
 */
export interface SpecStep {
  id: string
  description: string
  tools: string[]
  targetFiles: string[]
  status: 'pending' | 'active' | 'completed' | 'failed'
  result?: string
}

/**
 * File dependency for tracking access patterns
 */
export interface FileDependency {
  path: string
  access: 'read' | 'write' | 'create' | 'delete'
  reason: string
}

/**
 * Risk assessment for specification execution
 */
export interface Risk {
  description: string
  severity: 'low' | 'medium' | 'high'
  mitigation: string
}

/**
 * Pre/post condition for specification validation
 */
export interface Condition {
  description: string
  check: string // Machine-evaluable expression or LLM prompt
  type: 'file-exists' | 'file-contains' | 'command-passes' | 'llm-assert'
}

/**
 * Invariant that must remain true during execution
 */
export interface Invariant {
  description: string
  scope: string // File path or pattern
  rule: string // What must remain true
}

/**
 * Intent definition - what the user wants to achieve
 */
export interface SpecIntent {
  goal: string
  rawMessage: string
  constraints: Constraint[]
  acceptanceCriteria: AcceptanceCriterion[]
}

/**
 * Plan definition - how to achieve the intent
 */
export interface SpecPlan {
  steps: SpecStep[]
  dependencies: FileDependency[]
  risks: Risk[]
  estimatedTools: string[]
}

/**
 * Validation definition - how to verify success
 */
export interface SpecValidation {
  preConditions: Condition[]
  postConditions: Condition[]
  invariants: Invariant[]
}

/**
 * Provenance metadata - traceability information
 */
export interface SpecProvenance {
  model: string
  promptHash: string
  timestamp: number
  parentSpecId?: string
  chatId: string
  runId?: string
}

/**
 * Verification result for post-execution validation
 */
export interface VerificationResult {
  criterionId: string
  passed: boolean
  message?: string
  details?: Record<string, unknown>
}

/**
 * Core specification structure
 * The central type for the SpecNative system
 */
export interface FormalSpecification {
  id: string
  version: number
  tier: SpecTier
  status: SpecStatus

  /** What the user wants */
  intent: SpecIntent

  /** How to achieve it */
  plan: SpecPlan

  /** How to verify it */
  validation: SpecValidation

  /** Traceability metadata */
  provenance: SpecProvenance

  /** Post-execution verification results */
  verificationResults?: VerificationResult[]

  /** Timestamps */
  createdAt: number
  updatedAt: number
}

/**
 * Spec engine configuration
 */
export interface SpecEngineConfig {
  /** Whether the spec engine is enabled */
  enabled: boolean
  /** Default tier for classification (overrides auto-detection) */
  defaultTier?: SpecTier
  /** Whether to auto-approve ambient specs */
  autoApproveAmbient?: boolean
  /** Maximum specs to store per project */
  maxSpecsPerProject?: number
  /** Whether to enable drift detection */
  enableDriftDetection?: boolean
}

/**
 * Type guard for SpecTier
 */
export function isSpecTier(value: unknown): value is SpecTier {
  return typeof value === 'string' && ['instant', 'ambient', 'explicit'].includes(value)
}

/**
 * Type guard for SpecStatus
 */
export function isSpecStatus(value: unknown): value is SpecStatus {
  const validStatuses: SpecStatus[] = [
    'draft',
    'validated',
    'approved',
    'executing',
    'verified',
    'drifted',
    'failed',
    'archived',
  ]
  return typeof value === 'string' && validStatuses.includes(value as SpecStatus)
}

/**
 * Type guard for Constraint
 */
export function isConstraint(value: unknown): value is Constraint {
  if (typeof value !== 'object' || value === null) return false
  const constraint = value as Record<string, unknown>
  if (!('type' in constraint)) return false

  const validTypes = ['structural', 'behavioral', 'performance', 'compatibility', 'security']
  if (!validTypes.includes(constraint.type as string)) return false

  switch (constraint.type) {
    case 'structural':
      return 'rule' in constraint && 'target' in constraint
    case 'behavioral':
      return 'rule' in constraint && 'assertion' in constraint
    case 'performance':
      return 'metric' in constraint && 'threshold' in constraint && 'unit' in constraint
    case 'compatibility':
      return 'requirement' in constraint && 'scope' in constraint
    case 'security':
      return 'requirement' in constraint
    default:
      return false
  }
}

/**
 * Type guard for AcceptanceCriterion
 */
export function isAcceptanceCriterion(value: unknown): value is AcceptanceCriterion {
  if (typeof value !== 'object' || value === null) return false
  const criterion = value as Record<string, unknown>
  return (
    'id' in criterion &&
    'trigger' in criterion &&
    'behavior' in criterion &&
    'verificationMethod' in criterion &&
    'status' in criterion
  )
}

/**
 * Create a new acceptance criterion with EARS syntax
 */
export function createAcceptanceCriterion(
  id: string,
  trigger: string,
  behavior: string,
  verificationMethod: 'automated' | 'llm-judge' | 'manual' = 'automated'
): AcceptanceCriterion {
  return {
    id,
    trigger,
    behavior,
    verificationMethod,
    status: 'pending',
  }
}

/**
 * Create a new structural constraint
 */
export function createStructuralConstraint(rule: string, target: string): Constraint {
  return { type: 'structural', rule, target }
}

/**
 * Create a new behavioral constraint
 */
export function createBehavioralConstraint(rule: string, assertion: string): Constraint {
  return { type: 'behavioral', rule, assertion }
}

/**
 * Create a new performance constraint
 */
export function createPerformanceConstraint(
  metric: string,
  threshold: number,
  unit: string
): Constraint {
  return { type: 'performance', metric, threshold, unit }
}

/**
 * Create a new compatibility constraint
 */
export function createCompatibilityConstraint(requirement: string, scope: string): Constraint {
  return { type: 'compatibility', requirement, scope }
}

/**
 * Create a new security constraint
 */
export function createSecurityConstraint(requirement: string, standard?: string): Constraint {
  return { type: 'security', requirement, standard }
}
