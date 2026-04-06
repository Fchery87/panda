import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { DeliveryStatusStrip } from './DeliveryStatusStrip'

describe('DeliveryStatusStrip', () => {
  test('renders phase, role, task, gate badges, and evidence warning', () => {
    const html = renderToStaticMarkup(
      <DeliveryStatusStrip
        currentPhase="execute"
        activeRole="manager"
        currentTaskTitle="Introduce canonical delivery state"
        reviewGateStatus="pending"
        qaGateStatus="passed"
        shipGateStatus="not_required"
        evidenceMissing={true}
      />
    )

    expect(html).toContain('Phase execute')
    expect(html).toContain('Role manager')
    expect(html).toContain('Task Introduce canonical delivery state')
    expect(html).toContain('Review pending')
    expect(html).toContain('QA passed')
    expect(html).toContain('Evidence missing')
  })

  test('renders ship readiness when a ship gate is present', () => {
    const html = renderToStaticMarkup(
      <DeliveryStatusStrip
        currentPhase="ship"
        activeRole="executive"
        currentTaskTitle="Implement delivery closure"
        reviewGateStatus="passed"
        qaGateStatus="passed"
        shipGateStatus="passed"
        evidenceMissing={false}
      />
    )

    expect(html).toContain('Ship passed')
  })

  test('returns null when no current task or phase context exists', () => {
    const html = renderToStaticMarkup(
      <DeliveryStatusStrip
        currentPhase={null}
        activeRole={null}
        currentTaskTitle={null}
        reviewGateStatus="not_required"
        qaGateStatus="not_required"
        shipGateStatus="not_required"
        evidenceMissing={false}
      />
    )

    expect(html).toBe('')
  })
})
