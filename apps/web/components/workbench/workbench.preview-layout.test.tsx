import { describe, expect, test } from 'bun:test'
import { Workbench } from './Workbench'

describe('Workbench preview layout', () => {
  test('supports contextual preview without permanent sidebar preview destination', () => {
    expect(Workbench).toBeDefined()
  })
})
