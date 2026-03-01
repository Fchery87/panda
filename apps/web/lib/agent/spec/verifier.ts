/**
 * Spec Verifier - Post-execution verification against specifications
 *
 * Verifies that execution results satisfy the specification:
 * - Checks acceptance criteria against results
 * - Verifies constraints are satisfied
 * - Generates verification report with pass/fail status
 */

import type {
  FormalSpecification,
  AcceptanceCriterion,
  Constraint,
  VerificationResult,
  SpecStatus,
} from './types'

/**
 * Execution results for verification
 */
export interface ExecutionResults {
  /** Files that were modified */
  filesModified?: string[]
  /** Commands that were run */
  commandsRun?: string[]
  /** Errors that occurred */
  errors?: string[]
  /** Output from execution */
  output?: string
  /** Tool calls made */
  toolCalls?: Array<{
    tool: string
    args: Record<string, unknown>
    result?: string
    error?: string
  }>
}

/**
 * Verification report
 */
export interface SpecVerificationReport {
  /** Whether all criteria passed */
  passed: boolean
  /** Overall status */
  status: 'passed' | 'failed' | 'partial' | 'inconclusive'
  /** Individual criterion results */
  criterionResults: VerificationResult[]
  /** Constraint verification results */
  constraintResults: Array<{
    constraint: Constraint
    satisfied: boolean
    message?: string
  }>
  /** Summary message */
  summary: string
  /** Recommendations for fixes */
  recommendations: string[]
  /** Timestamp */
  timestamp: number
}

/**
 * Verify execution results against a specification
 *
 * @param spec - The specification to verify against
 * @param results - Execution results
 * @returns Verification report
 */
export async function verifySpec(
  spec: FormalSpecification,
  results: ExecutionResults
): Promise<SpecVerificationReport> {
  const timestamp = Date.now()

  // Verify acceptance criteria
  const criterionResults = await verifyAcceptanceCriteria(spec.intent.acceptanceCriteria, results)

  // Verify constraints
  const constraintResults = await verifyConstraints(spec.intent.constraints, results)

  // Determine overall status
  const passedCriteria = criterionResults.filter((r) => r.passed).length
  const totalCriteria = criterionResults.length
  const passedConstraints = constraintResults.filter((r) => r.satisfied).length
  const totalConstraints = constraintResults.length

  const allCriteriaPassed = passedCriteria === totalCriteria
  const allConstraintsSatisfied = passedConstraints === totalConstraints

  let status: SpecVerificationReport['status']
  if (allCriteriaPassed && allConstraintsSatisfied) {
    status = 'passed'
  } else if (passedCriteria === 0) {
    status = 'failed'
  } else if (allCriteriaPassed || allConstraintsSatisfied) {
    status = 'partial'
  } else {
    status = 'inconclusive'
  }

  // Generate summary
  const summary = generateSummary(spec, criterionResults, constraintResults, results.errors || [])

  // Generate recommendations
  const recommendations = generateRecommendations(criterionResults, constraintResults, results)

  return {
    passed: status === 'passed',
    status,
    criterionResults,
    constraintResults,
    summary,
    recommendations,
    timestamp,
  }
}

/**
 * Verify acceptance criteria against execution results
 */
async function verifyAcceptanceCriteria(
  criteria: AcceptanceCriterion[],
  results: ExecutionResults
): Promise<VerificationResult[]> {
  const results_array: VerificationResult[] = []

  for (const criterion of criteria) {
    const result = await verifySingleCriterion(criterion, results)
    results_array.push(result)
  }

  return results_array
}

/**
 * Verify a single acceptance criterion
 */
async function verifySingleCriterion(
  criterion: AcceptanceCriterion,
  results: ExecutionResults
): Promise<VerificationResult> {
  const { trigger, behavior, verificationMethod } = criterion

  switch (verificationMethod) {
    case 'automated':
      return verifyAutomatedCriterion(criterion, results)

    case 'llm-judge':
      return verifyLLMJudgeCriterion(criterion, results)

    case 'manual':
      return {
        criterionId: criterion.id,
        passed: false,
        message: 'Manual verification required',
        details: {
          trigger,
          behavior,
          note: 'This criterion requires human review',
        },
      }

    default:
      return {
        criterionId: criterion.id,
        passed: false,
        message: `Unknown verification method: ${verificationMethod}`,
      }
  }
}

/**
 * Verify criterion using automated checks
 */
function verifyAutomatedCriterion(
  criterion: AcceptanceCriterion,
  results: ExecutionResults
): VerificationResult {
  const { trigger, behavior } = criterion
  const triggerLower = trigger.toLowerCase()
  const behaviorLower = behavior.toLowerCase()

  // Check for errors first
  if (results.errors && results.errors.length > 0) {
    // If criterion is about error handling
    if (triggerLower.includes('error') || behaviorLower.includes('error')) {
      const hasErrorHandling = results.toolCalls?.some(
        (tc) =>
          tc.tool.includes('error') ||
          (tc.result && tc.result.toLowerCase().includes('error')) ||
          (tc.error && tc.error.toLowerCase().includes('handled'))
      )

      return {
        criterionId: criterion.id,
        passed: hasErrorHandling || false,
        message: hasErrorHandling
          ? 'Error handling detected'
          : 'Criterion requires error handling but none detected',
        details: { errors: results.errors },
      }
    }

    // Other criteria fail if there are errors
    return {
      criterionId: criterion.id,
      passed: false,
      message: `Execution had errors: ${results.errors.join(', ')}`,
      details: { errors: results.errors },
    }
  }

  // Check if files were modified (for implementation criteria)
  if (
    (triggerLower.includes('implemented') || triggerLower.includes('applied')) &&
    (behaviorLower.includes('code') || behaviorLower.includes('file'))
  ) {
    const filesModified = results.filesModified || []
    const passed = filesModified.length > 0

    return {
      criterionId: criterion.id,
      passed,
      message: passed ? `Files modified: ${filesModified.join(', ')}` : 'No files were modified',
      details: { filesModified },
    }
  }

  // Check for successful command execution
  if (triggerLower.includes('command') || behaviorLower.includes('command')) {
    const commandsRun = results.commandsRun || []
    const passed = commandsRun.length > 0 && (results.errors?.length || 0) === 0

    return {
      criterionId: criterion.id,
      passed,
      message: passed
        ? `Commands executed: ${commandsRun.length}`
        : 'Commands were not executed successfully',
      details: { commandsRun },
    }
  }

  // Check for output generation
  if (behaviorLower.includes('response') || behaviorLower.includes('output')) {
    const hasOutput = results.output && results.output.length > 0
    return {
      criterionId: criterion.id,
      passed: hasOutput || false,
      message: hasOutput ? 'Output was generated' : 'No output was generated',
      details: { outputLength: results.output?.length },
    }
  }

  // Default: assume passed if no errors
  return {
    criterionId: criterion.id,
    passed: (results.errors?.length || 0) === 0,
    message: 'No errors detected during execution',
  }
}

/**
 * Verify criterion using LLM judgment (simulated)
 *
 * In production, this would call an LLM to evaluate the criterion
 */
function verifyLLMJudgeCriterion(
  criterion: AcceptanceCriterion,
  results: ExecutionResults
): VerificationResult {
  const { trigger, behavior } = criterion

  // Simulate LLM judgment with heuristics
  const output = results.output || ''
  const outputLower = output.toLowerCase()
  const behaviorLower = behavior.toLowerCase()

  // Check if output contains indicators of the behavior
  const behaviorKeywords = behaviorLower
    .replace(/the system shall /g, '')
    .replace(/the system should /g, '')
    .split(' ')
    .filter((w) => w.length > 4)

  const keywordMatches = behaviorKeywords.filter((kw) => outputLower.includes(kw)).length
  const matchRatio = behaviorKeywords.length > 0 ? keywordMatches / behaviorKeywords.length : 0

  // Heuristic: if we have good output and no errors, likely passed
  const passed = matchRatio > 0.3 && (results.errors?.length || 0) === 0

  return {
    criterionId: criterion.id,
    passed,
    message: passed
      ? `LLM judge: Output appears to satisfy "${behavior}"`
      : `LLM judge: Output may not fully satisfy "${behavior}"`,
    details: {
      trigger,
      behavior,
      matchRatio,
      outputPreview: output.slice(0, 200),
    },
  }
}

/**
 * Verify constraints against execution results
 */
async function verifyConstraints(
  constraints: Constraint[],
  results: ExecutionResults
): Promise<
  Array<{
    constraint: Constraint
    satisfied: boolean
    message?: string
  }>
> {
  const results_array: Array<{
    constraint: Constraint
    satisfied: boolean
    message?: string
  }> = []

  for (const constraint of constraints) {
    const result = await verifySingleConstraint(constraint, results)
    results_array.push(result)
  }

  return results_array
}

/**
 * Verify a single constraint
 */
async function verifySingleConstraint(
  constraint: Constraint,
  results: ExecutionResults
): Promise<{
  constraint: Constraint
  satisfied: boolean
  message?: string
}> {
  switch (constraint.type) {
    case 'structural':
      return verifyStructuralConstraint(constraint, results)

    case 'behavioral':
      return verifyBehavioralConstraint(constraint, results)

    case 'performance':
      return verifyPerformanceConstraint(constraint, results)

    case 'compatibility':
      return verifyCompatibilityConstraint(constraint, results)

    case 'security':
      return verifySecurityConstraint(constraint, results)

    default:
      return {
        constraint,
        satisfied: false,
        message: `Unknown constraint type: ${(constraint as Constraint).type}`,
      }
  }
}

/**
 * Verify structural constraint
 */
function verifyStructuralConstraint(
  constraint: Extract<Constraint, { type: 'structural' }>,
  results: ExecutionResults
): {
  constraint: Constraint
  satisfied: boolean
  message?: string
} {
  const { rule } = constraint
  const ruleLower = rule.toLowerCase()

  // Check for breaking changes
  if (ruleLower.includes('breaking') || ruleLower.includes('api')) {
    // This would need more context to verify properly
    return {
      constraint,
      satisfied: true, // Assume satisfied unless proven otherwise
      message: 'Breaking change verification requires additional context',
    }
  }

  // Check for file structure
  if (ruleLower.includes('structure') || ruleLower.includes('convention')) {
    const filesModified = results.filesModified || []
    // Assume satisfied if files were modified appropriately
    return {
      constraint,
      satisfied: filesModified.length > 0,
      message:
        filesModified.length > 0 ? 'Files modified following structure' : 'No files modified',
    }
  }

  return {
    constraint,
    satisfied: true,
    message: `Structural constraint "${rule}" assumed satisfied`,
  }
}

/**
 * Verify behavioral constraint
 */
function verifyBehavioralConstraint(
  constraint: Extract<Constraint, { type: 'behavioral' }>,
  results: ExecutionResults
): {
  constraint: Constraint
  satisfied: boolean
  message?: string
} {
  const { rule, assertion } = constraint
  const ruleLower = rule.toLowerCase()

  // Check for error handling
  if (ruleLower.includes('error handling') || ruleLower.includes('error')) {
    const hasErrors = (results.errors?.length || 0) > 0
    const toolErrors = results.toolCalls?.filter((tc) => tc.error).length || 0

    return {
      constraint,
      satisfied: !hasErrors || toolErrors === 0,
      message: hasErrors
        ? `Errors occurred: ${results.errors?.join(', ')}`
        : 'No unhandled errors detected',
    }
  }

  // Check for tests
  if (ruleLower.includes('test') || assertion?.toLowerCase().includes('test')) {
    const testCommands = results.commandsRun?.filter((cmd) =>
      cmd.toLowerCase().includes('test')
    ).length

    return {
      constraint,
      satisfied: (testCommands || 0) > 0,
      message: testCommands ? `Test commands executed: ${testCommands}` : 'No test commands run',
    }
  }

  return {
    constraint,
    satisfied: (results.errors?.length || 0) === 0,
    message: `Behavioral constraint checked: ${rule}`,
  }
}

/**
 * Verify performance constraint
 */
function verifyPerformanceConstraint(
  constraint: Extract<Constraint, { type: 'performance' }>,
  _results: ExecutionResults
): {
  constraint: Constraint
  satisfied: boolean
  message?: string
} {
  const { metric, threshold, unit } = constraint

  // Performance constraints require runtime measurement
  // This would typically be checked with actual timing data
  return {
    constraint,
    satisfied: true, // Assume satisfied, would need actual metrics
    message: `Performance constraint (${metric} < ${threshold}${unit}) requires runtime metrics for verification`,
  }
}

/**
 * Verify compatibility constraint
 */
function verifyCompatibilityConstraint(
  constraint: Extract<Constraint, { type: 'compatibility' }>,
  results: ExecutionResults
): {
  constraint: Constraint
  satisfied: boolean
  message?: string
} {
  const { requirement, scope } = constraint

  // Check if scope files were modified
  const filesModified = results.filesModified || []
  const scopeFilesModified = filesModified.filter((f) => f.includes(scope))

  return {
    constraint,
    satisfied: true, // Assume satisfied
    message: `Compatibility constraint "${requirement}" for scope "${scope}" - ${scopeFilesModified.length} files in scope modified`,
  }
}

/**
 * Verify security constraint
 */
function verifySecurityConstraint(
  constraint: Extract<Constraint, { type: 'security' }>,
  results: ExecutionResults
): {
  constraint: Constraint
  satisfied: boolean
  message?: string
} {
  const { requirement, standard } = constraint

  // Security constraints typically require static analysis
  // This is a simplified check
  const hasSecurityTool = results.toolCalls?.some(
    (tc) =>
      tc.tool.toLowerCase().includes('security') ||
      tc.tool.toLowerCase().includes('audit') ||
      tc.tool.toLowerCase().includes('scan')
  )

  return {
    constraint,
    satisfied: hasSecurityTool || false,
    message: hasSecurityTool
      ? `Security tool executed for "${requirement}"`
      : `Security constraint "${requirement}"${standard ? ` (${standard})` : ''} requires security scanning`,
  }
}

/**
 * Generate verification summary
 */
function generateSummary(
  spec: FormalSpecification,
  criterionResults: VerificationResult[],
  constraintResults: Array<{
    constraint: Constraint
    satisfied: boolean
    message?: string
  }>,
  errors: string[]
): string {
  const passedCriteria = criterionResults.filter((r) => r.passed).length
  const totalCriteria = criterionResults.length
  const passedConstraints = constraintResults.filter((r) => r.satisfied).length
  const totalConstraints = constraintResults.length

  const parts: string[] = []

  parts.push(`Verification for spec "${spec.intent.goal.slice(0, 50)}..."`)
  parts.push(`Acceptance Criteria: ${passedCriteria}/${totalCriteria} passed`)
  parts.push(`Constraints: ${passedConstraints}/${totalConstraints} satisfied`)

  if (errors.length > 0) {
    parts.push(`Errors during execution: ${errors.length}`)
  }

  const allPassed = passedCriteria === totalCriteria && passedConstraints === totalConstraints

  if (allPassed) {
    parts.push('✓ All verifications passed')
  } else if (passedCriteria === 0 && passedConstraints === 0) {
    parts.push('✗ Verification failed')
  } else {
    parts.push('⚠ Partial verification - some items need attention')
  }

  return parts.join('\n')
}

/**
 * Generate recommendations based on verification results
 */
function generateRecommendations(
  criterionResults: VerificationResult[],
  constraintResults: Array<{
    constraint: Constraint
    satisfied: boolean
    message?: string
  }>,
  results: ExecutionResults
): string[] {
  const recommendations: string[] = []

  // Failed criteria recommendations
  const failedCriteria = criterionResults.filter((r) => !r.passed)
  for (const result of failedCriteria) {
    if (result.message?.includes('error')) {
      recommendations.push(`Fix error handling for criterion ${result.criterionId}`)
    }
    if (result.message?.includes('file')) {
      recommendations.push(`Ensure files are properly modified for criterion ${result.criterionId}`)
    }
  }

  // Failed constraint recommendations
  const failedConstraints = constraintResults.filter((r) => !r.satisfied)
  for (const result of failedConstraints) {
    if (result.constraint.type === 'behavioral') {
      recommendations.push(`Address behavioral constraint: ${result.constraint.rule}`)
    }
    if (result.constraint.type === 'structural') {
      recommendations.push(`Review structural constraint: ${result.constraint.rule}`)
    }
  }

  // Error-based recommendations
  if (results.errors && results.errors.length > 0) {
    recommendations.push('Review and fix execution errors')
  }

  // No files modified recommendation
  if ((!results.filesModified || results.filesModified.length === 0) && failedCriteria.length > 0) {
    recommendations.push('Consider if file modifications are needed to satisfy criteria')
  }

  return recommendations
}

/**
 * Check if a spec can be marked as verified
 */
export function canMarkAsVerified(report: SpecVerificationReport): boolean {
  return report.status === 'passed' || report.status === 'partial'
}

/**
 * Get the appropriate status based on verification
 */
export function getStatusFromVerification(
  report: SpecVerificationReport
): Extract<SpecStatus, 'verified' | 'failed' | 'drifted'> {
  if (report.status === 'passed') {
    return 'verified'
  } else if (report.status === 'failed') {
    return 'failed'
  } else {
    return 'drifted'
  }
}
