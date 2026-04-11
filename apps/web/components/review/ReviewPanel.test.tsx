import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { ReviewPanel } from './ReviewPanel'

describe('ReviewPanel', () => {
  test('renders tasks, run, plan, artifacts, memory, evals, qa, state, browser, activity, and decisions review tabs', () => {
    const html = renderToStaticMarkup(
      <ReviewPanel
        taskContent={<div>tasks</div>}
        activeTab="run"
        onTabChange={() => {}}
        runContent={<div>run</div>}
        planContent={<div>plan</div>}
        artifactsContent={<div>artifacts</div>}
        memoryContent={<div>memory</div>}
        evalsContent={<div>evals</div>}
        qaContent={<div>qa</div>}
        stateContent={<div>state</div>}
        browserContent={<div>browser</div>}
        activityContent={<div>activity</div>}
        decisionsContent={<div>decisions</div>}
      />
    )

    expect(html).toContain('Tasks')
    expect(html).toContain('Run')
    expect(html).toContain('Plan')
    expect(html).toContain('Artifacts')
    expect(html).toContain('Memory')
    expect(html).toContain('Evals')
    expect(html).toContain('QA')
    expect(html).toContain('State')
    expect(html).toContain('Browser')
    expect(html).toContain('Activity')
    expect(html).toContain('Decisions')
    expect(html).toContain('Planning intake')
    expect(html).toContain('Open the project chat inspector to continue the guided intake flow.')
    expect(html).not.toContain('Start intake')
  })
})
