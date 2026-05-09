import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('GitHub-backed source control read model', () => {
  test('source control pane reads project GitHub sync state before local git fallback', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'SourceControlPane.tsx'), 'utf8')

    expect(source).toContain('api.githubConnections.getProjectSyncState')
    expect(source).toContain('if (githubState?.repository)')
    expect(source).toContain('GitHubSourceControlState')
    expect(source).toContain('GitHub working copy is clean')
  })
})
