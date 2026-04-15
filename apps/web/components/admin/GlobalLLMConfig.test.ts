import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const globalConfigPath = path.join(import.meta.dir, 'GlobalLLMConfig.tsx')
const adminSystemPagePath = path.join(import.meta.dir, '../../app/admin/system/page.tsx')

describe('GlobalLLMConfig select control', () => {
  it('keeps the provider select controlled with a sentinel value', () => {
    const content = readFileSync(globalConfigPath, 'utf8')

    expect(content).toContain("const NO_PROVIDER_SELECTED = '__no-provider-selected__'")
    expect(content).not.toContain('value={config.provider || undefined}')
  })

  it('keeps the admin system provider select controlled with a sentinel value', () => {
    const content = readFileSync(adminSystemPagePath, 'utf8')

    expect(content).toContain("const NO_PROVIDER_SELECTED = '__no-provider-selected__'")
    expect(content).not.toContain('value={globalLLMConfig.globalDefaultProvider || undefined}')
  })
})
