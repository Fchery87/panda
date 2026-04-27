# Plan: Routing Engine and Execution Receipts

## Milestone 1: Typed Routing Domain

What: Define the routing domain types and contracts for `RoutingDecision`,
`RoutingInput`, `ThreadState`, `requestedMode`, `resolvedMode`, WebContainer
status, confidence, and manual override provenance.

Acceptance criteria:

- Routing types distinguish requested mode from resolved mode.
- Thread state and WebContainer status are modeled without requiring persistent
  Zustand duplication.
- The routing domain exposes a small stable interface that can be tested without
  React or Convex.

Validation: `bun run typecheck && bun test apps/web/lib/agent/routing`

Status: [x] complete

## Milestone 2: Deterministic Routing Rules

What: Add rules-first routing that maps common user intents to `ask`, `plan`,
`code`, or `build` with confidence and rationale. Manual override bypasses
classification and produces a high-confidence routing decision.

Acceptance criteria:

- Common prompts route deterministically with high or medium confidence.
- Ambiguous prompts produce low confidence or a clarification path without
  calling an LLM.
- Manual selected mode produces a high-confidence decision with override
  provenance.
- No LLM fallback exists in this milestone.

Validation: `bun run typecheck && bun test apps/web/lib/agent/routing`

Status: [x] complete

## Milestone 3: `useAgent` Routing Integration

What: Wire the routing engine into the agent send flow and audit every existing
`mode` usage so it is intentionally converted to either `requestedMode` or
`resolvedMode`.

Acceptance criteria:

- Prompt construction, runtime config, run creation, message annotations, usage
  metrics, and visible assistant/user messages use the correct mode concept.
- Existing manual mode switching still works.
- Routing decisions are available to the run lifecycle and UI before the first
  assistant token streams.
- WebContainer unavailable or errored states do not globally block `code` or
  `build` mode.

Validation: `bun run typecheck && bun run lint && bun test apps/web/hooks`

Status: [x] complete

## Milestone 4: Typed Receipt Validators

What: Add versioned Convex validators for `ExecutionReceiptV1`, including nested
validators for routing decisions, context audit records, WebContainer summaries,
native execution summaries, token usage, approval summaries, and result status.

Acceptance criteria:

- `agentRuns` stores an optional typed receipt field, not `v.any()`.
- Receipt schema is versioned.
- Receipt validators enforce bounded arrays and structured redacted records
  where practical.
- Existing rows remain valid.

Validation: `bun run typecheck && npx convex dev --once`

Status: [x] complete

## Milestone 5: Atomic Run Lifecycle Persistence

What: Extend terminal run mutations so `complete`, `fail`, and `stop` can write
receipt data atomically with terminal state.

Acceptance criteria:

- Completed runs can persist status, summary, usage, completion time, and
  receipt in one mutation.
- Failed runs can persist status, error, completion time, and receipt in one
  mutation.
- Stopped runs can persist status, completion time, and receipt in one mutation.
- There is no separate canonical post-terminal receipt write path.

Validation: `bun run typecheck && bun test convex && npx convex dev --once`

Status: [x] complete

## Milestone 6: Receipt Builder and Context Audit

What: Build receipt assembly from routing decision, prompt audit, run/tool
events, token usage, approval records, and WebContainer/native execution
summaries.

Acceptance criteria:

- Receipt builder emits bounded, redacted, typed `ExecutionReceiptV1` data.
- Prompt context assembly produces context audit metadata alongside prompt
  context.
- WebContainer summaries distinguish container execution from native/server
  execution.
- Failed and stopped runs still get partial receipts when enough data exists.

Validation: `bun run typecheck && bun test apps/web/lib/agent apps/web/hooks`

Status: [x] complete

## Milestone 7: Routing Badge and Receipt UI

What: Add a routing badge before assistant streaming and upgrade the actual
existing run content surface to render structured receipt data.

Acceptance criteria:

- High-confidence review mode can show a concise routing badge.
- Medium/low confidence can show a confirmation or clarification flow without
  introducing a new panel.
- Autopilot high-confidence decisions do not add unnecessary blocking UI.
- Receipt UI renders routing, context, WebContainer/native execution,
  token/cost, approval, and result status sections.
- Receipt UI gracefully handles missing legacy receipt data.

Validation: `bun run typecheck && bun run lint && bun test apps/web/components`

Status: [x] complete

## Milestone 8: Test Coverage and Expansion Gate

What: Add focused tests before expanding beyond deterministic routing.

Acceptance criteria:

- Tests cover deterministic routing rules.
- Tests cover manual override and requested/resolved mode propagation.
- Tests cover WebContainer ready, booting, unsupported, and error fallback
  decisions.
- Tests cover receipt validation boundaries and redaction.
- Tests cover completed, failed, and stopped receipt persistence.
- The full validation gate passes before considering LLM fallback or additional
  cockpit features.

Validation:
`bun run typecheck && bun run lint && bun run format:check && bun test`

Status: [x] complete
