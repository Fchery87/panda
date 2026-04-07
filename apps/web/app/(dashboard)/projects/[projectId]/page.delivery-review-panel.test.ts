import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('Project page review artifact visibility wiring', () => {
  test('uses forge snapshot review, activity, browser, and decision data in ReviewPanel', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'page.tsx'), 'utf8')

    expect(source).toContain('browserContent={')
    expect(source).toContain('activityContent={')
    expect(source).toContain('decisionsContent={')
    expect(source).toContain('<BrowserSessionPanel')
    expect(source).toContain('<ActivityTimelinePanel')
    expect(source).toContain('<DecisionPanel')
  })
})
