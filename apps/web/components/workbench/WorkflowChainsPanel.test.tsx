import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { ActiveWorkflowChains, WorkflowChainsList } from './WorkflowChainsPanel'

describe('WorkflowChainsList', () => {
  test('renders chain templates and step badges', () => {
    const html = renderToStaticMarkup(<WorkflowChainsList />)

    expect(html).toContain('Research to Plan')
    expect(html).toContain('Full Feature Build')
    expect(html).toContain('Bug Investigation')
    expect(html).toContain('Start')
  })

  test('renders active chain progress', () => {
    const html = renderToStaticMarkup(
      <ActiveWorkflowChains
        chains={[
          {
            _id: 'chain_1',
            chainId: 'research-to-plan',
            label: 'Research to Plan',
            userGoal: 'Improve reliability',
            status: 'running',
            currentStepId: 'research',
            steps: [
              {
                id: 'research',
                label: 'Research',
                stage: 'research',
                mode: 'ask',
                status: 'running',
              },
              { id: 'plan', label: 'Plan', stage: 'plan', mode: 'plan', status: 'pending' },
            ],
          },
        ]}
      />
    )

    expect(html).toContain('Active chains')
    expect(html).toContain('Research to Plan')
    expect(html).toContain('Research')
    expect(html).toContain('running')
  })
})
