import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('GitHub-backed project creation contract', () => {
  test('createFromGitHubRepository verifies connection ownership and imports bounded files', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'projects.ts'), 'utf8')
    const block = source.slice(
      source.indexOf('export const createFromGitHubRepository'),
      source.indexOf('// update (mutation)')
    )

    expect(block).toContain('const connection = await ctx.db.get(args.repository.connectionId)')
    expect(block).toContain('connection.userId !== userId')
    expect(block).toContain('MAX_INITIAL_GITHUB_FILES')
    expect(block).toContain("await ctx.db.insert('files'")
    expect(block).toContain('githubRepository: {')
    expect(block).toContain('repoUrl: args.repository.htmlUrl')
  })
})
