import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { BrowserSessionPanel } from './BrowserSessionPanel'

describe('BrowserSessionPanel', () => {
  test('renders session status, base URL, route coverage, and lease metadata', () => {
    const html = renderToStaticMarkup(
      <BrowserSessionPanel
        session={{
          browserSessionKey: 'browser-session::project_1::local',
          status: 'ready',
          environment: 'local',
          baseUrl: 'http://localhost:3000',
          lastRoutesTested: ['/projects/[projectId]'],
          leaseOwner: 'qa-worker',
          leaseExpiresAt: 31_000,
          updatedAt: 1_000,
        }}
      />
    )

    expect(html).toContain('Browser session')
    expect(html).toContain('browser-session::project_1::local')
    expect(html).toContain('Status ready')
    expect(html).toContain('http://localhost:3000')
    expect(html).toContain('/projects/[projectId]')
    expect(html).toContain('qa-worker')
  })

  test('renders empty state when no browser session exists', () => {
    const html = renderToStaticMarkup(<BrowserSessionPanel session={null} />)

    expect(html).toContain('No browser session')
    expect(html).toContain('Persistent QA session metadata will appear here')
  })
})
