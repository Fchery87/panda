import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const webRoot = process.cwd().endsWith('apps/web') ? process.cwd() : join(process.cwd(), 'apps/web')
const source = (path: string) => readFileSync(join(webRoot, path), 'utf8')

const propertyAccess = (path: string) => new RegExp(`${path.replaceAll('.', String.raw`\.`)}\\b`)

describe('Convex bandwidth guards', () => {
  test('keeps project boot off broad file and chat queries', () => {
    const loader = source('components/projects/ProjectShellDataLoader.tsx')

    expect(loader).not.toMatch(propertyAccess('api.files.list'))
    expect(loader).not.toMatch(propertyAccess('api.chats.list'))
  })

  test('keeps WebContainer runtime boot off full reactive file content lists', () => {
    const runtimeProvider = source('components/projects/WorkspaceRuntimeProvider.tsx')

    expect(runtimeProvider).not.toMatch(propertyAccess('api.files.list'))
  })

  test('keeps UI progress surfaces off full runtime checkpoint queries', () => {
    const progressPanel = source('components/chat/RunProgressPanel.tsx')
    const chatPanel = source('components/projects/ProjectChatPanel.tsx')

    expect(progressPanel).not.toMatch(propertyAccess('api.agentRuns.listRuntimeCheckpoints'))
    expect(chatPanel).not.toMatch(propertyAccess('api.agentRuns.listRuntimeCheckpoints'))
  })

  test('keeps the workspace session rail on bounded summary queries', () => {
    const sessionRailHook = source('components/sidebar/useSessionRailSummary.ts')
    const historyPanel = source('components/sidebar/SidebarHistoryPanel.tsx')

    expect(sessionRailHook).toMatch(propertyAccess('api.agentRuns.listRecentSummariesByProject'))
    expect(sessionRailHook).not.toMatch(propertyAccess('api.agentRuns.listRecentByProject'))
    expect(historyPanel).toMatch(propertyAccess('api.chats.listRecent'))
    expect(historyPanel).not.toMatch(propertyAccess('api.chats.list'))
  })

  test('keeps shared chat route off the full transcript query', () => {
    const sharedChatPage = source('app/s/[shareId]/page.tsx')
    const sharedChatContent = source('app/s/[shareId]/SharedChatContent.tsx')

    expect(sharedChatPage).not.toMatch(propertyAccess('api.sharing.getSharedChat'))
    expect(sharedChatContent).not.toMatch(propertyAccess('api.sharing.getSharedChat'))
  })

  test('bounds the legacy shared chat compatibility query', () => {
    const sharing = readFileSync(join(process.cwd(), 'convex/sharing.ts'), 'utf8')
    const getSharedChatBody = sharing.slice(
      sharing.indexOf('export const getSharedChat'),
      sharing.indexOf('export const getSharedChatHeader')
    )

    expect(getSharedChatBody).not.toContain('.collect()')
    expect(getSharedChatBody).toContain('.take(')
  })
})
