/**
 * Spec Engine - Core specification generation, validation, and refinement
 *
 * The SpecEngine class is the central component of the SpecNative system:
 * - Generates formal specifications from user messages
 * - Validates specifications for correctness and completeness
 * - Refines specifications based on validation errors
 * - Verifies execution results against specifications
 */

import type {
  FormalSpecification,
  SpecTier,
  SpecEngineConfig,
  VerificationResult,
  Constraint,
  AcceptanceCriterion,
  SpecStep,
} from './types'
import { classifyIntent, type ClassificationContext, type ClassificationResult } from './classifier'
import {
  generateBuildSpec,
  generateCodeSpec,
  generateArchitectSpec,
  generateDebugSpec,
  generateReviewSpec,
} from './templates'
import { validateSpec, type ValidationResult } from './validator'
import { verifySpec, type SpecVerificationReport } from './verifier'
import { ascending } from '../harness/identifier'
import { hashString } from '../utils/hash'
import type { DriftReport, DriftFinding, ReconciliationChange } from './reconciler'

/**
 * Context for spec generation
 */
export interface SpecGenerationContext {
  /** Project ID */
  projectId?: string
  /** Chat ID */
  chatId?: string
  /** Current chat mode */
  mode?: string
  /** Existing files in project */
  existingFiles?: string[]
  /** Technology stack */
  techStack?: string[]
  /** Target files for the operation */
  targetFiles?: string[]
  /** Error message (for debug mode) */
  errorMessage?: string
  /** Stack trace (for debug mode) */
  stackTrace?: string
  /** Model used to generate the spec */
  model?: string
}

/**
 * Spec generation result
 */
export interface SpecGenerationResult {
  spec: FormalSpecification
  tier: SpecTier
  classification: ClassificationResult
}

/**
 * Spec Engine class
 *
 * Central engine for the SpecNative system. Handles:
 * - Intent classification
 * - Specification generation
 * - Validation and refinement
 * - Post-execution verification
 */
export class SpecEngine {
  private config: SpecEngineConfig

  constructor(config: SpecEngineConfig) {
    this.config = {
      autoApproveAmbient: true,
      maxSpecsPerProject: 100,
      enableDriftDetection: false,
      ...config,
    }
  }

  /**
   * Check if the spec engine is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled
  }

  /**
   * Get the spec engine configuration
   */
  getConfig(): SpecEngineConfig {
    return { ...this.config }
  }

  /**
   * Update the spec engine configuration
   */
  updateConfig(config: Partial<SpecEngineConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Classify user intent to determine spec tier
   *
   * @param message - User's message
   * @param context - Classification context
   * @returns Classification result with tier and confidence
   */
  async classify(message: string, context?: ClassificationContext): Promise<ClassificationResult> {
    // If default tier is set, use it but still run classification for factors
    if (this.config.defaultTier) {
      const result = await classifyIntent(message, context)
      return {
        ...result,
        tier: this.config.defaultTier,
        reasoning: `${result.reasoning} (overridden by defaultTier: ${this.config.defaultTier})`,
      }
    }

    return classifyIntent(message, context)
  }

  /**
   * Generate a formal specification from user message
   *
   * @param userMessage - The user's original message
   * @param context - Generation context
   * @param tier - The spec tier (instant, ambient, explicit)
   * @returns Generated specification
   */
  async generate(
    userMessage: string,
    context: SpecGenerationContext,
    tier: SpecTier
  ): Promise<SpecGenerationResult> {
    const classification = await this.classify(userMessage, {
      mode: context.mode,
      projectContext: context.existingFiles
        ? { fileCount: context.existingFiles.length }
        : undefined,
    })

    // For instant tier, return minimal spec
    if (tier === 'instant') {
      const spec = this.createMinimalSpec(userMessage, context, tier)
      return { spec, tier, classification }
    }

    // Generate full spec based on mode
    const specData = this.generateSpecForMode(userMessage, context, tier)

    const now = Date.now()
    const spec: FormalSpecification = {
      id: ascending('spec_'),
      version: 1,
      tier,
      status: 'draft',
      ...specData,
      provenance: {
        ...specData.provenance,
        chatId: context.chatId || '',
      },
      createdAt: now,
      updatedAt: now,
    }

    return { spec, tier, classification }
  }

  /**
   * Validate a specification
   *
   * @param spec - The specification to validate
   * @returns Validation result with errors if any
   */
  async validate(spec: FormalSpecification): Promise<ValidationResult> {
    return validateSpec(spec)
  }

  /**
   * Refine a specification based on validation errors
   *
   * @param spec - The specification to refine
   * @param errors - Validation errors to address
   * @returns Refined specification
   */
  async refine(
    spec: FormalSpecification,
    errors: ValidationResult['errors']
  ): Promise<FormalSpecification> {
    const refined: FormalSpecification = {
      ...spec,
      version: spec.version + 1,
      status: 'draft',
      updatedAt: Date.now(),
    }

    // Address structural errors
    for (const error of errors) {
      switch (error.field) {
        case 'intent.goal':
          if (!refined.intent.goal || refined.intent.goal.length < 5) {
            refined.intent.goal = this.inferGoalFromMessage(refined.intent.rawMessage)
          }
          break

        case 'intent.acceptanceCriteria':
          if (refined.intent.acceptanceCriteria.length === 0) {
            refined.intent.acceptanceCriteria = [
              {
                id: 'ac-1',
                trigger: 'the task is executed',
                behavior: 'the system completes the requested operation',
                verificationMethod: 'automated',
                status: 'pending',
              },
            ]
          }
          break

        case 'plan.steps':
          if (refined.plan.steps.length === 0) {
            refined.plan.steps = [
              {
                id: 'step-1',
                description: 'Analyze and execute the request',
                tools: ['read_files', 'write_files'],
                targetFiles: ['src/'],
                status: 'pending',
              },
            ]
          }
          break

        case 'validation.preConditions':
          if (refined.validation.preConditions.length === 0) {
            refined.validation.preConditions = [
              {
                description: 'Project is in a valid state',
                check: 'Files are accessible',
                type: 'file-exists',
              },
            ]
          }
          break

        case 'validation.postConditions':
          if (refined.validation.postConditions.length === 0) {
            refined.validation.postConditions = [
              {
                description: 'Task is completed successfully',
                check: 'Requested changes are applied',
                type: 'llm-assert',
              },
            ]
          }
          break

        default:
          // For other errors, add a constraint note
          if (
            !refined.intent.constraints.find(
              (c) => c.type === 'structural' && c.rule.includes('refined')
            )
          ) {
            refined.intent.constraints.push({
              type: 'structural',
              rule: `Auto-refined: ${error.message}`,
              target: error.field,
            })
          }
          break
      }
    }

    // Re-validate to ensure fixes worked
    const revalidation = await this.validate(refined)
    if (!revalidation.isValid) {
      // If still invalid, mark as best effort
      refined.status = 'draft'
    } else {
      refined.status = 'validated'
    }

    return refined
  }

  /**
   * Verify execution results against specification
   *
   * @param spec - The specification to verify against
   * @param executionResults - Results from execution
   * @returns Verification report
   */
  async verify(
    spec: FormalSpecification,
    executionResults: {
      filesModified?: string[]
      commandsRun?: string[]
      errors?: string[]
      output?: string
    }
  ): Promise<SpecVerificationReport> {
    return verifySpec(spec, executionResults)
  }

  /**
   * Approve a specification for execution (Tier 3)
   *
   * @param spec - The specification to approve
   * @returns Approved specification
   */
  approve(spec: FormalSpecification): FormalSpecification {
    if (spec.tier !== 'explicit') {
      throw new Error('Only explicit tier specs require approval')
    }

    return {
      ...spec,
      status: 'approved',
      updatedAt: Date.now(),
    }
  }

  /**
   * Mark a specification as executing
   *
   * @param spec - The specification
   * @returns Updated specification
   */
  markExecuting(spec: FormalSpecification): FormalSpecification {
    return {
      ...spec,
      status: 'executing',
      updatedAt: Date.now(),
    }
  }

  /**
   * Mark a specification as verified
   *
   * @param spec - The specification
   * @param results - Verification results
   * @returns Updated specification
   */
  markVerified(spec: FormalSpecification, results: VerificationResult[]): FormalSpecification {
    return {
      ...spec,
      status: 'verified',
      verificationResults: results,
      updatedAt: Date.now(),
    }
  }

  /**
   * Mark a specification as failed
   *
   * @param spec - The specification
   * @param reason - Failure reason
   * @returns Updated specification
   */
  markFailed(spec: FormalSpecification, _reason: string): FormalSpecification {
    return {
      ...spec,
      status: 'failed',
      updatedAt: Date.now(),
    }
  }

  /**
   * Mark a specification as drifted
   *
   * @param spec - The specification
   * @param driftReport - The drift report
   * @returns Updated specification
   */
  markDrifted(spec: FormalSpecification, _driftReport: DriftReport): FormalSpecification {
    return {
      ...spec,
      status: 'drifted',
      updatedAt: Date.now(),
    }
  }

  /**
   * Refine a specification based on detected drift
   *
   * This method re-evaluates constraints against new code state and
   * generates a reconciliation plan to update the spec.
   *
   * @param spec - The specification to refine
   * @param driftReport - The drift detection report
   * @returns Refined specification with updated constraints
   */
  async refineFromDrift(
    spec: FormalSpecification,
    driftReport: DriftReport
  ): Promise<{ spec: FormalSpecification; changes: ReconciliationChange[] }> {
    const changes: ReconciliationChange[] = []
    const refined: FormalSpecification = {
      ...spec,
      version: spec.version + 1,
      status: 'draft',
      updatedAt: Date.now(),
      provenance: {
        ...spec.provenance,
        parentSpecId: spec.id,
        timestamp: Date.now(),
      },
    }

    // Process each drift finding
    for (const finding of driftReport.findings) {
      const change = await this.generateChangeForFinding(finding, spec)
      if (change) {
        changes.push(change)
        this.applyChange(refined, change)
      }
    }

    // Add a meta-constraint about the drift
    refined.intent.constraints.push({
      type: 'structural',
      rule: `Auto-refined from drift detection at ${new Date().toISOString()}`,
      target: driftReport.modifiedFiles.join(', ') || 'spec',
    })

    // Validate the refined spec
    const validation = await this.validate(refined)
    if (validation.isValid) {
      refined.status = 'validated'
    }

    return { spec: refined, changes }
  }

  /**
   * Generate a reconciliation change for a drift finding
   */
  private async generateChangeForFinding(
    finding: DriftFinding,
    _spec: FormalSpecification
  ): Promise<ReconciliationChange | null> {
    switch (finding.type) {
      case 'constraint_violation':
        if (finding.relatedConstraint) {
          // Update the existing constraint to reflect new reality
          // Only structural and behavioral constraints have a 'rule' property
          const updatedConstraint =
            finding.relatedConstraint.type === 'structural' ||
            finding.relatedConstraint.type === 'behavioral'
              ? {
                  ...finding.relatedConstraint,
                  rule: `${finding.relatedConstraint.rule} (updated after drift detection)`,
                }
              : finding.relatedConstraint

          return {
            type: 'update_constraint',
            targetId: finding.relatedConstraint.type,
            value: updatedConstraint,
            reason: finding.description,
          }
        }
        // Add a new constraint to address the drift
        return {
          type: 'add_constraint',
          value: {
            type: 'structural',
            rule: `Address drift: ${finding.description}`,
            target: finding.filePath,
          },
          reason: finding.description,
        }

      case 'dependency_change':
        // Add or update dependency
        return {
          type: 'update_dependency',
          targetId: finding.filePath,
          value: {
            path: finding.filePath,
            access: 'write',
            reason: `Modified during execution: ${finding.description}`,
          },
          reason: finding.description,
        }

      case 'invariant_breach':
        // Add a note about the invariant in constraints
        return {
          type: 'add_constraint',
          value: {
            type: 'behavioral',
            rule: `Verify invariant after changes: ${finding.description}`,
            assertion: finding.suggestion,
          },
          reason: finding.description,
        }

      case 'requirement_mismatch':
        // Add a new acceptance criterion
        return {
          type: 'add_criterion',
          value: {
            id: `ac-drift-${Date.now()}`,
            trigger: `code changes to ${finding.filePath}`,
            behavior: finding.suggestion,
            verificationMethod: 'automated',
            status: 'pending',
          },
          reason: finding.description,
        }

      default:
        return null
    }
  }

  /**
   * Apply a reconciliation change to a specification
   */
  private applyChange(spec: FormalSpecification, change: ReconciliationChange): boolean {
    switch (change.type) {
      case 'add_constraint':
        spec.intent.constraints.push(change.value as Constraint)
        return true

      case 'remove_constraint':
        spec.intent.constraints = spec.intent.constraints.filter(
          (c) => JSON.stringify(c) !== JSON.stringify(change.value)
        )
        return true

      case 'update_constraint':
        if (change.targetId) {
          const idx = spec.intent.constraints.findIndex((c) => c.type === change.targetId)
          if (idx >= 0) {
            spec.intent.constraints[idx] = change.value as Constraint
            return true
          }
        }
        return false

      case 'add_criterion':
        spec.intent.acceptanceCriteria.push(change.value as AcceptanceCriterion)
        return true

      case 'update_criterion':
        if (change.targetId) {
          const idx = spec.intent.acceptanceCriteria.findIndex((c) => c.id === change.targetId)
          if (idx >= 0) {
            spec.intent.acceptanceCriteria[idx] = {
              ...spec.intent.acceptanceCriteria[idx],
              ...(change.value as Partial<AcceptanceCriterion>),
            }
            return true
          }
        }
        return false

      case 'add_step':
        spec.plan.steps.push(change.value as SpecStep)
        return true

      case 'update_step':
        if (change.targetId) {
          const idx = spec.plan.steps.findIndex((s) => s.id === change.targetId)
          if (idx >= 0) {
            spec.plan.steps[idx] = {
              ...spec.plan.steps[idx],
              ...(change.value as Partial<SpecStep>),
            }
            return true
          }
        }
        return false

      default:
        return false
    }
  }

  /**
   * Create a minimal spec for instant tier
   */
  private createMinimalSpec(
    userMessage: string,
    context: SpecGenerationContext,
    tier: SpecTier
  ): FormalSpecification {
    const now = Date.now()

    return {
      id: ascending('spec_'),
      version: 1,
      tier,
      status: 'validated', // Instant specs skip validation
      intent: {
        goal: this.inferGoalFromMessage(userMessage),
        rawMessage: userMessage,
        constraints: [],
        acceptanceCriteria: [
          {
            id: 'ac-1',
            trigger: 'the request is processed',
            behavior: 'the system provides a helpful response',
            verificationMethod: 'llm-judge',
            status: 'pending',
          },
        ],
      },
      plan: {
        steps: [
          {
            id: 'step-1',
            description: 'Process the user request',
            tools: ['read_files'],
            targetFiles: context.targetFiles || [],
            status: 'pending',
          },
        ],
        dependencies: [],
        risks: [],
        estimatedTools: [],
      },
      validation: {
        preConditions: [],
        postConditions: [],
        invariants: [],
      },
      provenance: {
        model: 'gpt-4o',
        promptHash: hashString(userMessage),
        timestamp: now,
        chatId: context.chatId || '',
      },
      createdAt: now,
      updatedAt: now,
    }
  }

  /**
   * Generate spec data based on mode
   */
  private generateSpecForMode(
    userMessage: string,
    context: SpecGenerationContext,
    _tier: SpecTier
  ): Omit<FormalSpecification, 'id' | 'version' | 'tier' | 'status' | 'createdAt' | 'updatedAt'> {
    const mode = context.mode?.toLowerCase() || 'code'
    const model = context.model || 'unknown'

    switch (mode) {
      case 'build':
        return generateBuildSpec(userMessage, {
          projectId: context.projectId,
          chatId: context.chatId,
          existingFiles: context.existingFiles,
          techStack: context.techStack,
          model,
        })

      case 'architect':
        return generateArchitectSpec(userMessage, {
          projectId: context.projectId,
          chatId: context.chatId,
          existingFiles: context.existingFiles,
          techStack: context.techStack,
          model,
        })

      case 'debug':
        return generateDebugSpec(userMessage, {
          projectId: context.projectId,
          chatId: context.chatId,
          errorMessage: context.errorMessage,
          stackTrace: context.stackTrace,
          model,
        })

      case 'review':
        return generateReviewSpec(userMessage, {
          projectId: context.projectId,
          chatId: context.chatId,
          targetFiles: context.targetFiles,
          model,
        })

      case 'code':
      case 'ask':
      case 'discuss':
      default:
        return generateCodeSpec(userMessage, {
          projectId: context.projectId,
          chatId: context.chatId,
          existingFiles: context.existingFiles,
          targetFiles: context.targetFiles,
          model,
        })
    }
  }

  /**
   * Infer a goal from the user message
   */
  private inferGoalFromMessage(message: string): string {
    const firstSentence = message.split(/[.!?]/)[0] || message
    return firstSentence.slice(0, 150).trim()
  }
}

/**
 * Create a spec engine instance
 */
export function createSpecEngine(config?: Partial<SpecEngineConfig>): SpecEngine {
  return new SpecEngine({
    enabled: false,
    autoApproveAmbient: true,
    maxSpecsPerProject: 100,
    enableDriftDetection: false,
    ...config,
  })
}

/**
 * Default spec engine instance (disabled by default)
 */
export const defaultSpecEngine = createSpecEngine()
