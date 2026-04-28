import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { RoutingConfirmation } from './RoutingConfirmation'
import type { ExecutionReceipt } from '@/lib/agent/receipt'

function makeReceipt(overrides: {
  confidence: 'high' | 'medium' | 'low'
  requestedMode?: string
  resolvedMode?: string
  rationale?: string
}): ExecutionReceipt {
  return {
    version: 1,
    mode: (overrides.resolvedMode ?? 'code') as ExecutionReceipt['mode'],
    requestedMode: (overrides.requestedMode ?? 'ask') as ExecutionReceipt['requestedMode'],
    resolvedMode: (overrides.resolvedMode ?? 'code') as ExecutionReceipt['resolvedMode'],
    agent: (overrides.resolvedMode ?? 'code') as ExecutionReceipt['agent'],
    routingDecision: {
      requestedMode: (overrides.requestedMode ?? 'ask') as 'ask',
      resolvedMode: (overrides.resolvedMode ?? 'code') as 'code',
      agent: (overrides.resolvedMode ?? 'code') as 'code',
      confidence: overrides.confidence,
      rationale: overrides.rationale ?? 'Test rationale',
      requiresApproval: false,
      webcontainerRequired: false,
      suggestedSkills: [],
      source: 'deterministic_rules',
    },
    contextSources: {
      filesConsidered: [],
      filesLoaded: [],
      filesExcluded: [],
      memoryBankIncluded: false,
      planIncluded: false,
      specIncluded: false,
      sessionSummaryIncluded: false,
      compactionOccurred: false,
      truncated: false,
    },
    webcontainer: {
      used: false,
      truncated: false,
      filesWritten: [],
      commandsRun: [],
    },
    nativeExecution: {
      filesRead: [],
      toolsUsed: [],
      approvalsRequested: [],
      truncated: false,
    },
    tokens: { input: 100, output: 50, cached: 0 },
    durationMs: 1000,
    resultStatus: 'complete',
  }
}

describe('RoutingConfirmation', () => {
  test('renders nothing for high confidence', () => {
    const html = renderToStaticMarkup(
      <RoutingConfirmation receipt={makeReceipt({ confidence: 'high' })} />
    )
    expect(html).toBe('')
  })

  test('renders for low confidence', () => {
    const html = renderToStaticMarkup(
      <RoutingConfirmation receipt={makeReceipt({ confidence: 'low' })} />
    )
    expect(html).toContain('low confidence')
    expect(html).toContain('Test rationale')
  })

  test('renders for medium confidence', () => {
    const html = renderToStaticMarkup(
      <RoutingConfirmation receipt={makeReceipt({ confidence: 'medium' })} />
    )
    expect(html).toContain('medium confidence')
  })

  test('shows routing direction', () => {
    const html = renderToStaticMarkup(
      <RoutingConfirmation
        receipt={makeReceipt({ confidence: 'low', requestedMode: 'ask', resolvedMode: 'code' })}
      />
    )
    expect(html).toContain('ask')
    expect(html).toContain('code')
  })

  test('shows accept button when callback provided', () => {
    const html = renderToStaticMarkup(
      <RoutingConfirmation receipt={makeReceipt({ confidence: 'low' })} onAccept={() => {}} />
    )
    expect(html).toContain('Accept')
  })

  test('shows override button when callback provided', () => {
    const html = renderToStaticMarkup(
      <RoutingConfirmation receipt={makeReceipt({ confidence: 'low' })} onOverride={() => {}} />
    )
    expect(html).toContain('Override')
  })

  test('hides buttons when no callbacks provided', () => {
    const html = renderToStaticMarkup(
      <RoutingConfirmation receipt={makeReceipt({ confidence: 'low' })} />
    )
    expect(html).not.toContain('Accept')
    expect(html).not.toContain('Override')
  })
})
