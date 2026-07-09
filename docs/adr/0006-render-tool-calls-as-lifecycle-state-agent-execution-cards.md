# Render tool calls as lifecycle-state Agent Execution Cards

Status: accepted

Tool calls and agent steps were rendered as plain text in the chat transcript.
As of July 2026, every major AI coding tool (Cursor 3.1, Windsurf 2, VS Code
Copilot) renders tool calls as interactive cards with lifecycle states. We are
replacing text-only rendering with Agent Execution Cards.

## Decision

Each tool call renders as a compact card with a `Lifecycle State` (`pending` →
`running` → `success` / `error`). Card types include File Edit (diff preview),
Command (output), Search (results), MCP Call (response), and Subagent (nested
steps). Cards are collapsed by default and expandable. Batch operations render
as summary cards ("Edited 3 files") that expand to individual cards.

## Considered Options

1. **Lifecycle-state cards** — Interactive, stateful, expandable. Matches 2026
   industry standard. *(Chosen)*

2. **Keep plain text with inline formatting** — Simpler but poor information
   density and no interactive affordances.

3. **Full inline rendering (no cards)** — Show everything inline (diffs, output,
   etc.) directly in the transcript. Rejected because it creates extremely long
   transcripts and makes scanning difficult.

## Consequences

- Chat transcript becomes scannable: collapsed cards let users see the shape of
  execution at a glance.
- Error cards provide retry/expand actions inline.
- Batch cards reduce visual noise for multi-file operations.
- Card rendering requires a message-content-block architecture (structured
  content blocks rather than monolithic strings).
