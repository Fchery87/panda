import type { ArtifactAction, ArtifactRecordStatus } from '@/lib/artifacts/executeArtifact'
import type { DiffFileEntry } from './DiffTab'

type PreviewArtifactRecord = {
  _id: string
  actions: ArtifactAction[]
  status: ArtifactRecordStatus
  createdAt: number
}

type OpenTab = {
  path: string
  isDirty?: boolean
}

export type WorkspaceArtifactPreview = {
  artifactId: string
  filePath: string
  originalContent: string
  pendingContent: string
  status: Extract<ArtifactRecordStatus, 'pending' | 'in_progress'>
  createdAt: number
}

export function deriveWorkspaceArtifactPreviews(
  records: PreviewArtifactRecord[]
): WorkspaceArtifactPreview[] {
  return records
    .flatMap((record) => {
      if (record.status !== 'pending' && record.status !== 'in_progress') {
        return []
      }

      const action = record.actions[0]
      if (!action || action.type !== 'file_write') {
        return []
      }

      return [
        {
          artifactId: record._id,
          createdAt: record.createdAt,
          filePath: action.payload.filePath,
          originalContent: action.payload.originalContent ?? '',
          pendingContent: action.payload.content,
          status: record.status,
        },
      ]
    })
    .sort((left, right) => right.createdAt - left.createdAt)
}

export function resolveArtifactPreviewNavigation(args: {
  preview: WorkspaceArtifactPreview
  openTabs: OpenTab[]
  selectedFilePath: string | null
}): {
  shouldOpenTab: boolean
  shouldSelectFile: boolean
} {
  const { preview, openTabs, selectedFilePath } = args
  const isOpen = openTabs.some((tab) => tab.path === preview.filePath)
  const selectedTab = openTabs.find((tab) => tab.path === selectedFilePath)
  const hasConflictingDirtyTab =
    Boolean(selectedTab?.isDirty) &&
    selectedFilePath !== null &&
    selectedFilePath !== preview.filePath

  return {
    shouldOpenTab: !isOpen,
    shouldSelectFile: selectedFilePath !== preview.filePath && !hasConflictingDirtyTab,
  }
}

export function derivePreviewDiffEntries(previews: WorkspaceArtifactPreview[]): DiffFileEntry[] {
  return previews.map((preview) => {
    const originalLines = preview.originalContent.split('\n')
    const pendingLines = preview.pendingContent.split('\n')

    return {
      path: preview.filePath,
      status: preview.originalContent ? 'modified' : 'added',
      reviewStatus: 'pending',
      hunks: [
        {
          id: preview.artifactId,
          startLine: 1,
          endLine: Math.max(originalLines.length, pendingLines.length),
          added: pendingLines,
          removed: preview.originalContent ? originalLines : [],
          context: [],
          status: 'pending',
        },
      ],
    }
  })
}
