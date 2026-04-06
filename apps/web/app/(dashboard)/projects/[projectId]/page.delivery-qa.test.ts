import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('Project page QA wiring', () => {
  test('creates QA reports, queries latest QA by task, and renders QA using the panel view-model helper', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'page.tsx'), 'utf8')

    expect(source).toContain('createQaReportMutation')
    expect(source).toContain('api.qaReports.listByTask')
    expect(source).toContain('<QAPanel')
    expect(source).toContain('buildQAPanelViewModel({ activeTaskQaReport })')
  })
})
