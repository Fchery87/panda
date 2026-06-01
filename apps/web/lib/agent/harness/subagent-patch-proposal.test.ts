import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const runtimeSource = readFileSync(join(import.meta.dir, 'runtime.ts'), 'utf8')
const typesSource = readFileSync(join(import.meta.dir, 'types.ts'), 'utf8')
const useAgentSource = readFileSync(join(import.meta.dir, '../../../hooks/useAgent.ts'), 'utf8')
const inspectorSource = readFileSync(
  join(import.meta.dir, '../../../components/chat/inspector/InspectorRunContent.tsx'),
  'utf8'
)
const panelSource = readFileSync(
  join(import.meta.dir, '../../../components/chat/SubagentPanel.tsx'),
  'utf8'
)

describe('subagent patch-proposal artifact flow', () => {
  test('adds patch proposal artifacts to harness subagent summaries', () => {
    expect(typesSource).toContain('export interface HarnessPatchProposalArtifact')
    expect(typesSource).toContain("kind: 'patch-proposal'")
    expect(typesSource).toContain('patchProposals?: HarnessPatchProposalArtifact[]')
  })

  test('extracts fenced diff/patch blocks only for patch-proposal isolation children', () => {
    expect(runtimeSource).toContain('private extractSubagentPatchProposals')
    expect(runtimeSource).toContain('matchAll(/```(?:diff|patch)')
    expect(runtimeSource).toContain(
      "this.selectSubagentIsolationMode(subagentConfig) === 'patch-proposal'"
    )
    expect(runtimeSource).toContain('patchProposals.length > 0 ? { patchProposals } : {}')
  })

  test('surfaces patch proposal counts through persistence and UI rows', () => {
    expect(useAgentSource).toContain('(summary.patchProposals?.length ?? 0)')
    expect(inspectorSource).toContain("kind: 'patch-proposal'")
    expect(inspectorSource).toContain('patchProposalCount: child.patchProposals?.length')
    expect(panelSource).toContain('export interface PersistedPatchProposalPreview')
    expect(panelSource).toContain('patchProposalCount?: number')
    expect(panelSource).toContain('patchProposals?: PersistedPatchProposalPreview[]')
    expect(panelSource).toContain('Patch proposal — parent review required')
    expect(panelSource).toContain('Preview only; not applied automatically')
    expect(inspectorSource).toContain('patchProposals: child.patchProposals')
    expect(panelSource).toContain('patch proposals')
  })
})
