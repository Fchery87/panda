import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const runtimeSource = readFileSync(join(import.meta.dir, 'runtime.ts'), 'utf8')
const typesSource = readFileSync(join(import.meta.dir, 'types.ts'), 'utf8')
const agentsSource = readFileSync(join(import.meta.dir, 'agents.ts'), 'utf8')
const configSource = readFileSync(join(import.meta.dir, 'runtime-config.ts'), 'utf8')

describe('subagent isolation selection', () => {
  test('defines isolation modes and runtime availability config', () => {
    expect(typesSource).toContain('export type SubagentIsolationMode')
    expect(typesSource).toContain("'patch-proposal'")
    expect(typesSource).toContain('defaultIsolationMode?: SubagentIsolationMode')
    expect(typesSource).toContain('defaultSubagentIsolationMode?: SubagentIsolationMode')
    expect(typesSource).toContain('availableSubagentIsolationModes?: SubagentIsolationMode[]')
    expect(configSource).toContain("defaultSubagentIsolationMode: 'shared-readonly'")
    expect(configSource).toContain("availableSubagentIsolationModes: ['shared-readonly']")
  })

  test('infers patch-proposal preference for mutating subagents and readonly shared-readonly', () => {
    expect(agentsSource).toContain('function inferDefaultIsolationMode')
    expect(agentsSource).toContain("return canMutate ? 'patch-proposal' : 'shared-readonly'")
    expect(agentsSource).toContain('defaultIsolationMode: inferDefaultIsolationMode(config)')
  })

  test('selects effective isolation and serializes mutating subagents when isolation unavailable', () => {
    expect(runtimeSource).toContain('private selectSubagentIsolationMode')
    expect(runtimeSource).toContain("available.has('patch-proposal') ? 'patch-proposal' : 'shared-readonly'")
    expect(runtimeSource).toContain('isolationMode: this.selectSubagentIsolationMode(subagentConfig)')
    expect(runtimeSource).toContain('const mutatingIsolationReady = mutatingSubtasks.every')
    expect(runtimeSource).toContain('const mutatingConcurrency = mutatingIsolationReady ? requestedMutatingConcurrency : 1')
  })
})
