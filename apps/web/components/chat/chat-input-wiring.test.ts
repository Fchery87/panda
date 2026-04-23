import { describe, expect, test } from 'bun:test'
import path from 'node:path'

async function readChatComponent(fileName: string) {
  const fs = await import('node:fs')
  return fs.readFileSync(path.resolve(import.meta.dir, fileName), 'utf-8')
}

describe('chat input wiring', () => {
  test('ChatInput gates attachment UI behind an explicit flag and exposes send state cues for attachment-only sends', async () => {
    const content = await readChatComponent('ChatInput.tsx')

    expect(content).toContain("projectId?: Id<'projects'>")
    expect(content).toContain("chatId?: Id<'chats'>")
    expect(content).toContain('attachmentsEnabled?: boolean')
    expect(content).toContain('attachmentsEnabled = false')
    expect(content).toContain('{attachmentsEnabled ? (')
    expect(content).toContain('const storedPath = `.panda/attachments/')
    expect(content).toContain('formatAttachmentMessage')
    expect(content).toContain('attachmentsOnly: !message.trim() && uploadedAttachments.length > 0')
    expect(content).not.toContain('Attached 1 asset')
    expect(content).toContain('generateAttachmentUploadUrl')
    expect(content).toContain('await upsertFile({')
    expect(content).toContain('attachments: uploadedAttachments')
    expect(content).toContain('contextFilePath: isTextLike ? storedPath : undefined')
    expect(content).toContain(
      'const hasSendContent = input.trim().length > 0 || attachments.length > 0'
    )
    expect(content).toContain('disabled={!hasSendContent}')
    expect(content).toContain(
      "hasSendContent\n                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'"
    )
  })

  test('ChatInput labels the main composer textarea for accessible name queries', async () => {
    const content = await readChatComponent('ChatInput.tsx')

    expect(content).toContain('aria-label="Message input"')
    expect(content).toContain('placeholder="Ask anything, @ to mention, / for workflows"')
  })

  test('ChatInput surfaces a Plan-only brainstorm toggle wired to the architect callback', async () => {
    const content = await readChatComponent('ChatInput.tsx')

    expect(content).toContain('architectBrainstormEnabled = false')
    expect(content).toContain('onArchitectBrainstormEnabledChange')
    expect(content).toContain("{mode === 'plan' && onArchitectBrainstormEnabledChange && (")
    expect(content).toContain('aria-pressed={architectBrainstormEnabled}')
    expect(content).toContain(
      "architectBrainstormEnabled ? 'Disable brainstorming' : 'Enable brainstorming'"
    )
    expect(content).toContain(
      'onClick={() => onArchitectBrainstormEnabledChange(!architectBrainstormEnabled)}'
    )
    expect(content).toContain('Brainstorm')
  })

  test('AttachmentButton labels remove actions and sizes preview images', async () => {
    const content = await readChatComponent('AttachmentButton.tsx')

    expect(content).toContain('aria-label={`Remove attachment ${att.file.name}`}')
    expect(content).toContain('width={32}')
    expect(content).toContain('height={32}')
  })

  test('ChatInput only mirrors text-like file attachments into workspace files', async () => {
    const content = await readChatComponent('ChatInput.tsx')

    expect(content).toContain('const isTextLike =')
    expect(content).toContain("attachment.file.type.startsWith('text/')")
    expect(content).toContain('if (isTextLike) {')
  })
})
