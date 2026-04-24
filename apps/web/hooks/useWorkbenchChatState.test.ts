import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

function readHook(fileName: string) {
  return fs.readFileSync(path.resolve(import.meta.dir, fileName), 'utf-8')
}

describe('useWorkbenchChatState wiring', () => {
  test('requests a smaller initial active-chat message page', () => {
    const content = readHook('useWorkbenchChatState.ts')

    expect(content).toContain('{ initialNumItems: 50 }')
    expect(content).not.toContain('{ initialNumItems: 100 }')
  })

  test('exposes persisted active-chat messages for prompt history without another subscription', () => {
    const content = readHook('useWorkbenchChatState.ts')

    expect(content).toContain('onPersistedMessagesChange?: (messages: Message[]) => void')
    expect(content).toContain('onPersistedMessagesChange?.(persistedChatMessages)')
    expect(content).toContain('msg.chatId === activeChat._id')
  })

  test('only falls back to cached local agent messages for the active chat', () => {
    const content = readHook('useWorkbenchChatState.ts')

    expect(content).toContain("const lastAgentMessagesChatIdRef = useRef<Id<'chats'> | null>(null)")
    expect(content).toContain('lastAgentMessagesChatIdRef.current = activeChat._id')
    expect(content).toContain('lastAgentMessagesChatIdRef.current === activeChat._id')
  })
})
