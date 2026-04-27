import { describe, expect, test } from 'bun:test'

import type { RoutingDecision } from './routing'
import { buildExecutionReceipt } from './receipt'

const routingDecision: RoutingDecision = {
  requestedMode: 'ask',
  resolvedMode: 'code',
  agent: 'code',
  confidence: 'high',
  rationale: 'The request asks for a concrete code change.',
  requiresApproval: false,
  webcontainerRequired: false,
  suggestedSkills: [],
  source: 'deterministic_rules',
}

describe('buildExecutionReceipt', () => {
  test('builds a bounded redacted receipt from run events', () => {
    const receipt = buildExecutionReceipt({
      routingDecision,
      providerModel: 'openai:gpt-4o',
      contextSources: {
        filesConsidered: [{ path: 'apps/web/app/page.tsx', relevanceScore: 0.8 }],
        filesLoaded: [{ path: 'apps/web/app/page.tsx', tokenCount: 120 }],
        filesExcluded: [],
        memoryBankIncluded: true,
        specIncluded: false,
        planIncluded: false,
        sessionSummaryIncluded: false,
        compactionOccurred: false,
        truncated: false,
      },
      runEvents: [
        {
          type: 'tool_call',
          toolName: 'read_files',
          args: { paths: ['apps/web/app/page.tsx'] },
        },
        {
          type: 'tool_call',
          toolName: 'run_command',
          args: { command: 'API_KEY=secret bun test apps/web/app/page.test.ts' },
        },
      ],
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15, cacheRead: 2 },
      startedAt: 100,
      completedAt: 175,
      resultStatus: 'complete',
      webcontainer: { used: true },
    })

    expect(receipt.version).toBe(1)
    expect(receipt.requestedMode).toBe('ask')
    expect(receipt.resolvedMode).toBe('code')
    expect(receipt.contextSources.memoryBankIncluded).toBe(true)
    expect(receipt.nativeExecution.filesRead).toEqual(['apps/web/app/page.tsx'])
    expect(receipt.webcontainer.used).toBe(true)
    expect(receipt.webcontainer.commandsRun).toEqual([
      { command: 'API_KEY=[REDACTED] bun test apps/web/app/page.test.ts', redacted: true },
    ])
    expect(receipt.tokens).toEqual({ input: 10, output: 5, cached: 2 })
    expect(receipt.durationMs).toBe(75)
  })

  test('bounds command and native tool summaries while preserving redaction flags', () => {
    const receipt = buildExecutionReceipt({
      routingDecision,
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
      runEvents: Array.from({ length: 55 }, (_, index) => ({
        type: 'tool_call',
        toolName: index % 2 === 0 ? 'run_command' : `tool_${index}`,
        args:
          index % 2 === 0
            ? { command: `SECRET_TOKEN=value-${index} bun test ${index}` }
            : undefined,
      })),
      startedAt: 100,
      completedAt: 100,
      resultStatus: 'error',
      webcontainer: { used: false, unavailableReason: 'unsupported' },
    })

    expect(receipt.webcontainer.commandsRun.length).toBeLessThanOrEqual(50)
    expect(receipt.webcontainer.commandsRun[0]).toEqual({
      command: 'SECRET_TOKEN=[REDACTED] bun test 0',
      redacted: true,
    })
    expect(receipt.nativeExecution.toolsUsed.length).toBeLessThanOrEqual(50)
    expect(receipt.nativeExecution.truncated).toBe(true)
    expect(receipt.resultStatus).toBe('error')
  })

  test('redacts common CLI secret flag and bearer token forms in command summaries', () => {
    const receipt = buildExecutionReceipt({
      routingDecision,
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
      runEvents: [
        {
          type: 'tool_call',
          toolName: 'run_command',
          args: {
            command:
              'curl -H "Authorization: Bearer sk-live" --api-key secret-token --password hunter2 https://example.test',
          },
        },
      ],
      startedAt: 100,
      completedAt: 100,
      resultStatus: 'complete',
      webcontainer: { used: false },
    })

    expect(receipt.webcontainer.commandsRun).toEqual([
      {
        command:
          'curl -H "Authorization: Bearer [REDACTED]" --api-key [REDACTED] --password [REDACTED] https://example.test',
        redacted: true,
      },
    ])
  })

  test('bounds context audit arrays and marks truncated receipts', () => {
    const receipt = buildExecutionReceipt({
      routingDecision,
      contextSources: {
        filesConsidered: Array.from({ length: 55 }, (_, index) => ({
          path: `apps/web/file-${index}.ts`,
          relevanceScore: index / 100,
        })),
        filesLoaded: Array.from({ length: 55 }, (_, index) => ({
          path: `apps/web/loaded-${index}.ts`,
          tokenCount: index,
        })),
        filesExcluded: Array.from({ length: 55 }, (_, index) => ({
          path: `apps/web/excluded-${index}.ts`,
          reason: 'budget' as const,
        })),
        memoryBankIncluded: false,
        specIncluded: false,
        planIncluded: false,
        sessionSummaryIncluded: false,
        compactionOccurred: false,
        truncated: false,
      },
      runEvents: [],
      startedAt: 100,
      completedAt: 100,
      resultStatus: 'complete',
      webcontainer: { used: false },
    })

    expect(receipt.contextSources.filesConsidered).toHaveLength(50)
    expect(receipt.contextSources.filesLoaded).toHaveLength(50)
    expect(receipt.contextSources.filesExcluded).toHaveLength(50)
    expect(receipt.contextSources.truncated).toBe(true)
  })

  test('does not attribute artifact target paths to WebContainer file writes by default', () => {
    const receipt = buildExecutionReceipt({
      routingDecision,
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
      runEvents: [
        {
          type: 'progress_step',
          toolName: 'write_files',
          targetFilePaths: ['apps/web/app/page.tsx'],
        },
      ],
      startedAt: 100,
      completedAt: 100,
      resultStatus: 'complete',
      webcontainer: { used: false },
    })

    expect(receipt.webcontainer.used).toBe(false)
    expect(receipt.webcontainer.filesWritten).toEqual([])
  })

  test('maps permission approval events into native execution approval audit records', () => {
    const receipt = buildExecutionReceipt({
      routingDecision,
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
      runEvents: [
        {
          type: 'approval_decision',
          toolName: 'run_command',
          status: 'approved',
          content: 'User approved command execution',
          createdAt: 123,
        },
      ],
      startedAt: 100,
      completedAt: 100,
      resultStatus: 'complete',
      webcontainer: { used: false },
    })

    expect(receipt.nativeExecution.approvalsRequested).toEqual([
      {
        tool: 'run_command',
        decision: 'approved',
        reason: 'User approved command execution',
        timestamp: 123,
      },
    ])
  })
})
