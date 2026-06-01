# Phase 2 — Message Lifecycle Contract

**Phase ID:** 2  
**Status:** Completed  
**Prerequisite:** Phase 1 complete  
**Next Phase:** Phase 3 — Structured Message Blocks

## Objective

Make assistant message lifecycle explicit and easier to reason about.

## Current Issue

Panda currently updates assistant messages through a combination of:

- runtime stream events,
- mutable local variables in `useAgent.ts`,
- `schedulePaint()`,
- `useAgent-event-applier.ts`,
- final Convex persistence.

This works, but the lifecycle is implicit.

## Target Lifecycle

Introduce or document lifecycle events:

```ts
type AssistantMessageLifecycleEvent =
  | { type: 'assistant_message_started'; messageId: string; runId?: string }
  | { type: 'assistant_message_delta'; messageId: string; delta: MessageDelta }
  | {
      type: 'assistant_message_completed'
      messageId: string
      content: string
      usage?: TokenUsage
    }
  | { type: 'assistant_message_failed'; messageId: string; error: string }
```

## Mapping From Existing Runtime Events

```txt
first text/reasoning/tool event → assistant_message_started
text event                      → assistant_message_delta(text)
reasoning event                 → assistant_message_delta(reasoning)
tool_call event                 → assistant_message_delta(tool_call_ref)
tool_result event               → assistant_message_delta(tool_result_ref)
complete event                  → assistant_message_completed
error event                     → assistant_message_failed
```

## Relevant Files

- `apps/web/hooks/useAgent.ts`
- `apps/web/hooks/useAgent-event-applier.ts`
- `apps/web/lib/agent/harness/runtime-types.ts`
- `apps/web/lib/agent/harness/runtime.ts`
- `apps/web/components/chat/types.ts`

## Implementation Direction

1. Add type definitions first.
2. Document mapping from current events.
3. Keep existing runtime events working.
4. Gradually route assistant draft updates through lifecycle helper functions.
5. Avoid changing provider adapters in this phase unless necessary.

## Acceptance Criteria

- [x] Lifecycle types exist or are documented.
- [x] Existing event applier behavior still works.
- [x] Assistant draft creation/update/completion is easier to trace.
- [x] Tests around streaming assistant updates continue to pass.

## Verification

- [x] `bun test apps/web/lib/agent/harness/message-lifecycle.test.ts`
- [x] `bun test apps/web/lib/chat/transcript-blocks.test.ts`
- [x] `bun run typecheck`

## Next Step After Completion

Proceed to `03_PHASE_3_STRUCTURED_MESSAGE_BLOCKS.md`.
