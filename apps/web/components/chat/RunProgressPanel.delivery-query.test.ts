import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('RunProgressPanel delivery query wiring', () => {
  test('reads the Forge snapshot for the current chat and maps it into strip props', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'RunProgressPanel.tsx'), 'utf8')

    expect(source).toContain('api.forge.getProjectSnapshot')
    expect(source).toContain('mapDeliveryStateToStatusStripProps(')
    expect(source).not.toContain('api.deliveryStates.getActiveByChat')
  })
})
