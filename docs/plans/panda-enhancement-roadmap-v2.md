# Panda.ai Enhancement Roadmap v2

**Date:** 2025-02-17  
**Status:** Cloud-Native Implementation Plan  
**Architecture:** Next.js 16 + Convex (Browser + Cloud Backend)

---

## Executive Summary

This roadmap adapts the Kilo Code comparative analysis for Panda's
**cloud-native web IDE architecture**. Features requiring local filesystem
access or desktop execution have been removed or adapted.

### What's Included

| Feature                | Adaptation                                       | Priority |
| ---------------------- | ------------------------------------------------ | -------- |
| Multi-Mode System      | Extend existing mode union in schema             | **P0**   |
| Checkpoint System      | Use existing `fileSnapshots` table + rollback UI | **P0**   |
| MCP Integration        | StreamableHTTP transport, server-side execution  | **P1**   |
| Semantic Code Indexing | Convex vector indexes                            | **P1**   |
| Orchestrator Mode      | Convex actions + real-time subscriptions         | **P2**   |
| Preview Enhancement    | Dev server proxy via jobs table                  | **P2**   |

### What's Removed

| Feature                       | Reason                                                |
| ----------------------------- | ----------------------------------------------------- |
| CLI Interface                 | User explicitly declined                              |
| Git Worktrees                 | No local filesystem in web IDE                        |
| Parallel Agents (as designed) | Requires local Git operations                         |
| Puppeteer Browser Automation  | Cloud-native IDE cannot run headless browsers locally |

---

## Phase 1: Foundation (Weeks 1-2)

### 1.1 Multi-Mode System Expansion

**Current State:** 4 modes (`ask`, `architect`, `code`, `build`)  
**Target:** 4 explicit user-facing modes

```typescript
// convex/schema.ts - Update chats table
mode: v.union(
  v.literal('ask'), // Read-only Q&A
  v.literal('architect'), // System design, limited edits
  v.literal('code'), // Full coding capabilities
  v.literal('build') // Full implementation
)
```

**Files to Modify:**

| File                                        | Changes                                  |
| ------------------------------------------- | ---------------------------------------- |
| `convex/schema.ts`                          | Extend mode union, migrate existing data |
| `apps/web/lib/agent/prompt-library.ts`      | Add mode-specific system prompts         |
| `apps/web/lib/agent/tools.ts`               | Add tool restrictions per mode           |
| `apps/web/components/chat/ChatInput.tsx`    | Add mode selector dropdown               |
| `apps/web/components/chat/ModeSelector.tsx` | New component for mode switching         |

**Mode Definitions:**

| Mode        | Tools Allowed                                  | File Access | Description                 |
| ----------- | ---------------------------------------------- | ----------- | --------------------------- |
| `ask`       | `search_code`, `search_code_ast`, `read_files` | Read-only   | Q&A without modifications   |
| `architect` | All read tools                                 | Read-only   | System design, planning     |
| `code`      | All tools                                      | Full access | Default implementation mode |
| `build`     | All tools                                      | Full access | Full implementation         |

**Complexity:** Low  
**Estimated Effort:** 3-4 days

---

### 1.2 Checkpoint System (Rollback)

**Current State:** `fileSnapshots` table exists but no rollback workflow  
**Target:** User-facing checkpoint restore functionality

**Implementation Strategy:**

Use existing `fileSnapshots` table. Add checkpoint metadata and restore UI.

```typescript
// convex/schema.ts - Add checkpoints metadata table
checkpoints: defineTable({
  projectId: v.id('projects'),
  chatId: v.id('chats'),
  name: v.string(),
  description: v.optional(v.string()),
  filesChanged: v.array(v.string()),
  snapshotIds: v.array(v.id('fileSnapshots')),
  createdAt: v.number(),
})
  .index('by_project', ['projectId'])
  .index('by_chat', ['chatId'])
```

**New Files:**

| File                                                   | Purpose                                    |
| ------------------------------------------------------ | ------------------------------------------ |
| `convex/checkpoints.ts`                                | Create, list, restore checkpoint mutations |
| `apps/web/components/chat/CheckpointIndicator.tsx`     | Show checkpoint status                     |
| `apps/web/components/chat/CheckpointRestoreDialog.tsx` | Restore workflow UI                        |

**Files to Modify:**

| File                          | Changes                              |
| ----------------------------- | ------------------------------------ |
| `apps/web/lib/agent/tools.ts` | Create checkpoint before file writes |
| `apps/web/hooks/useAgent.ts`  | Track checkpoint in run events       |

**User Workflow:**

1. Agent creates checkpoint before making changes
2. Checkpoint appears in chat timeline
3. User can "Restore" to revert all changes
4. Diff view shows what would be restored

**Complexity:** Medium  
**Estimated Effort:** 4-5 days

---

## Phase 2: Extensibility (Weeks 3-4)

### 2.1 MCP Integration (StreamableHTTP)

**Objective:** Add Model Context Protocol support for extensible tools

**Architecture Decision:** Use StreamableHTTP transport (not STDIO) since MCP
servers will run server-side.

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Browser Client │────▶│  Next.js API     │────▶│  MCP Server     │
│  (Panda UI)     │     │  /api/mcp        │     │  (HTTP/SSE)     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │  Convex          │
                        │  (tool configs)  │
                        └──────────────────┘
```

**Dependencies:**

```bash
bun add @modelcontextprotocol/sdk
```

**New Files:**

| File                                              | Purpose                            |
| ------------------------------------------------- | ---------------------------------- |
| `apps/web/lib/mcp/client.ts`                      | MCP client wrapper for server-side |
| `apps/web/lib/mcp/registry.ts`                    | Manage configured MCP servers      |
| `apps/web/app/api/mcp/route.ts`                   | StreamableHTTP endpoint            |
| `apps/web/components/settings/MCPConfigPanel.tsx` | Server management UI               |

**Schema Addition:**

```typescript
// convex/schema.ts
mcpServers: defineTable({
  userId: v.id('users'),
  projectId: v.optional(v.id('projects')),
  name: v.string(),
  url: v.string(), // HTTP endpoint for MCP server
  enabled: v.boolean(),
  headers: v.optional(v.record(v.string(), v.string())),
  createdAt: v.number(),
})
  .index('by_user', ['userId'])
  .index('by_project', ['projectId'])
```

**Example MCP Server Config:**

```typescript
// User adds an MCP server via settings
{
  name: "exa-search",
  url: "https://mcp.exa.ai/sse",
  headers: {
    "Authorization": "Bearer <api-key>"
  }
}
```

**Complexity:** High  
**Estimated Effort:** 1.5 weeks

---

### 2.2 Semantic Code Indexing

**Objective:** Vector-based semantic search using Convex's built-in vector
indexes

**Implementation Strategy:**

Convex supports vector indexes natively. Store code embeddings directly.

```typescript
// convex/schema.ts
codeEmbeddings: defineTable({
  projectId: v.id('projects'),
  filePath: v.string(),
  chunkId: v.string(),
  content: v.string(),
  startLine: v.number(),
  endLine: v.number(),
  embedding: v.array(v.float64()),
  indexedAt: v.number(),
})
  .index('by_project_file', ['projectId', 'filePath'])
  .vectorIndex('by_embedding', {
    vectorField: 'embedding',
    dimensions: 1536, // OpenAI text-embedding-3-small
    filterFields: ['projectId'],
  })
```

**New Files:**

| File                                     | Purpose                        |
| ---------------------------------------- | ------------------------------ |
| `convex/indexing.ts`                     | Indexing queries and mutations |
| `apps/web/lib/agent/indexing/chunker.ts` | Code chunking strategies       |
| `apps/web/app/api/index/route.ts`        | Trigger re-indexing            |

**Indexing Flow:**

1. On file save, queue chunking job
2. Chunk code by functions/classes
3. Generate embeddings via OpenAI API
4. Store in `codeEmbeddings` table
5. Query via Convex vector search

**Complexity:** Medium-High  
**Estimated Effort:** 1 week

---

## Phase 3: Advanced Features (Weeks 5-6)

### 3.1 Orchestrator Mode

**Objective:** Multi-step task coordination with Convex actions

**How It Works with Convex:**

Convex actions can orchestrate multiple agent calls. Real-time subscriptions
provide progress updates to the client.

```typescript
// convex/orchestrator.ts
export const decomposeAndExecute = action({
  args: { chatId: v.id('chats'), userRequest: v.string() },
  handler: async (ctx, args) => {
    // 1. Decompose task into subtasks (LLM call)
    const subtasks = await decomposeWithLLM(args.userRequest)

    // 2. Store subtasks in DB
    for (const subtask of subtasks) {
      await ctx.runMutation(api.subtasks.create, subtask)
    }

    // 3. Execute sequentially, updating status
    for (const subtask of subtasks) {
      await ctx.runMutation(api.subtasks.updateStatus, {
        id: subtask.id,
        status: 'running',
      })

      const result = await executeSubtask(ctx, subtask)

      await ctx.runMutation(api.subtasks.updateStatus, {
        id: subtask.id,
        status: 'completed',
        result,
      })
    }
  },
})
```

**Schema Addition:**

```typescript
// convex/schema.ts
subtasks: defineTable({
  chatId: v.id('chats'),
  parentRunId: v.id('agentRuns'),
  description: v.string(),
  mode: v.string(), // Which agent mode to use
  dependencies: v.optional(v.array(v.id('subtasks'))),
  status: v.union(
    v.literal('pending'),
    v.literal('running'),
    v.literal('completed'),
    v.literal('failed')
  ),
  result: v.optional(v.string()),
  createdAt: v.number(),
  completedAt: v.optional(v.number()),
})
  .index('by_chat', ['chatId'])
  .index('by_parent', ['parentRunId'])
  .index('by_status', ['chatId', 'status'])
```

**New Files:**

| File                                        | Purpose                          |
| ------------------------------------------- | -------------------------------- |
| `convex/orchestrator.ts`                    | Task decomposition and execution |
| `convex/subtasks.ts`                        | Subtask CRUD operations          |
| `apps/web/components/chat/SubtaskPanel.tsx` | Real-time progress UI            |

**UI Components:**

- Subtask timeline showing progress
- Dependency visualization
- Status indicators (pending/running/completed/failed)
- Result preview per subtask

**Complexity:** High  
**Estimated Effort:** 1.5 weeks

---

### 3.2 Preview Enhancement (Dev Server Integration)

**Objective:** Allow users to preview their running applications in the Preview
panel

**Current State:** Preview component accepts a `url` prop but has no integration
with dev servers.

**Implementation Strategy:**

When a user runs a dev server (e.g., `npm run dev`), capture the port and proxy
it.

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Terminal       │────▶│  Job Execution   │────▶│  Dev Server     │
│  "npm run dev"  │     │  (Convex action) │     │  localhost:3000 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │  Proxy Service   │
                        │  /api/preview/   │
                        └──────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │  Preview Panel   │
                        │  (iframe)        │
                        └──────────────────┘
```

**New Files:**

| File                                          | Purpose                 |
| --------------------------------------------- | ----------------------- |
| `apps/web/app/api/preview/[...path]/route.ts` | Proxy to dev server     |
| `apps/web/hooks/usePreviewServer.ts`          | Track dev server status |

**Files to Modify:**

| File                                         | Changes                         |
| -------------------------------------------- | ------------------------------- |
| `apps/web/components/workbench/Preview.tsx`  | Add dev server URL input        |
| `apps/web/components/workbench/Terminal.tsx` | Detect and link running servers |
| `convex/jobs.ts`                             | Track preview port              |

**Schema Addition:**

```typescript
// Add to jobs table
previewUrl: v.optional(v.string()),  // Proxied URL for preview
previewPort: v.optional(v.number()), // Detected port
```

**Implementation Details:**

1. Terminal detects localhost URLs in output
2. Creates proxy route: `/api/preview/{projectId}/{port}/`
3. Preview panel shows proxied URL in iframe
4. Auto-refresh when dev server restarts

**Complexity:** Medium  
**Estimated Effort:** 4-5 days

---

## Implementation Priority Summary

| Phase | Feature             | Effort    | Risk   | Priority |
| ----- | ------------------- | --------- | ------ | -------- |
| 1.1   | Multi-Mode System   | 3-4 days  | Low    | **P0**   |
| 1.2   | Checkpoint System   | 4-5 days  | Low    | **P0**   |
| 2.1   | MCP Integration     | 1.5 weeks | Medium | **P1**   |
| 2.2   | Semantic Indexing   | 1 week    | Medium | **P1**   |
| 3.1   | Orchestrator Mode   | 1.5 weeks | Medium | **P2**   |
| 3.2   | Preview Enhancement | 4-5 days  | Low    | **P2**   |

**Total Estimated Effort:** 5-6 weeks

---

## Schema Changes Summary

```typescript
// convex/schema.ts additions

// 1. Extended mode union (modify existing)
mode: v.union(
  v.literal('ask'),
  v.literal('architect'),
  v.literal('code'),
  v.literal('build')
)

// 2. Checkpoints table (new)
checkpoints: defineTable({...})

// 3. MCP servers table (new)
mcpServers: defineTable({...})

// 4. Code embeddings table (new)
codeEmbeddings: defineTable({...}).vectorIndex('by_embedding', {...})

// 5. Subtasks table (new)
subtasks: defineTable({...})

// 6. Jobs table additions
previewUrl: v.optional(v.string()),
previewPort: v.optional(v.number())
```

---

## Technical Recommendations

### 1. Embedding Provider

Use OpenAI `text-embedding-3-small` for cost efficiency:

```typescript
const response = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: codeChunks,
  dimensions: 1536,
})
```

### 2. MCP Server Deployment

For MCP servers that need to run as separate processes:

- Deploy as serverless functions (Vercel, Cloudflare Workers)
- Or run as Docker containers in a separate service
- Expose via HTTP/SSE endpoints

### 3. Preview Proxy Security

```typescript
// Validate project access before proxying
const session = await getAuthSession(req)
const project = await ctx.runQuery(api.projects.get, { projectId })
if (project.createdBy !== session.userId) {
  return new Response('Unauthorized', { status: 401 })
}
```

### 4. Checkpoint Storage

Keep last 50 checkpoints per project, auto-prune older ones:

```typescript
// convex/checkpoints.ts
const MAX_CHECKPOINTS = 50
const oldCheckpoints = await ctx.db
  .query('checkpoints')
  .withIndex('by_project', (q) => q.eq('projectId', projectId))
  .order('asc')
  .take(count - MAX_CHECKPOINTS)

for (const cp of oldCheckpoints) {
  await ctx.db.delete(cp._id)
}
```

---

## Migration Plan

### Step 1: Schema Migration

```bash
bunx convex dev  # Push schema changes
```

### Step 2: Data Migration (Modes)

```typescript
// One-time migration script
// Update existing chats from legacy modes to current modes
await ctx.db
  .query('chats')
  .filter((q) => q.eq(q.field('mode'), 'discuss'))
  .collect()
  .then((chats) =>
    Promise.all(
      chats.map(
        (c) => ctx.db.patch(c._id, { mode: 'architect' }) // Map discuss → architect
      )
    )
  )
```

### Step 3: Feature Flags

Use environment variables to roll out features incrementally:

```typescript
const ENABLE_MCP = process.env.ENABLE_MCP === 'true'
const ENABLE_ORCHESTRATOR = process.env.ENABLE_ORCHESTRATOR === 'true'
```

---

## Success Metrics

| Feature      | Metric                       | Target                                    |
| ------------ | ---------------------------- | ----------------------------------------- |
| Multi-Mode   | Mode usage distribution      | All modes used within 30 days             |
| Checkpoints  | Restore actions per week     | 10% of users use restore                  |
| MCP          | External servers configured  | 5+ community MCP servers                  |
| Indexing     | Search latency               | <200ms for semantic search                |
| Orchestrator | Complex task completion      | 80% success rate for 3+ subtask workflows |
| Preview      | Preview sessions per project | 50% of web projects use preview           |

---

_This plan was created on 2025-02-17, adapted from the Kilo Code comparative
analysis for Panda's cloud-native architecture._
