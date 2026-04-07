import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('Project page delivery lifecycle wiring', () => {
  test('queries the forge project snapshot and uses it as the primary review-state read model', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'page.tsx'), 'utf8')

    expect(source).toContain('api.forge.getProjectSnapshot')
    expect(source).toContain('forgeProjectSnapshot')
  })
})
