import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('GitHub confirmed push flow', () => {
  test('confirmPushBranch requires explicit confirmation before marking pushed', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'githubConnections.ts'), 'utf8')
    const block = source.slice(
      source.indexOf('export const confirmPushBranch'),
      source.indexOf('export const getLatestCommitForProject')
    )

    expect(block).toContain('confirmed: v.boolean()')
    expect(block).toContain('if (!args.confirmed)')
    expect(block).toContain('Push requires explicit confirmation')
    expect(block).toContain('pushedAt: now')
  })

  test('source control panel has a separate push confirmation step', () => {
    const source = fs.readFileSync(
      path.resolve(import.meta.dir, '../apps/web/components/sidebar/SourceControlPane.tsx'),
      'utf8'
    )

    expect(source).toContain('showPushConfirm')
    expect(source).toContain('Confirm Push')
    expect(source).toContain('This will write the Panda branch to GitHub')
  })
})
