import type { RuntimeConfig } from './types'

/**
 * Default runtime configuration shared by the harness runtime constructor.
 *
 * Keeping the defaults outside runtime.ts makes behavior reviewable without
 * entering the orchestration engine and gives future config tests a focused
 * import seam.
 */
export const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = {
  maxIterations: 100,
  maxSteps: 50,
  maxToolCallsPerStep: 10,
  enableToolDeduplication: true,
  toolLoopThreshold: 3,
  contextCompactionThreshold: 0.9,
  enableSnapshots: true,
  snapshotFailureMode: 'warn',
  enableReasoning: true,
  maxSubagentDepth: 2,
  subagentDepth: 0,
  maxConcurrentSubagents: 4,
  maxConcurrentMutatingSubagents: 1,
  defaultSubagentIsolationMode: 'shared-readonly',
  availableSubagentIsolationModes: ['shared-readonly'],
  maxToolExecutionRetries: 0,
  toolRetryBackoffMs: 200,
  enableToolCallIdempotencyCache: false,
  toolExecutionTimeoutMs: 300000,
  specEngine: {
    enabled: true,
    autoApproveAmbient: true,
    maxSpecsPerProject: 100,
    enableDriftDetection: true,
  },
  streamIdleTimeoutMs: 120000,
  maxStreamRetries: 3,
  streamRetryBackoffMs: 2000,
}
