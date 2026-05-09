import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('GitHub task branch flow', () => {
  test('createTaskBranch records a Panda working branch without changing base branch', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'githubConnections.ts'), 'utf8')
    const block = source.slice(
      source.indexOf('export const createTaskBranch'),
      source.indexOf('export const upsertConnectionForInstallation')
    )

    expect(block).toContain('buildTaskBranchName')
    expect(block).toContain('workingBranch,')
    expect(block).toContain('baseBranch: syncState.baseBranch')
    expect(block).not.toContain('baseBranch: workingBranch')
  })

  test('branch names are namespaced under panda', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'githubConnections.ts'), 'utf8')

    expect(source).toContain('function buildTaskBranchName')
    expect(source).toContain("return `panda/${slug || 'task'}-${timestamp}`")
  })
})
