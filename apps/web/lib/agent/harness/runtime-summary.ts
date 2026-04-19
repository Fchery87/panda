import type { Message } from './types'

export function gatherModifiedFiles(messages: Message[]): string[] {
  const modifiedFiles: string[] = []

  for (const message of messages) {
    if (message.role !== 'assistant') continue
    for (const part of message.parts) {
      if (part.type !== 'tool' || part.state.status !== 'completed') continue
      const input = part.state.input as Record<string, unknown> | undefined
      if (!input) continue
      if (Array.isArray(input.paths)) modifiedFiles.push(...input.paths.map((p) => String(p)))
      if (Array.isArray(input.files)) {
        modifiedFiles.push(
          ...input.files.map((f: { path?: string }) => f.path || '').filter(Boolean)
        )
      }
      if (typeof input.path === 'string') modifiedFiles.push(input.path)
      if (typeof input.file_path === 'string') modifiedFiles.push(input.file_path)
    }
  }

  return [...new Set(modifiedFiles)]
}

export function gatherCommandsRun(messages: Message[]): string[] {
  const commands: string[] = []

  for (const message of messages) {
    if (message.role !== 'assistant') continue
    for (const part of message.parts) {
      if (part.type !== 'tool' || part.tool !== 'run_command') continue
      const input = part.state.input as { command?: string } | undefined
      if (input?.command) commands.push(input.command)
    }
  }

  return commands
}

export function gatherErrors(messages: Message[]): string[] {
  const errors: string[] = []

  for (const message of messages) {
    if (message.role !== 'assistant') continue
    for (const part of message.parts) {
      if (part.type !== 'tool' || part.state.status !== 'error') continue
      const errorState = part.state as { error?: string }
      if (errorState.error) errors.push(errorState.error)
    }
  }

  return errors
}

export function gatherOutput(messages: Message[]): string {
  const outputs: string[] = []

  for (const message of messages) {
    if (message.role !== 'assistant') continue
    for (const part of message.parts) {
      if (part.type === 'text') outputs.push(part.text)
    }
  }

  return outputs.join('\n')
}
