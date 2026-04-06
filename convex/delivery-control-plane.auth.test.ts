import { describe, expect, it } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('delivery control-plane authz and transition enforcement', () => {
  it('guards delivery state and task access through project and chat ownership', () => {
    const deliveryStatesSource = fs.readFileSync(
      path.resolve(import.meta.dir, 'deliveryStates.ts'),
      'utf8'
    )
    const deliveryTasksSource = fs.readFileSync(
      path.resolve(import.meta.dir, 'deliveryTasks.ts'),
      'utf8'
    )

    expect(deliveryStatesSource).toContain('requireChatOwner')
    expect(deliveryStatesSource).toContain('requireProjectOwner')
    expect(deliveryTasksSource).toContain('requireProjectOwner')

    expect(deliveryStatesSource).toContain("throw new Error('Delivery state not found')")
    expect(deliveryTasksSource).toContain("throw new Error('Delivery task not found')")
  })

  it('uses transition helper guards rather than ad-hoc status patching', () => {
    const deliveryStatesSource = fs.readFileSync(
      path.resolve(import.meta.dir, 'deliveryStates.ts'),
      'utf8'
    )
    const deliveryTasksSource = fs.readFileSync(
      path.resolve(import.meta.dir, 'deliveryTasks.ts'),
      'utf8'
    )

    expect(deliveryStatesSource).toContain('transitionDeliveryStatePhase(')
    expect(deliveryTasksSource).toContain('transitionDeliveryTaskRecord(')
    expect(deliveryTasksSource).toContain('attachTaskEvidence(')
  })
})
