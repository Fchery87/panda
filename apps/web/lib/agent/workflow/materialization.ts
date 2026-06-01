import type { WorkflowArtifactKind } from './artifacts'

export interface WorkflowArtifactMaterializationInput {
  chatId: string
  artifactId: string
  kind: WorkflowArtifactKind | string
  title: string
  content: string
  createdAt?: number
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return slug || 'artifact'
}

export function buildWorkflowArtifactMaterializedPath(
  artifact: Pick<
    WorkflowArtifactMaterializationInput,
    'chatId' | 'artifactId' | 'kind' | 'title' | 'createdAt'
  >
): string {
  const timestamp = new Date(artifact.createdAt ?? Date.now()).toISOString().replace(/[:.]/g, '-')
  return `.panda/artifacts/${artifact.chatId}/${artifact.kind}/${timestamp}-${slugify(artifact.title)}-${artifact.artifactId.slice(-8)}.md`
}

export function buildWorkflowArtifactMarkdown(
  artifact: WorkflowArtifactMaterializationInput
): string {
  return [
    '---',
    `id: ${artifact.artifactId}`,
    `chatId: ${artifact.chatId}`,
    `kind: ${artifact.kind}`,
    `title: ${JSON.stringify(artifact.title)}`,
    artifact.createdAt ? `createdAt: ${new Date(artifact.createdAt).toISOString()}` : null,
    '---',
    '',
    `# ${artifact.title}`,
    '',
    artifact.content.trim(),
    '',
  ]
    .filter((line): line is string => line !== null)
    .join('\n')
}

export function buildWorkflowArtifactMaterializationDraft(
  artifact: WorkflowArtifactMaterializationInput
): { path: string; content: string } {
  return {
    path: buildWorkflowArtifactMaterializedPath(artifact),
    content: buildWorkflowArtifactMarkdown(artifact),
  }
}
