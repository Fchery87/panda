import { describe, expect, test } from 'bun:test'

import type { ExecutionReceipt } from './receipt'
import { projectRunForSurface, type RunProjectionFact } from './run-projection'

function fact(overrides: Partial<RunProjectionFact>): RunProjectionFact {
  return {
    id: overrides.id ?? 'fact-1',
    type: overrides.type ?? 'progress_step',
    content: overrides.content ?? 'Updated files',
    status: overrides.status ?? 'completed',
    createdAt: overrides.createdAt ?? 1,
    progressCategory: overrides.progressCategory ?? 'tool',
    progressToolName: overrides.progressToolName,
    toolCallId: overrides.toolCallId,
    targetFilePaths: overrides.targetFilePaths,
    args: overrides.args,
    output: overrides.output,
    error: overrides.error,
  }
}

function receipt(overrides: Partial<ExecutionReceipt> = {}): ExecutionReceipt {
  return {
    version: 1,
    mode: 'code',
    requestedMode: 'code',
    resolvedMode: 'code',
    agent: 'code',
    routingDecision: {
      requestedMode: 'code',
      resolvedMode: 'code',
      agent: 'code',
      source: 'deterministic_rules',
      confidence: 'high',
      rationale: 'Code change requested.',
      requiresApproval: false,
      webcontainerRequired: false,
      suggestedSkills: [],
    },
    providerModel: 'test:model',
    contextSources: {
      filesConsidered: [],
      filesLoaded: [],
      filesExcluded: [],
      memoryBankIncluded: false,
      specIncluded: false,
      planIncluded: false,
      sessionSummaryIncluded: false,
      compactionOccurred: false,
      truncated: false,
    },
    webcontainer: {
      used: true,
      filesWritten: ['apps/web/a.tsx'],
      commandsRun: [{ command: 'bun test', redacted: false }],
      truncated: false,
    },
    nativeExecution: {
      filesRead: [],
      toolsUsed: ['write_files'],
      approvalsRequested: [],
      truncated: false,
    },
    tokens: { input: 1, output: 2, cached: 0 },
    durationMs: 3,
    resultStatus: 'complete',
    ...overrides,
  }
}

describe('projectRunForSurface', () => {
  test('returns bounded chat summaries without raw tool args or output', () => {
    const projection = projectRunForSurface({
      surface: 'chat',
      facts: [
        fact({
          id: 'tool-call',
          type: 'tool_call',
          content: 'Calling write_files',
          progressToolName: 'write_files',
          args: { files: [{ path: 'secret.ts', content: 'private source' }] },
        }),
        fact({
          id: 'tool-result',
          type: 'tool_result',
          content: 'Wrote file',
          progressToolName: 'write_files',
          output: 'private source',
          targetFilePaths: ['apps/web/a.tsx'],
          createdAt: 2,
        }),
      ],
      receipt: receipt(),
    })

    expect(projection.surface).toBe('chat')
    expect(projection.items.length).toBeGreaterThan(0)
    expect(JSON.stringify(projection)).not.toContain('private source')
    expect(JSON.stringify(projection)).not.toContain('secret.ts')
    expect(projection.items.every((item) => item.detail === undefined)).toBe(true)
  })

  test('allows proof detail while keeping public projections redacted', () => {
    const facts = [
      fact({
        id: 'tool-result',
        type: 'tool_result',
        content: 'Command completed',
        progressToolName: 'run_command',
        output: 'full command output',
        error: 'stack trace excerpt',
        createdAt: 2,
      }),
    ]

    const proof = projectRunForSurface({ surface: 'proof', facts, receipt: receipt() })
    const publicShare = projectRunForSurface({ surface: 'public_share', facts, receipt: receipt() })

    expect(JSON.stringify(proof)).toContain('stack trace excerpt')
    expect(JSON.stringify(publicShare)).not.toContain('full command output')
    expect(JSON.stringify(publicShare)).not.toContain('stack trace excerpt')
    expect(publicShare.items.every((item) => item.source !== 'tool_call')).toBe(true)
  })
})
