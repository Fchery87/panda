# Convex Bandwidth Optimization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Reduce Convex database bandwidth by measuring query payloads,
shrinking default live-query results, and loading large data only when the UI
actually needs it.

**Architecture:** Treat Convex bandwidth as a data-shape problem first. Add
small payload-measurement utilities and tests, then replace broad default
subscriptions with metadata, summary, paginated, and lazy-detail queries while
preserving existing workspace behavior.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Convex
queries/mutations/actions, Bun test runner, Playwright E2E.

## Current Root Causes

- `apps/web/components/projects/ProjectShellDataLoader.tsx` subscribes to
  `api.files.list`, which returns every file including `content` from
  `convex/files.ts`.
- `ProjectShellDataLoader` also subscribes to `api.chats.list`, which uses
  `.collect()` and returns every chat for the project.
- `convex/messages.ts` has paginated messages, but each message is hydrated with
  per-message attachment queries and storage URL resolution.
- `apps/web/hooks/useWorkbenchChatState.ts` subscribes to
  `api.agentRuns.listEventsByChat` with `limit: 120`, and
  `apps/web/components/chat/RunProgressPanel.tsx` separately subscribes to
  events and runtime checkpoints.
- `convex/agentRuns.ts` returns full runtime checkpoint documents even though
  most UI surfaces only need checkpoint metadata.
- `convex/sharing.ts` returns full shared transcript history in one query.
- `convex/agentRuns.ts:usageByChatMode` collects all runs for a chat whenever
  `useAgent` mounts.

## Success Criteria

- Project page initial Convex payload no longer includes file contents for all
  project files.
- Active chat message loading remains paginated and does not duplicate
  independent transcript subscriptions for the same panel.
- Run panels fetch event/checkpoint summaries by default; full checkpoint
  payload is loaded only when resuming.
- Shared chat pages are paginated or capped with explicit load-more behavior.
- Tests cover payload shape regressions so broad queries do not reappear
  accidentally.
- Verification passes: `bun run typecheck`, `bun run lint`,
  `bun run format:check`, `bun test`, and targeted E2E for workbench and
  sharing.

## Non-Goals

- Do not redesign the workspace UI.
- Do not migrate file contents out of Convex storage in this pass.
- Do not remove realtime behavior from active chat or active project metadata.
- Do not introduce new infrastructure or external analytics services.

## Task 1: Add Payload Shape Tests for Existing Hotspots

**Files:**

- Create: `convex/bandwidth.payload-shape.test.ts`
- Modify only if needed: `convex/files.ts`
- Modify only if needed: `convex/messages.ts`
- Modify only if needed: `convex/agentRuns.ts`
- Modify only if needed: `convex/sharing.ts`

**Step 1: Write failing regression tests**

Create tests that assert the intended slim query contracts before
implementation. Use the existing Convex test style in `convex/*.test.ts` as the
local pattern.

Test cases to add:

```ts
import { describe, expect, test } from 'bun:test'

describe('Convex bandwidth payload contracts', () => {
  test('files.listMetadata excludes content', () => {
    const file = {
      _id: 'file-id',
      path: 'src/index.ts',
      content: 'large file content',
      isBinary: false,
      updatedAt: 123,
    }

    const { content, ...metadata } = file

    expect(metadata).not.toHaveProperty('content')
    expect(metadata).toEqual({
      _id: 'file-id',
      path: 'src/index.ts',
      isBinary: false,
      updatedAt: 123,
    })
  })

  test('runtime checkpoint summaries exclude checkpoint payload', () => {
    const row = {
      _id: 'checkpoint-id',
      reason: 'step',
      savedAt: 123,
      sessionID: 'session-1',
      checkpoint: { state: { messages: [{ content: 'large transcript' }] } },
    }

    const summary = {
      _id: row._id,
      reason: row.reason,
      savedAt: row.savedAt,
      sessionID: row.sessionID,
    }

    expect(summary).not.toHaveProperty('checkpoint')
  })
})
```

**Step 2: Run the new test**

Run: `bun test convex/bandwidth.payload-shape.test.ts`

Expected: PASS for pure helper tests, or FAIL if the tests import helpers that
do not exist yet.

**Step 3: Commit**

Do not commit unless the user explicitly asks for commits in the execution
session. If commits are requested, use:

```bash
git add convex/bandwidth.payload-shape.test.ts
git commit -m "test: capture convex bandwidth payload contracts"
```

## Task 2: Replace Project Boot File Content Subscription

**Files:**

- Modify: `apps/web/components/projects/ProjectShellDataLoader.tsx`
- Modify: `apps/web/components/projects/WorkspaceRuntimeProvider.tsx`
- Modify: `apps/web/hooks/useProjectWorkbenchFiles.ts`
- Modify: `apps/web/hooks/useProjectRuntimeControls.ts`
- Modify: `apps/web/hooks/useProjectRequestedFileSync.ts`
- Modify: `apps/web/components/workbench/*` only where TypeScript requires
  updated file types
- Test: `apps/web/components/projects/ProjectShellDataLoader.test.tsx`

**Step 1: Update ProjectShellDataLoader to use metadata**

Change this:

```ts
const files = useQuery(api.files.list, { projectId })
```

To this:

```ts
const files = useQuery(api.files.listMetadata, { projectId })
```

**Step 2: Rename the provider prop type locally**

In `WorkspaceRuntimeProvider.tsx`, replace the `File` interface with a
metadata-only type:

```ts
interface ProjectFileMetadata {
  _id: Id<'files'>
  _creationTime: number
  projectId: Id<'projects'>
  path: string
  isBinary?: boolean
  updatedAt: number
}
```

Update props from `files: File[]` to `files: ProjectFileMetadata[]`.

**Step 3: Load file content on demand for editor open**

In `useProjectWorkbenchFiles.ts`, add `useConvex` and fetch content through
`api.files.getByPath` inside `handleFileSelect` before or after setting the
selected file path, depending on the current editor data flow.

Use this minimal shape:

```ts
const convex = useConvex()

const loadFileContent = useCallback(
  async (path: string) => {
    return await convex.query(api.files.getByPath, { projectId, path })
  },
  [convex, projectId]
)
```

Only store the content in the component/store that actually renders the editor.
Do not reintroduce full-project content into provider state.

**Step 4: Fix rename and save flows**

`handleFileRename` currently sends `content: file.content`. Since metadata does
not contain content, change rename to a Convex mutation that renames without
requiring content.

Add to `convex/files.ts`:

```ts
export const rename = mutation({
  args: {
    id: v.id('files'),
    projectId: v.id('projects'),
    path: v.string(),
  },
  handler: async (ctx, args) => {
    const { file: existing } = await requireFileOwner(ctx, args.id)
    if (existing.projectId !== args.projectId) {
      throw new Error('File does not belong to the specified project')
    }

    const pathConflict = await ctx.db
      .query('files')
      .withIndex('by_path', (q) =>
        q.eq('projectId', args.projectId).eq('path', args.path)
      )
      .unique()

    if (pathConflict && pathConflict._id !== args.id) {
      throw new Error(`File already exists at path: ${args.path}`)
    }

    await ctx.db.patch(args.id, { path: args.path, updatedAt: Date.now() })
    return args.id
  },
})
```

Use `api.files.rename` in `handleFileRename`.

**Step 5: Fix runtime start if it needs full files**

`WorkspaceRuntimeProvider.tsx` passes `files` to `useProjectRuntimeControls`. If
that hook needs full content for preview/runtime, fetch full files only when
starting runtime using `convex.query(api.files.list, { projectId })`, not at
project boot.

**Step 6: Run targeted checks**

Run:
`bun test apps/web/components/projects/ProjectShellDataLoader.test.tsx apps/web/hooks/useProjectWorkbenchFiles.test.ts`

Expected: PASS. If no hook test exists, add one for metadata-only rename
behavior.

## Task 3: Slim Chat List Query and Add Chat Pagination

**Files:**

- Modify: `convex/chats.ts`
- Modify: `apps/web/components/projects/ProjectShellDataLoader.tsx`
- Modify: `apps/web/hooks/useProjectChatSession.ts`
- Modify: chat history UI files if they require all chats
- Test: `convex/chats.bandwidth.test.ts`

**Step 1: Add a bounded summary query**

In `convex/chats.ts`, add:

```ts
export const listRecent = query({
  args: {
    projectId: v.id('projects'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    const limit = Math.max(1, Math.min(args.limit ?? 25, 100))
    const chats = await ctx.db
      .query('chats')
      .withIndex('by_updated', (q) => q.eq('projectId', args.projectId))
      .order('desc')
      .take(limit)

    return chats.map((chat) => ({
      _id: chat._id,
      projectId: chat.projectId,
      title: chat.title,
      mode: chat.mode,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    }))
  },
})
```

**Step 2: Use listRecent at project boot**

In `ProjectShellDataLoader.tsx`, replace `api.chats.list` with
`api.chats.listRecent` and pass `{ projectId, limit: 25 }`.

**Step 3: Preserve active-chat selection**

In `useProjectChatSession.ts`, ensure active chat selection still defaults to
the most recently updated chat. Add handling for the case where a route or
search param later points to a chat not in the first page.

**Step 4: Add a full history path only for history UI**

If the chat history drawer needs older chats, add a paginated query using
`paginationOptsValidator`; do not use `.collect()` at project boot.

**Step 5: Run targeted tests**

Run:
`bun test convex/chats.bandwidth.test.ts apps/web/components/projects/ProjectShellDataLoader.test.tsx`

Expected: PASS.

## Task 4: Remove Duplicate Message Subscriptions

**Files:**

- Modify: `apps/web/hooks/useAgent.ts`
- Modify: `apps/web/hooks/useMessageHistory.ts`
- Modify: `apps/web/hooks/useWorkbenchChatState.ts`
- Modify: `apps/web/components/projects/WorkspaceRuntimeProvider.tsx`
- Test: add or update `apps/web/hooks/useWorkbenchChatState.test.ts`

**Step 1: Identify the owner of persisted chat history**

Make `useWorkbenchChatState` the single UI owner for persisted active-chat
transcript data in the workspace shell.

**Step 2: Disable useAgent history hydration when embedded in workspace**

Add an option to `useAgent`:

```ts
hydratePersistedMessages?: boolean
```

Default it to `true` for backward compatibility inside the hook, but pass
`false` from `WorkspaceRuntimeProvider`.

**Step 3: Gate useMessageHistory**

Update `useMessageHistory` to accept `enabled`:

```ts
export function useMessageHistory(
  chatId: Id<'chats'> | undefined,
  mode: ChatMode,
  getReasoningRuntimeSettings: () => { showReasoningPanel: boolean },
  isRunningRef: React.RefObject<boolean>,
  enabled = true
): UseMessageHistoryResult {
  const queryArgs = enabled && chatId ? { chatId } : 'skip'
  // use queryArgs in usePaginatedQuery
}
```

**Step 4: Keep streaming local state intact**

Ensure `useAgent` still manages the in-flight user/assistant messages during a
run. Only skip the redundant persisted hydration subscription.

**Step 5: Lower initial message page size**

In `useWorkbenchChatState.ts`, reduce `{ initialNumItems: 100 }` to
`{ initialNumItems: 50 }`. Add load-more UI later only if users report missing
older context in the visible transcript.

**Step 6: Run targeted tests**

Run:
`bun test apps/web/hooks/useMessageHistory.test.ts apps/web/hooks/useWorkbenchChatState.test.ts`

Expected: PASS. If these tests do not exist, add focused hook tests for skip
behavior and initial page-size config.

## Task 5: Split Message Attachment Metadata from Signed URLs

**Files:**

- Modify: `convex/messages.ts`
- Modify: `apps/web/hooks/useMessageHistory.ts`
- Modify: `apps/web/hooks/useWorkbenchChatState.ts`
- Modify: `apps/web/components/chat/MessageBubble.tsx`
- Test: `convex/messages.bandwidth.test.ts`

**Step 1: Add a no-URL message list query**

In `convex/messages.ts`, add `listPaginatedLite` that returns messages plus
attachment metadata but does not call `ctx.storage.getUrl` for every attachment.

Return attachment fields needed for display:

```ts
{
  _id,
  storageId,
  kind,
  filename,
  contentType,
  size,
  contextFilePath,
  createdAt,
}
```

**Step 2: Add attachment URL query**

Add a query that resolves one attachment URL by attachment id:

```ts
export const getAttachmentUrl = query({
  args: { attachmentId: v.id('chatAttachments') },
  handler: async (ctx, args) => {
    const attachment = await ctx.db.get(args.attachmentId)
    if (!attachment) return null
    await requireMessageOwner(ctx, attachment.messageId)
    return await ctx.storage.getUrl(attachment.storageId)
  },
})
```

**Step 3: Use lite query in workspace**

Switch `useWorkbenchChatState` and `useMessageHistory` to
`api.messages.listPaginatedLite`.

**Step 4: Resolve URLs only in the component that needs preview/download**

In `MessageBubble.tsx`, call `api.messages.getAttachmentUrl` only when rendering
an image preview or when the user opens/downloads the attachment.

**Step 5: Run targeted tests**

Run:
`bun test convex/messages.bandwidth.test.ts apps/web/components/chat/MessageBubble.test.tsx`

Expected: PASS.

## Task 6: Add Run Event Summary Query and Remove Duplicate Event Subscriptions

**Files:**

- Modify: `convex/agentRuns.ts`
- Modify: `apps/web/hooks/useWorkbenchChatState.ts`
- Modify: `apps/web/components/chat/RunProgressPanel.tsx`
- Modify: `apps/web/components/projects/ProjectChatPanel.tsx`
- Modify: `apps/web/components/projects/ProjectChatInspector.tsx`
- Test: `convex/agentRuns.bandwidth.test.ts`

**Step 1: Add an event summary mapper**

In `convex/agentRuns.ts`, add a local helper:

```ts
function toRunEventSummary(event: Doc<'agentRunEvents'>) {
  return {
    _id: event._id,
    runId: event.runId,
    chatId: event.chatId,
    sequence: event.sequence,
    type: event.type,
    status: event.status,
    progressCategory: event.progressCategory,
    progressToolName: event.progressToolName,
    progressHasArtifactTarget: event.progressHasArtifactTarget,
    targetFilePaths: event.targetFilePaths,
    toolCallId: event.toolCallId,
    toolName: event.toolName,
    durationMs: event.durationMs,
    planStepIndex: event.planStepIndex,
    planStepTitle: event.planStepTitle,
    planTotalSteps: event.planTotalSteps,
    completedPlanStepIndexes: event.completedPlanStepIndexes,
    usage: event.usage,
    snapshot: event.snapshot,
    createdAt: event.createdAt,
    contentPreview: event.content?.slice(0, 500),
    errorPreview: event.error?.slice(0, 500),
  }
}
```

Import `Doc` from `./_generated/dataModel` if needed.

**Step 2: Add listEventSummariesByChat**

Add a query mirroring `listEventsByChat`, but return summaries and default to
`limit: 60`, max `200`.

**Step 3: Switch UI to summaries by default**

Change `useWorkbenchChatState` to call `api.agentRuns.listEventSummariesByChat`
with `limit: 60`.

Change `RunProgressPanel` to accept `runEvents` from context instead of making
its own `useQuery(api.agentRuns.listEventsByChat)`.

**Step 4: Avoid querying run data while run tab is closed**

Move runtime checkpoint summary query out of always-mounted chat panel if
possible. Query checkpoint summaries only when the resume banner or run
inspector needs them.

**Step 5: Run targeted tests**

Run:
`bun test convex/agentRuns.bandwidth.test.ts apps/web/components/chat/RunProgressPanel.test.tsx`

Expected: PASS.

## Task 7: Split Runtime Checkpoint Summary from Full Checkpoint Payload

**Files:**

- Modify: `convex/agentRuns.ts`
- Modify: `apps/web/components/chat/RunProgressPanel.tsx`
- Modify: `apps/web/components/projects/ProjectChatPanel.tsx`
- Modify: `apps/web/lib/agent/harness/convex-checkpoint-store.ts`
- Test: `convex/agentRuns.bandwidth.test.ts`

**Step 1: Add listRuntimeCheckpointSummaries**

In `convex/agentRuns.ts`, add:

```ts
export const listRuntimeCheckpointSummaries = query({
  args: {
    runId: v.optional(v.id('agentRuns')),
    chatId: v.optional(v.id('chats')),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const rows = await loadRuntimeCheckpointRows(ctx, args)
    return rows.map((row) => ({
      _id: row._id,
      runId: row.runId,
      chatId: row.chatId,
      sessionID: row.sessionID,
      reason: row.reason,
      savedAt: row.savedAt,
      agentName: row.agentName,
      version: row.version,
    }))
  },
})
```

If a shared helper is too much churn, duplicate the small query branches from
`listRuntimeCheckpoints` and return summaries.

**Step 2: Keep full payload query only for resume**

Keep `getLatestRuntimeCheckpoint` for resume flows. Do not use
`listRuntimeCheckpoints` in UI badges or panels.

**Step 3: Update UI consumers**

Replace `api.agentRuns.listRuntimeCheckpoints` with
`api.agentRuns.listRuntimeCheckpointSummaries` in `RunProgressPanel.tsx` and
`ProjectChatPanel.tsx`.

**Step 4: Run targeted tests**

Run: `bun test convex/agentRuns.bandwidth.test.ts`

Expected: PASS.

## Task 8: Replace usageByChatMode Full Scan with Stored Counters or Recent Summary

**Files:**

- Modify: `convex/agentRuns.ts`
- Modify: `apps/web/hooks/useAgent.ts`
- Optional Modify: `convex/schema.ts`
- Test: `convex/agentRuns.persistence.test.ts`

**Step 1: Check actual usage**

In `apps/web/hooks/useAgent.ts`, inspect how `persistedModeUsage` is used. If it
is only informational, remove the subscription entirely and derive
current-session usage locally.

**Step 2: Prefer removing the live query**

If no critical UI depends on historical mode usage, delete this query from
`useAgent`:

```ts
const persistedModeUsage = useQuery(
  api.agentRuns.usageByChatMode,
  chatId ? { chatId, mode } : 'skip'
)
```

**Step 3: If history is required, add a bounded query**

If the UI must show historical usage, replace `.collect()` with a recent bounded
query:

```ts
.order('desc').take(50)
```

Document that totals are recent-session estimates unless a separate aggregate
table is added.

**Step 4: Run targeted tests**

Run:
`bun test convex/agentRuns.persistence.test.ts apps/web/hooks/useAgent.test.ts`

Expected: PASS.

## Task 9: Paginate Shared Chat Transcript

**Files:**

- Modify: `convex/sharing.ts`
- Modify: `apps/web/app/s/[shareId]/SharedChatContent.tsx`
- Modify: `apps/web/components/chat/SharedTranscript.tsx`
- Test: `apps/web/e2e/sharing.e2e-spec.ts`

**Step 1: Add paginated shared messages query**

In `convex/sharing.ts`, add `getSharedChatHeader` and
`listSharedMessagesPaginated`.

Use `paginationOptsValidator` for messages.

`getSharedChatHeader` returns:

```ts
{
  chat: { title, mode, createdAt },
  sharedAt,
}
```

`listSharedMessagesPaginated` returns only:

```ts
{
  role,
  content,
  createdAt,
}
```

**Step 2: Update shared route component**

In `SharedChatContent.tsx`, use
`useQuery(api.sharing.getSharedChatHeader, { shareId })` for the header and
`usePaginatedQuery(api.sharing.listSharedMessagesPaginated, { shareId }, { initialNumItems: 50 })`
for messages.

**Step 3: Add load-more affordance**

In `SharedTranscript.tsx` or the page component, add a brutalist
`Load older messages` button when pagination status is `CanLoadMore`.

**Step 4: Run targeted E2E**

Run: `cd apps/web && bun run test:e2e -- e2e/sharing.e2e-spec.ts`

Expected: PASS.

## Task 10: Add Development Payload Instrumentation

**Files:**

- Create: `apps/web/lib/convex/payload-metrics.ts`
- Modify: `apps/web/components/projects/ProjectShellDataLoader.tsx`
- Modify: `apps/web/hooks/useWorkbenchChatState.ts`
- Modify: `apps/web/components/chat/RunProgressPanel.tsx`
- Test: `apps/web/lib/convex/payload-metrics.test.ts`

**Step 1: Add a tiny measurement utility**

Create:

```ts
export function estimateJsonBytes(value: unknown): number {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).length
  } catch {
    return 0
  }
}

export function logConvexPayload(label: string, value: unknown): void {
  if (process.env.NODE_ENV === 'production') return
  if (process.env.NEXT_PUBLIC_DEBUG_CONVEX_PAYLOADS !== '1') return
  const bytes = estimateJsonBytes(value)
  console.info(`[convex-payload] ${label}: ${bytes} bytes`)
}
```

**Step 2: Add tests**

Test `estimateJsonBytes` with a small object and circular-safe failure behavior.

**Step 3: Instrument only hotspot boundaries**

Log these payloads after query values load:

- project file metadata
- recent chats
- active chat messages
- run event summaries
- runtime checkpoint summaries

Do not log message content or secrets. Log byte counts only.

**Step 4: Run targeted tests**

Run: `bun test apps/web/lib/convex/payload-metrics.test.ts`

Expected: PASS.

## Task 11: Add Guardrails Against Reintroducing Broad Queries

**Files:**

- Create: `apps/web/lib/convex/bandwidth-guard.test.ts`
- Optional Create: `apps/web/lib/convex/bandwidth-guard.ts`

**Step 1: Add static tests for known bad call sites**

Create a Bun test that reads source files and asserts these patterns do not
exist:

```ts
expect(projectShellSource).not.toContain('api.files.list, { projectId }')
expect(projectShellSource).not.toContain('api.chats.list, { projectId }')
expect(runProgressSource).not.toContain('api.agentRuns.listRuntimeCheckpoints')
```

**Step 2: Run guard test**

Run: `bun test apps/web/lib/convex/bandwidth-guard.test.ts`

Expected: PASS.

## Task 12: Full Verification

**Files:**

- No code changes unless verification exposes issues.

**Step 1: Run codegen**

Run: `bun run convex:codegen`

Expected: Convex generated files update if API changed.

**Step 2: Run typecheck**

Run: `bun run typecheck`

Expected: PASS.

**Step 3: Run lint**

Run: `bun run lint`

Expected: PASS with zero warnings.

**Step 4: Run formatting check**

Run: `bun run format:check`

Expected: PASS.

**Step 5: Run unit tests**

Run: `bun test`

Expected: PASS.

**Step 6: Run targeted E2E**

Run:
`cd apps/web && bun run test:e2e -- e2e/workbench.e2e-spec.ts e2e/sharing.e2e-spec.ts`

Expected: PASS.

**Step 7: Manual payload spot check**

Run the app with:

```bash
NEXT_PUBLIC_DEBUG_CONVEX_PAYLOADS=1 bun run dev
```

Open a project and confirm console payload logs show metadata-sized project boot
payloads instead of full file content payloads.

## Rollout Order

1. Tasks 1-2 first because full-project file content is the largest obvious
   bandwidth leak.
2. Tasks 3-4 next because they reduce always-on chat payloads.
3. Tasks 5-7 next because they reduce hidden multipliers from attachments and
   runtime history.
4. Tasks 8-9 next because they remove scans and public transcript spikes.
5. Tasks 10-12 last because they prove the improvement and prevent regression.

## Risk Notes

- Moving file content to on-demand fetch may expose assumptions in editor,
  preview, rename, and runtime-start flows.
- Runtime checkpoint summaries must not break resume; keep full checkpoint reads
  in resume-only code paths.
- Message attachment URL lazy-loading can change image preview timing; preserve
  clear loading states.
- Reducing initial message page size may affect users who expect long history
  immediately visible; use load-more if needed.
- Existing worktree has unrelated modified files. During execution, do not
  revert or overwrite unrelated user changes.
