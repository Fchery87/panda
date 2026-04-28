# Plan: Panda Architecture Contract Hardening

## Milestone 1: Contract Docs

What: Add canonical glossary and source-of-truth docs.

Acceptance criteria: A fresh reader can identify canonical terms and ownership
for modes, planning, specs, runs, receipts, shares, runtime status, provider
state, and delivery state.

Validation:
`bun run typecheck && bun run lint && bun run format:check && bun test`

Status: [x] complete

## Milestone 2: Positioning Cleanup

What: Replace browser-only/web-only language with browser-first plus server
fallback across active docs.

Acceptance criteria: Active docs no longer claim Panda is browser-only or
web-only; WebContainer fallback behavior remains explicit.

Validation:
`bun run typecheck && bun run lint && bun run format:check && bun test`

Status: [x] complete

## Milestone 3: Security And Backend Governance

What: Add security/trust-boundary documentation and Convex backend governance
rules.

Acceptance criteria: Sensitive surfaces have documented enforcement, redaction,
sharing, token, query-shape, and retention policies.

Validation:
`bun run typecheck && bun run lint && bun run format:check && bun test`

Status: [x] complete

## Milestone 4: Mode Hardening Alignment

What: Update mode-hardening docs from pure proposal to partial implementation
status and list remaining runtime work.

Acceptance criteria: Docs distinguish implemented contracts from remaining work
and use canonical mode vocabulary.

Validation:
`bun run typecheck && bun run lint && bun run format:check && bun test`

Status: [x] complete

## Milestone 5: Wiring And Reader Test

What: Link docs from entry points, cold-read for gaps, and run validation.

Acceptance criteria: New docs are discoverable, current, and pass the named
post-read action.

Validation:
`bun run typecheck && bun run lint && bun run format:check && bun test`

Status: [x] complete
