# Convex Usage Reduction Implementation Plan

> Status: proposed implementation plan  
> Scope: reduce Convex reads, writes, storage, bandwidth, and live-query churn in Panda  
> Created: 2026-05-25  
> Source audit: read-only top-to-bottom architecture/usage review of the current Panda repo

## Executive Summary

Panda's current Convex usage risk is less about one obviously broken query and more about several high-leverage Modules whose Interfaces look bounded but whose Implementations still read, duplicate, or live-subscribe to large/changing data.

The strongest recommendations are:

1. **Stop prompt-time broad context re-indexing.** `apps/web/hooks/useAgent.ts` currently invokes multiple `contextChunks` indexing mutations before building an agent context pack. This can turn one prompt into many Convex reads/writes/search-index updates.
2. **Deepen the `files` Module into a true metadata/content seam.** `api.files.listMetadata` strips `content` after reading full file documents, reducing client payload but not fully reducing Convex read cost or invalidation pressure.
3. **Split hot run progress from cold raw trace/checkpoint data.** `agentRunEvents` and `harnessRuntimeCheckpoints` are useful but can become high-write, high-storage, and live-query-sensitive operational data.
4. **Replace raw admin scans with aggregate or paginated Interfaces.** Admin pages are not the main hot path, but open dashboards can repeatedly read large slices of raw tables.
5. **Retire or quarantine legacy heavyweight message/file Interfaces.** Keep `listPaginatedLite` and metadata-first paths canonical.

This plan uses the architecture vocabulary from `improve-codebase-architecture`: **Module**, **Interface**, **Implementation**, **Depth**, **Shallow**, **Seam**, **Adapter**, **Leverage**, **Locality**, and **deletion test**.

## Current Evidence

### Convex health/usage context

- Convex dev/prod insights showed no resource-limit or OCC incidents over the last 72 hours during the audit.
- Convex AI files status showed only **Agent skills** out of date; project guidelines and AGENTS/CLAUDE Convex sections were up to date.
- The usage warning is likely plan quota / accumulated usage / usage-rate related rather than one currently failing function.

### High-signal sample data

Dev deployment samples from the audit:

- `projects`: 107 rows
- `chats`: 112 rows
- `files`: 134 rows; max sampled row around 99 KB
- `messages`: 101 rows; max sampled row around 77 KB
- `agentRuns`: 177 rows
- `agentRunEvents`: 257 rows
- `permissionAuditLog`: 499 rows
- `harnessRuntimeCheckpoints`: 20 rows; sampled rows averaged tens of KB
- `contextChunks`: 104 rows
- `specifications`: 57 rows; sampled rows often several KB

Prod deployment samples were smaller, but still showed runtime checkpoints and event rows present.

## Design Principles

### Hot data must be small

Hot live queries should return bounded summaries and metadata only. Avoid full file contents, full checkpoint payloads, signed URLs, raw command output, and full transcript bodies unless the user explicitly opens that detail.

### Deep Interfaces should hide expensive Implementation details

A Module has useful **Depth** when callers get a small, stable Interface while expensive or complex Implementation details are hidden and localized.

Examples of desired Depth:

- File tree asks for file metadata and never touches file content.
- Run progress asks for a compact status summary and never touches raw trace output.
- Agent context retrieval asks for a budgeted context pack and does not trigger broad re-indexing.

### Materialized Adapters must not become hidden sources of truth

`contextChunks` should be an Adapter for retrieval, not a duplicate source of truth for project files, chats, plans, specs, and run outputs.

Deletion test: deleting `contextChunks` should not break core project/files/chat behavior. It should only degrade semantic retrieval until rebuilt lazily.

### Write amplification is as important as read volume

Free-plan pressure can come from:

- repeated function calls,
- live query invalidations,
- repeated writes to indexed tables,
- large document rewrites,
- search/vector index updates,
- retained operational detail rows.

## Phase 0 — Establish Measurement and Safety Baseline

### Goal

Make usage changes measurable before altering behavior.

### Target files

- `docs/CONVEX_BACKEND_GOVERNANCE.md`
- `apps/web/lib/convex/payload-logger.ts` or equivalent logging utility
- Convex dashboard usage pages
- Existing tests around bandwidth and collect usage

### Tasks

1. Record current Convex dashboard usage breakdown:
   - database bandwidth,
   - function calls,
   - database storage,
   - file storage,
   - action compute,
   - vector/search usage if visible.
2. Record dev/prod table row counts for high-risk tables:
   - `files`
   - `fileSnapshots`
   - `messages`
   - `agentRuns`
   - `agentRunEvents`
   - `harnessRuntimeCheckpoints`
   - `contextChunks`
   - `permissionAuditLog`
   - `specifications`
3. Add/confirm audit checks that flag:
   - `.collect()` in production Convex code,
   - hot UI use of `api.files.list`,
   - hot UI use of heavyweight message listing paths,
   - unbounded or high-limit query additions.
4. Define target usage budgets:
   - project shell boot payload budget,
   - message history page payload budget,
   - run progress live payload budget,
   - context indexing writes per prompt budget,
   - checkpoint writes per run budget.

### Acceptance criteria

- A maintainer can answer: “which table/function is growing and why?”
- Future changes can compare usage before/after.
- No product behavior changes yet.

## Phase 1 — Stop Prompt-Time Broad Context Re-indexing

### Why this is first

This is the highest-leverage recommendation. Today one agent prompt can trigger broad reads and writes before the agent does useful work.

### Current hot path

`apps/web/hooks/useAgent.ts` calls, during context pack construction:

- `api.contextChunks.indexProjectFiles`
- `api.contextChunks.indexSessionSummaries`
- `api.contextChunks.indexSpecifications`
- `api.contextChunks.indexMessages`
- `api.contextChunks.indexPlanningSessionPlans`
- then `api.contextChunks.search`

### Problem

The `contextChunks` Module has a useful retrieval Interface, but its Implementation is too broad. It duplicates files, messages, plans, specs, summaries, and run output into searchable chunks. Prompt-time indexing causes write amplification and search-index churn.

### Desired architecture

Deepen `contextChunks` into a narrow **Adapter**:

- The Interface remains “return a budgeted relevant context pack.”
- The Implementation becomes hash-gated, source-scoped, lazy, and incremental.
- Source-of-truth Locality stays with files/messages/specs/plans.

### Implementation slices

#### 1.1 Add a context freshness decision Module

Create a small Module responsible for deciding whether a source should be indexed.

Interface shape conceptually:

```ts
shouldIndexContextSource({
  projectId,
  sourceType,
  sourceId,
  contentHash,
  updatedAt,
}): Promise<'skip' | 'index'>
```

This Module should hide:

- chunk existence checks,
- content hash comparison,
- staleness policy,
- source-specific limits.

#### 1.2 Remove broad prompt-time indexing from `useAgent`

Replace “index everything before every search” with:

- search existing chunks first,
- index only explicit/active sources if stale,
- use local active editor/chat state when available,
- fall back gracefully when no chunks exist.

Priority source order:

1. explicit context attachments/selections,
2. active file,
3. open tabs,
4. latest session summary,
5. recent current-chat messages,
6. existing indexed chunks.

#### 1.3 Move bulk indexing to explicit user/admin action

Keep project rebuild/re-index behavior, but make it explicit:

- “Rebuild project context index” button/action,
- admin/dev-only tool,
- scheduled low-volume job if needed,
- never default per prompt.

#### 1.4 Put hard caps on materialization

Caps should be policy-level, not scattered constants:

- max chunks written per prompt,
- max bytes indexed per source,
- max sources indexed per prompt,
- max run-output chunks per run,
- max total context chunks per project before cleanup/rebuild.

### Acceptance criteria

- A normal Ask/Plan/Agent prompt does not call all five indexing mutations.
- Repeating the same prompt without content changes creates zero or near-zero `contextChunks` writes.
- Existing context search still works when chunks exist.
- Agent still receives useful local context without requiring full project indexing.
- `contextChunks` can be deleted and rebuilt without breaking core project/chat/file behavior.

### Expected usage reduction

High reduction in:

- writes,
- search index churn,
- function calls,
- duplicated storage,
- prompt latency.

## Phase 2 — Deepen the `files` Module into Metadata and Content Seams

### Why this is second

File metadata powers the project shell, file tree, workbench, project overview, and agent tools. It should be cheap and hot. File content should be cold and lazy.

### Current state

`convex/files.ts:listMetadata` reads full `files` documents and strips `content` afterward. This reduces client payload but does not fully reduce Convex read cost or live invalidation cost.

### Desired architecture

Deepen the `files` Module:

- **Hot Interface:** file metadata by project/path.
- **Cold Interface:** file content by id/path, fetched only when opened or needed by an agent.
- **Snapshot Interface:** bounded recovery/version history, not hot project state.

### Implementation options

#### Option A — Split table design

Tables:

- `fileMetadata`
  - projectId
  - path
  - isBinary
  - size
  - contentHash
  - updatedAt
  - language/mime if useful
- `fileContents`
  - fileId or projectId+path
  - content
  - contentHash
  - updatedAt

Pros:

- true metadata-only live queries,
- clean Locality,
- easier payload budgets.

Cons:

- migration required,
- more joins for content fetch.

#### Option B — Storage-backed content

Keep metadata in Convex documents and move larger content to storage or external workspace source.

Pros:

- avoids large Convex docs,
- potentially better for generated artifacts and binary files.

Cons:

- signed URL/content loading complexity,
- more care needed for auth and consistency.

#### Option C — Transitional projection table

Keep `files` as-is short term, add `fileMetas` projection maintained on writes.

Pros:

- lower migration risk,
- hot UI can move quickly.

Cons:

- temporary duplication,
- requires projection consistency.

### Recommended path

Use Option C as a migration bridge, then move toward Option A or B.

### Implementation slices

#### 2.1 Introduce canonical metadata projection

Add a metadata-only Interface used by all hot UI:

- project shell,
- file tree,
- project overview,
- agent metadata scans.

#### 2.2 Move FileTree and ProjectShell to metadata projection

Target files:

- `apps/web/components/projects/ProjectShellDataLoader.tsx`
- `apps/web/hooks/useProjectContext.ts`
- `apps/web/components/projects/WorkspaceRuntimeProvider.tsx`
- `apps/web/lib/agent/tools.ts`

#### 2.3 Make content fetch explicit and lazy

Only fetch content for:

- selected file,
- open tabs,
- explicit agent read,
- artifact application/diff,
- project export/download.

#### 2.4 Cap and compact snapshots

Target files:

- `convex/files.ts`
- `convex/checkpoints.ts`
- `convex/retention.ts`

Rules:

- cap snapshots per file/project,
- delete or compact old snapshots,
- never list full snapshot contents in hot UI.

### Acceptance criteria

- File tree/project boot live queries do not read file content fields.
- Opening one file fetches one file content payload.
- Agent metadata scans do not read all file contents.
- Existing bandwidth guard tests are expanded to protect the new seam.

### Expected usage reduction

High reduction in:

- read bandwidth,
- live-query invalidation payloads,
- project boot cost,
- agent tool file scans,
- storage growth from unbounded snapshots.

## Phase 3 — Split Hot Run Progress from Cold Raw Trace and Checkpoints

### Current state

Target files:

- `convex/agentRuns.ts`
- `convex/schema.ts`
- `apps/web/hooks/useRunEventBuffer.ts`
- `apps/web/components/chat/RunProgressPanel.tsx`
- `apps/web/components/projects/WorkspaceRuntimeProvider.tsx`
- `apps/web/lib/agent/harness/runtime.ts`
- `apps/web/lib/agent/harness/convex-checkpoint-store.ts`

Current behavior:

- `appendEvents` inserts one row per event.
- Events may store content, args, output, usage, snapshot, and metadata.
- Runtime checkpoints store full checkpoint payloads.
- Runtime saves checkpoints on step/error/complete paths.
- UI subscribes to runtime checkpoint summaries and run event summaries.

### Problem

The run/proof Module has good product Depth, but raw trace and recovery data are too close to live progress Interfaces. That creates write/storage/live-query churn.

### Desired architecture

Three layers:

1. **Hot run status**
   - one compact row/document per active run,
   - current step/status/progress/category/recent message preview,
   - safe for live query.
2. **Warm run summary**
   - persisted receipt/proof summary,
   - compact after completion,
   - shown in history/Proof rail.
3. **Cold raw trace/checkpoint detail**
   - paginated/lazy,
   - shorter retention,
   - only fetched for debugging/restore.

### Implementation slices

#### 3.1 Add or deepen a run progress summary Module

Interface concept:

```ts
getRunProgressSummary({ chatId, runId? })
```

Should return:

- run status,
- active step,
- recent event preview,
- artifact count,
- checkpoint availability boolean,
- latest recoverable checkpoint metadata,
- no raw checkpoint payload,
- no large output.

#### 3.2 Compact event persistence

Keep raw events during active run if needed, then compact after completion:

- retain first N events,
- retain last N events,
- retain errors/permission decisions/artifact events,
- summarize repetitive progress/tool events,
- delete or archive bulky output.

#### 3.3 Make checkpoint writes conditional

Change checkpoint policy from “save every step” to:

- save full checkpoint at start/end/error and before risky mutations,
- save summary/heartbeat at regular steps,
- skip full save if serialized state hash unchanged,
- cap full checkpoints per run/chat.

#### 3.4 Strengthen retention

Current `convex/retention.ts` is a good cleanup seam. Extend policy targets:

- shorter dev retention for `agentRunEvents`,
- stricter cap for `harnessRuntimeCheckpoints`,
- separate retention for full raw traces vs summaries.

### Acceptance criteria

- Active run UI uses summary-shaped data.
- Full checkpoint payload is not part of hot live query payloads.
- A normal run writes fewer full checkpoint rows.
- Completed runs preserve enough proof without retaining every raw event forever.
- Restore still works from the latest valid checkpoint.

### Expected usage reduction

Medium-to-high reduction in:

- writes,
- storage,
- live-query churn during active runs,
- retained operational data.

## Phase 4 — Make Admin Analytics Aggregate-Backed

### Current state

Target file:

- `convex/admin.ts`

Expensive Interfaces:

- `getSystemOverview`
- `getProviderAnalytics`
- `getAuditLog`
- `listUsers`

These read up to 1,000 raw rows and filter in memory.

### Desired architecture

Admin dashboard should read aggregate documents and paginated details.

### Implementation slices

#### 4.1 Create aggregate docs

Possible table:

- `adminUsageAggregates`

Possible docs:

- global counts,
- daily user activity,
- daily provider/model usage,
- message/run counts,
- storage estimates if available.

#### 4.2 Update aggregates on writes or scheduled jobs

Prefer scheduled jobs for lower risk at first:

- daily/hourly aggregate refresh,
- bounded batch processing,
- no live raw scans.

#### 4.3 Paginate audit logs

`getAuditLog` should use pagination and indexed filters rather than `take(1000)` + in-memory filtering.

#### 4.4 Make admin pages opt-in refresh

For heavy admin dashboards, prefer:

- manual refresh,
- stale-while-visible summary,
- no always-live raw operational scans.

### Acceptance criteria

- Admin overview no longer reads users/projects/chats/messages/agentRuns directly on every live query.
- Provider analytics does not scan 1,000 recent runs for each dashboard render.
- Audit logs are paginated.

### Expected usage reduction

Medium reduction when admin pages are open; low effect on normal user path.

## Phase 5 — Quarantine Legacy Heavy Interfaces

### Current risk

Some good deep Interfaces already exist, but legacy heavy paths remain.

Examples:

- Prefer `messages.listPaginatedLite`; avoid `messages.list` and heavyweight `listPaginated` in hot UI.
- Prefer metadata-only file paths; avoid `files.list` except export/download or explicit full project operations.
- Prefer checkpoint summaries; avoid full checkpoint list in UI.

### Implementation slices

#### 5.1 Add compatibility labels/comments

Label heavyweight functions as:

- legacy,
- compatibility-only,
- not for hot UI.

#### 5.2 Add static guard tests

Guard against accidental hot usage of:

- `api.files.list`
- `api.messages.list`
- full checkpoint list queries in project shell
- full attachment URL loading in transcript list

#### 5.3 Build smaller detail Interfaces

Where old callers still need data, add narrower Interfaces rather than reusing broad ones.

### Acceptance criteria

- Hot UI cannot regress to full file/message/checkpoint payloads without failing tests.
- Legacy functions have known callers or are removed.

## Phase 6 — Operational Cleanup for Dev/Test Usage

### Why this matters

The dev deployment has many E2E/dev fixture projects and operational rows. Even if each row count is modest, repeated tests and agent runs can exceed Free plan limits.

### Tasks

1. Decide what dev/test data can be deleted.
2. Delete old fixture projects/chats/runs from the Convex dashboard or via a maintainer-approved cleanup mutation.
3. Prefer local Convex for high-volume E2E tests.
4. Stop cloud dev servers when not actively testing.
5. Consider separate test deployment or local-only policy for Playwright fixture runs.

### Acceptance criteria

- Old fixture projects are not accumulating indefinitely in the shared dev deployment.
- E2E tests do not routinely create cloud Convex data unless explicitly requested.

## Testing Strategy

### Unit/static tests

Add or extend tests for:

- hot UI does not call `api.files.list`,
- hot UI uses `messages.listPaginatedLite`,
- context indexing is hash-gated,
- repeated prompt with unchanged sources does not write new chunks,
- checkpoint save policy skips unchanged state,
- run progress summary omits raw payloads.

### Integration tests

Scenarios:

1. Open project shell with 500 files.
   - Expected: metadata payload only.
2. Open one file.
   - Expected: one content fetch.
3. Send Ask prompt twice with no file/message changes.
   - Expected: second prompt does not re-index broad project context.
4. Run agent with several tool steps.
   - Expected: run progress stays live; raw event/checkpoint rows are capped/compacted.
5. Open admin analytics.
   - Expected: aggregate reads, not raw table scans.

### Measurement tests

Track before/after:

- number of Convex functions invoked per prompt,
- `contextChunks` writes per prompt,
- checkpoint writes per run,
- project boot payload bytes,
- run progress live payload bytes,
- retained rows after cleanup.

## Rollout Plan

### Order

1. Phase 0 measurement baseline.
2. Phase 1 context indexing changes.
3. Phase 2 file metadata/content seam.
4. Phase 3 run progress/checkpoint compaction.
5. Phase 4 admin aggregates.
6. Phase 5 legacy Interface quarantine.
7. Phase 6 dev/test cleanup.

### Safe rollout pattern

For each phase:

1. Add new deep Interface beside old Interface.
2. Move one caller at a time.
3. Add guard test to prevent regression.
4. Measure payload/function/write deltas.
5. Retire or label old Interface after caller inventory.

## Risks and Mitigations

### Risk: context retrieval quality drops

Mitigation:

- preserve explicit context and active editor context first,
- add fallback to existing search chunks,
- make rebuild explicit,
- compare answer quality manually on common Ask/Plan/Agent prompts.

### Risk: file content migration complexity

Mitigation:

- use projection table first,
- avoid immediate destructive migration,
- keep compatibility read path until all callers move.

### Risk: less detailed proof/debug history

Mitigation:

- keep errors, permission decisions, artifact events, first/last events,
- store summary receipts,
- allow explicit debug mode with longer retention.

### Risk: admin aggregate drift

Mitigation:

- scheduled aggregate rebuild,
- dashboard display `lastComputedAt`,
- keep raw paginated detail for audit.

## Success Metrics

### Prompt path

- Repeated prompt with unchanged project creates near-zero context indexing writes.
- Context pack construction performs bounded reads only.

### Project shell

- Project boot does not fetch file contents.
- File tree remains fast with hundreds/thousands of files.

### Agent runs

- Fewer full checkpoint rows per run.
- Run progress live payload stays small.
- Raw event retention is bounded.

### Storage

- `contextChunks`, `agentRunEvents`, `harnessRuntimeCheckpoints`, and `fileSnapshots` stop growing unbounded.

### Product behavior

- Ask/Plan/Agent continue to work.
- Restore/proof/debug flows remain available through lazy detail paths.

## Immediate Non-Code Actions

These can reduce usage while implementation is pending:

1. Close admin dashboard pages when not actively using them.
2. Stop local `convex dev`, Next dev, and Playwright sessions when not actively testing.
3. Delete disposable dev/E2E fixture projects from Convex dashboard after review.
4. Prefer local Convex for high-volume E2E testing.
5. Avoid repeated agent runs on large projects until prompt-time context re-indexing is fixed.
6. Run `npx convex ai-files update` only when file writes are acceptable; current status says only Agent skills are out of date.

## Final Recommendation

Start with **Phase 1: Stop Prompt-Time Broad Context Re-indexing**.

It has the strongest Leverage because it reduces Convex reads, writes, storage duplication, search index churn, and prompt latency without first requiring a risky data migration. After that, deepen the `files` Module so hot project/workbench UI has a true metadata-only Interface.
