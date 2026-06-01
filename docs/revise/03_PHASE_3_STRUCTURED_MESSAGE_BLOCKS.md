# Phase 3 — Structured Message Blocks

**Phase ID:** 3  
**Status:** Completed  
**Prerequisite:** Phase 2 complete  
**Next Phase:** Phase 4 — Reasoning Metadata Upgrade

## Objective

Add an optional durable structured message block model while preserving existing
`content: string` compatibility.

## Current Issue

Convex `messages` currently store:

```ts
{
  chatId,
  role,
  content: string,
  annotations?: MessageAnnotation[],
  createdAt
}
```

This is simple and stable, but Panda's runtime output is richer than a string.

## Target Additive Model

Add optional blocks, not a breaking replacement:

```ts
type MessageBlock =
  | { type: 'text'; text: string }
  | {
      type: 'reasoning_summary'
      text?: string
      redacted?: boolean
      tokenCount?: number
    }
  | { type: 'tool_call_ref'; toolCallId: string; toolName?: string }
  | { type: 'tool_result_ref'; toolCallId: string; eventId?: string }
  | { type: 'artifact_ref'; artifactId: string }
  | {
      type: 'file_change_ref'
      path: string
      action: 'created' | 'updated' | 'deleted'
    }
  | { type: 'error'; message: string }
```

## Migration Rule

- Keep `content` as canonical fallback.
- Render `blocks` if present.
- Existing messages without `blocks` must render exactly as before.

## Relevant Files

- `convex/schema.ts`
- `convex/messages.ts`
- `apps/web/components/chat/types.ts`
- `apps/web/lib/chat/transcript-blocks.ts`
- `apps/web/hooks/useAgent.ts`
- `apps/web/hooks/useMessageHistory.ts`

## Implementation Direction

1. Add schema validator for message blocks.
2. Add optional `blocks` field to messages table.
3. Update message add/update mutations to accept blocks.
4. Update client types.
5. Update transcript block builder to prefer blocks.
6. Keep fallback to `content`.

## Acceptance Criteria

- [x] Existing messages still render.
- [x] New assistant messages can optionally persist blocks.
- [x] Tool and artifact references do not require dumping detail in chat.
- [x] No data migration required for existing records.

## Verification

- [x] `bun test apps/web/lib/chat/transcript-blocks.test.ts`
- [x] `bun test apps/web/lib/agent/harness/message-lifecycle.test.ts`
- [x] `bun run typecheck`

## Next Step After Completion

Proceed to `04_PHASE_4_REASONING_METADATA.md`.
