/**
 * SpecNative Module - Formal specification system for agentic development
 *
 * Exports all SpecNative components:
 * - Types: FormalSpecification, SpecTier, SpecStatus, etc.
 * - Engine: SpecEngine class for generation, validation, refinement
 * - Classifier: Intent classification for tier detection
 * - Validator: Multi-layer validation pipeline
 * - Verifier: Post-execution verification
 * - Templates: Mode-specific spec generators
 */

// Types
export type {
  SpecTier,
  SpecStatus,
  FormalSpecification,
  AcceptanceCriterion,
  Constraint,
  SpecStep,
  FileDependency,
  Risk,
  Condition,
  Invariant,
  SpecIntent,
  SpecPlan,
  SpecValidation,
  SpecProvenance,
  VerificationResult,
  SpecEngineConfig,
} from './types'

// Type guards and helpers
export {
  isSpecTier,
  isSpecStatus,
  isConstraint,
  isAcceptanceCriterion,
  createAcceptanceCriterion,
  createStructuralConstraint,
  createBehavioralConstraint,
  createPerformanceConstraint,
  createCompatibilityConstraint,
  createSecurityConstraint,
} from './types'

// Engine
export { SpecEngine, createSpecEngine, defaultSpecEngine } from './engine'
export type { SpecGenerationContext, SpecGenerationResult } from './engine'
export { DefaultSpecLifecycleManager } from './lifecycle-manager'
export type { SpecLifecycleManager } from './lifecycle-manager'

// Classifier
export { classifyIntent, classifyBatch, getClassificationStats } from './classifier'
export type { ClassificationContext, ClassificationResult } from './classifier'

// Validator
export { validateSpec, quickValidate, validateField } from './validator'
export type { ValidationResult, ValidationError } from './validator'

// Verifier
export { verifySpec, canMarkAsVerified, getStatusFromVerification } from './verifier'
export type { ExecutionResults, SpecVerificationReport } from './verifier'

// Templates
export {
  generateBuildSpec,
  generateCodeSpec,
  generateArchitectSpec,
  generateDebugSpec,
  generateReviewSpec,
} from './templates'
