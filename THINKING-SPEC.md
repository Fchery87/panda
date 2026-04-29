# Spec: Chat Thinking Panel V1

## Deliverables

- [ ] Owner-only inline Thinking appears above the assistant answer as soon as
      display-safe reasoning deltas arrive, even before answer text.
- [ ] Live Thinking auto-opens while streaming and collapses after completion.
- [ ] Assistant turns with only Thinking render no empty answer bubble.
- [ ] Historical assistant messages show collapsed saved display-safe Thinking
      summaries when present.
- [ ] Historical assistant messages with reasoning tokens but no safe summary
      show a redacted unavailable indicator.
- [ ] Copying assistant messages excludes Thinking content.
- [ ] Public shared chats remain reasoning-free unless an existing leak is found
      and fixed.
- [ ] Visible settings copy says "Show Thinking" while internal field names stay
      unchanged.
- [ ] Focused tests cover transcript block generation and message rendering.

## Constraints

- Do not expose raw chain-of-thought.
- Use `Thinking` for product copy and `reasoning content` for internal/policy
  language.
- Consume normalized app-level `reasoning` events; do not add provider-specific
  chat UI.
- Use existing provider-level reasoning controls only.
- Store only bounded display-safe summaries and reasoning token metadata.
- Keep public share projections free of reasoning, proof internals, and
  owner-only execution detail.
- Preserve the existing brutalist visual system.

## Out of Scope

- Adding per-chat reasoning toggles.
- Adding chat-panel reasoning effort or budget controls.
- Adding a Panda-owned summarizer pipeline.
- Migrating or backfilling historical Convex messages.
- Refactoring the reasoning/transcript architecture beyond the focused v1 gaps.
