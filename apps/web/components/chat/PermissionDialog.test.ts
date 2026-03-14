import { describe, expect, test } from 'bun:test'
import path from 'node:path'

describe('PermissionDialog', () => {
  test('uses shared permission presentation copy for browser-facing labels', async () => {
    const fs = await import('node:fs')
    const componentPath = path.resolve(import.meta.dir, 'PermissionDialog.tsx')
    const content = fs.readFileSync(componentPath, 'utf-8')

    expect(content).toContain("from '@/lib/agent/permission-presentation'")
    expect(content).toContain('const presentation = describePermissionRequest(request.request)')
    expect(content).toContain('{presentation.title}')
    expect(content).toContain('{presentation.summary}')
  })
})
