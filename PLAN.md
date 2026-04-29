# Plan: Architecture Deepening Program

## Milestone 1: Run Orchestration Module

What: Extract behavior-preserving Run lifecycle ordering from `useAgent` and
related hook helpers into a Deep Module under `apps/web/lib/agent/`.

Acceptance criteria:

- `useAgent` delegates Run lifecycle ordering to the new Module.
- Existing `ask`, `plan`, `code`, and `build` behavior remains unchanged.
- Existing event persistence and receipt behavior remains unchanged.
- Tests cover the orchestration Interface for one chat turn or approved plan
  execution.

Validation:
`bun run typecheck && bun run lint && bun run format:check && bun test`

Status: [x] complete

## Milestone 2: Plan And Spec Lifecycle

What: Align Plan and Spec usage so Plan owns execution intent and Spec provides
verification context attached to a Run.

Acceptance criteria:

- Spec approval no longer acts as a parallel approval lifecycle unless
  explicitly required by existing product behavior.
- Run orchestration can attach Plan and Spec context through one lifecycle path.
- Tests cover accepted Plan to Run execution with Spec verification context.

Validation:
`bun run typecheck && bun run lint && bun run format:check && bun test`

Status: [x] complete

## Milestone 3: Run Projection Module

What: Create a Run Projection Module that transforms live and persisted Run
facts into chat, proof, and public-share projections.

Acceptance criteria:

- Chat projection returns bounded timeline summaries.
- Proof projection can include inspection detail while staying bounded and
  redacted.
- Public share projection excludes owner-only execution detail, raw reasoning,
  provider secrets, signed URLs, private files, and checkpoint payloads.
- Live and persisted inputs produce stable ordering.
- Unknown event kinds degrade to safe summaries.

Validation:
`bun run typecheck && bun run lint && bun run format:check && bun test`

Status: [x] complete

## Milestone 4: Harness Tool Scheduling Planner

What: Extract tool execution scheduling decisions from harness `Runtime` into a
planner-first Module.

Acceptance criteria:

- The planner decides sequential versus parallel scheduling, retry eligibility,
  dedupe, loop stop, and risk interruption outcomes.
- The existing `Runtime` remains the executor.
- Tests cover planner decisions without requiring provider streaming or React.

Validation:
`bun run typecheck && bun run lint && bun run format:check && bun test`

Status: [x] complete

## Milestone 5: Runtime Command Execution Adapter

What: Deepen Runtime Command Execution into an Adapter-backed Seam for
WebContainer and server-backed execution paths.

Acceptance criteria:

- Terminal owns user intent and rendering, not fallback mechanics.
- The command execution Adapter owns runtime selection, status transitions,
  output shaping, and failure classification.
- WebContainer and server-backed execution are concrete paths behind the
  Adapter.
- Tests cover browser-ready, browser-failed, server fallback, status
  transitions, and log shaping without rendering Terminal.

Validation:
`bun run typecheck && bun run lint && bun run format:check && bun test`

Status: [x] complete

## Milestone 6: Workspace Runtime Availability Interface

What: Split the Workspace Runtime Interface by product concept, starting with
runtime availability.

Acceptance criteria:

- Runtime availability exposes a small Interface for `idle`, `booting`, `ready`,
  `unsupported`, and `error` behavior.
- Callers needing runtime availability no longer depend on the full workspace
  runtime object.
- Existing workbench behavior remains unchanged.
- Tests cover the runtime availability Interface independently.

Validation:
`bun run typecheck && bun run lint && bun run format:check && bun test`

Status: [x] complete

## Milestone 7: Convex Query Shape Interfaces

What: Force active UI onto summary/detail-specific Convex Interfaces and mark
broad legacy Interfaces as compatibility-only.

Acceptance criteria:

- Hot UI uses bounded, indexed, summary-shaped, paginated, or lazy detail
  Interfaces.
- Cold detail flows use explicit detail Interfaces.
- Broad legacy Interfaces are renamed or documented as compatibility-only before
  removal.
- Tests guard active UI against regressing to broad hot-path queries.
- Convex schema deploy is verified when Convex code changes.

Validation:
`bun run typecheck && bun run lint && bun run format:check && bun test && npx convex dev --once`

Status: [x] complete
