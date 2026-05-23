import React from 'react'
import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { SubagentPanel } from './SubagentPanel'

describe('SubagentPanel persisted child run rendering', () => {
  test('renders persisted child run rows with status, activity, artifacts, and patch proposal previews', () => {
    const html = renderToStaticMarkup(
      <SubagentPanel
        persistedSubagents={[
          {
            id: 'child-1',
            name: 'researcher',
            status: 'running',
            summary: 'Inspect docs',
            lastActivity: 'now',
            artifactCount: 2,
            patchProposalCount: 1,
            patchProposals: [
              {
                kind: 'patch-proposal',
                title: 'Patch proposal 1',
                summary: 'Proposes changes to apps/web/foo.ts',
                files: ['apps/web/foo.ts'],
                patch: '--- a/apps/web/foo.ts\n+++ b/apps/web/foo.ts\n@@ -1 +1 @@\n-old\n+new',
              },
            ],
          },
        ]}
      />
    )

    expect(html).toContain('1 subagent')
    expect(html).toContain('researcher')
    expect(html).toContain('persisted')
    expect(html).toContain('Inspect docs')
    expect(html).toContain('active now')
    expect(html).toContain('2 artifacts')
    expect(html).toContain('1 patch proposals')
    expect(html).toContain('Patch proposal — parent review required')
    expect(html).toContain('Preview only; not applied automatically')
    expect(html).toContain('apps/web/foo.ts')
    expect(html).toContain('aria-label="running"')
  })

  test('renders failed persisted child diagnostics with structured error category', () => {
    const html = renderToStaticMarkup(
      <SubagentPanel
        persistedSubagents={[
          {
            id: 'child-failed',
            name: 'worker',
            status: 'failed',
            summary: 'Failed implementation',
            error: 'Permission denied',
            errorCategory: 'policy',
            lastActivity: 'now',
          },
        ]}
      />
    )

    expect(html).toContain('worker')
    expect(html).toContain('Failure category:')
    expect(html).toContain('policy')
    expect(html).toContain('aria-label="error"')
  })

  test('renders stopped persisted child runs as stopped, not completed', () => {
    const html = renderToStaticMarkup(
      <SubagentPanel
        persistedSubagents={[
          {
            id: 'child-stopped',
            name: 'worker',
            status: 'stopped',
            summary: 'Stopped implementation',
            lastActivity: '1h',
          },
        ]}
      />
    )

    expect(html).toContain('worker')
    expect(html).toContain('Stopped implementation')
    expect(html).toContain('aria-label="stopped"')
  })
})
