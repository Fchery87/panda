import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('Project page state panel wiring', () => {
  test('passes StatePanel into ReviewPanel using the state panel view-model helper', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'page.tsx'), 'utf8')

    expect(source).toContain('<StatePanel')
    expect(source).toContain('stateContent={')
    expect(source).toContain('const statePanelViewModel = useMemo(() => {')
    expect(source).toContain('state={statePanelViewModel}')
  })
})
