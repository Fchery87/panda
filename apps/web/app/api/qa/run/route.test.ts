import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('QA run route wiring', () => {
  test('uses the browser QA executor and runs on the Node runtime', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'route.ts'), 'utf8')

    expect(source).toContain("export const runtime = 'nodejs'")
    expect(source).toContain('runBrowserQa(')
    expect(source).toContain('buildBrowserQaRunInput(')
  })

  test('passes optional baseUrl through to the executor and normalizes the browser result', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'route.ts'), 'utf8')

    expect(source).toContain('baseUrl?: string')
    expect(source).toContain('baseUrl: body.baseUrl')
    expect(source).toContain('normalizeBrowserQaResult(result)')
  })
})
