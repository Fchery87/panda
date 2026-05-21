# Phase 0 — Architecture Contract

**Phase ID:** 0  
**Status:** Completed  
**Prerequisite:** Approved planning docs in `docs/revise`  
**Next Phase:** Phase 1 — Surface Ownership Cleanup

## Objective

Create a shared architecture contract for Panda's runtime, chat, provider streaming, reasoning, tool execution, persistence, and workspace surfaces before changing behavior.

This phase is documentation-first. It should not alter runtime behavior.

## Why This Phase Comes First

Panda already has many mature pieces, but their responsibilities are spread across several layers:

- `ChatInput.tsx`
- `useProjectMessageWorkflow.ts`
- `useAgent.ts`
- `runtime.ts`
- `useAgent-event-applier.ts`
- Convex `messages` and `agentRunEvents`
- `MessageList.tsx`
- `transcript-blocks.ts`
- `WorkbenchRightPanel.tsx`

A written contract prevents implementation drift.

## Deliverables

Create or update an architecture document, suggested path:

`docs/PANDA_RUNTIME_AND_WORKSPACE_MODERNIZATION_PLAN.md`

It should include:

1. Current prompt submission lifecycle
2. Current runtime streaming lifecycle
3. Current provider chunk contract
4. Current run-event persistence path
5. Target surface ownership model
6. Target message lifecycle model
7. Target reasoning safety policy
8. Tool output display policy
9. Migration phase sequence
10. Approval gates

## Current Lifecycle to Document

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

## Target Contract Summary

Panda should converge toward:

```txt
Provider chunk
  → Runtime event
  → Message lifecycle event
  → UI state update
  → Persisted run event/message block
  → Transcript block
```

## Files to Reference

- `apps/web/components/chat/ChatInput.tsx`
- `apps/web/hooks/useProjectMessageWorkflow.ts`
- `apps/web/hooks/useAgent.ts`
- `apps/web/lib/agent/harness/runtime.ts`
- `apps/web/lib/llm/types.ts`
- `apps/web/lib/llm/providers/openai-compatible.ts`
- `apps/web/hooks/useAgent-event-applier.ts`
- `apps/web/lib/chat/transcript-policy.ts`
- `apps/web/lib/chat/transcript-blocks.ts`
- `convex/schema.ts`

## Acceptance Criteria

- [x] Architecture document exists: `docs/PANDA_RUNTIME_AND_WORKSPACE_MODERNIZATION_PLAN.md`.
- [x] It clearly defines current and target lifecycle.
- [x] It states surface ownership rules.
- [x] It states reasoning safety rules.
- [x] It lists implementation phases and next phase.
- [x] No runtime behavior changes were made.

## Next Step After Completion

Proceed to `01_PHASE_1_SURFACE_OWNERSHIP.md`.
