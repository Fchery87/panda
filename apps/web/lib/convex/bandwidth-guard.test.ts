import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const webRoot = process.cwd().endsWith('apps/web') ? process.cwd() : join(process.cwd(), 'apps/web')
const repoRoot = process.cwd().endsWith('apps/web') ? join(process.cwd(), '../..') : process.cwd()
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

  test('keeps project context hooks on metadata-only file queries', () => {
    const projectContext = source('hooks/useProjectContext.ts')
    const loader = source('components/projects/ProjectShellDataLoader.tsx')

    expect(projectContext).toMatch(propertyAccess('api.files.listMetadata'))
    expect(projectContext).not.toMatch(propertyAccess('api.files.list'))
    expect(loader).toMatch(propertyAccess('api.files.listMetadata'))
    expect(loader).not.toMatch(propertyAccess('api.files.list'))
  })

  test('backs file metadata listing with the metadata projection table', () => {
    const filesModule = readFileSync(join(repoRoot, 'convex/files.ts'), 'utf8')
    const listMetadataBody = filesModule.slice(
      filesModule.indexOf('export const listMetadata'),
      filesModule.indexOf('// get (query)')
    )

    expect(listMetadataBody).toContain("query('fileMetadata')")
    expect(listMetadataBody).not.toContain("api.files.list")
  })

  test('keeps UI progress surfaces off full runtime checkpoint queries', () => {
    const progressPanel = source('components/chat/RunProgressPanel.tsx')
    const chatPanel = source('components/projects/ProjectChatPanel.tsx')

    expect(progressPanel).not.toMatch(propertyAccess('api.agentRuns.listRuntimeCheckpoints'))
    expect(chatPanel).not.toMatch(propertyAccess('api.agentRuns.listRuntimeCheckpoints'))
  })

  test('keeps run event summaries free of cold snapshot payloads', () => {
    const agentRuns = readFileSync(join(repoRoot, 'convex/agentRuns.ts'), 'utf8')
    const summaryBody = agentRuns.slice(
      agentRuns.indexOf('function toRunEventSummary'),
      agentRuns.indexOf('function toRuntimeCheckpointSummary')
    )

    expect(summaryBody).not.toContain('snapshot: event.snapshot')
    expect(summaryBody).toContain('contentPreview')
    expect(summaryBody).toContain('outputPreview')
  })

  test('caps and deduplicates cold runtime checkpoint writes', () => {
    const agentRuns = readFileSync(join(repoRoot, 'convex/agentRuns.ts'), 'utf8')
    const saveBody = agentRuns.slice(
      agentRuns.indexOf('export const saveRuntimeCheckpoint'),
      agentRuns.indexOf('export const getLatestRuntimeCheckpoint')
    )
    const runtime = source('lib/agent/harness/runtime.ts')

    expect(saveBody).toContain('DEFAULT_HOT_CHECKPOINT_RETENTION')
    expect(saveBody).toContain('stableHash')
    expect(runtime).toContain("reason === 'step'")
    expect(runtime).toContain('state.step % 3')
  })

  test('labels heavyweight compatibility queries as deprecated legacy paths', () => {
    const files = readFileSync(join(repoRoot, 'convex/files.ts'), 'utf8')
    const messages = readFileSync(join(repoRoot, 'convex/messages.ts'), 'utf8')
    const agentRuns = readFileSync(join(repoRoot, 'convex/agentRuns.ts'), 'utf8')
    const sharing = readFileSync(join(repoRoot, 'convex/sharing.ts'), 'utf8')

    expect(files.slice(files.indexOf('@deprecated'), files.indexOf('export const list'))).toContain('Legacy compatibility query')
    expect(messages.slice(messages.indexOf('@deprecated'), messages.indexOf('export const list'))).toContain('listPaginatedLite')
    expect(messages.slice(messages.indexOf('export const listPaginated') - 250, messages.indexOf('export const listPaginated'))).toContain('@deprecated')
    expect(agentRuns.slice(agentRuns.indexOf('export const listRuntimeCheckpoints') - 350, agentRuns.indexOf('export const listRuntimeCheckpoints'))).toContain('@deprecated')
    expect(sharing.slice(sharing.indexOf('export const getSharedChat') - 300, sharing.indexOf('export const getSharedChat'))).toContain('@deprecated')
  })

  test('keeps admin operational cleanup bounded and source-of-truth safe', () => {
    const admin = readFileSync(join(repoRoot, 'convex/admin.ts'), 'utf8')
    const retention = readFileSync(join(repoRoot, 'convex/retention.ts'), 'utf8')
    const cleanupBody = admin.slice(
      admin.indexOf('export const cleanupOperationalDataNow'),
      admin.indexOf('/**\n * Check if current user is admin')
    )

    expect(cleanupBody).toContain('ADMIN_OPERATIONAL_CLEANUP_MAX_LIMIT')
    expect(cleanupBody).toContain("'agentRunEvents'")
    expect(cleanupBody).toContain("'harnessRuntimeCheckpoints'")
    expect(cleanupBody).toContain("'evalRunResults'")
    expect(cleanupBody).toContain("'fileSnapshots'")
    expect(cleanupBody).not.toContain("'projects'")
    expect(cleanupBody).not.toContain("'messages'")
    expect(cleanupBody).not.toContain("'files'")
    expect(retention).toContain('const DEFAULT_BATCH_LIMIT = 500')
  })

  test('keeps admin dashboards on aggregate or bounded reads', () => {
    const admin = readFileSync(join(repoRoot, 'convex/admin.ts'), 'utf8')
    const overviewBody = admin.slice(
      admin.indexOf('export const getSystemOverview'),
      admin.indexOf('/**\n * Get provider usage analytics')
    )
    const providerBody = admin.slice(
      admin.indexOf('export const getProviderAnalytics'),
      admin.indexOf('/**\n * Get audit log entries')
    )
    const auditBody = admin.slice(
      admin.indexOf('export const getAuditLog'),
      admin.indexOf('/**\n * Check if current user is admin')
    )

    expect(overviewBody).toContain('readAdminAggregate')
    expect(overviewBody).not.toContain("query('users')")
    expect(overviewBody).not.toContain("query('agentRuns')")
    expect(providerBody).toContain('readAdminAggregate')
    expect(providerBody).not.toContain('.take(1000)')
    expect(auditBody).not.toContain('.take(1000)')
    expect(auditBody).toContain('Math.min(limit * 3, 250)')
  })

  test('keeps the workspace session rail on bounded summary queries', () => {
    const sessionRailHook = source('components/sidebar/useSessionRailSummary.ts')
    const historyPanel = source('components/sidebar/SidebarHistoryPanel.tsx')

    expect(sessionRailHook).toMatch(propertyAccess('api.agentRuns.listRecentSummariesByProject'))
    expect(sessionRailHook).not.toMatch(propertyAccess('api.agentRuns.listRecentByProject'))
    expect(historyPanel).toMatch(propertyAccess('api.chats.listRecent'))
    expect(historyPanel).not.toMatch(propertyAccess('api.chats.list'))
  })

  test('keeps active chat history on the lite paginated message interface', () => {
    const workbenchChatState = source('hooks/useWorkbenchChatState.ts')
    const messageHistory = source('hooks/useMessageHistory.ts')

    for (const hook of [workbenchChatState, messageHistory]) {
      expect(hook).toMatch(propertyAccess('api.messages.listPaginatedLite'))
      expect(hook).not.toMatch(propertyAccess('api.messages.list'))
      expect(hook).not.toMatch(propertyAccess('api.messages.listPaginated'))
    }
  })

  test('keeps agent prompt path off broad context re-indexing mutations', () => {
    const useAgent = source('hooks/useAgent.ts')

    expect(useAgent).not.toMatch(propertyAccess('api.contextChunks.indexProjectFiles'))
    expect(useAgent).not.toMatch(propertyAccess('api.contextChunks.indexSessionSummaries'))
    expect(useAgent).not.toMatch(propertyAccess('api.contextChunks.indexSpecifications'))
    expect(useAgent).not.toMatch(propertyAccess('api.contextChunks.indexMessages'))
    expect(useAgent).not.toMatch(propertyAccess('api.contextChunks.indexPlanningSessionPlans'))
    expect(useAgent).toMatch(propertyAccess('api.contextChunks.search'))
  })

  test('keeps shared chat route off the full transcript query', () => {
    const sharedChatPage = source('app/s/[shareId]/page.tsx')
    const sharedChatContent = source('app/s/[shareId]/SharedChatContent.tsx')

    expect(sharedChatPage).not.toMatch(propertyAccess('api.sharing.getSharedChat'))
    expect(sharedChatContent).not.toMatch(propertyAccess('api.sharing.getSharedChat'))
  })

  test('bounds the legacy shared chat compatibility query', () => {
    const sharing = readFileSync(join(repoRoot, 'convex/sharing.ts'), 'utf8')
    const getSharedChatBody = sharing.slice(
      sharing.indexOf('export const getSharedChat'),
      sharing.indexOf('export const getSharedChatHeader')
    )

    expect(getSharedChatBody).not.toContain('.collect()')
    expect(getSharedChatBody).toContain('.take(')
  })
})
