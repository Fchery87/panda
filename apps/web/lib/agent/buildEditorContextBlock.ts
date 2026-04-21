import type { WorkspaceOpenTab } from '@/contexts/WorkspaceContext'
import type { EditorSelection } from '@/stores/editorContextStore'

const MAX_SELECTION_CHARS = 1000

export function buildEditorContextBlock(args: {
  activeFile: string | null
  selection: EditorSelection | null
  openTabs: WorkspaceOpenTab[]
}): string | null {
  const { activeFile, selection, openTabs } = args

  if (!activeFile && !selection && openTabs.length === 0) return null

  const lines: string[] = ['<editor-context>']

  if (activeFile) {
    lines.push(`Active file: ${activeFile}`)
  }

  if (selection) {
    lines.push(`Selection: ${selection.filePath}:${selection.startLine}-${selection.endLine}`)

    if (selection.text) {
      const text =
        selection.text.length > MAX_SELECTION_CHARS
          ? `${selection.text.slice(0, MAX_SELECTION_CHARS)} [truncated]`
          : selection.text
      lines.push('```')
      lines.push(text)
      lines.push('```')
    }
  }

  const otherTabs = openTabs.filter((tab) => tab.path !== activeFile).map((tab) => tab.path)
  if (otherTabs.length > 0) {
    lines.push(`Other open tabs: ${otherTabs.join(', ')}`)
  }

  lines.push('</editor-context>')
  return lines.join('\n')
}
