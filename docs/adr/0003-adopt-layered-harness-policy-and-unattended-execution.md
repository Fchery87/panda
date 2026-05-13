# 0003. Adopt Layered Harness Policy and Unattended Execution

## Status

Accepted

## Context

Panda's agentic harness needs clearer governance for tool permissions, command
risk, MCP, Subagents, audit records, and runs that cannot ask the owner for
approval. The Thanos harness review highlighted useful local-extension patterns:
capability-based policy rules, command-family controls, visible denials, bounded
audit records, and headless-safe defaults. Panda must adapt those ideas without
breaking its Convex-backed product architecture.

## Decision

Panda will use a layered Harness Policy model. Admin policy is the authoritative
ceiling and defines the maximum allowed capabilities. User preferences may make
behavior stricter inside that ceiling. Project-scoped Harness Policy is deferred
until Panda has explicit team/project governance semantics.

Command-Family Policy will be owned by Convex admin settings first. Runtime will
receive a resolved policy snapshot and must not be the source of truth.

`permissionAuditLog` will be the canonical store for permission and audit
decisions. `agentRunEvents` may mirror bounded proof summaries for timeline and
Proof UI, but those summaries are not the canonical audit record.

Subagent summaries will be persisted in both run events and receipts: run events
for live/historical inspection, receipts for final durable rollup. Raw subagent
prompt/output remains owner-only, bounded, lazy-loaded, or omitted by default.

Project-scoped MCP is deferred. Panda will ship admin-scoped MCP policy and
user-scoped MCP configuration first. Project MCP may appear as recommendations,
but active inherited project MCP requires team/project governance.

Panda will use `Unattended Execution` as the product term for a Run with no
active owner approval channel. `headless` is only an internal compatibility
term. Server fallback is not the same thing as Unattended Execution.

## Consequences

- Future permission behavior should be explainable as admin ceiling, user
  preference, execution contract, and session approval.
- Security and audit queries can use `permissionAuditLog` without depending on
  run timeline retention or projection shape.
- Panda can add command-family policy and headless-safe defaults without
  treating server fallback as non-interactive by definition.
- Project-scoped MCP and project policy remain intentionally blocked until team
  governance exists.
