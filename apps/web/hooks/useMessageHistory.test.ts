import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

function readHook(fileName: string) {
  return fs.readFileSync(path.resolve(import.meta.dir, fileName), 'utf-8')
}

describe('useMessageHistory wiring', () => {
  test('skips persisted message pagination when disabled', () => {
    const content = readHook('useMessageHistory.ts')

    expect(content).toContain('enabled = true')
    expect(content).toContain("const queryArgs = enabled && chatId ? { chatId } : 'skip'")
    expect(content).toContain('queryArgs,')
    expect(content).toContain('if (!enabled || !persistedMessages || isRunningRef.current) return')
  })

  test('useAgent clears and keys local streaming messages when hydration is disabled', () => {
    const content = readHook('useAgent.ts')

    expect(content).toContain('if (hydratePersistedMessages) return')
    expect(content).toContain('setMessages([])')
    expect(content).toContain('localMessagesChatIdRef.current = chatId')
    expect(content).toContain(
      'hydratePersistedMessages || localMessagesChatIdRef.current === chatId'
    )
  })
})
