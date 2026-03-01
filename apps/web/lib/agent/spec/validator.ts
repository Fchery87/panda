/**
 * Spec Validator - Multi-layer validation pipeline
 *
 * Validates formal specifications through multiple layers:
 * - Structural validation: Required fields, types, formats
 * - Semantic validation: Logical consistency, completeness
 * - Constraint validation: Feasibility checks
 */

import type { FormalSpecification } from './types'
import { isConstraint, isAcceptanceCriterion, isSpecTier, isSpecStatus } from './types'

/**
 * Validation error
 */
export interface ValidationError {
  field: string
  message: string
  severity: 'error' | 'warning'
  code: string
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
}

/**
 * Validate a specification
 *
 * Runs multi-layer validation:
 * 1. Structural - Required fields, types
 * 2. Semantic - Logical consistency
 * 3. Constraint - Feasibility
 */
export async function validateSpec(spec: FormalSpecification): Promise<ValidationResult> {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []

  // Layer 1: Structural validation
  const structuralErrors = validateStructure(spec)
  errors.push(...structuralErrors.filter((e) => e.severity === 'error'))
  warnings.push(...structuralErrors.filter((e) => e.severity === 'warning'))

  // Layer 2: Semantic validation
  const semanticErrors = validateSemantics(spec)
  errors.push(...semanticErrors.filter((e) => e.severity === 'error'))
  warnings.push(...semanticErrors.filter((e) => e.severity === 'warning'))

  // Layer 3: Constraint validation
  const constraintErrors = validateConstraints(spec)
  errors.push(...constraintErrors.filter((e) => e.severity === 'error'))
  warnings.push(...constraintErrors.filter((e) => e.severity === 'warning'))

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Structural validation - Required fields and types
 */
function validateStructure(spec: FormalSpecification): ValidationError[] {
  const errors: ValidationError[] = []

  // ID validation
  if (!spec.id || typeof spec.id !== 'string') {
    errors.push({
      field: 'id',
      message: 'Spec ID is required and must be a string',
      severity: 'error',
      code: 'STRUCT-001',
    })
  }

  // Version validation
  if (typeof spec.version !== 'number' || spec.version < 1) {
    errors.push({
      field: 'version',
      message: 'Version must be a positive number',
      severity: 'error',
      code: 'STRUCT-002',
    })
  }

  // Tier validation
  if (!isSpecTier(spec.tier)) {
    errors.push({
      field: 'tier',
      message: `Invalid tier: ${spec.tier}. Must be 'instant', 'ambient', or 'explicit'`,
      severity: 'error',
      code: 'STRUCT-003',
    })
  }

  // Status validation
  if (!isSpecStatus(spec.status)) {
    errors.push({
      field: 'status',
      message: `Invalid status: ${spec.status}`,
      severity: 'error',
      code: 'STRUCT-004',
    })
  }

  // Intent validation
  errors.push(...validateIntentStructure(spec.intent))

  // Plan validation
  errors.push(...validatePlanStructure(spec.plan))

  // Validation section validation
  errors.push(...validateValidationStructure(spec.validation))

  // Provenance validation
  errors.push(...validateProvenanceStructure(spec.provenance))

  // Timestamp validation
  if (!spec.createdAt || typeof spec.createdAt !== 'number') {
    errors.push({
      field: 'createdAt',
      message: 'createdAt timestamp is required',
      severity: 'error',
      code: 'STRUCT-005',
    })
  }

  if (!spec.updatedAt || typeof spec.updatedAt !== 'number') {
    errors.push({
      field: 'updatedAt',
      message: 'updatedAt timestamp is required',
      severity: 'error',
      code: 'STRUCT-006',
    })
  }

  return errors
}

/**
 * Validate intent structure
 */
function validateIntent(intent: FormalSpecification['intent']): ValidationError[] {
  const errors: ValidationError[] = []

  // Goal validation
  if (!intent.goal || typeof intent.goal !== 'string') {
    errors.push({
      field: 'intent.goal',
      message: 'Goal is required and must be a string',
      severity: 'error',
      code: 'STRUCT-101',
    })
  } else if (intent.goal.length < 5) {
    errors.push({
      field: 'intent.goal',
      message: 'Goal must be at least 5 characters',
      severity: 'error',
      code: 'STRUCT-102',
    })
  } else if (intent.goal.length > 500) {
    errors.push({
      field: 'intent.goal',
      message: 'Goal should be concise (max 500 chars)',
      severity: 'warning',
      code: 'STRUCT-103',
    })
  }

  // Raw message validation
  if (!intent.rawMessage || typeof intent.rawMessage !== 'string') {
    errors.push({
      field: 'intent.rawMessage',
      message: 'Raw message is required',
      severity: 'error',
      code: 'STRUCT-104',
    })
  }

  // Constraints validation
  if (!Array.isArray(intent.constraints)) {
    errors.push({
      field: 'intent.constraints',
      message: 'Constraints must be an array',
      severity: 'error',
      code: 'STRUCT-105',
    })
  } else {
    for (let i = 0; i < intent.constraints.length; i++) {
      if (!isConstraint(intent.constraints[i])) {
        errors.push({
          field: `intent.constraints[${i}]`,
          message: `Invalid constraint at index ${i}`,
          severity: 'error',
          code: 'STRUCT-106',
        })
      }
    }
  }

  // Acceptance criteria validation
  if (!Array.isArray(intent.acceptanceCriteria)) {
    errors.push({
      field: 'intent.acceptanceCriteria',
      message: 'Acceptance criteria must be an array',
      severity: 'error',
      code: 'STRUCT-107',
    })
  } else {
    for (let i = 0; i < intent.acceptanceCriteria.length; i++) {
      if (!isAcceptanceCriterion(intent.acceptanceCriteria[i])) {
        errors.push({
          field: `intent.acceptanceCriteria[${i}]`,
          message: `Invalid acceptance criterion at index ${i}`,
          severity: 'error',
          code: 'STRUCT-108',
        })
      }
    }
  }

  return errors
}

/**
 * Validate plan structure
 */
function validatePlan(plan: FormalSpecification['plan']): ValidationError[] {
  const errors: ValidationError[] = []

  // Steps validation
  if (!Array.isArray(plan.steps)) {
    errors.push({
      field: 'plan.steps',
      message: 'Steps must be an array',
      severity: 'error',
      code: 'STRUCT-201',
    })
  } else if (plan.steps.length === 0) {
    errors.push({
      field: 'plan.steps',
      message: 'At least one step is required',
      severity: 'error',
      code: 'STRUCT-202',
    })
  } else {
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i]
      if (!step.id || typeof step.id !== 'string') {
        errors.push({
          field: `plan.steps[${i}].id`,
          message: `Step ${i} must have an ID`,
          severity: 'error',
          code: 'STRUCT-203',
        })
      }
      if (!step.description || typeof step.description !== 'string') {
        errors.push({
          field: `plan.steps[${i}].description`,
          message: `Step ${i} must have a description`,
          severity: 'error',
          code: 'STRUCT-204',
        })
      }
      if (!Array.isArray(step.tools)) {
        errors.push({
          field: `plan.steps[${i}].tools`,
          message: `Step ${i} tools must be an array`,
          severity: 'error',
          code: 'STRUCT-205',
        })
      }
      if (!Array.isArray(step.targetFiles)) {
        errors.push({
          field: `plan.steps[${i}].targetFiles`,
          message: `Step ${i} targetFiles must be an array`,
          severity: 'error',
          code: 'STRUCT-206',
        })
      }
    }
  }

  // Dependencies validation
  if (!Array.isArray(plan.dependencies)) {
    errors.push({
      field: 'plan.dependencies',
      message: 'Dependencies must be an array',
      severity: 'error',
      code: 'STRUCT-207',
    })
  }

  // Risks validation
  if (!Array.isArray(plan.risks)) {
    errors.push({
      field: 'plan.risks',
      message: 'Risks must be an array',
      severity: 'error',
      code: 'STRUCT-208',
    })
  }

  // Estimated tools validation
  if (!Array.isArray(plan.estimatedTools)) {
    errors.push({
      field: 'plan.estimatedTools',
      message: 'Estimated tools must be an array',
      severity: 'error',
      code: 'STRUCT-209',
    })
  }

  return errors
}

/**
 * Validate validation section structure
 */
function validateValidation(validation: FormalSpecification['validation']): ValidationError[] {
  const errors: ValidationError[] = []

  // Pre-conditions validation
  if (!Array.isArray(validation.preConditions)) {
    errors.push({
      field: 'validation.preConditions',
      message: 'Pre-conditions must be an array',
      severity: 'error',
      code: 'STRUCT-301',
    })
  }

  // Post-conditions validation
  if (!Array.isArray(validation.postConditions)) {
    errors.push({
      field: 'validation.postConditions',
      message: 'Post-conditions must be an array',
      severity: 'error',
      code: 'STRUCT-302',
    })
  }

  // Invariants validation
  if (!Array.isArray(validation.invariants)) {
    errors.push({
      field: 'validation.invariants',
      message: 'Invariants must be an array',
      severity: 'error',
      code: 'STRUCT-303',
    })
  }

  return errors
}

/**
 * Validate provenance structure
 */
function validateProvenance(provenance: FormalSpecification['provenance']): ValidationError[] {
  const errors: ValidationError[] = []

  if (!provenance.model || typeof provenance.model !== 'string') {
    errors.push({
      field: 'provenance.model',
      message: 'Model is required',
      severity: 'error',
      code: 'STRUCT-401',
    })
  }

  if (!provenance.promptHash || typeof provenance.promptHash !== 'string') {
    errors.push({
      field: 'provenance.promptHash',
      message: 'Prompt hash is required',
      severity: 'error',
      code: 'STRUCT-402',
    })
  }

  if (!provenance.timestamp || typeof provenance.timestamp !== 'number') {
    errors.push({
      field: 'provenance.timestamp',
      message: 'Timestamp is required',
      severity: 'error',
      code: 'STRUCT-403',
    })
  }

  if (!provenance.chatId || typeof provenance.chatId !== 'string') {
    errors.push({
      field: 'provenance.chatId',
      message: 'Chat ID is required',
      severity: 'error',
      code: 'STRUCT-404',
    })
  }

  return errors
}

// Alias functions to fix the naming issue
const validateIntentStructure = validateIntent
const validatePlanStructure = validatePlan
const validateValidationStructure = validateValidation
const validateProvenanceStructure = validateProvenance

/**
 * Semantic validation - Logical consistency
 */
function validateSemantics(spec: FormalSpecification): ValidationError[] {
  const errors: ValidationError[] = []

  // Check that goal matches raw message intent
  const goalLower = spec.intent.goal.toLowerCase()
  const messageLower = spec.intent.rawMessage.toLowerCase()

  // Goal should be a reasonable summary of the message
  const messageWords = messageLower.split(/\s+/).filter((w) => w.length > 3)
  const goalWords = goalLower.split(/\s+/).filter((w) => w.length > 3)
  const commonWords = messageWords.filter((w) => goalWords.includes(w))

  if (messageWords.length > 0 && commonWords.length / messageWords.length < 0.1) {
    errors.push({
      field: 'intent.goal',
      message: 'Goal appears unrelated to the raw message',
      severity: 'warning',
      code: 'SEM-001',
    })
  }

  // Check that steps are ordered logically
  for (let i = 1; i < spec.plan.steps.length; i++) {
    const prevStep = spec.plan.steps[i - 1]
    const currStep = spec.plan.steps[i]

    // Steps should have unique IDs
    if (prevStep.id === currStep.id) {
      errors.push({
        field: `plan.steps[${i}].id`,
        message: `Duplicate step ID: ${currStep.id}`,
        severity: 'error',
        code: 'SEM-002',
      })
    }
  }

  // Check that acceptance criteria are testable
  for (let i = 0; i < spec.intent.acceptanceCriteria.length; i++) {
    const ac = spec.intent.acceptanceCriteria[i]

    // EARS-style criteria should have WHEN and SHALL
    if (!ac.trigger.toLowerCase().includes('when') && !ac.behavior.toLowerCase().includes('when')) {
      errors.push({
        field: `intent.acceptanceCriteria[${i}]`,
        message: `Criterion ${ac.id} should use EARS-style "WHEN" syntax`,
        severity: 'warning',
        code: 'SEM-003',
      })
    }

    if (
      !ac.behavior.toLowerCase().includes('shall') &&
      !ac.behavior.toLowerCase().includes('should') &&
      !ac.behavior.toLowerCase().includes('must')
    ) {
      errors.push({
        field: `intent.acceptanceCriteria[${i}]`,
        message: `Criterion ${ac.id} should use "SHALL/MUST/SHOULD" for behavior`,
        severity: 'warning',
        code: 'SEM-004',
      })
    }
  }

  // Check tier-appropriate complexity
  if (spec.tier === 'instant' && spec.plan.steps.length > 3) {
    errors.push({
      field: 'plan.steps',
      message: 'Instant tier should have minimal steps (≤3)',
      severity: 'warning',
      code: 'SEM-005',
    })
  }

  // Check that explicit tier has proper constraints
  if (spec.tier === 'explicit' && spec.intent.constraints.length < 2) {
    errors.push({
      field: 'intent.constraints',
      message: 'Explicit tier should have multiple constraints defined',
      severity: 'warning',
      code: 'SEM-006',
    })
  }

  return errors
}

/**
 * Constraint validation - Feasibility checks
 */
function validateConstraints(spec: FormalSpecification): ValidationError[] {
  const errors: ValidationError[] = []

  // Check for duplicate constraints
  const constraintSignatures = new Set<string>()
  for (let i = 0; i < spec.intent.constraints.length; i++) {
    const c = spec.intent.constraints[i]
    const sig = `${c.type}:${JSON.stringify(c)}`
    if (constraintSignatures.has(sig)) {
      errors.push({
        field: `intent.constraints[${i}]`,
        message: `Duplicate constraint detected`,
        severity: 'warning',
        code: 'CONST-001',
      })
    }
    constraintSignatures.add(sig)
  }

  // Check that file dependencies match step targets
  const dependencyPaths = new Set(spec.plan.dependencies.map((d) => d.path))
  const stepTargetPaths = new Set(spec.plan.steps.flatMap((s) => s.targetFiles))

  for (const targetPath of stepTargetPaths) {
    // Check if any dependency covers this target
    const hasMatchingDependency = Array.from(dependencyPaths).some(
      (depPath) => targetPath.startsWith(depPath) || depPath.startsWith(targetPath)
    )

    if (!hasMatchingDependency && spec.plan.dependencies.length > 0) {
      errors.push({
        field: 'plan.dependencies',
        message: `Step targets ${targetPath} but no matching dependency declared`,
        severity: 'warning',
        code: 'CONST-002',
      })
    }
  }

  // Check for realistic step count
  if (spec.plan.steps.length > 20) {
    errors.push({
      field: 'plan.steps',
      message: 'Spec has unusually high number of steps (>20), consider breaking into subtasks',
      severity: 'warning',
      code: 'CONST-003',
    })
  }

  // Check that risks have mitigations
  for (let i = 0; i < spec.plan.risks.length; i++) {
    const risk = spec.plan.risks[i]
    if (!risk.mitigation || risk.mitigation.length < 10) {
      errors.push({
        field: `plan.risks[${i}]`,
        message: `Risk "${risk.description}" should have a detailed mitigation strategy`,
        severity: 'warning',
        code: 'CONST-004',
      })
    }
  }

  // Validate performance constraints have reasonable thresholds
  for (let i = 0; i < spec.intent.constraints.length; i++) {
    const c = spec.intent.constraints[i]
    if (c.type === 'performance') {
      if (c.threshold <= 0) {
        errors.push({
          field: `intent.constraints[${i}]`,
          message: `Performance threshold must be positive`,
          severity: 'error',
          code: 'CONST-005',
        })
      }
      if (c.unit !== 'ms' && c.unit !== 's' && c.unit !== 'mb' && c.unit !== 'gb') {
        errors.push({
          field: `intent.constraints[${i}]`,
          message: `Performance unit should be ms, s, mb, or gb`,
          severity: 'warning',
          code: 'CONST-006',
        })
      }
    }
  }

  return errors
}

/**
 * Quick validation - Check only critical fields
 */
export function quickValidate(spec: Partial<FormalSpecification>): ValidationResult {
  const errors: ValidationError[] = []

  if (!spec.id) {
    errors.push({
      field: 'id',
      message: 'ID is required',
      severity: 'error',
      code: 'QUICK-001',
    })
  }

  if (!spec.intent?.goal) {
    errors.push({
      field: 'intent.goal',
      message: 'Goal is required',
      severity: 'error',
      code: 'QUICK-002',
    })
  }

  if (!spec.plan?.steps || spec.plan.steps.length === 0) {
    errors.push({
      field: 'plan.steps',
      message: 'At least one step is required',
      severity: 'error',
      code: 'QUICK-003',
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: [],
  }
}

/**
 * Validate a specific field
 */
export function validateField(
  spec: FormalSpecification,
  fieldPath: string
): ValidationError | null {
  const allErrors = validateStructure(spec)
  return allErrors.find((e) => e.field === fieldPath) || null
}
