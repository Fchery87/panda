import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { ReviewPanel } from './ReviewPanel'

describe('ReviewPanel', () => {
  test('renders run, plan, artifacts, memory, and eval review tabs', () => {
    const html = renderToStaticMarkup(
      <ReviewPanel
        activeTab="run"
        onTabChange={() => {}}
        runContent={<div>run</div>}
        planContent={<div>plan</div>}
        artifactsContent={<div>artifacts</div>}
        memoryContent={<div>memory</div>}
        evalsContent={<div>evals</div>}
      />
    )

    expect(html).toContain('Run')
    expect(html).toContain('Plan')
    expect(html).toContain('Artifacts')
    expect(html).toContain('Memory')
    expect(html).toContain('Evals')
  })
})
