import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('Project page QA wiring', () => {
  test('renders QA using forge snapshot verification data', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'page.tsx'), 'utf8')

    expect(source).toContain('forgeProjectSnapshot?.verification.latestQa')
    expect(source).toContain('<QAPanel')
    expect(source).toContain('report={qaPanelViewModel}')
  })
})
