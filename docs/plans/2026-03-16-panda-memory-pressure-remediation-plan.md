# Panda Memory Pressure Remediation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate the six validated sources of memory pressure in Panda's agent harness and UI layer.

**Architecture:** Fix checkpoint cloning to avoid per-step deep copies, paginate unbounded Convex queries, add session cleanup to module-level singletons, wire `runtime.abort()` on unmount, add unmount timer cleanup, and virtualize long lists.

**Tech Stack:** TypeScript, React, Convex, @tanstack/react-virtual

---

## Task 1: Reduce checkpoint cloning overhead

The top memory pressure source. `serializeStateForCheckpoint()` calls `structuredClone(this.state.messages)` on every step (up to 6 `saveCheckpoint` call sites in `runLoop`). A 50-step run with a growing message array creates 50 full deep copies.

**Files:**
- Modify: `apps/web/lib/agent/harness/runtime.ts:2430-2452` (serializeStateForCheckpoint)
- Modify: `apps/web/lib/agent/harness/runtime.ts:2478-2495` (saveCheckpoint)
- Test: `apps/web/lib/agent/harness/runtime.test.ts`

**Step 1: Write failing test — checkpoint does not deep-clone messages on every save**

```typescript
// In runtime.test.ts — add to the checkpoint test section
it('should not structuredClone the full message array on every checkpoint', async () => {
  const checkpoints: unknown[] = []
  const mockCheckpointStore = {
    save: vi.fn(async (cp: unknown) => { checkpoints.push(cp) }),
    load: vi.fn(async () => null),
  }

  const runtime = createRuntime(mockProvider, mockToolExecutors, {
    checkpointStore: mockCheckpointStore,
  })

  // Spy on structuredClone to count calls
  const cloneSpy = vi.spyOn(globalThis, 'structuredClone')

  // Run a short agent session (2 steps)
  const events = []
  for await (const event of runtime.run(testAgent, testMessages)) {
    events.push(event)
  }

  // structuredClone should NOT be called once per step for messages
  // It may still be called for other fields, but the count should be
  // significantly less than (steps * 2) — the old behavior cloned
  // messages + pendingSubtasks per checkpoint
  const messageCloneCalls = cloneSpy.mock.calls.filter(
    (args) => Array.isArray(args[0]) && args[0].length > 0 && args[0][0]?.role
  )
  expect(messageCloneCalls.length).toBeLessThanOrEqual(1)

  cloneSpy.mockRestore()
})
```

**Step 2: Run test to verify it fails**

Run: `cd "apps/web" && bun test lib/agent/harness/runtime.test.ts -t "structuredClone"`
Expected: FAIL — current code clones messages on every checkpoint

**Step 3: Implement incremental checkpoint serialization**

Replace `serializeStateForCheckpoint` to use a dirty flag instead of cloning the full array every time:

```typescript
// In runtime.ts — add a field to RuntimeState (near line 87)
// Add after `lastInterventionStep: number`:
  checkpointMessageSnapshot: Message[] | null  // Last serialized messages, reused if unchanged
  messagesDirtySinceCheckpoint: boolean        // Whether messages changed since last snapshot

// In createInitialState (near line 450), add:
  checkpointMessageSnapshot: null,
  messagesDirtySinceCheckpoint: true,

// Wherever messages are mutated (this.state.messages.push or messages array is replaced),
// set: this.state.messagesDirtySinceCheckpoint = true
// Key locations:
//   - After message push in executeStep (search for state.messages.push)
//   - After compaction replaces the messages array

// Replace serializeStateForCheckpoint (line 2430-2452):
private serializeStateForCheckpoint(): RuntimeCheckpointState | null {
  if (!this.state) return null

  // Only clone messages when they've actually changed since last checkpoint
  if (this.state.messagesDirtySinceCheckpoint || !this.state.checkpointMessageSnapshot) {
    this.state.checkpointMessageSnapshot = structuredClone(this.state.messages)
    this.state.messagesDirtySinceCheckpoint = false
  }

  return {
    sessionID: this.state.sessionID,
    messages: this.state.checkpointMessageSnapshot,
    step: this.state.step,
    isComplete: this.state.isComplete,
    isLastStep: this.state.isLastStep,
    pendingSubtasks: structuredClone(this.state.pendingSubtasks),
    cost: this.state.cost,
    tokens: { ...this.state.tokens },
    lastToolLoopSignature: this.state.lastToolLoopSignature,
    toolLoopStreak: this.state.toolLoopStreak,
    toolCallHistory: this.state.toolCallHistory,
    toolCallFrequency: Array.from(this.state.toolCallFrequency.entries()).map(([key, count]) => ({
      key,
      count,
    })),
    cyclicPatternDetected: this.state.cyclicPatternDetected,
    lastInterventionStep: this.state.lastInterventionStep,
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd "apps/web" && bun test lib/agent/harness/runtime.test.ts -t "structuredClone"`
Expected: PASS

**Step 5: Run full harness test suite**

Run: `cd "apps/web" && bun test lib/agent/harness/`
Expected: All pass

**Step 6: Commit**

```bash
git add apps/web/lib/agent/harness/runtime.ts apps/web/lib/agent/harness/runtime.test.ts
git commit -m "perf: avoid per-step structuredClone of messages in checkpoint serialization"
```

---

## Task 2: Add session cleanup to module-level singletons

Three singletons accumulate per-session state that is never released: `SnapshotManager`, `CompactionManager`, and `PermissionManager`. The `PermissionManager.clearCache()` only clears `userDecisions` — `sessionPermissions` has no cleanup path.

**Files:**
- Modify: `apps/web/lib/agent/harness/permissions.ts:295-300` (add `clearSession` method)
- Modify: `apps/web/lib/agent/harness/runtime.ts:584-596` (add cleanup in session end / catch)
- Test: `apps/web/lib/agent/harness/runtime.test.ts`

**Step 1: Write failing test — singletons are cleaned up after run completes**

```typescript
import { snapshots } from '../harness/snapshots'
import { compaction } from '../harness/compaction'
import { permissions } from '../harness/permissions'

it('should clear singleton session state after run completes', async () => {
  const runtime = createRuntime(mockProvider, mockToolExecutors)

  const events = []
  for await (const event of runtime.run(testAgent, testMessages)) {
    events.push(event)
  }

  const sessionID = events.find(e => e.type === 'session_start')?.sessionID
  expect(sessionID).toBeDefined()

  // After run completes, singleton state for this session should be cleared
  expect(snapshots.getSnapshots(sessionID!)).toEqual([])
  expect(compaction.getSummary(sessionID!)).toBeUndefined()
  expect(permissions.getSessionPermissions(sessionID!)).toBeUndefined()
})
```

**Step 2: Run test to verify it fails**

Run: `cd "apps/web" && bun test lib/agent/harness/runtime.test.ts -t "singleton session state"`
Expected: FAIL — singletons retain session data after run

**Step 3: Add `clearSession` to PermissionManager**

In `permissions.ts`, after the `clearCache` method (line 300):

```typescript
/**
 * Clear all state for a session
 */
clearSession(sessionID: Identifier): void {
  this.sessionPermissions.delete(sessionID)
  // Also clear decisions scoped to this session
  for (const key of this.userDecisions.keys()) {
    if (key.startsWith(`${sessionID}:`)) {
      this.userDecisions.delete(key)
    }
  }
}
```

**Step 4: Add cleanup call in runtime.ts runLoop**

In `runtime.ts`, add a private cleanup method and call it from both the success path and catch block:

```typescript
// Add as a private method on the Runtime class:
private cleanupSessionSingletons(sessionID: Identifier): void {
  snapshots.clear(sessionID)
  compaction.clearSummary(sessionID)
  permissions.clearSession(sessionID)
}
```

Call it in two places:
1. After `session.end` hook (line ~588): `this.cleanupSessionSingletons(sessionID)`
2. In the catch block (line ~589-595), after `saveCheckpoint`: `this.cleanupSessionSingletons(sessionID)`
3. After the max-steps error return (line ~556): `this.cleanupSessionSingletons(sessionID)`

**Step 5: Run test to verify it passes**

Run: `cd "apps/web" && bun test lib/agent/harness/runtime.test.ts -t "singleton session state"`
Expected: PASS

**Step 6: Run full harness test suite**

Run: `cd "apps/web" && bun test lib/agent/harness/`
Expected: All pass

**Step 7: Commit**

```bash
git add apps/web/lib/agent/harness/permissions.ts apps/web/lib/agent/harness/runtime.ts apps/web/lib/agent/harness/runtime.test.ts
git commit -m "fix: clear singleton session state (snapshots, compaction, permissions) after run"
```

---

## Task 3: Paginate `api.messages.list`

Currently returns every message in a chat via `.collect()` with no limit. Both the Convex query and `useAgent.ts` hold the full unbounded result.

**Files:**
- Modify: `convex/messages.ts:8-18` (add pagination)
- Modify: `apps/web/hooks/useAgent.ts:270` (consume paginated query)
- Test: `apps/web/app/api/e2e/project/route.test.ts` (if message-related E2E tests exist)

**Step 1: Add a paginated messages query**

In `convex/messages.ts`, add a new query alongside the existing `list`:

```typescript
// paginated list - returns messages with cursor-based pagination
export const listPaginated = query({
  args: {
    chatId: v.id('chats'),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await requireChatOwner(ctx, args.chatId)
    return await ctx.db
      .query('messages')
      .withIndex('by_created', (q) => q.eq('chatId', args.chatId))
      .order('asc')
      .paginate(args.paginationOpts)
  },
})
```

Add import at top of file: `import { paginationOptsValidator } from 'convex/server'`

**Step 2: Update `useAgent.ts` to use paginated query**

In `useAgent.ts`, replace the `useQuery(api.messages.list, ...)` call (line ~270) with `usePaginatedQuery`:

```typescript
import { usePaginatedQuery } from 'convex/react'

// Replace the existing useQuery for messages:
const {
  results: persistedMessages,
  loadMore,
  status: messagesPaginationStatus,
} = usePaginatedQuery(
  api.messages.listPaginated,
  chatId ? { chatId } : 'skip',
  { initialNumItems: 50 }
)
```

**Note:** Keep the original `list` query for backward compat — other callers may use it. The `listPaginated` is additive.

**Step 3: Deploy and test**

Run: `npx convex dev` to deploy the new query
Run: `cd "apps/web" && bun test` — verify no regressions

**Step 4: Commit**

```bash
git add convex/messages.ts apps/web/hooks/useAgent.ts
git commit -m "perf: paginate messages.list to avoid loading entire chat history"
```

---

## Task 4: Lazy-load file content in `api.files.list`

Currently returns full `content` for every file in the project. The list query should return metadata only; content loaded on demand.

**Files:**
- Modify: `convex/files.ts:8-17` (exclude content from list)
- Modify: `apps/web/hooks/useAgent.ts:299-323` (adapt to metadata-only list)
- Modify: `apps/web/hooks/useAgent.ts:1640` (remove projectFiles from sendMessageInternal deps)

**Step 1: Create a lightweight list query**

In `convex/files.ts`, add a new query that excludes content:

```typescript
// listMetadata (query) - list file metadata without content
export const listMetadata = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    const files = await ctx.db
      .query('files')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect()
    return files.map(({ content, ...meta }) => meta)
  },
})
```

**Step 2: Update useAgent.ts to use metadata-only list**

In `useAgent.ts` line ~299, switch from `api.files.list` to `api.files.listMetadata`. The `projectFiles` array will no longer contain `content`.

For `buildAgentPromptContext` which needs file contents, use the existing `api.files.batchGet` query to fetch content only for files actually needed by the prompt (or use a separate subscription scoped to open/active files).

**Step 3: Remove `projectFiles` from `sendMessageInternal` dependency array**

In `useAgent.ts` line ~1640, the `sendMessageInternal` callback captures `projectFiles` (the full file list with content). After switching to metadata-only, this closure no longer holds file contents. If prompt building still needs content, fetch it inside `sendMessageInternal` via a Convex action call rather than closing over the full array.

**Step 4: Deploy and test**

Run: `npx convex dev`
Run: `cd "apps/web" && bun test`

**Step 5: Commit**

```bash
git add convex/files.ts apps/web/hooks/useAgent.ts
git commit -m "perf: exclude file content from list query, load on demand"
```

---

## Task 5: Wire `runtime.abort()` on unmount

`useAgent.ts` `stop()` (line 516-517) aborts the hook-local `AbortController` but never calls `runtime.abort()` (`runtime.ts:2700`). The runtime's own controller (created at `runtime.ts:454`) is orphaned, so the LLM provider stream continues until natural termination.

**Files:**
- Modify: `apps/web/hooks/useAgent.ts:510-529` (call runtime.abort in stop)
- Test: `apps/web/hooks/useAgent.ts` (manual verification — hook tests are integration-level)

**Step 1: Add runtime.abort() call to stop()**

In `useAgent.ts`, inside the `stop` callback (line ~516-517), after aborting the hook controller:

```typescript
// Existing:
if (abortControllerRef.current) {
  abortControllerRef.current.abort()
}
// Add immediately after:
if (runtimeRef.current?.abort) {
  runtimeRef.current.abort()
}
```

**Step 2: Verify the runtime ref type exposes abort**

Check that `runtimeRef.current` is typed as `Runtime` (from `harness/runtime.ts`) and that `abort()` is a public method. It is — see `runtime.ts:2700`.

**Step 3: Run tests**

Run: `cd "apps/web" && bun test`
Expected: All pass

**Step 4: Commit**

```bash
git add apps/web/hooks/useAgent.ts
git commit -m "fix: call runtime.abort() on stop to terminate provider stream"
```

---

## Task 6: Add unmount cleanup for timers in useRunEventBuffer

The retry `setTimeout` (line 120) and scheduled flush timer (line 150) are never cancelled on unmount. Post-unmount `setState` calls result in React warnings and minor memory retention.

**Files:**
- Modify: `apps/web/hooks/useRunEventBuffer.ts` (add cleanup)
- Test: `apps/web/hooks/useRunEventBuffer.test.ts` (if exists, otherwise manual)

**Step 1: The hook is consumed by useAgent, not standalone. Add a `cleanup` function to the return value**

At the bottom of `useRunEventBuffer`, add a cleanup callback:

```typescript
const cleanup = useCallback(() => {
  if (runEventFlushTimerRef.current !== null) {
    clearTimeout(runEventFlushTimerRef.current)
    runEventFlushTimerRef.current = null
  }
}, [])
```

Add `cleanup` to the return object.

**Step 2: Call cleanup from useAgent's unmount effect**

In `useAgent.ts`, in the unmount `useEffect` (line ~1766-1770), call the buffer cleanup:

```typescript
useEffect(() => {
  return () => {
    stop()
    runEventBufferCleanup()  // from useRunEventBuffer return
  }
}, [stop, runEventBufferCleanup])
```

**Step 3: Run tests**

Run: `cd "apps/web" && bun test`
Expected: All pass

**Step 4: Commit**

```bash
git add apps/web/hooks/useRunEventBuffer.ts apps/web/hooks/useAgent.ts
git commit -m "fix: cancel flush timers on unmount to prevent post-unmount setState"
```

---

## Task 7: Virtualize MessageList

All messages render in the DOM simultaneously with Framer Motion animations. For long chats this creates significant layout/render pressure.

**Files:**
- Modify: `apps/web/components/chat/MessageList.tsx:53-87`
- Modify: `package.json` (add @tanstack/react-virtual if not present)

**Step 1: Install @tanstack/react-virtual**

Run: `cd "apps/web" && bun add @tanstack/react-virtual`

**Step 2: Rewrite MessageList with virtualization**

Replace the current `messages.map()` with a virtualized list:

```typescript
import { useVirtualizer } from '@tanstack/react-virtual'

export function MessageList({ messages, isStreaming, onSuggestedAction }: MessageListProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,  // estimated row height
    overscan: 5,
  })

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      virtualizer.scrollToIndex(messages.length - 1, { align: 'end', behavior: 'smooth' })
    }
  }, [messages.length, isStreaming, virtualizer])

  if (messages.length === 0) {
    // ... keep existing empty state
  }

  return (
    <div ref={parentRef} className="h-full min-h-0 min-w-0 overflow-auto">
      <div
        className="relative w-full"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const message = messages[virtualRow.index]
          return (
            <div
              key={message._id}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className="absolute left-0 top-0 w-full px-3 py-2 xl:px-4"
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              <MessageBubble
                message={message}
                isStreaming={
                  isStreaming &&
                  virtualRow.index === messages.length - 1 &&
                  message.role === 'assistant'
                }
                onSuggestedAction={onSuggestedAction}
                disableActions={isStreaming}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

**Note:** This removes the per-message `motion.div` entrance animation (the `delay: index * 0.05` pattern). That animation was O(n) anyway and would be a performance problem on long chats. Keep entrance animation only for the most recent message if desired.

**Step 3: Visually test**

Run the dev server and verify:
- Messages render correctly
- Scrolling is smooth
- Auto-scroll to bottom works on new messages
- Streaming message updates correctly

**Step 4: Commit**

```bash
git add apps/web/components/chat/MessageList.tsx apps/web/package.json apps/web/bun.lockb
git commit -m "perf: virtualize MessageList to reduce DOM pressure on long chats"
```

---

## Execution Order & Dependencies

```
Task 1 (checkpoint cloning)     — independent, highest impact
Task 2 (singleton cleanup)      — independent, high impact
Task 3 (paginate messages)      — independent, high impact
Task 4 (lazy-load file content) — independent, high impact
Task 5 (runtime.abort)          — independent, quick fix
Task 6 (timer cleanup)          — independent, quick fix
Task 7 (virtualize MessageList) — independent, UI change
```

All tasks are independent and can be executed in any order. Tasks 1-2 are harness-internal changes with low regression risk. Tasks 3-4 touch the Convex layer and require `npx convex dev`. Tasks 5-6 are small targeted fixes. Task 7 is a UI refactor.

Recommended batching:
- **Batch A** (harness internals): Tasks 1, 2, 5
- **Batch B** (data layer): Tasks 3, 4
- **Batch C** (UI): Tasks 6, 7
