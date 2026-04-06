import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('Project page real browser QA wiring', () => {
  test('calls the QA route and persists the returned QA artifact instead of building only synthetic QA inline', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'page.tsx'), 'utf8')

    expect(source).toContain("fetch('/api/qa/run'")
    expect(source).toContain('await qaResponse.json()')
  })
})
