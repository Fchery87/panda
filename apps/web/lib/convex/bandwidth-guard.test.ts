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

  test('keeps UI progress surfaces off full runtime checkpoint queries', () => {
    const progressPanel = source('components/chat/RunProgressPanel.tsx')
    const chatPanel = source('components/projects/ProjectChatPanel.tsx')

    expect(progressPanel).not.toMatch(propertyAccess('api.agentRuns.listRuntimeCheckpoints'))
    expect(chatPanel).not.toMatch(propertyAccess('api.agentRuns.listRuntimeCheckpoints'))
  })

  test('keeps shared chat route off the full transcript query', () => {
    const sharedChatPage = source('app/s/[shareId]/page.tsx')
    const sharedChatContent = source('app/s/[shareId]/SharedChatContent.tsx')

    expect(sharedChatPage).not.toMatch(propertyAccess('api.sharing.getSharedChat'))
    expect(sharedChatContent).not.toMatch(propertyAccess('api.sharing.getSharedChat'))
  })
})
