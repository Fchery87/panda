import { describe, expect, it } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('Workbench integration wiring', () => {
  it('removes the preview tab from the workbench surface', () => {
    const workbenchPath = path.resolve(import.meta.dir, 'Workbench.tsx')
    const source = fs.readFileSync(workbenchPath, 'utf8')

    expect(source).not.toContain("import { Preview } from './Preview'")
    expect(source).not.toContain("activeTab === 'preview'")
    expect(source).not.toContain('>Preview<')
  })

  it('passes currentChatId to desktop workbench so timeline history works', () => {
    const pagePath = path.resolve(
      import.meta.dir,
      '../../app/(dashboard)/projects/[projectId]/page.tsx'
    )
    const source = fs.readFileSync(pagePath, 'utf8')

    const desktopWorkbenchCall = source.slice(
      source.indexOf('<Workbench'),
      source.lastIndexOf('/>') + 2
    )
    expect(desktopWorkbenchCall).toContain('currentChatId={activeChat?._id}')
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
})
