export interface WorkbenchFilePath {
  path: string
}

export function resolveExplorerRevealTarget(args: {
  folderPath: string
  files: WorkbenchFilePath[]
}): string | null {
  const prefix = `${args.folderPath}/`

  return (
    [...args.files]
      .map((file) => file.path)
      .filter((path) => path.startsWith(prefix))
      .sort((left, right) => left.localeCompare(right))[0] ?? null
  )
}

export interface InlineChatFailureDisplay {
  title: string
  description: string
}

export function buildInlineChatFailureDisplay(error: unknown): InlineChatFailureDisplay {
  if (error instanceof Error && error.message.trim()) {
    return {
      title: 'Inline chat failed',
      description: error.message.trim(),
    }
  }

  if (typeof error === 'string' && error.trim()) {
    return {
      title: 'Inline chat failed',
      description: error.trim(),
    }
  }

  return {
    title: 'Inline chat failed',
    description: 'The request could not be completed. Try again.',
  }
}
