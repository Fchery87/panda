import { describe, expect, it } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { TabContainer } from './tab-container'

describe('TabContainer types', () => {
  it('exports TabContainer', async () => {
    const mod = await import('./tab-container')

    expect(mod.TabContainer).toBeDefined()
  })

  it('TabItem requires id, label, and content', async () => {
    await import('./tab-container')
    type TabItem = import('./tab-container').TabItem

    const tab: TabItem = {
      id: 'chat',
      label: 'Chat',
      content: null,
    }

    expect(tab.id).toBe('chat')
    expect(tab.label).toBe('Chat')
  })

  it('TabItem optionally accepts an icon', async () => {
    await import('./tab-container')
    type TabItem = import('./tab-container').TabItem

    const tab: TabItem = {
      id: 'preview',
      label: 'Preview',
      icon: 'eye-icon-placeholder',
      content: null,
    }

    expect(tab.icon).toBeDefined()
  })

  it('renders only the active tab content', () => {
    const html = renderToStaticMarkup(
      <TabContainer
        activeTab="run"
        tabs={[
          { id: 'run', label: 'Run', content: <div>run-content</div> },
          { id: 'artifacts', label: 'Artifacts', content: <div>artifact-content</div> },
          { id: 'evals', label: 'Evals', content: <div>eval-content</div> },
        ]}
      />
    )

    expect(html).toContain('run-content')
    expect(html).not.toContain('artifact-content')
    expect(html).not.toContain('eval-content')
  })
})
