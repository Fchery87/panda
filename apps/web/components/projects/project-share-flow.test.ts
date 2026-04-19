import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('project share flow', () => {
  test('workspace page uses the real share dialog instead of the placeholder event bus', () => {
    const pagePath = path.resolve(
      import.meta.dir,
      '../../app/(dashboard)/projects/[projectId]/page.tsx'
    )
    const pageSource = fs.readFileSync(pagePath, 'utf8')
    const shellPath = path.resolve(import.meta.dir, 'ProjectWorkspaceShell.tsx')
    const shellSource = fs.readFileSync(shellPath, 'utf8')
    const uiHookPath = path.resolve(import.meta.dir, '../../hooks/useProjectWorkspaceUi.ts')
    const uiHookSource = fs.readFileSync(uiHookPath, 'utf8')
    const dialogPath = path.resolve(import.meta.dir, 'ProjectShareDialog.tsx')
    const dialogSource = fs.readFileSync(dialogPath, 'utf8')

    expect(shellSource).toContain(
      "import { ProjectShareDialog } from '@/components/projects/ProjectShareDialog'"
    )
    expect(shellSource).toContain('<ProjectShareDialog')
    expect(pageSource).toContain('onOpenShareDialog: () => setIsShareDialogOpen(true)')
    expect(pageSource).toContain('onOpenShare: () => setIsShareDialogOpen(true),')
    expect(pageSource).not.toContain('panda:open-share')

    expect(uiHookSource).not.toContain('Share feature coming soon')
    expect(uiHookSource).not.toContain('panda:open-share')
    expect(uiHookSource).toContain('isShareDialogOpen')
    expect(uiHookSource).toContain('setIsShareDialogOpen')

    expect(dialogSource).toContain("import { ShareButton } from '@/components/chat/ShareButton'")
    expect(dialogSource).toContain('<ShareButton')
  })
})
