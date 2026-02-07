import { describe, expect, it } from 'bun:test'
import {
  isDeniedPath,
  toWorkspaceRelativePath,
  validateAstSearchRequest,
  validateTextSearchRequest,
} from './validate'

describe('search validate helpers', () => {
  it('normalizes workspace-relative paths', () => {
    expect(toWorkspaceRelativePath('./src/app.ts')).toBe('src/app.ts')
    expect(() => toWorkspaceRelativePath('../etc/passwd')).toThrow('Path escapes workspace')
  })

  it('detects denied paths', () => {
    expect(isDeniedPath('.git/config')).toBe(true)
    expect(isDeniedPath('node_modules/pkg/index.js')).toBe(true)
    expect(isDeniedPath('.env.local')).toBe(true)
    expect(isDeniedPath('src/index.ts')).toBe(false)
  })

  it('validates and clamps text search request', () => {
    const parsed = validateTextSearchRequest({
      type: 'text',
      query: 'hello',
      mode: 'regex',
      maxResults: 5000,
      maxMatchesPerFile: 1000,
      contextLines: 20,
      timeoutMs: 999999,
      paths: ['src', '.'],
    })

    expect(parsed.mode).toBe('regex')
    expect(parsed.maxResults).toBe(1000)
    expect(parsed.maxMatchesPerFile).toBe(200)
    expect(parsed.contextLines).toBe(3)
    expect(parsed.timeoutMs).toBe(15000)
    expect(parsed.paths).toEqual(['src', '.'])
  })

  it('requires non-empty text query', () => {
    expect(() => validateTextSearchRequest({ type: 'text', query: '' })).toThrow(
      'query is required'
    )
  })

  it('validates and defaults ast request', () => {
    const parsed = validateAstSearchRequest({
      type: 'ast',
      pattern: 'console.log($X)',
    })

    expect(parsed.pattern).toBe('console.log($X)')
    expect(parsed.jsonStyle).toBe('stream')
    expect(parsed.paths).toEqual(['.'])
  })

  it('rejects denied paths in requests', () => {
    expect(() =>
      validateTextSearchRequest({
        type: 'text',
        query: 'x',
        paths: ['.git'],
      })
    ).toThrow('Path is not searchable')
  })
})
