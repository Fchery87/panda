# Panda Runtime and Workspace Modernization Plan

**Status:** Phase 0 architecture contract completed  
**Source plan:** `docs/revise/00_PHASE_0_ARCHITECTURE_CONTRACT.md`  
**Next phase:** `docs/revise/01_PHASE_1_SURFACE_OWNERSHIP.md`

## 1. Purpose

This document is the shared architecture contract for modernizing Panda's browser IDE, agent runtime, chat transcript, reasoning handling, tool execution visibility, persistence, and workspace layout.

Phase 0 is documentation-only. It intentionally does not change runtime behavior.

The implementation strategy follows the Karpathy guidelines requested for this work:

- make the smallest useful change for the current phase,
- avoid speculative abstractions,
- keep changes surgical,
- define verifiable success criteria,
- do not refactor unrelated code.

## 2. Current Prompt Submission Lifecycle

Current prompt flow:

```txt
ChatInput
  ↓
ProjectChatPanel
  ↓
WorkspaceRuntimeContext
  ↓
WorkspaceRuntimeProvider
  ↓
useProjectMessageWorkflow
  ↓
useAgent.sendMessage
  ↓
createAgentRuntime / Runtime.run()
  ↓
provider.completionStream()
  ↓
Runtime events
  ↓
useAgent-event-applier
  ↓
React state + Convex persistence
```

Primary files:

- `apps/web/components/chat/ChatInput.tsx`
- `apps/web/components/projects/ProjectChatPanel.tsx`
- `apps/web/components/projects/WorkspaceRuntimeProvider.tsx`
- `apps/web/hooks/useProjectMessageWorkflow.ts`
- `apps/web/hooks/useAgent.ts`
- `apps/web/lib/agent/harness/runtime.ts`
- `apps/web/hooks/useAgent-event-applier.ts`
- `convex/messages.ts`
- `convex/agentRuns.ts`

Current behavior summary:

1. `ChatInput` collects text, mentions, and attachments.
2. `ProjectChatPanel` wires chat UI to the workspace runtime.
3. `WorkspaceRuntimeProvider` exposes the active runtime/session state.
4. `useProjectMessageWorkflow` handles chat selection, mode checks, provider checks, and send orchestration.
5. `useAgent.sendMessage` creates local user/assistant state and starts the runtime.
6. `Runtime.run()` builds completion options and streams provider output.
7. `useAgent-event-applier` applies runtime events to UI state and run-event persistence.
8. Convex persists messages, run events, receipts, artifacts, and related execution metadata.

## 3. Current Runtime Streaming Lifecycle

Current provider streaming is normalized through Panda's `StreamChunk` contract.

Current stream chunk families include:

```txt
status_thinking
reasoning
text
tool_call
tool_result
error
finish
```

Primary files:

- `apps/web/lib/llm/types.ts`
- `apps/web/lib/llm/providers/openai-compatible.ts`
- `apps/web/lib/agent/harness/runtime.ts`

Current runtime behavior summary:

1. Runtime builds `CompletionOptions`.
2. Provider returns an async stream through `completionStream(options)`.
3. Provider-specific chunks are normalized into Panda stream chunks.
4. Runtime converts stream chunks into higher-level runtime events.
5. UI and persistence layers consume those runtime events.

Known improvement target:

Panda's stream chunks work, but the assistant message lifecycle is still implicit. Later phases should introduce an explicit message lifecycle without breaking current provider adapters.

## 4. Current Provider Chunk Contract

The provider contract currently normalizes provider-specific behavior into shared chunks.

Example target mapping:

```txt
provider text delta       → StreamChunk: text
provider reasoning delta  → StreamChunk: reasoning
provider tool call        → StreamChunk: tool_call
provider tool result      → StreamChunk: tool_result
provider completion       → StreamChunk: finish
provider error            → StreamChunk: error
```

The OpenAI-compatible provider uses the Vercel AI SDK stream path and maps streaming parts into this contract.

The contract should remain stable during early modernization phases. Later work should layer lifecycle events above this contract rather than replacing it immediately.

## 5. Current Run-Event Persistence Path

Panda currently persists runtime and execution evidence in Convex.

Important persistent concepts:

- `messages`
- message annotations
- tool calls
- reasoning summary/tokens
- `agentRuns`
- `agentRunEvents`
- run receipts
- artifacts
- files
- attachments

Persistence path:

```txt
Runtime event
  ↓
useAgent-event-applier
  ↓
local React state update
  ↓
Convex message/run-event mutation
  ↓
MessageList / Inspector / Workbench surfaces
```

Important files:

- `convex/schema.ts`
- `convex/messages.ts`
- `convex/agentRuns.ts`
- `convex/artifacts.ts`
- `convex/files.ts`
- `apps/web/hooks/useAgent-event-applier.ts`

Current persistence is already strong. Modernization should be additive and compatibility-preserving.

## 6. Target Lifecycle Contract

Panda should converge toward this explicit lifecycle:

```txt
Provider chunk
  → Runtime event
  → Message lifecycle event
  → UI state update
  → Persisted run event/message block
  → Transcript block
```

Target assistant message lifecycle:

```txt
assistant_message_started
assistant_message_delta
assistant_message_completed
assistant_message_failed
```

Target event responsibility:

| Layer | Responsibility |
| --- | --- |
| Provider chunk | Normalize provider-specific stream output. |
| Runtime event | Represent agent/runtime activity. |
| Message lifecycle event | Represent assistant message construction. |
| UI state update | Keep local transcript/workspace responsive. |
| Persisted event/block | Store durable evidence and transcript data. |
| Transcript block | Render user-facing chat story. |

This lifecycle should be introduced incrementally in later phases.

## 7. Target Surface Ownership Model

Panda should enforce clear ownership between major surfaces:

```txt
Chat      = user intent, assistant answer, compact reasoning, compact run summary
Proof     = run trace, tool calls, approvals, snapshots, debug/provenance
Changes   = artifacts, diffs, generated/modified files
Context   = plan, memory, evals, specifications
Workbench = editor, file tabs, preview, active file work
Terminal  = command logs and running processes
```

Design rule:

```txt
Chat = story
Inspector = evidence
Workbench = files
Terminal = commands
```

Chat may show compact tool chips and run summaries, but detailed tool output belongs in Proof or the appropriate inspector surface.

## 8. Reasoning Safety Policy

Panda should not expose raw chain-of-thought by default.

Allowed user-facing reasoning surfaces:

- reasoning summary,
- compact thinking teaser,
- redacted thinking indicator,
- reasoning token count,
- provider/model metadata,
- progress/status labels.

Provider-opaque reasoning metadata should be preserved where available, but not rendered as raw reasoning text by default.

Target reasoning model for later phases:

```ts
type ReasoningState = {
  mode: 'off' | 'auto' | 'low' | 'medium' | 'high' | 'max'
  display: 'hidden' | 'summary' | 'expanded' | 'debug'
  summary?: string
  visibleContent?: string
  redacted?: boolean
  tokenCount?: number
  providerMetadata?: {
    encryptedContent?: string
    signature?: string
    redactedPayload?: string
    thoughtSignature?: string
  }
}
```

This model is a target contract, not a Phase 0 code change.

## 9. Tool Output Display Policy

Tool data should remain durable and inspectable, but chat should not become a raw log stream.

Chat should show:

- compact tool chips,
- short status summaries,
- plan checklist summaries,
- final outcome summaries.

Proof should show:

- full tool call timeline,
- tool arguments,
- tool output,
- errors,
- approvals,
- snapshots,
- run receipts,
- subagent details.

Changes should show:

- generated artifacts,
- file diffs,
- created/updated/deleted file summaries.

Terminal should show:

- command logs,
- process output,
- runtime command state.

## 10. Migration Phase Sequence

The approved phase order is:

1. `00_PHASE_0_ARCHITECTURE_CONTRACT.md` — architecture contract.
2. `01_PHASE_1_SURFACE_OWNERSHIP.md` — surface ownership cleanup.
3. `02_PHASE_2_MESSAGE_LIFECYCLE.md` — message lifecycle contract.
4. `03_PHASE_3_STRUCTURED_MESSAGE_BLOCKS.md` — structured message blocks.
5. `04_PHASE_4_REASONING_METADATA.md` — reasoning metadata upgrade.
6. `05_PHASE_5_LAYOUT_FOCUS_MODES.md` — layout focus modes.
7. `06_PHASE_6_QUEUE_STEER_UX.md` — mid-stream queue / steer UX.
8. Post-phase QA and polish.

## 11. Approval Gates

Each phase should be completed and verified before moving to the next.

Phase gate checklist:

```txt
Read phase doc
  ↓
Confirm prerequisite complete
  ↓
Make the smallest implementation that satisfies acceptance criteria
  ↓
Run focused verification
  ↓
Update phase status/checklist
  ↓
Proceed to next phase doc
```

Current next phase after this document:

```txt
docs/revise/01_PHASE_1_SURFACE_OWNERSHIP.md
```

## 12. Phase 0 Acceptance Criteria

- [x] Architecture document exists.
- [x] It clearly defines current and target lifecycle.
- [x] It states surface ownership rules.
- [x] It states reasoning safety rules.
- [x] It lists implementation phases and next phase.
- [x] No runtime behavior changes were made.

## 13. Non-Goals for Phase 0

Phase 0 does not:

- modify runtime behavior,
- change provider adapters,
- change Convex schema,
- change chat rendering,
- change workspace layout,
- add queue/steer behavior,
- expose raw chain-of-thought.

## 14. Next Phase

Proceed to:

```txt
docs/revise/01_PHASE_1_SURFACE_OWNERSHIP.md
```
