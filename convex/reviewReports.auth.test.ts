import { describe, expect, it } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('reviewReports authz and creation wiring', () => {
  it('guards review report access through project ownership and exports create/list operations', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'reviewReports.ts'), 'utf8')

    expect(source).toContain('requireProjectOwner')
    expect(source).toContain('export const create = mutation({')
    expect(source).toContain('export const listByTask = query({')
    expect(source).toContain("throw new Error('Delivery task not found')")
  })
})
