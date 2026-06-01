import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(import.meta.dir, '..', '..', '..', '..')

function readRepoFile(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')
}

function compactMarkdown(value: string) {
  return value.replace(/\s+/g, ' ')
}

describe('implementation-first guardrails', () => {
  test('active architecture contract keeps current modes canonical and legacy labels compatibility-only', () => {
    const contract = readRepoFile('docs/ARCHITECTURE_CONTRACT.md')
    const compactContract = compactMarkdown(contract)

    expect(contract).toContain('The user-facing workflow has exactly three primary surfaces')
    expect(contract).toContain('| `Ask`')
    expect(contract).toContain('| `Plan`')
    expect(contract).toContain('| `Agent · Guided`')
    expect(contract).toContain('| `Agent · Autopilot`')
    expect(contract).toContain(
      'Runtime compatibility values remain `ask`, `plan`, `code`, and `build`'
    )
    expect(compactContract).toContain(
      'must not replace these surfaces or runtime values in current user-facing docs'
    )
    expect(compactContract).toContain('legacy stored values or internal agent names')
  })

  test('active docs keep planning sessions and Execution Session Shell as current owners', () => {
    const contract = readRepoFile('docs/ARCHITECTURE_CONTRACT.md')
    const context = readRepoFile('CONTEXT.md')
    const compactContract = compactMarkdown(contract)
    const compactContext = compactMarkdown(context)

    expect(contract).toContain('The planning session is the canonical planning workflow')
    expect(compactContract).toContain('Chat-level plan fields are compatibility mirrors only')
    expect(context).toContain(
      'Use `Execution Session Shell` for the implemented workspace structure'
    )
    expect(compactContext).toContain(
      'Use `Chat-First Workbench` only for the broader product principle'
    )
  })

  test('tracked compatibility guardrails preserve-before-delete decisions', () => {
    const contract = readRepoFile('docs/ARCHITECTURE_CONTRACT.md')
    const schema = readRepoFile('convex/schema.ts')
    const compactContract = compactMarkdown(contract)

    expect(schema).toContain('export const StoredChatMode')
    expect(schema).toContain("v.literal('architect')")
    expect(schema).toContain("v.literal('discuss')")
    expect(schema).toContain("v.literal('debug')")
    expect(schema).toContain("v.literal('review')")
    expect(compactContract).toContain('legacy stored values or internal agent names')
    expect(compactContract).toContain(
      'Do not present `architect`, `discuss`, `debug`, or `review` as current top-level user-facing modes'
    )
    expect(compactContract).toContain('Chat-level plan fields are compatibility mirrors only')
    expect(compactContract).toContain('must not become the primary source')
    expect(compactContract).toContain('Execution Session Shell')
  })

  test('delivery handoff policy keeps deployment external and GitHub review explicit', () => {
    const policy = readRepoFile('docs/DELIVERY_HANDOFF_POLICY.md')
    const docsIndex = readRepoFile('docs/README.md')
    const compactPolicy = compactMarkdown(policy)

    expect(policy).toContain('Panda keeps hosted deployment external for now')
    expect(compactPolicy).toContain('create a task branch, review changes, commit')
    expect(compactPolicy).toContain('confirm push, draft a pull request')
    expect(compactPolicy).toContain('Export must not become a parallel deployment system')
    expect(compactPolicy).toContain('Do not add a separate deployment wizard')
    expect(docsIndex).toContain('docs/DELIVERY_HANDOFF_POLICY.md')
    expect(docsIndex).toContain(
      'Current boundary for deployment, export, and review handoff decisions'
    )
  })

  test('docs index labels authority, historical, proposed, and completed records', () => {
    const docsIndex = readRepoFile('docs/README.md')
    const contract = readRepoFile('docs/ARCHITECTURE_CONTRACT.md')
    const compactIndex = compactMarkdown(docsIndex)
    const compactContract = compactMarkdown(contract)

    expect(docsIndex).toContain('## Status Labels')
    expect(docsIndex).toContain('## Active Authority And Current Guides')
    expect(docsIndex).toContain('## Historical And Planning Records')
    expect(compactIndex).toContain('Active authority: current contracts')
    expect(compactIndex).toContain('Historical record: useful context, not current authority')
    expect(compactIndex).toContain('Proposed plan: not current implementation')
    expect(compactIndex).toContain('Completed milestone: implementation evidence')
    expect(compactIndex).toContain('Date-stamped planning records; historical by default')
    expect(compactContract).toContain('The docs index labels documents as active authority')
  })
})
