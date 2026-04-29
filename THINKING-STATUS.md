# Status: Chat Thinking Panel V1

## Current Milestone

Validation

## Last Completed

Milestone 3: Tests And Verification - 2026-04-29

## Decision Log

- Use `Thinking` as the user-facing term and `reasoning content` as internal
  policy language.
- Do not expose raw chain-of-thought; show only display-safe provider summaries
  or safe excerpts.
- Use existing provider-level controls only for v1.
- Keep v1 provider-agnostic by consuming normalized `reasoning` events.
- Store bounded display-safe summaries and reasoning token metadata only.
- Keep public shared chats reasoning-free.
- Rename visible settings copy to "Show Thinking" without changing persisted
  field names.
- Implement as a small focused patch because existing runtime and UI seams
  already exist.

## Known Issues

- Root `SPEC.md`, `PLAN.md`, and `STATUS.md` already describe a previous
  architecture program, so this task uses `THINKING-*` runtime artifacts to
  avoid overwriting unrelated state.
- Targeted Thinking tests pass with
  `bun test apps/web/lib/chat/transcript-blocks.test.ts apps/web/components/chat/MessageBubble.test.tsx`.
- `bun run typecheck` and `bun run lint` pass after the implementation.
- A follow-up frontend regression was fixed: `status_thinking` events now create
  a temporary assistant draft with `Thinking...` or provider status text before
  answer text exists, so the chat panel has a row to render during long thinking
  phases even when no display-safe reasoning delta has arrived yet.
- `bun run format:check` still fails on unrelated pre-existing documentation
  files: `CLAUDE.md`, `docs/agents/domain.md`, `docs/agents/issue-tracker.md`,
  and `docs/agents/triage-labels.md`.

## Future Work

- Consider a dedicated owner-only Run proof surface for richer reasoning audit
  only if a future product requirement justifies it.
