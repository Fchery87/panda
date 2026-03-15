import { describe, expect, it } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('Workbench integration wiring', () => {
  it('removes the preview tab from the workbench surface', () => {
    const workbenchPath = path.resolve(import.meta.dir, 'Workbench.tsx')
    const source = fs.readFileSync(workbenchPath, 'utf8')

    expect(source).not.toContain("import { Preview } from './Preview'")
    expect(source).not.toContain("activeTab === 'preview'")
  })

  it('passes currentChatId to desktop workbench so timeline history works', () => {
    const pagePath = path.resolve(
      import.meta.dir,
      '../../app/(dashboard)/projects/[projectId]/page.tsx'
    )
    const pageSource = fs.readFileSync(pagePath, 'utf8')
    const layoutPath = path.resolve(import.meta.dir, '../projects/ProjectWorkspaceLayout.tsx')
    const layoutSource = fs.readFileSync(layoutPath, 'utf8')

    expect(pageSource).toContain('activeChatId={activeChat?._id}')
    expect(layoutSource).toContain('currentChatId={activeChatId}')
  })

  it('keeps plan execution detached from auto-opening the inspector', () => {
    const pagePath = path.resolve(
      import.meta.dir,
      '../../app/(dashboard)/projects/[projectId]/page.tsx'
    )
    const source = fs.readFileSync(pagePath, 'utf8')

    const handleBuildFromPlanStart = source.indexOf('const handleBuildFromPlan = useCallback')
    const handleBuildFromPlanEnd = source.indexOf('const handleModeChange = useCallback')
    const buildFromPlanBlock = source.slice(handleBuildFromPlanStart, handleBuildFromPlanEnd)

    expect(buildFromPlanBlock).not.toContain("setChatInspectorTab('run')")
    expect(buildFromPlanBlock).not.toContain('setIsChatInspectorOpen(true)')
  })

  it('threads pending artifact previews into the workspace editor path', () => {
    const pagePath = path.resolve(
      import.meta.dir,
      '../../app/(dashboard)/projects/[projectId]/page.tsx'
    )
    const pageSource = fs.readFileSync(pagePath, 'utf8')
    const layoutPath = path.resolve(import.meta.dir, '../projects/ProjectWorkspaceLayout.tsx')
    const layoutSource = fs.readFileSync(layoutPath, 'utf8')
    const workbenchPath = path.resolve(import.meta.dir, 'Workbench.tsx')
    const workbenchSource = fs.readFileSync(workbenchPath, 'utf8')

    expect(pageSource).toContain('pendingArtifactPreview={pendingArtifactPreview}')
    expect(layoutSource).toContain('pendingArtifactPreview={pendingArtifactPreview}')
    expect(workbenchSource).toContain('PendingArtifactOverlay')
    expect(workbenchSource).toContain('pendingArtifactPreview')
  })

  it('tracks editor dirty state in page-owned tabs so artifact navigation can avoid stealing focus', () => {
    const pagePath = path.resolve(
      import.meta.dir,
      '../../app/(dashboard)/projects/[projectId]/page.tsx'
    )
    const pageSource = fs.readFileSync(pagePath, 'utf8')
    const layoutPath = path.resolve(import.meta.dir, '../projects/ProjectWorkspaceLayout.tsx')
    const layoutSource = fs.readFileSync(layoutPath, 'utf8')
    const workbenchPath = path.resolve(import.meta.dir, 'Workbench.tsx')
    const workbenchSource = fs.readFileSync(workbenchPath, 'utf8')
    const editorContainerPath = path.resolve(import.meta.dir, '../editor/EditorContainer.tsx')
    const editorContainerSource = fs.readFileSync(editorContainerPath, 'utf8')

    expect(pageSource).toContain('onEditorDirtyChange={handleEditorDirtyChange}')
    expect(layoutSource).toContain('onEditorDirtyChange={onEditorDirtyChange}')
    expect(workbenchSource).toContain('onDirtyChange={(isDirty) =>')
    expect(workbenchSource).toContain('onEditorDirtyChange(selectedFile.path, isDirty)')
    expect(editorContainerSource).toContain('onDirtyChange?: (isDirty: boolean) => void')
  })

  it('uses the shared diff viewer for pending artifact previews and does not depend on the legacy workbench diff component', () => {
    const overlayPath = path.resolve(import.meta.dir, 'PendingArtifactOverlay.tsx')
    const overlaySource = fs.readFileSync(overlayPath, 'utf8')
    const legacyDiffPath = path.resolve(import.meta.dir, 'DiffViewer.tsx')

    expect(overlaySource).toContain("import { DiffViewer } from '@/components/diff/DiffViewer'")
    expect(fs.existsSync(legacyDiffPath)).toBe(false)
  })
})
