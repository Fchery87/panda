import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

function listConvexSourceFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === '_generated') return []
      return listConvexSourceFiles(fullPath)
    }
    if (!entry.name.endsWith('.ts') || entry.name.endsWith('.test.ts')) return []
    return [fullPath]
  })
}

describe('agentRuns persistence', () => {
  test('routes run event writes through the central insertRunEvent seam', () => {
    const convexDir = import.meta.dir
    const allowedDirectInsertFile = path.join(convexDir, 'lib', 'runEvents.ts')
    const offenders = listConvexSourceFiles(convexDir)
      .filter((file) => file !== allowedDirectInsertFile)
      .filter((file) =>
        /ctx\.db\.insert\(['"]agentRunEvents['"]/.test(fs.readFileSync(file, 'utf8'))
      )
      .map((file) => path.relative(convexDir, file))

    expect(offenders).toEqual([])
  })

  test('splits new run event cold bodies behind the insertRunEvent seam', () => {
    const schemaSource = fs.readFileSync(path.resolve(import.meta.dir, 'schema.ts'), 'utf8')
    const runEventsSource = fs.readFileSync(
      path.resolve(import.meta.dir, 'lib/runEvents.ts'),
      'utf8'
    )
    const agentRunsSource = fs.readFileSync(path.resolve(import.meta.dir, 'agentRuns.ts'), 'utf8')
    const projectsSource = fs.readFileSync(path.resolve(import.meta.dir, 'projects.ts'), 'utf8')
    const chatsSource = fs.readFileSync(path.resolve(import.meta.dir, 'chats.ts'), 'utf8')
    const retentionSource = fs.readFileSync(path.resolve(import.meta.dir, 'retention.ts'), 'utf8')
    const adminSource = fs.readFileSync(path.resolve(import.meta.dir, 'admin.ts'), 'utf8')

    expect(schemaSource).toContain('agentRunEventBodies: defineTable({')
    expect(schemaSource).toContain(".index('by_event', ['eventId'])")
    expect(schemaSource).toContain(".index('by_run_sequence', ['runId', 'sequence'])")
    expect(schemaSource).toContain(".index('by_chat_created', ['chatId', 'createdAt'])")
    expect(schemaSource).toContain('contentPreview: v.optional(v.string())')
    expect(schemaSource).toContain('hasBody: v.optional(v.boolean())')
    expect(schemaSource).toContain('hasArgs: v.optional(v.boolean())')
    expect(schemaSource).toContain('hasSnapshot: v.optional(v.boolean())')

    expect(runEventsSource).toContain("ctx.db.insert('agentRunEvents'")
    expect(runEventsSource).toContain("ctx.db.insert('agentRunEventBodies'")
    expect(runEventsSource).toContain(
      'const { content, output, error, args, snapshot, ...hotEvent }'
    )
    expect(runEventsSource).toContain(
      'contentPreview: event.contentPreview ?? previewText(content)'
    )
    expect(runEventsSource).toContain('export async function deleteRunEventWithBody')

    expect(agentRunsSource).toContain('async function hydrateRunEventBody')
    expect(agentRunsSource).toContain('export const backfillRunEventBodies = internalMutation({')
    expect(agentRunsSource).toContain("runId: v.id('agentRuns')")
    expect(agentRunsSource).toContain('paginationOpts: paginationOptsValidator')
    expect(agentRunsSource).not.toContain('afterCreatedAt')
    expect(agentRunsSource).not.toContain('afterSequence')
    expect(agentRunsSource).toContain('Math.min(args.paginationOpts.numItems, 500)')
    expect(agentRunsSource).toContain(".withIndex('by_run_sequence'")
    expect(agentRunsSource).toContain('.paginate({')
    expect(agentRunsSource).toContain(".query('agentRunEventBodies')")
    expect(agentRunsSource).toContain("ctx.db.insert('agentRunEventBodies'")
    expect(agentRunsSource).not.toContain('content: undefined')
    expect(agentRunsSource).toContain('deleteRunEventWithBody(ctx, eventId)')
    expect(projectsSource).toContain("'agentRunEventBodies', 'by_chat_created'")
    expect(projectsSource).toContain("'agentRuns', 'by_chat_started'")
    expect(chatsSource).toContain("'agentRunEventBodies', 'by_chat_created'")
    expect(chatsSource).toContain("'agentRuns', 'by_chat_started'")
    expect(chatsSource).toContain('while (true)')
    expect(retentionSource).toContain('deleteRunEventWithBody(ctx, row._id)')
    expect(adminSource).toContain('deleteRunEventWithBody(ctx, row._id)')
    expect(adminSource).toContain("'agentRunEventBodies', 'by_chat_created'")
    expect(adminSource).toContain("'agentRuns', 'by_chat_started'")
    expect(adminSource).toContain('while (true)')
  })

  test('splits runtime checkpoint cold bodies behind the existing checkpoint store seam', () => {
    const schemaSource = fs.readFileSync(path.resolve(import.meta.dir, 'schema.ts'), 'utf8')
    const agentRunsSource = fs.readFileSync(path.resolve(import.meta.dir, 'agentRuns.ts'), 'utf8')
    const projectsSource = fs.readFileSync(path.resolve(import.meta.dir, 'projects.ts'), 'utf8')
    const chatsSource = fs.readFileSync(path.resolve(import.meta.dir, 'chats.ts'), 'utf8')
    const retentionSource = fs.readFileSync(path.resolve(import.meta.dir, 'retention.ts'), 'utf8')
    const adminSource = fs.readFileSync(path.resolve(import.meta.dir, 'admin.ts'), 'utf8')

    expect(schemaSource).toContain('harnessRuntimeCheckpointBodies: defineTable({')
    expect(schemaSource).toContain('checkpoint: v.optional(RuntimeCheckpointPayload)')
    expect(schemaSource).toContain('checkpointHash: v.optional(v.string())')
    expect(schemaSource).toContain('messageCount: v.optional(v.number())')
    expect(schemaSource).toContain('hasBody: v.optional(v.boolean())')
    expect(schemaSource).toContain(".index('by_checkpoint', ['checkpointId'])")
    expect(schemaSource).toContain(
      ".index('by_run_session_created', ['runId', 'sessionID', 'createdAt'])"
    )
    expect(schemaSource).toContain(
      ".index('by_chat_session_created', ['chatId', 'sessionID', 'createdAt'])"
    )

    expect(agentRunsSource).toContain('function summarizeRuntimeCheckpoint')
    expect(agentRunsSource).toContain('async function loadRuntimeCheckpointBody')
    expect(agentRunsSource).toContain('async function deleteRuntimeCheckpointWithBody')
    expect(agentRunsSource).toContain("ctx.db.insert('harnessRuntimeCheckpointBodies'")
    expect(agentRunsSource).toContain('hasBody: true')
    expect(agentRunsSource).toContain('await loadRuntimeCheckpointBody(ctx, rows[0])')
    expect(agentRunsSource).toContain(
      'checkpoint: await loadRuntimeCheckpointBody(ctx, checkpoint)'
    )
    expect(agentRunsSource).toContain('deleteRuntimeCheckpointWithBody(ctx, stale._id)')
    expect(agentRunsSource).toContain('deleteRuntimeCheckpointWithBody(ctx, checkpointId)')
    expect(agentRunsSource).toContain(
      'export const backfillRuntimeCheckpointBodies = internalMutation({'
    )
    expect(agentRunsSource).toContain('paginationOpts: paginationOptsValidator')
    expect(agentRunsSource).toContain('Math.min(args.paginationOpts.numItems, 200)')
    expect(agentRunsSource).toContain(".query('harnessRuntimeCheckpointBodies')")
    expect(agentRunsSource).toContain("ctx.db.insert('harnessRuntimeCheckpointBodies'")
    expect(agentRunsSource).not.toContain('checkpoint: undefined')

    expect(projectsSource).toContain("'harnessRuntimeCheckpointBodies', 'by_chat_created'")
    expect(projectsSource).toContain("'harnessRuntimeCheckpointBodies', 'by_project_created'")
    expect(chatsSource).toContain("'harnessRuntimeCheckpointBodies', 'by_chat_created'")
    expect(adminSource).toContain("'harnessRuntimeCheckpointBodies', 'by_chat_created'")
    expect(adminSource).toContain("query('harnessRuntimeCheckpointBodies')")
    expect(retentionSource).toContain("query('harnessRuntimeCheckpointBodies')")
  })

  test('uses explicit persistence schemas and normalizes event ingestion order', () => {
    const schemaSource = fs.readFileSync(path.resolve(import.meta.dir, 'schema.ts'), 'utf8')
    const agentRunsSource = fs.readFileSync(path.resolve(import.meta.dir, 'agentRuns.ts'), 'utf8')

    expect(schemaSource).not.toContain('usage: v.optional(v.record(v.string(), v.any()))')
    expect(schemaSource).not.toContain('checkpoint: v.any()')
    expect(schemaSource).toContain('key: v.string()')
    expect(schemaSource).toContain('count: v.number()')
    expect(schemaSource).toContain('consecutiveCompactionFailures: v.optional(v.number())')
    expect(schemaSource).toContain('consecutiveNarrationTurns: v.optional(v.number())')
    expect(schemaSource).toContain('activeSpec: v.optional(v.any())')
    expect(schemaSource).toContain('v.union(')
    expect(schemaSource).toContain('v.array(v.union(v.string(), v.number()))')
    expect(schemaSource).toContain('export const StoredChatMode = v.union(')
    expect(schemaSource).toContain("v.literal('architect')")
    expect(schemaSource).toContain("v.literal('discuss')")
    expect(schemaSource).toContain("v.literal('debug')")
    expect(schemaSource).toContain("v.literal('review')")
    expect(schemaSource).toContain('mode: StoredChatMode,')
    expect(schemaSource).toContain('export const TerminationReason = v.union(')
    expect(schemaSource).toContain("v.literal('preflight-failed')")
    expect(schemaSource).toContain('terminationReason: v.optional(TerminationReason),')
    expect(schemaSource).toContain('planStatus: v.optional(PlanStatus),')
    expect(schemaSource).toContain('Planning sessions are the authoritative plan store.')

    expect(agentRunsSource).toContain('const normalizedEvents = [...args.events].sort')
    expect(agentRunsSource).toContain('return normalizedEvents.length')
    expect(agentRunsSource).toContain('mode: ChatMode,')
    expect(agentRunsSource).toContain('assertAgentRunTransition')
    expect(agentRunsSource).toContain("from !== 'running'")
    expect(agentRunsSource).toContain('Cannot transition agent run from ${from} to ${to}')
    expect(agentRunsSource).toContain('terminationReason: v.optional(TerminationReason),')
    expect(agentRunsSource).toContain('terminationReason: args.terminationReason,')
    expect(agentRunsSource).toContain('export const getLatestReceiptByChat = query({')
    expect(agentRunsSource).toContain('.take(1)')
    expect(agentRunsSource).toContain('receipt: run.receipt ?? null')
  })
})
