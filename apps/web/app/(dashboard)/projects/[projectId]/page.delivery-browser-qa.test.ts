import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('Project page real browser QA wiring', () => {
  test('calls the QA route with Forge session metadata and persists the returned browser session key', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'page.tsx'), 'utf8')

    expect(source).toContain("fetch('/api/qa/run'")
    expect(source).toContain('await qaResponse.json()')
    expect(source).toContain('filesInScope: activeDeliveryTask.filesInScope')
    expect(source).toContain('existingSession: forgeProjectSnapshot?.browserQa.activeSession')
    expect(source).toContain('browserSessionKey: qaPayload.browserSessionKey')
  })
})
