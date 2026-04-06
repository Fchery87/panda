import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('RunProgressPanel delivery integration', () => {
  test('mounts the delivery status strip in the operational badge rail', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'RunProgressPanel.tsx'), 'utf8')

    expect(source).toContain("import { DeliveryStatusStrip } from './DeliveryStatusStrip'")
    expect(source).toContain('<DeliveryStatusStrip')
  })
})
