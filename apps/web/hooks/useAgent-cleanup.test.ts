import { describe, expect, test } from 'bun:test'
import path from 'node:path'
import { readFileSync } from 'node:fs'

describe('useAgent cleanup wiring', () => {
  test('does not abort active runs when stop callback identity changes', () => {
    const content = readFileSync(path.resolve(import.meta.dir, 'useAgent.ts'), 'utf-8')

    expect(content).toContain('const stopRef = useRef(stop)')
    expect(content).toContain('stopRef.current = stop')
    expect(content).toContain('stopRef.current()')
    expect(content).toContain('aborting the active Panda run even though the component is still mounted')
    expect(content).not.toContain('}, [stop, runEventBufferCleanup])')
  })
})
