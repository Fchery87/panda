export interface CreateProjectErrorDisplay {
  title: string
  description: string
  recoveryHint: string | null
}

const PROJECT_LIMIT_PREFIX = 'Project limit reached'

export function getCreateProjectErrorDisplay(error: unknown): CreateProjectErrorDisplay {
  const description =
    error instanceof Error && error.message.trim().length > 0
      ? error.message.trim()
      : 'Unknown error'

  if (description.startsWith(PROJECT_LIMIT_PREFIX)) {
    return {
      title: PROJECT_LIMIT_PREFIX,
      description,
      recoveryHint: 'Delete or archive an older project, then try creating this project again.',
    }
  }

  return {
    title: 'Failed to create project',
    description,
    recoveryHint: null,
  }
}
