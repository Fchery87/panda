# Phase 4 — Reasoning Metadata Upgrade

**Phase ID:** 4  
**Status:** Completed  
**Prerequisite:** Phase 3 complete  
**Next Phase:** Phase 5 — Layout Focus Modes

## Objective

Modernize Panda's reasoning model to support safe summaries, redaction, token
accounting, and provider-opaque continuity metadata.

## Safety Rule

Do not expose raw chain-of-thought by default.

## Current Strengths

Panda already has:

- `supportsReasoning`
- `reasoningControl`
- `reasoningEffort`
- `reasoningBudget`
- `reasoningContent`
- `reasoningTokens`
- transcript blocks for thinking teaser/redacted states

## Gap

Panda should explicitly model provider-opaque reasoning metadata such as:

- OpenAI encrypted reasoning content
- Anthropic thinking signatures/redacted thinking
- Google thought signatures

## Target Model

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

## Relevant Files

- `apps/web/lib/llm/types.ts`
- `apps/web/lib/llm/reasoning-transform.ts`
- `apps/web/lib/llm/providers/openai-compatible.ts`
- `apps/web/lib/agent/harness/runtime.ts`
- `apps/web/hooks/useAgent-event-applier.ts`
- `apps/web/lib/chat/transcript-blocks.ts`
- `convex/schema.ts`

## Implementation Direction

1. Define provider-neutral reasoning metadata types.
2. Preserve existing `reasoningContent` behavior.
3. Add redacted/summary states to durable message blocks or annotations.
4. Extend provider adapters only where provider data is available.
5. Keep raw reasoning hidden unless explicit debug tooling is approved.

## Acceptance Criteria

- [x] Reasoning summary/redacted states render safely.
- [x] Reasoning token accounting remains visible.
- [x] Provider metadata can be preserved without displaying raw CoT.
- [x] Existing reasoning panel behavior does not regress.

## Verification

- [x] `bun test apps/web/hooks/useAgent-event-utils.test.ts`
- [x] `bun test apps/web/lib/chat/transcript-blocks.test.ts`
- [x] `bun test apps/web/lib/agent/harness/message-lifecycle.test.ts`
- [x] `bun run typecheck`

## Next Step After Completion

Proceed to `05_PHASE_5_LAYOUT_FOCUS_MODES.md`.
