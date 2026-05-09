import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('GitHub project shell summary', () => {
  test('summary query returns bounded GitHub delivery state', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'githubConnections.ts'), 'utf8')
    const block = source.slice(
      source.indexOf('export const getProjectShellSummary'),
      source.indexOf('export const upsertConnectionForInstallation')
    )

    expect(block).toContain('repositoryFullName')
    expect(block).toContain('syncStatus')
    expect(block).toContain('pendingChanges')
    expect(block).toContain('pullRequestStatus')
    expect(block).not.toContain('body: pullRequest')
  })

  test('top bar prefers GitHub summary over local git status for repo label', () => {
    const source = fs.readFileSync(
      path.resolve(import.meta.dir, '../apps/web/components/workbench/WorkbenchTopBar.tsx'),
      'utf8'
    )

    expect(source).toContain('githubShellSummary')
    expect(source).toContain('PR ${githubShellSummary.pullRequestStatus}')
    expect(source).toContain('gitStatus')
  })
})
