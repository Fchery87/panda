import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ExecutionReceipt } from '@/lib/agent/receipt'
import { RunReceiptPanel } from './RunReceiptPanel'

const receipt: ExecutionReceipt = {
  version: 1,
  mode: 'code',
  requestedMode: 'ask',
  resolvedMode: 'code',
  agent: 'code',
  routingDecision: {
    requestedMode: 'ask',
    resolvedMode: 'code',
    agent: 'code',
    confidence: 'high',
    rationale: 'The request asks for a concrete code change.',
    requiresApproval: false,
    webcontainerRequired: false,
    suggestedSkills: ['react-best-practices'],
    source: 'deterministic_rules',
  },
  providerModel: 'openai:gpt-4o',
  contextSources: {
    filesConsidered: [{ path: 'apps/web/app/page.tsx', relevanceScore: 0.8 }],
    filesLoaded: [{ path: 'apps/web/app/page.tsx', tokenCount: 120 }],
    filesExcluded: [],
    memoryBankIncluded: true,
    specIncluded: false,
    planIncluded: true,
    sessionSummaryIncluded: false,
    compactionOccurred: false,
    truncated: false,
  },
  webcontainer: {
    used: true,
    filesWritten: ['apps/web/app/page.tsx'],
    commandsRun: [{ command: 'API_KEY=[REDACTED] bun test', redacted: true }],
    truncated: false,
  },
  nativeExecution: {
    filesRead: ['apps/web/app/page.tsx'],
    toolsUsed: ['read_files', 'run_command'],
    approvalsRequested: [],
    truncated: false,
  },
  tokens: { input: 10, output: 5, cached: 2 },
  durationMs: 75,
  resultStatus: 'complete',
}

describe('RunReceiptPanel', () => {
  test('renders routing, context, execution, token, and result receipt sections', () => {
    const html = renderToStaticMarkup(<RunReceiptPanel receipt={receipt} />)

    expect(html).toContain('Execution receipt')
    expect(html).toContain('ask -&gt; code')
    expect(html).toContain('high confidence')
    expect(html).toContain('Context')
    expect(html).toContain('1 considered')
    expect(html).toContain('WebContainer')
    expect(html).toContain('API_KEY=[REDACTED] bun test')
    expect(html).toContain('Native tools')
    expect(html).toContain('Tokens')
    expect(html).toContain('complete')
  })

  test('renders a legacy empty state when no receipt exists', () => {
    const html = renderToStaticMarkup(<RunReceiptPanel receipt={null} />)

    expect(html).toContain('No execution receipt yet')
    expect(html).toContain('Legacy runs and in-flight runs may not have canonical receipts.')
  })
})
