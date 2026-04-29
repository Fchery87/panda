# Plan: Chat Thinking Panel V1

## Milestone 1: UI Behavior

What: Patch the existing ReasoningPanel and MessageBubble rendering so live
Thinking appears before answer text, auto-opens while streaming, collapses after
completion, and avoids empty answer bubbles.

Acceptance criteria:

- Reasoning-only assistant drafts render the Thinking panel without an empty
  answer bubble.
- Live Thinking auto-opens while streaming.
- Historical Thinking remains collapsed by default.
- Redacted/unavailable copy is clear and bounded.

Validation:
`bun test apps/web/components/chat/MessageBubble.test.tsx apps/web/lib/chat/transcript-blocks.test.ts`

Status: [x] complete

## Milestone 2: Settings Copy

What: Rename visible provider setting copy to "Show Thinking" while preserving
existing internal field names and persisted shape.

Acceptance criteria:

- User-facing label avoids "reasoning panel" wording.
- No stored setting field names change.

Validation: `bun run typecheck`

Status: [x] complete

## Milestone 3: Tests And Verification

What: Add focused tests for transcript block generation and message rendering.

Acceptance criteria:

- Tests cover safe Thinking summary display.
- Tests cover redacted indicator when reasoning tokens exist without summary.
- Tests cover no empty answer bubble before text.
- Tests cover existing copy behavior excluding Thinking where a test seam
  exists.

Validation:
`bun run typecheck && bun run lint && bun run format:check && bun test apps/web/components/chat/MessageBubble.test.tsx apps/web/lib/chat/transcript-blocks.test.ts`

Status: [x] complete
