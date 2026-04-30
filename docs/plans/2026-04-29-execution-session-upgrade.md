# Execution Session Upgrade Plan

> Reader: Panda maintainers and future agents continuing the workspace upgrade.
>
> Post-read action: execute the remaining Execution Session upgrade in small,
> independently verifiable slices without re-litigating the product direction.

## Purpose

Panda is moving from an IDE-first workspace to an Execution Session-centered
workbench. An Execution Session is the user-facing thread for one goal inside a
project. Chat, plans, runs, receipts, changed work, preview state, and branch
outcomes are all supporting parts of that session.

This plan covers the remaining product and implementation work after the first
safe UI abstraction slice. The initial slice introduced a derived Execution
Session view model and started replacing scattered chat/task/run language with
session-centered language. It deliberately did not add a persisted
`executionSessions` table or redesign the full shell.

## Target End State

The user should experience Panda as a session-first coding workbench:

- The session timeline is the primary surface for intent, progress, proof, and
  review.
- Files, editor tabs, terminal, preview, and diffs are support surfaces opened
  from the session, not the default information hierarchy.
- The left rail is organized around active and recent sessions.
- Run proof, changed work, context, and preview are session inspector surfaces.
- Parallel agents appear as session-scoped branches with summarized outcomes.
- The canonical modes remain `ask`, `plan`, `code`, and `build`.
- Browser-first with server fallback remains the runtime model.
- Existing Convex records remain the source of truth until a dedicated Execution
  Session lifecycle record is justified.

## Current Baseline

Already complete:

- A pure Execution Session view model derives session phase, title, status,
  summary, next action, changed work, proof, preview, and branch summaries from
  existing records.
- Workspace runtime context exposes the derived session model.
- Chat, proof, home, and session rail surfaces have started using
  session-centered labels.
- Focused tests cover view-model derivation and session rail copy.

Still true:

- The center workspace is still mostly IDE/editor-first.
- Session history still reads from chat records.
- The proof and changed-work surfaces are only partially session-aware.
- Parallel execution is not yet presented as user-readable session branches.
- A dedicated persisted Execution Session entity is intentionally deferred.

## Remaining Milestones

### 1. Session Timeline As Primary Canvas

Replace the center workbench default with a session timeline and next-action
canvas. The editor, file tree, terminal, preview, and diff surfaces remain
available, but they should be opened as contextual support surfaces.

Acceptance criteria:

- Opening a project lands on the active session canvas, not an empty editor-like
  workbench.
- The session canvas shows objective, current phase, next action, recent proof,
  changed-work summary, and preview/runtime state.
- Existing editor, file tree, terminal, and diff interactions remain reachable.
- Mobile keeps chat/session first, with proof and preview reachable from the
  bottom navigation.

Validation:

- Add or update component tests for the default canvas state.
- Run TypeScript, lint, focused component tests, and a browser smoke test for
  the project workspace route.

### 2. Session Inspector Consolidation

Make proof, changed work, context, and preview read from one session-centered
contract. The right panel should feel like a session inspector, not a set of
unrelated tabs.

Acceptance criteria:

- Inspector tab labels and empty states refer to the current session.
- Proof shows bounded run/receipt summaries by default.
- Changed work summarizes artifacts and file changes before showing raw detail.
- Context shows plan, memory, and spec constraints as session inputs.
- Preview clearly distinguishes browser runtime, server fallback, unsupported,
  and error states.

Validation:

- Add tests around inspector labels and empty states.
- Verify no hot Convex query returns full unbounded events, messages, file
  contents, or artifact payloads by default.

### 3. Session Rail And History Behavior

Rebuild the left rail around active/recent sessions while preserving existing
chat-backed storage. This is a presentation and interaction change first, not a
schema migration.

Acceptance criteria:

- The rail separates active, needs-review, recently completed, and idle
  sessions.
- Search and new-session actions use session language.
- Session status markers reflect derived session phase, not only run status.
- Existing chat selection and creation flows keep working.

Validation:

- Add tests for rail grouping and status labels.
- Run focused layout tests and TypeScript.

### 4. Branch Outcomes For Parallel Agents

Present parallel agents as branches inside one Execution Session. Avoid adding a
swarm dashboard or exposing orchestration internals as product navigation.

Acceptance criteria:

- Branches have user-readable labels, status, and outcome summaries.
- The session timeline can show branch start, branch completion, conflicts, and
  selected outcome.
- Branch detail is lazy-loaded or inspector-scoped.
- Failed branches do not obscure the primary session path unless they require
  user action.

Validation:

- Add view-model tests for multiple branch states.
- Add UI tests for branch summary rendering.
- Confirm payloads are bounded for branch timelines.

### 5. Execution Session Persistence Decision

Decide whether the derived model is enough or whether Panda needs a dedicated
persisted Execution Session lifecycle record.

Add a table only if there is a concrete need such as cross-chat session
continuation, stable share URLs, durable branch selection, independent session
renaming, long-running lifecycle state, or analytics that cannot be derived
cheaply from existing records.

Acceptance criteria if persistence is deferred:

- The Architecture Contract states that Execution Session is a derived product
  projection over existing records.
- Tests cover the derivation boundaries.
- No UI assumes a nonexistent table.

Acceptance criteria if persistence is added:

- The schema has explicit ownership and transition rules.
- Migration follows widen-migrate-narrow.
- Existing chat, planning, run, receipt, artifact, and message ownership remains
  clear.
- Hot queries return session summaries, not full transcripts or event streams.

Validation:

- For a deferred decision, run TypeScript and focused derivation tests.
- For a schema change, also run Convex codegen and a one-shot Convex dev check.

### 6. Documentation Contract Update

Update active architecture docs after the interaction model stabilizes. Current
docs still use chat-first language in places where the implementation is moving
to session-first.

Acceptance criteria:

- The Architecture Contract defines Execution Session, its owner, and whether it
  is persisted or derived.
- The docs index points to this plan while it is active.
- Historical chat-first plans are marked as historical or superseded where
  appropriate.
- The transcript policy explains what belongs in the session timeline versus the
  inspector.

Validation:

- Run Markdown formatting for touched docs.
- Cold-read the docs as a future agent and confirm the next implementation slice
  is unambiguous.

### 7. Full Quality Gate And Cleanup

Finish by running the full validation gate and cleaning up temporary runtime
artifacts once the maintainer decides whether to keep them.

Acceptance criteria:

- TypeScript passes.
- Lint passes.
- Formatting passes, including unrelated pre-existing doc formatting issues if
  the team chooses to fix them in this upgrade.
- Unit tests pass.
- Relevant browser smoke tests pass.
- Root runtime artifacts are either removed or intentionally retained as audit
  evidence.

Validation:

- Run the repository validation gate.
- Run browser verification for the workspace route on desktop and mobile
  breakpoints.

## Recommended Sequence

Execute the remaining work in this order:

1. Session inspector consolidation.
2. Session rail behavior.
3. Session timeline as primary canvas.
4. Branch outcomes for parallel agents.
5. Persistence decision.
6. Documentation contract update.
7. Full quality gate and cleanup.

This order avoids locking in a database model before the UI contract stabilizes,
and it keeps each slice independently testable.

## Non-Goals

- Do not copy OpenCode Desktop's Tauri or sidecar runtime architecture.
- Do not remove the canonical `ask`, `plan`, `code`, and `build` modes.
- Do not expose multi-orchestration as a swarm dashboard.
- Do not subscribe hot UI surfaces to full transcripts, file contents, tool
  arguments, command output, or unbounded run events by default.
- Do not add a persisted Execution Session table until the product need is
  proven.

## Risks

- A visual copy pass alone may make the UI say “session” while it still behaves
  like an IDE. Prioritize layout and interaction changes next.
- Adding persistence too early can create source-of-truth ambiguity with chats,
  planning sessions, runs, and receipts.
- Branch UI can become noisy if it exposes every agent event. Show outcomes
  first; lazy-load detail.
- Full formatting is currently blocked by unrelated Markdown formatting issues.
  Decide whether to fix those as part of the final cleanup or keep the gate
  scoped per slice until then.
