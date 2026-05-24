# Panda Context Guard Implementation Plan

> Last updated: May 24, 2026  
> Status: In progress — Phase 0, Phase 1, Phase 2 foundation, retrieval tool, and Proof visibility implemented  
> Source review: `mksglu/context-mode` repository review against Panda architecture  
> Owner: Panda runtime/workspace maintainers

## 1. Purpose

This document converts the context-mode review recommendations into a Panda-native implementation plan.

The goal is **not** to vendor, copy, or ship `mksglu/context-mode` inside Panda. The goal is to implement the useful architectural pattern natively in Panda:

```txt
Large/raw tool data should not flood chat or the model context.
Full evidence belongs in Proof, Terminal, Changes, and persisted run records.
The agent receives only bounded summaries and searchable references.
```

This plan aligns with Panda's active architecture contract:

```txt
Chat      = story
Proof     = evidence
Changes   = artifacts and diffs
Context   = plans, specs, memory, retrieval
Workbench = files
Terminal  = commands
```

## 2. Decision Summary

### Adopt

- Context-safe tool result boundaries.
- Indexed retrieval for large command/test/build/search output.
- Retrieval-first continuation and resume behavior.
- Context savings and retrieval audit metrics.
- A strict separation between analysis tools and mutation tools.

### Do Not Adopt Directly

- Do not vendor or directly embed `context-mode` into the Panda hosted product.
- Do not add local SQLite FTS5 as Panda's product context store.
- Do not expose raw arbitrary local-code execution as a hosted feature without Panda's own sandbox and permission model.
- Do not import context-mode hook/adaptor code; Panda owns its runtime directly.

### Rationale

`context-mode` is licensed under Elastic License 2.0 and is designed as a local MCP/plugin runtime. Panda is a browser-first, Convex-backed, multi-user product. The concepts fit strongly; the package and storage/runtime model do not fit directly.

## 3. Target Architecture

### 3.1 High-Level Flow

```txt
Tool executes
  ↓
Tool result guard measures output size, type, sensitivity, and mode
  ↓
Small result: return bounded output directly
Medium result: return summary + focused excerpts
Large result: store full output, index chunks, return summary + retrieval handles
Huge result: store full output, index/search only, return compact evidence card
  ↓
Full evidence is available in Proof / Terminal / Changes
  ↓
Relevant excerpts can be retrieved into future context packs
```

### 3.2 Source-of-Truth Mapping

| Concern | Panda owner | Notes |
| --- | --- | --- |
| Full command output | `agentRunEvents`, jobs/Terminal records | Full data should not be copied into chat by default. |
| Full tool call evidence | Proof / run events / receipts | Tool args, status, output references, errors. |
| Generated file changes | Artifacts, Changes, Workbench file model | File writes remain artifact/file-owned. |
| Indexed context snippets | `contextChunks` | Project-scoped, auth-protected, searchable. |
| Agent-facing summary | Runtime tool result returned to model | Bounded, deterministic, evidence-linked. |
| Continuity context | `sessionSummaries`, `contextChunks`, checkpoints | Retrieved by relevance, not dumped wholesale. |

## 4. Implementation Principles

1. **Bound the model-facing payload.** No tool result should send unbounded stdout, stderr, file contents, search results, network responses, or logs back into the model loop.
2. **Preserve full evidence.** Truncation for the model must never mean data loss for the user. Full output goes to Proof/Terminal/persistence.
3. **Index before re-reading.** Large persisted outputs should become searchable chunks instead of being repeatedly re-sent.
4. **Keep mutation separate from analysis.** Analysis helpers may summarize/process data; file creation and edits must still go through `write_files`, `apply_patch`, artifacts, and review paths.
5. **Honor mode permissions.** Ask/Plan remain read-only; Code/Build can write or execute according to mode and policy.
6. **Make summaries auditable.** Every summarized/truncated/indexed result records what happened and where the full evidence lives.
7. **Stay Panda-native.** Use Convex, Panda run events, context chunks, receipts, Workbench, Proof, Changes, and Terminal.

## 5. Proposed Phases

### Current Implementation Status — May 24, 2026

Implemented and verified:

- Phase 0 architecture terms added to `docs/ARCHITECTURE_CONTRACT.md`.
- Phase 1 Tool Output Guard utility added at `apps/web/lib/agent/context-guard.ts`.
- `run_command` model-facing output is guarded behind `PANDA_CONTEXT_GUARD_ENABLED=1`.
- Guard metadata is explicit and includes bytes measured, bytes returned, bytes avoided, classification, and truncation state.
- Unicode-safe truncation is covered by tests.
- Phase 2 foundation added: guarded command output can be indexed into Convex `contextChunks` as `run_event` chunks behind `PANDA_CONTEXT_GUARD_INDEX_OUTPUTS=1`.
- Small command outputs are measured but not indexed.
- Guarded outputs return evidence handles with `sourceType`, `sourceId`, `chunksWritten`, and retrieval hints.
- Retrieval tool added: `search_indexed_output` can fetch focused excerpts for a guarded output `sourceId`.
- Proof / Run Progress visibility added: guarded output metadata is rendered with classification, bytes avoided, raw bytes, indexed chunk count, and evidence `sourceId`.
- Targeted tests and TypeScript checks pass for the implemented slices.

Still remaining:

- Broader Phase 3 ranking upgrades across all context retrieval. Initial run-output excerpt quality is implemented for `search_indexed_output`: matched chunks now return focused snippets, matched terms, truncation state, score, and line metadata.
- Phase 4 context-safe analysis tooling beyond `search_indexed_output`.
- Phase 5 session continuity indexing.
- Phase 6 receipt/context metrics are now partially implemented: receipts aggregate guarded tool results, raw bytes, returned bytes, bytes avoided, indexed chunks, and source handles, and `RunReceiptPanel` renders them. Remaining Phase 6 work is broader dashboards/tuning analytics if needed.
- Phase 7 explicit directory records if Panda later chooses first-class directory persistence beyond `.gitkeep` placeholders. The current file-backed folder path is implemented: explicit directory intents become `.gitkeep`, and the file tree renders those placeholders as folders without showing the placeholder file.


## Phase 0 — Architecture Contract Update

### Goal

Record Context Guard as a first-class Panda runtime boundary before implementation begins.

### Tasks

- Add this plan to docs.
- Add a short entry to `docs/ARCHITECTURE_CONTRACT.md` or a later architecture update that defines:
  - `Context Guard`
  - `Tool Output Guard`
  - `Indexed Evidence`
  - `Model-facing summary`
- Confirm the feature is Panda-native and not a direct context-mode integration.

### Acceptance Criteria

- [x] The term `Context Guard` has one canonical meaning.
- [x] Docs explicitly state that full evidence belongs outside chat/model context.
- [x] Context Guard is documented as Panda-native, not a direct context-mode integration.

---

## Phase 1 — Tool Output Guard

### Goal

Prevent raw large tool outputs from entering the model loop or chat transcript while preserving full evidence.

### Primary Files

Likely files to inspect/change:

- `apps/web/lib/agent/tools.ts`
- `apps/web/lib/agent/harness/runtime.ts`
- `apps/web/lib/agent/harness/runtime-events.ts`
- `apps/web/hooks/useAgent-event-applier.ts`
- `convex/agentRuns.ts`
- `convex/schema.ts`
- `apps/web/components/chat/RunProgressPanel.tsx`
- `apps/web/components/chat/RunReceiptPanel.tsx`
- `apps/web/components/chat/RunStatus.tsx`

### New Runtime Concept

Introduce a model-facing tool result wrapper, conceptually:

```ts
type GuardedToolResult = {
  modelResult: string
  fullOutputRef?: {
    runEventId?: string
    jobId?: string
    artifactId?: string
    contextSourceId?: string
  }
  guard: {
    applied: boolean
    reason: 'small_output' | 'medium_output' | 'large_output' | 'huge_output' | 'sensitive_output'
    rawBytes: number
    returnedBytes: number
    indexed: boolean
    truncated: boolean
    summaryStrategy: 'none' | 'head_tail' | 'error_focused' | 'structured_summary' | 'search_handle'
  }
}
```

Exact type names can differ, but the behavior should be explicit and testable.

### Guard Thresholds

Initial conservative thresholds:

| Output class | Raw size | Agent receives |
| --- | ---: | --- |
| Small | <= 8 KB | Direct bounded output |
| Medium | 8–32 KB | Summary + head/tail + error excerpts |
| Large | 32–256 KB | Summary + indexed refs + focused excerpts |
| Huge | > 256 KB | Summary + search handle only |

These should be constants, feature-flagged if possible, and tuned with tests.

### Tool Coverage

Apply first to:

- `run_command`
- `search_code`
- `search_code_ast`
- `search_codebase`
- any runtime/tool result path that can return large output

Later coverage:

- large `read_files` responses
- future web/doc fetch tools
- subagent child-run output

### Summary Strategy

For command output, generate deterministic summaries without relying on another LLM call initially:

- exit code
- duration
- command
- stdout/stderr byte counts
- first useful lines
- last useful lines
- detected error lines
- detected warnings
- detected failed tests
- path-like references

Examples of model-facing output:

```txt
Command completed with exit code 1 in 4.2s.
Raw output: 184 KB stdout, 12 KB stderr. Full output saved to Proof/Terminal.
Context Guard indexed 48 chunks under source run_event:abc123.

Most relevant errors:
- apps/web/lib/foo.ts:42: TypeError: ...
- FAIL apps/web/components/bar.test.tsx

Use indexed run output if more detail is needed.
```

### Acceptance Criteria

- [x] A command producing >32 KB does not return raw full output to the model when `PANDA_CONTEXT_GUARD_ENABLED=1`.
- [x] Full output can be preserved/indexed as run evidence when `PANDA_CONTEXT_GUARD_INDEX_OUTPUTS=1`.
- [x] Guard metadata is persisted in the guarded tool result output and exposed in run event summaries.
- [x] Existing small-output behavior remains unchanged when the guard is disabled, and small outputs are not indexed.
- [x] Unit tests cover threshold classification, guarded output metadata, Unicode-safe truncation, and run_command integration.

---

## Phase 2 — Indexed Run Output

### Goal

Make large tool outputs searchable through Panda's existing `contextChunks` system.

### Primary Files

- `convex/contextChunks.ts`
- `convex/schema.ts`
- `apps/web/lib/agent/context/chunker.ts`
- `apps/web/lib/agent/context/context-pack.ts`
- `apps/web/lib/agent/context/retriever.ts`
- `apps/web/lib/agent/context/index-sources.ts`

### Schema Direction

Prefer extending existing `sourceType: 'run_event'` before adding new source types. If more precision is needed, add source metadata rather than expanding source types prematurely.

Possible metadata to persist in chunks or source records:

```ts
{
  outputKind: 'stdout' | 'stderr' | 'combined' | 'search_results' | 'test_output' | 'build_output',
  command?: string,
  exitCode?: number,
  runId?: Id<'agentRuns'>,
  eventId?: Id<'agentRunEvents'>,
  chunkPurpose?: 'error' | 'warning' | 'summary' | 'raw_window'
}
```

If Convex schema changes are too heavy for Phase 2, encode minimal metadata in title/path/sourceId first and formalize schema later.

### Indexing Behavior

When Tool Output Guard detects large output:

1. Persist full raw output to run evidence.
2. Chunk output into context-safe windows.
3. Index chunks as project-scoped `contextChunks`.
4. Return source/chunk references in the model-facing result.
5. Make the chunks retrievable by future context pack construction.

### Acceptance Criteria

- [x] Large failed test/build output can create searchable `run_event` chunks via `contextChunks.indexRunOutput`.
- [x] Retrieval can fetch focused excerpts through `search_indexed_output` / `contextChunks.searchRunOutput`.
- [x] Chunks are project-scoped and auth-protected through existing Context Chunk authorization.
- [x] Purge/remove flows explicitly account for run-output chunks through `removeRunOutputBySource`, `removeRunOutputByRun`, and `purgeRunOutputs`.
- [x] Full output and indexed chunks are linked by a Context Guard evidence `sourceId`.

---

## Phase 3 — Retrieval Quality Upgrade

### Goal

Improve Panda's retrieval ranking using the best context-mode-inspired concepts while staying on Convex/Panda storage.

### Primary Files

- `apps/web/lib/agent/context/retriever.ts`
- `apps/web/lib/agent/context/context-pack.ts`
- `convex/contextChunks.ts`
- `apps/web/lib/agent/context/context-budget.ts`

### Improvements

Add or improve:

- title/path weighting
- active file weighting
- open tab weighting
- source type weighting
- recent run weighting
- plan/spec priority in Build-from-plan
- proximity boost for multi-term queries
- smarter snippets around matched terms
- query batching
- hybrid merge between:
  - Convex text search
  - vector search
  - active/open file boosts
  - recent run events

### Acceptance Criteria

- [x] Run-output retrieval returns focused snippets around match locations instead of whole chunks.
- [ ] Active/open files rank higher for implementation asks.
- [x] Failed run output can be retrieved by error text through `search_indexed_output`.
- [ ] Plan/spec chunks rank strongly during Build-from-plan beyond current context-pack caps.
- [ ] Tests cover ranking order for file, plan, spec, run_event, and summary chunks.

---

## Phase 4 — Context-Safe Analysis Tooling

### Goal

Add a Panda-native, read-only way to process large data without dumping it into the model context.

### Important Constraint

Do not expose arbitrary unsandboxed code execution in the hosted product.

### Possible Tool Shapes

Prefer narrow tools first:

```txt
analyze_command_output
analyze_large_text
summarize_indexed_output
search_indexed_output
```

Only consider a general `analyze_with_script` later if Panda has strong sandbox guarantees.

### Safety Requirements

- Read-only by default.
- No writes.
- No unrestricted network.
- Time limit.
- Memory/output limit.
- Mode/permission aware.
- Full audit event.
- User-visible in Proof if used.

### Acceptance Criteria

- The model can ask for focused extraction from a large persisted output.
- The analysis result is bounded.
- The raw source remains stored and linked.
- The tool cannot modify project files.

---

## Phase 5 — Session Continuity Index

### Goal

Use Panda's persisted messages, run events, plans, specs, receipts, and summaries to restore relevant state without dumping old chats into context.

### Primary Files

- `convex/sessionSummaries.ts`
- `convex/contextChunks.ts`
- `apps/web/lib/agent/context/session-summary.ts`
- `apps/web/lib/agent/context/context-pack.ts`
- `apps/web/lib/agent/harness/convex-checkpoint-store.ts`
- `apps/web/lib/agent/harness/runtime-checkpoint.ts`

### Behavior

```txt
Completed or stopped run
  ↓
Update bounded session summary
  ↓
Index summary + important decisions + changed files + unresolved errors
  ↓
Next run retrieves relevant continuity chunks
```

### What to Capture

- current user goal
- approved plan reference
- active spec reference
- files changed
- commands run
- failing tests/errors
- user decisions/corrections
- blocked items
- next recommended step

### Acceptance Criteria

- A resumed chat/run can retrieve the latest relevant state.
- The model is not given full historical transcripts by default.
- User corrections and decisions are retrievable.
- Receipts and summaries stay bounded.

---

## Phase 6 — Context Metrics and Proof UX

### Goal

Make Context Guard behavior visible and auditable without cluttering chat.

### UI Surfaces

- Proof panel
- Run receipt panel
- Run progress panel
- Terminal output details
- Optional admin analytics later

### Metrics

Record per run:

- raw bytes produced
- bytes returned to model
- bytes avoided
- number of guarded tool results
- number of indexed chunks
- retrieval hits by source type
- largest outputs
- truncation/indexing reason

### Acceptance Criteria

- User can see when Panda summarized/indexed output.
- User can open full evidence from Proof/Terminal.
- Receipts include context guard summary.
- Chat remains compact.

---

## Phase 7 — Folder/File Tree Contract Fix

### Goal

Address the related but separate issue where the agent claims a folder was created but the file tree does not show it.

This is not directly solved by context-mode. It is a Panda file/workbench contract issue.

### Options

#### Option A — Explicit Directory Records

Add real directory support to the file model.

Pros:

- Empty folders can exist.
- File tree reflects user intent directly.

Cons:

- Convex schema and file tree logic become more complex.
- Need migration/backfill from file paths.

#### Option B — Placeholder File Contract

Keep file-derived directories but enforce `.gitkeep` or equivalent for empty folders.

Pros:

- Smaller change.
- Aligns with current `write_files` tool description.

Cons:

- Empty folder is represented indirectly.
- Must make this very clear in UI and tool feedback.

### Recommended First Step

Use Option B first:

- Reject or repair bare directory writes.
- If the model intends to create an empty folder, write `<folder>/.gitkeep`.
- Do not allow assistant success text until persistence/artifact creation confirms it.
- Show pending folder/file artifacts in Changes or file tree review state.

### Acceptance Criteria

- Asking to create a folder results in visible file tree evidence.
- The assistant cannot report folder creation unless there is a persisted artifact/file.
- Tests cover bare folder requests and `.gitkeep` behavior.

---

## 6. Feature Flags

Introduce feature flags to stage rollout safely:

```ts
PANDA_CONTEXT_GUARD_ENABLED
PANDA_CONTEXT_GUARD_INDEX_OUTPUTS
PANDA_CONTEXT_GUARD_SUMMARIZE_COMMANDS
PANDA_CONTEXT_GUARD_PROOF_UI
```

If Panda's existing feature flag system has a different naming convention, use that convention.

## 7. Test Plan

### Unit Tests

Add tests for:

- output size classification
- command summary generation
- error line extraction
- output truncation boundaries
- context chunk creation from run output
- retrieval ranking for run output
- receipt metadata
- mode-specific behavior

### Integration Tests

Add tests for:

- failed test command with large output
- successful build with medium output
- search producing many matches
- plan/build run with indexed proof
- resumed session retrieving prior failure context

### E2E Tests

Add Playwright coverage for:

- large command output appears in Terminal/Proof, not chat
- run receipt shows Context Guard activity
- file tree reflects folder creation through `.gitkeep` or explicit directory support

## 8. No-Go Criteria

Do not proceed with direct context-mode integration if any of the following remain true:

- no legal/commercial permission for hosted managed-service use
- direct dependency would expose context-mode functionality to Panda users as a hosted feature
- arbitrary code execution is not sandboxed by Panda's own runtime policy
- raw outputs can still bypass the guard into model context
- full evidence is lost when output is summarized
- guard behavior is invisible in Proof/receipts

## 9. Recommended Initial PR Sequence

1. [x] Add Context Guard docs and architecture terms.
2. [x] Add pure utility module for output measurement/classification/summary.
3. [x] Wrap `run_command` result path with guard metadata behind a feature flag.
4. [x] Persist guard metadata in run events and expose it in run event summaries.
5. [x] Index large command output into `contextChunks`.
6. [x] Update Proof / Run Progress UI to display Context Guard evidence references.
7. [x] Add retrieval tests for indexed run output.
8. [x] Add folder creation `.gitkeep` enforcement test/fix.

## 10. Success Definition

This implementation is successful when:

- Panda can run noisy commands without flooding chat/model context.
- Full output is still inspectable in Proof/Terminal.
- Large outputs become searchable context rather than raw transcript baggage.
- Future runs can retrieve relevant prior errors or decisions.
- Receipts explain what context was used and what was suppressed/indexed.
- The file tree reflects claimed file/folder changes reliably.

## 11. Relationship to Existing Modernization Phases

This plan should be inserted before or alongside the runtime steering work, because steering is safer when tool outputs are already bounded and evidence-linked.

Suggested placement:

```txt
Phase 0: Architecture Contract
Phase 1: Surface Ownership
Phase 2: Message Lifecycle
Phase 3: Structured Message Blocks
Phase 4: Reasoning Metadata
Phase 5: Layout Focus Modes
Phase 6: Queue / Steer UX
Context Guard: Tool output boundary + indexed evidence
Phase 7: Runtime Steering and Stop/Replace
```

If implementation pressure is high, start Context Guard immediately after the current stop/replace stability gate and before expanding Autopilot behavior.

## 12. Web Research Validation — May 2026

A follow-up web review was conducted before implementation to compare this plan against current AI coding-agent, context-engineering, Convex, and WebContainer guidance as of May 2026.

### 12.1 Validation Summary

The plan remains sound and is aligned with current standards. The most consistent 2026 patterns across agent systems are:

- Treat context as a budget, not an unlimited transcript.
- Bound tool results before they enter the model loop.
- Store full evidence outside the model context and return a summary plus handle/reference.
- Use retrieval over persisted chunks instead of repeatedly sending raw files, logs, or command output.
- Keep compaction, memory, and tool-result clearing as separate mechanisms.
- Instrument tool-result size, bytes returned, bytes avoided, and retrieval behavior.
- Use workspace/terminal/file-system evidence as the source of truth, not assistant narration.

These findings support the Panda-native Context Guard direction.

### 12.2 Relevant Current Standards and Sources

| Area | Current 2026 guidance | Plan impact |
| --- | --- | --- |
| Tool-result truncation | Agent systems increasingly cap tool output, save full payloads elsewhere, and return previews/handles. Gemini CLI has active work around truncating large MCP outputs and preserving full output. Claude Code-style architectures apply per-tool result budgets before compaction. | Phase 1 is correct and should be the first implementation phase. |
| Tool-result clearing vs compaction vs memory | Anthropic's context-engineering guidance separates compaction, tool-result clearing, and memory. Tool-result clearing removes bulky old results while preserving the fact that a tool call happened. | Keep Tool Output Guard separate from session summaries and long-run compaction. |
| Long-running agents | Anthropic/OpenAI-style harnesses use explicit progress artifacts, verification loops, and compact handoff summaries. | Phase 5 should preserve decisions, files, errors, active plan/spec, and next step as structured continuity chunks. |
| Agent architecture | Modern browser/remote IDE agents separate control plane, workspace execution, chat state, file I/O, terminal/process output, and compressed context. | Panda's Chat/Proof/Changes/Workbench/Terminal ownership model is current. |
| Convex search | Convex full-text search uses relevance ranking and supports project/source filters, but search queries have term/result/index limits. Convex RAG supports namespaces, chunk context, importance weighting, semantic search, and custom filters. | Phase 2/3 should use specific filters, pagination, short queries, and possibly Convex RAG patterns instead of attempting SQLite FTS5. |
| WebContainer filesystem | WebContainer supports real directories through `FileSystemTree` directory nodes and `fs.mkdir({ recursive })`; terminal output is stream-based. | The `.gitkeep` workaround is acceptable for current Panda's file-only Convex model, but long-term explicit directory support would better match WebContainer. |

### 12.3 Required Adjustments Before Implementation

The research does not invalidate the plan, but it suggests several refinements:

1. **Add Unicode-safe truncation.**
   - Truncation must not split grapheme clusters, emoji, or multibyte characters.
   - Prefer `Intl.Segmenter` where available, with a safe fallback.

2. **Add explicit `result_too_large` / `guarded_output` semantics.**
   - Do not silently truncate.
   - The model-facing result should clearly state that output was guarded, where the full evidence is stored, and how to retrieve more.

3. **Instrument every guarded output.**
   - Track raw bytes, returned bytes, bytes avoided, indexed chunk count, source type, and retrieval handle.
   - This should be persisted in run events/receipts and surfaced in Proof.

4. **Make tool output pagination/handles first-class.**
   - Large outputs should return a handle and optionally a cursor/page model.
   - The agent should be able to request more targeted chunks instead of receiving the whole output.

5. **Tune thresholds with character and byte limits.**
   - Initial thresholds in this plan are acceptable, but implementation should measure both bytes and characters.
   - Use conservative defaults and tests around 8 KB, 32 KB, and 40,000-character boundaries.

6. **Use Convex filters aggressively.**
   - Search/index queries must filter by `projectId` and, where possible, `sourceType`, `runId`, or `chatId`.
   - Avoid `.collect()` for broad result sets; use `take(n)` or pagination.

7. **Avoid adding too many Convex indexes prematurely.**
   - Convex has finite index limits and index maintenance costs.
   - Prefer extending existing `contextChunks` indexes first, then add staged indexes only when proven necessary.

8. **Keep context-mode as reference only.**
   - The Elastic License 2.0 concern still applies for hosted-product use.
   - Implementation should remain clean-room/Panda-native.

### 12.4 Standards-Aligned Implementation Order

The validated order is:

1. Output measurement and guard metadata.
2. Bounded model-facing summaries for `run_command`.
3. Full evidence persistence and Proof/Terminal linking.
4. Indexed run output chunks in Convex.
5. Targeted retrieval over indexed output.
6. Session continuity summaries and context-pack integration.
7. Optional advanced analysis tools only after sandbox policy is clear.

### 12.5 Additional Acceptance Criteria From Research

Add these to implementation QA:

- Large output never silently truncates; it is explicitly marked as guarded.
- Unicode truncation tests pass with emoji and multibyte text near boundaries.
- The full payload is recoverable from Proof/Terminal/run evidence.
- Convex search queries respect documented limits: short query terms, scoped filters, bounded result counts.
- Search/retrieval handles can fetch focused excerpts from large prior outputs.
- Context Guard metrics appear in run receipts.
- Empty folder behavior is tested against both Panda's Convex file model and WebContainer directory capabilities.

### 12.6 Final Research Verdict

The Context Guard plan is up to current May 2026 standards if implemented as a Panda-native evidence/index/retrieval boundary. The main implementation risks are not conceptual; they are operational:

- failing to persist full output before summarizing,
- silently truncating without a handle,
- over-indexing or under-filtering Convex searches,
- exposing unsafe generic code execution,
- and letting assistant narration outrun actual file/workbench persistence.

Addressing those risks in Phase 1 and Phase 2 will make the plan a strong fit for Panda's Ask / Plan / Agent workflow and browser-first workbench architecture.
