/**
 * Spec Reconciler - Bidirectional spec-code synchronization
 *
 * The SpecReconciler class implements the "living document" aspect of SpecNative:
 * - Detects drift between code changes and existing specifications
 * - Reconciles specs when code changes affect spec-covered areas
 * - Creates versioned spec chains to preserve evolution history
 *
 * This solves Kiro's fatal flaw: specs that don't auto-update when code changes.
 */

import type {
  FormalSpecification,
  Constraint,
  AcceptanceCriterion,
  SpecStep,
  FileDependency,
  SpecStatus,
} from './types'
import { ascending } from '../harness/identifier'

/**
 * Drift detection report
 */
export interface DriftReport {
  /** Whether drift was detected */
  hasDrift: boolean
  /** The specification that may have drifted */
  specId: string
  /** Files that were modified */
  modifiedFiles: string[]
  /** Specific drift findings */
  findings: DriftFinding[]
  /** Timestamp of detection */
  detectedAt: number
  /** Overall severity of drift */
  severity: 'low' | 'medium' | 'high'
}

/**
 * Individual drift finding
 */
export interface DriftFinding {
  /** Type of drift detected */
  type: 'constraint_violation' | 'requirement_mismatch' | 'dependency_change' | 'invariant_breach'
  /** File path affected */
  filePath: string
  /** Description of the drift */
  description: string
  /** Related constraint or requirement */
  relatedConstraint?: Constraint
  /** Related acceptance criterion */
  relatedCriterion?: AcceptanceCriterion
  /** Severity of this specific finding */
  severity: 'low' | 'medium' | 'high'
  /** Suggested action */
  suggestion: string
}

/**
 * Reconciliation result
 */
export interface ReconciliationResult {
  /** Whether reconciliation was successful */
  success: boolean
  /** The new specification version (if created) */
  newSpec?: FormalSpecification
  /** Changes that were applied */
  changesApplied: ReconciliationChange[]
  /** Changes that were rejected */
  changesRejected: ReconciliationChange[]
  /** Errors encountered */
  errors: string[]
}

/**
 * Change request for reconciliation
 */
export interface ReconciliationChange {
  /** Type of change */
  type:
    | 'add_constraint'
    | 'remove_constraint'
    | 'update_constraint'
    | 'add_criterion'
    | 'update_criterion'
    | 'add_step'
    | 'update_step'
    | 'update_dependency'
  /** Target ID (for updates) */
  targetId?: string
  /** New value */
  value: unknown
  /** Reason for change */
  reason: string
}

/**
 * Spec version chain entry
 */
export interface SpecVersionEntry {
  id: string
  version: number
  status: SpecStatus
  createdAt: number
  parentSpecId?: string
  driftReport?: DriftReport
}

/**
 * Spec Reconciler class
 *
 * Handles bidirectional synchronization between code and specifications:
 * 1. Detects when code changes affect spec-covered areas
 * 2. Generates reconciliation plans
 * 3. Creates new spec versions with proper chaining
 */
export class SpecReconciler {
  private activeSpecs: Map<string, FormalSpecification> = new Map()
  private driftHistory: Map<string, DriftReport[]> = new Map()

  /**
   * Register an active specification for drift monitoring
   */
  registerSpec(spec: FormalSpecification): void {
    this.activeSpecs.set(spec.id, spec)
  }

  /**
   * Unregister a specification (when archived or completed)
   */
  unregisterSpec(specId: string): void {
    this.activeSpecs.delete(specId)
  }

  /**
   * Detect drift between a specification and modified files
   *
   * @param spec - The specification to check
   * @param modifiedFiles - Files that were modified
   * @returns Drift detection report
   */
  async detectDrift(spec: FormalSpecification, modifiedFiles: string[]): Promise<DriftReport> {
    const findings: DriftFinding[] = []

    // Check if modified files are covered by spec dependencies
    const coveredFiles = this.getCoveredFiles(spec)
    const affectedFiles = modifiedFiles.filter((file) =>
      coveredFiles.some((covered) => this.fileMatches(file, covered))
    )

    if (affectedFiles.length === 0) {
      return {
        hasDrift: false,
        specId: spec.id,
        modifiedFiles,
        findings: [],
        detectedAt: Date.now(),
        severity: 'low',
      }
    }

    // Check constraints against modifications
    for (const file of affectedFiles) {
      const constraintFindings = await this.checkConstraintViolations(spec, file)
      findings.push(...constraintFindings)

      const dependencyFindings = await this.checkDependencyChanges(spec, file, modifiedFiles)
      findings.push(...dependencyFindings)

      const invariantFindings = await this.checkInvariantBreaches(spec, file)
      findings.push(...invariantFindings)
    }

    // Determine overall severity
    const severity = this.calculateSeverity(findings)

    const report: DriftReport = {
      hasDrift: findings.length > 0,
      specId: spec.id,
      modifiedFiles,
      findings,
      detectedAt: Date.now(),
      severity,
    }

    // Store in history
    const history = this.driftHistory.get(spec.id) || []
    history.push(report)
    this.driftHistory.set(spec.id, history)

    return report
  }

  /**
   * Reconcile a specification based on detected changes
   *
   * @param spec - The specification to reconcile
   * @param changes - Changes to apply
   * @returns Reconciliation result with new spec version
   */
  async reconcile(
    spec: FormalSpecification,
    changes: ReconciliationChange[]
  ): Promise<ReconciliationResult> {
    const result: ReconciliationResult = {
      success: false,
      changesApplied: [],
      changesRejected: [],
      errors: [],
    }

    // Create new spec version
    const newSpec = await this.createVersion(spec)

    // Apply changes
    for (const change of changes) {
      try {
        const applied = await this.applyChange(newSpec, change)
        if (applied) {
          result.changesApplied.push(change)
        } else {
          result.changesRejected.push(change)
        }
      } catch (error) {
        result.errors.push(
          `Failed to apply change ${change.type}: ${error instanceof Error ? error.message : String(error)}`
        )
        result.changesRejected.push(change)
      }
    }

    // Update status
    newSpec.status = 'validated'
    newSpec.updatedAt = Date.now()

    result.success = result.errors.length === 0
    result.newSpec = newSpec

    // Update active specs
    this.activeSpecs.set(newSpec.id, newSpec)
    this.unregisterSpec(spec.id)

    return result
  }

  /**
   * Create a new version of a specification
   *
   * @param parentSpec - The parent specification
   * @returns New specification with incremented version
   */
  async createVersion(parentSpec: FormalSpecification): Promise<FormalSpecification> {
    const now = Date.now()

    const newSpec: FormalSpecification = {
      ...parentSpec,
      id: ascending('spec_'),
      version: parentSpec.version + 1,
      status: 'draft',
      provenance: {
        ...parentSpec.provenance,
        timestamp: now,
        parentSpecId: parentSpec.id,
      },
      createdAt: now,
      updatedAt: now,
    }

    return newSpec
  }

  /**
   * Get the version chain for a specification
   *
   * @param specId - The specification ID
   * @returns Array of spec versions in chronological order
   */
  async getVersionChain(specId: string): Promise<SpecVersionEntry[]> {
    const chain: SpecVersionEntry[] = []
    const visited = new Set<string>()

    // First, find the root spec by looking through active specs
    let currentSpec = this.activeSpecs.get(specId)

    // If not in active specs, we can't build the chain
    if (!currentSpec) {
      return []
    }

    // Walk backwards to find root
    while (currentSpec.provenance.parentSpecId && !visited.has(currentSpec.id)) {
      visited.add(currentSpec.id)
      const parentId = currentSpec.provenance.parentSpecId
      const parent = this.activeSpecs.get(parentId)
      if (!parent) break
      currentSpec = parent
    }

    // Now walk forward to build chain
    visited.clear()
    const toProcess = [currentSpec]

    while (toProcess.length > 0) {
      const spec = toProcess.shift()!
      if (visited.has(spec.id)) continue
      visited.add(spec.id)

      chain.push({
        id: spec.id,
        version: spec.version,
        status: spec.status,
        createdAt: spec.createdAt,
        parentSpecId: spec.provenance.parentSpecId,
        driftReport: this.driftHistory.get(spec.id)?.at(-1),
      })

      // Find children (specs that have this as parent)
      for (const [, s] of this.activeSpecs) {
        if (s.provenance.parentSpecId === spec.id && !visited.has(s.id)) {
          toProcess.push(s)
        }
      }
    }

    // Sort by version
    return chain.sort((a, b) => a.version - b.version)
  }

  /**
   * Compare two specification versions
   *
   * @param specA - First specification
   * @param specB - Second specification
   * @returns Comparison result with differences
   */
  async compareSpecs(
    specA: FormalSpecification,
    specB: FormalSpecification
  ): Promise<SpecComparisonResult> {
    const differences: SpecDifference[] = []

    // Compare constraints
    const constraintDiffs = this.compareConstraints(
      specA.intent.constraints,
      specB.intent.constraints
    )
    differences.push(...constraintDiffs)

    // Compare acceptance criteria
    const criterionDiffs = this.compareCriteria(
      specA.intent.acceptanceCriteria,
      specB.intent.acceptanceCriteria
    )
    differences.push(...criterionDiffs)

    // Compare steps
    const stepDiffs = this.compareSteps(specA.plan.steps, specB.plan.steps)
    differences.push(...stepDiffs)

    // Compare dependencies
    const depDiffs = this.compareDependencies(specA.plan.dependencies, specB.plan.dependencies)
    differences.push(...depDiffs)

    return {
      specA: { id: specA.id, version: specA.version },
      specB: { id: specB.id, version: specB.version },
      differences,
      hasChanges: differences.length > 0,
    }
  }

  /**
   * Get drift history for a specification
   */
  getDriftHistory(specId: string): DriftReport[] {
    return this.driftHistory.get(specId) || []
  }

  /**
   * Clear drift history for a specification
   */
  clearDriftHistory(specId: string): void {
    this.driftHistory.delete(specId)
  }

  // Private helper methods

  private getCoveredFiles(spec: FormalSpecification): string[] {
    const files = new Set<string>()

    // Add files from dependencies
    for (const dep of spec.plan.dependencies) {
      files.add(dep.path)
    }

    // Add files from steps
    for (const step of spec.plan.steps) {
      for (const target of step.targetFiles) {
        files.add(target)
      }
    }

    // Add files from invariants
    for (const invariant of spec.validation.invariants) {
      files.add(invariant.scope)
    }

    return Array.from(files)
  }

  private fileMatches(file: string, pattern: string): boolean {
    // Exact match
    if (file === pattern) return true

    // Glob-style pattern matching (simplified)
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
      return regex.test(file)
    }

    // Directory prefix match
    if (pattern.endsWith('/')) {
      return file.startsWith(pattern)
    }

    return false
  }

  private async checkConstraintViolations(
    spec: FormalSpecification,
    filePath: string
  ): Promise<DriftFinding[]> {
    const findings: DriftFinding[] = []

    for (const constraint of spec.intent.constraints) {
      // Check if constraint applies to this file
      if (constraint.type === 'structural' && this.fileMatches(filePath, constraint.target)) {
        // Structural constraints are checked at validation time
        // Drift would be detected if the file no longer exists or changed structure
        findings.push({
          type: 'constraint_violation',
          filePath,
          description: `Structural constraint may be affected: ${constraint.rule}`,
          relatedConstraint: constraint,
          severity: 'medium',
          suggestion: 'Review structural constraint against new file state',
        })
      }

      if (constraint.type === 'behavioral') {
        findings.push({
          type: 'constraint_violation',
          filePath,
          description: `Behavioral constraint may need re-verification: ${constraint.rule}`,
          relatedConstraint: constraint,
          severity: 'low',
          suggestion: 'Re-run behavioral verification tests',
        })
      }
    }

    return findings
  }

  private async checkDependencyChanges(
    spec: FormalSpecification,
    filePath: string,
    _allModifiedFiles: string[]
  ): Promise<DriftFinding[]> {
    const findings: DriftFinding[] = []

    for (const dep of spec.plan.dependencies) {
      if (this.fileMatches(filePath, dep.path)) {
        findings.push({
          type: 'dependency_change',
          filePath,
          description: `File dependency modified: ${dep.access} access for ${dep.reason}`,
          severity: dep.access === 'delete' ? 'high' : 'medium',
          suggestion: 'Update spec dependencies if access pattern changed',
        })
      }
    }

    return findings
  }

  private async checkInvariantBreaches(
    spec: FormalSpecification,
    filePath: string
  ): Promise<DriftFinding[]> {
    const findings: DriftFinding[] = []

    for (const invariant of spec.validation.invariants) {
      if (this.fileMatches(filePath, invariant.scope)) {
        findings.push({
          type: 'invariant_breach',
          filePath,
          description: `Invariant may be affected: ${invariant.description}`,
          severity: 'high',
          suggestion: `Verify invariant still holds: ${invariant.rule}`,
        })
      }
    }

    return findings
  }

  private calculateSeverity(findings: DriftFinding[]): 'low' | 'medium' | 'high' {
    if (findings.some((f) => f.severity === 'high')) return 'high'
    if (findings.some((f) => f.severity === 'medium')) return 'medium'
    return 'low'
  }

  private async applyChange(
    spec: FormalSpecification,
    change: ReconciliationChange
  ): Promise<boolean> {
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
          const idx = spec.intent.constraints.findIndex(
            (c) => c.type === change.targetId // Simplified matching
          )
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

      case 'update_dependency':
        if (change.targetId) {
          const idx = spec.plan.dependencies.findIndex((d) => d.path === change.targetId)
          if (idx >= 0) {
            spec.plan.dependencies[idx] = change.value as FileDependency
            return true
          }
        }
        return false

      default:
        return false
    }
  }

  private compareConstraints(a: Constraint[], b: Constraint[]): SpecDifference[] {
    const differences: SpecDifference[] = []

    // Find added constraints
    for (const constraint of b) {
      const exists = a.some(
        (c) => c.type === constraint.type && JSON.stringify(c) === JSON.stringify(constraint)
      )
      if (!exists) {
        differences.push({
          type: 'constraint_added',
          field: 'intent.constraints',
          oldValue: undefined,
          newValue: constraint,
        })
      }
    }

    // Find removed constraints
    for (const constraint of a) {
      const exists = b.some(
        (c) => c.type === constraint.type && JSON.stringify(c) === JSON.stringify(constraint)
      )
      if (!exists) {
        differences.push({
          type: 'constraint_removed',
          field: 'intent.constraints',
          oldValue: constraint,
          newValue: undefined,
        })
      }
    }

    return differences
  }

  private compareCriteria(a: AcceptanceCriterion[], b: AcceptanceCriterion[]): SpecDifference[] {
    const differences: SpecDifference[] = []

    for (const criterion of b) {
      const oldCriterion = a.find((c) => c.id === criterion.id)
      if (!oldCriterion) {
        differences.push({
          type: 'criterion_added',
          field: 'intent.acceptanceCriteria',
          oldValue: undefined,
          newValue: criterion,
        })
      } else if (JSON.stringify(oldCriterion) !== JSON.stringify(criterion)) {
        differences.push({
          type: 'criterion_changed',
          field: `intent.acceptanceCriteria.${criterion.id}`,
          oldValue: oldCriterion,
          newValue: criterion,
        })
      }
    }

    for (const criterion of a) {
      if (!b.find((c) => c.id === criterion.id)) {
        differences.push({
          type: 'criterion_removed',
          field: 'intent.acceptanceCriteria',
          oldValue: criterion,
          newValue: undefined,
        })
      }
    }

    return differences
  }

  private compareSteps(a: SpecStep[], b: SpecStep[]): SpecDifference[] {
    const differences: SpecDifference[] = []

    for (const step of b) {
      const oldStep = a.find((s) => s.id === step.id)
      if (!oldStep) {
        differences.push({
          type: 'step_added',
          field: 'plan.steps',
          oldValue: undefined,
          newValue: step,
        })
      } else if (JSON.stringify(oldStep) !== JSON.stringify(step)) {
        differences.push({
          type: 'step_changed',
          field: `plan.steps.${step.id}`,
          oldValue: oldStep,
          newValue: step,
        })
      }
    }

    return differences
  }

  private compareDependencies(a: FileDependency[], b: FileDependency[]): SpecDifference[] {
    const differences: SpecDifference[] = []

    for (const dep of b) {
      const oldDep = a.find((d) => d.path === dep.path)
      if (!oldDep) {
        differences.push({
          type: 'dependency_added',
          field: 'plan.dependencies',
          oldValue: undefined,
          newValue: dep,
        })
      } else if (oldDep.access !== dep.access) {
        differences.push({
          type: 'dependency_changed',
          field: `plan.dependencies.${dep.path}`,
          oldValue: oldDep,
          newValue: dep,
        })
      }
    }

    return differences
  }
}

/**
 * Spec comparison result
 */
export interface SpecComparisonResult {
  specA: { id: string; version: number }
  specB: { id: string; version: number }
  differences: SpecDifference[]
  hasChanges: boolean
}

/**
 * Individual spec difference
 */
export interface SpecDifference {
  type:
    | 'constraint_added'
    | 'constraint_removed'
    | 'constraint_changed'
    | 'criterion_added'
    | 'criterion_removed'
    | 'criterion_changed'
    | 'step_added'
    | 'step_removed'
    | 'step_changed'
    | 'dependency_added'
    | 'dependency_removed'
    | 'dependency_changed'
  field: string
  oldValue: unknown
  newValue: unknown
}

/**
 * Create a spec reconciler instance
 */
export function createSpecReconciler(): SpecReconciler {
  return new SpecReconciler()
}

/**
 * Default spec reconciler instance
 */
export const defaultSpecReconciler = createSpecReconciler()
