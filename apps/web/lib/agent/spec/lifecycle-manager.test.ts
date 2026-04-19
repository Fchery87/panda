import { describe, expect, test } from 'bun:test'
import { createSpecEngine } from './engine'
import { DefaultSpecLifecycleManager } from './lifecycle-manager'

describe('DefaultSpecLifecycleManager', () => {
  test('delegates to the wrapped spec engine', async () => {
    const engine = createSpecEngine({ enabled: true })
    const manager = new DefaultSpecLifecycleManager(engine)

    expect(manager.isEnabled()).toBe(true)

    const classification = await manager.classify('Build a notification system', { mode: 'build' })
    expect(classification.tier).toBeTruthy()

    const { spec } = await manager.generate('Add validation', { mode: 'code' }, 'ambient')
    const validation = await manager.validate(spec)

    expect(spec.id).toBeTruthy()
    expect(validation).toBeDefined()
  })
})
