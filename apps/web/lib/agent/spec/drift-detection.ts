/**
 * Drift Detection Plugin - SpecNative spec-code sync
 *
 * This plugin hooks into tool execution to detect when code changes
 * affect areas covered by active specifications. It triggers drift
 * detection events that can be handled by the UI to prompt users
 * for spec reconciliation.
 *
 * Solves Kiro's fatal flaw: specs that don't auto-update when code changes.
 */

import type { Plugin, HookContext } from '../harness/types'
import type { DriftReport, DriftFinding } from './reconciler'
import type { FormalSpecification } from './types'

/**
 * Drift detection configuration
 */
export interface DriftDetectionConfig {
  /** Whether drift detection is enabled */
  enabled: boolean
  /** Minimum severity to trigger drift notification */
  minSeverity: 'low' | 'medium' | 'high'
  /** Throttle interval in milliseconds between drift notifications */
  throttleMs: number
  /** Maximum number of drift notifications per session */
  maxNotificationsPerSession: number
  /** Tools that trigger drift detection */
  watchedTools: string[]
}

/**
 * Default drift detection configuration
 */
export const DEFAULT_DRIFT_CONFIG: DriftDetectionConfig = {
  enabled: true,
  minSeverity: 'low',
  throttleMs: 5000, // 5 seconds
  maxNotificationsPerSession: 10,
  watchedTools: ['write_files', 'edit_file', 'apply_diff', 'create_file', 'delete_file'],
}

/**
 * Drift detection state
 */
interface DriftDetectionState {
  /** Active specifications being monitored */
  activeSpecs: Map<string, FormalSpecification>
  /** Last drift notification timestamp per spec */
  lastNotificationTime: Map<string, number>
  /** Notification count per session */
  notificationCount: Map<string, number>
  /** Pending drift reports awaiting user action */
  pendingDrifts: Map<string, DriftReport>
}

/**
 * Global drift detection state
 */
const state: DriftDetectionState = {
  activeSpecs: new Map(),
  lastNotificationTime: new Map(),
  notificationCount: new Map(),
  pendingDrifts: new Map(),
}

/**
 * Register an active specification for drift monitoring
 */
export function registerActiveSpec(spec: FormalSpecification): void {
  state.activeSpecs.set(spec.id, spec)
}

/**
 * Unregister a specification from drift monitoring
 */
export function unregisterActiveSpec(specId: string): void {
  state.activeSpecs.delete(specId)
  state.lastNotificationTime.delete(specId)
  state.pendingDrifts.delete(specId)
}

/**
 * Get all active specifications
 */
export function getActiveSpecs(): FormalSpecification[] {
  return Array.from(state.activeSpecs.values())
}

/**
 * Get pending drift reports
 */
export function getPendingDrifts(): DriftReport[] {
  return Array.from(state.pendingDrifts.values())
}

/**
 * Clear a pending drift report
 */
export function clearPendingDrift(specId: string): void {
  state.pendingDrifts.delete(specId)
}

/**
 * Check if a file is covered by a specification
 */
function isFileCoveredBySpec(filePath: string, spec: FormalSpecification): boolean {
  // Check dependencies
  for (const dep of spec.plan.dependencies) {
    if (fileMatches(filePath, dep.path)) {
      return true
    }
  }

  // Check step target files
  for (const step of spec.plan.steps) {
    for (const target of step.targetFiles) {
      if (fileMatches(filePath, target)) {
        return true
      }
    }
  }

  // Check invariants
  for (const invariant of spec.validation.invariants) {
    if (fileMatches(filePath, invariant.scope)) {
      return true
    }
  }

  return false
}

/**
 * File pattern matching
 */
function fileMatches(file: string, pattern: string): boolean {
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

  // Check if file is in the pattern directory
  const patternDir = pattern.includes('/') ? pattern.slice(0, pattern.lastIndexOf('/') + 1) : ''
  if (patternDir && file.startsWith(patternDir)) {
    return true
  }

  return false
}

/**
 * Extract file paths from tool arguments
 */
function extractFilePaths(toolName: string, args: Record<string, unknown>): string[] {
  const paths: string[] = []

  switch (toolName) {
    case 'write_files':
    case 'edit_file':
    case 'apply_diff':
      if (Array.isArray(args.paths)) {
        paths.push(...args.paths.map((p) => String(p)))
      }
      if (Array.isArray(args.files)) {
        paths.push(...args.files.map((f: { path?: string }) => f.path || '').filter(Boolean))
      }
      if (typeof args.path === 'string') {
        paths.push(args.path)
      }
      if (typeof args.file_path === 'string') {
        paths.push(args.file_path)
      }
      break

    case 'create_file':
      if (typeof args.path === 'string') {
        paths.push(args.path)
      }
      if (typeof args.file_path === 'string') {
        paths.push(args.file_path)
      }
      break

    case 'delete_file':
      if (typeof args.path === 'string') {
        paths.push(args.path)
      }
      break
  }

  return paths.filter(Boolean)
}

/**
 * Detect drift for a modified file against a specification
 */
function detectDriftForFile(
  filePath: string,
  spec: FormalSpecification,
  toolName: string
): DriftFinding[] {
  const findings: DriftFinding[] = []

  // Check if file is covered by spec
  if (!isFileCoveredBySpec(filePath, spec)) {
    return findings
  }

  // Find affected dependencies
  for (const dep of spec.plan.dependencies) {
    if (fileMatches(filePath, dep.path)) {
      findings.push({
        type: 'dependency_change',
        filePath,
        description: `File with ${dep.access} access was modified via ${toolName}`,
        relatedConstraint: undefined,
        relatedCriterion: undefined,
        severity: dep.access === 'delete' ? 'high' : 'medium',
        suggestion: 'Review spec dependencies and update if access patterns changed',
      })
    }
  }

  // Check constraints
  for (const constraint of spec.intent.constraints) {
    if (constraint.type === 'structural' && fileMatches(filePath, constraint.target)) {
      findings.push({
        type: 'constraint_violation',
        filePath,
        description: `Structural constraint may be affected: ${constraint.rule}`,
        relatedConstraint: constraint,
        relatedCriterion: undefined,
        severity: 'medium',
        suggestion: 'Verify structural constraint still holds after changes',
      })
    }
  }

  // Check invariants
  for (const invariant of spec.validation.invariants) {
    if (fileMatches(filePath, invariant.scope)) {
      findings.push({
        type: 'invariant_breach',
        filePath,
        description: `Invariant scope was modified: ${invariant.description}`,
        relatedConstraint: undefined,
        relatedCriterion: undefined,
        severity: 'high',
        suggestion: `Verify invariant still holds: ${invariant.rule}`,
      })
    }
  }

  return findings
}

/**
 * Check if drift notification should be throttled
 */
function shouldThrottle(specId: string, config: DriftDetectionConfig): boolean {
  const now = Date.now()
  const lastTime = state.lastNotificationTime.get(specId) || 0
  const count = state.notificationCount.get(specId) || 0

  // Check max notifications
  if (count >= config.maxNotificationsPerSession) {
    return true
  }

  // Check throttle interval
  if (now - lastTime < config.throttleMs) {
    return true
  }

  return false
}

/**
 * Update throttle state
 */
function updateThrottleState(specId: string): void {
  const now = Date.now()
  state.lastNotificationTime.set(specId, now)
  state.notificationCount.set(specId, (state.notificationCount.get(specId) || 0) + 1)
}

/**
 * Create drift detection plugin
 */
export function createDriftDetectionPlugin(config: Partial<DriftDetectionConfig> = {}): Plugin {
  const fullConfig = { ...DEFAULT_DRIFT_CONFIG, ...config }

  return {
    name: 'drift-detection',
    version: '1.0.0',
    hooks: {
      'tool.execute.after': async (ctx: HookContext, data: unknown): Promise<unknown> => {
        if (!fullConfig.enabled) {
          return data
        }

        const typedData = data as {
          toolName: string
          args: Record<string, unknown>
          result: { output?: string; error?: string }
        }

        const { toolName, args } = typedData

        // Only watch specific tools
        if (!fullConfig.watchedTools.includes(toolName)) {
          return data
        }

        // Skip if there was an error
        if (typedData.result.error) {
          return data
        }

        // Extract modified file paths
        const modifiedFiles = extractFilePaths(toolName, args)
        if (modifiedFiles.length === 0) {
          return data
        }

        // Check each active spec for drift
        for (const [specId, spec] of state.activeSpecs) {
          // Skip specs that are not in a state where drift matters
          if (spec.status !== 'verified' && spec.status !== 'executing') {
            continue
          }

          const findings: DriftFinding[] = []

          for (const filePath of modifiedFiles) {
            const fileFindings = detectDriftForFile(filePath, spec, toolName)
            findings.push(...fileFindings)
          }

          if (findings.length === 0) {
            continue
          }

          // Calculate severity
          const hasHigh = findings.some((f) => f.severity === 'high')
          const hasMedium = findings.some((f) => f.severity === 'medium')
          const severity = hasHigh ? 'high' : hasMedium ? 'medium' : 'low'

          // Check minimum severity threshold
          const severityLevels = { low: 0, medium: 1, high: 2 }
          if (severityLevels[severity] < severityLevels[fullConfig.minSeverity]) {
            continue
          }

          // Check throttle
          if (shouldThrottle(specId, fullConfig)) {
            continue
          }

          // Create drift report
          const driftReport: DriftReport = {
            hasDrift: true,
            specId,
            modifiedFiles,
            findings,
            detectedAt: Date.now(),
            severity,
          }

          // Store as pending
          state.pendingDrifts.set(specId, driftReport)

          // Update throttle state
          updateThrottleState(specId)

          // Emit drift detected event via plugin system
          // This will be picked up by the UI
          await plugins.executeHooks('spec.drift.detected', ctx, driftReport)
        }

        return data
      },
    },
  }
}

/**
 * Create a drift report from manual detection
 */
export function createDriftReport(
  spec: FormalSpecification,
  modifiedFiles: string[],
  reason: string
): DriftReport {
  const findings: DriftFinding[] = []

  for (const filePath of modifiedFiles) {
    const fileFindings = detectDriftForFile(filePath, spec, 'manual')
    findings.push(...fileFindings)
  }

  // If no specific findings, create a generic one
  if (findings.length === 0) {
    findings.push({
      type: 'requirement_mismatch',
      filePath: modifiedFiles[0] || 'unknown',
      description: reason,
      severity: 'medium',
      suggestion: 'Review spec and update to reflect code changes',
    })
  }

  const hasHigh = findings.some((f) => f.severity === 'high')
  const hasMedium = findings.some((f) => f.severity === 'medium')
  const severity = hasHigh ? 'high' : hasMedium ? 'medium' : 'low'

  return {
    hasDrift: true,
    specId: spec.id,
    modifiedFiles,
    findings,
    detectedAt: Date.now(),
    severity,
  }
}

// Import plugins for hook execution
import { plugins } from '../harness/plugins'
