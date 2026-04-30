# Plan: Execution Session Upgrade Completion

## Milestone 1: Session Inspector Consolidation

What: Make proof, changed work, context, and preview read as one current-session
inspector instead of unrelated right-panel tabs.

Acceptance criteria:

- Inspector heading and tab copy refer to the current Execution Session.
- Empty states are session-centered.
- Proof, changed work, context, and preview summaries use the shared session
  model where available.
- Existing tab routing and detail panels continue to work.

Validation:
`bun test apps/web/components/projects/project-workspace-layout.test.tsx apps/web/lib/workspace/execution-session-view-model.test.ts && bun run typecheck`

Status: [x] complete

## Milestone 2: Session Rail Behavior

What: Group rail/history presentation around session states while preserving
chat-backed storage and bounded recent-chat queries.

Acceptance criteria:

- Rail copy and grouping distinguish active, needs-review, recent, and idle
  sessions.
- Search and new-session affordances remain accessible.
- Existing chat selection and creation flows continue to work.
- Tests cover grouping and status labels.

Validation:
`bun test apps/web/components/projects/project-workspace-layout.test.tsx && bun run typecheck`

Status: [x] complete

## Milestone 3: Session Timeline Primary Canvas

What: Make the center workspace default to the session timeline/next-action
canvas while keeping editor/file/terminal/diff support surfaces reachable.

Acceptance criteria:

- Project open state lands on session canvas language instead of IDE-empty state
  language.
- The center canvas shows objective, phase, next action, proof, changed work,
  and preview/runtime summaries.
- Editor, files, terminal, preview, and diff remain reachable.
- Mobile remains session/chat-first with proof and preview navigation intact.

Validation:
`bun test apps/web/components/projects/project-workspace-layout.test.tsx && bun run typecheck`

Status: [x] complete

## Milestone 4: Branch Outcomes

What: Present parallel agent work as branches inside the current Execution
Session.

Acceptance criteria:

- Branch summaries have labels, status, and outcome copy.
- Branch detail is lazy or inspector-scoped.
- Failed branches surface only when user action is needed.
- View-model tests cover multiple branch states.

Validation:
`bun test apps/web/lib/workspace/execution-session-view-model.test.ts && bun run typecheck`

Status: [ ] pending

## Milestone 5: Persistence Decision And Docs

What: Decide and document whether Execution Session remains a derived projection
or becomes a persisted lifecycle record.

Acceptance criteria:

- Architecture Contract defines Execution Session and its owner.
- Docs state whether it is currently derived or persisted.
- Historical chat-first language is superseded where needed.
- No schema change is added unless the decision requires it.

Validation:
`bunx prettier --check docs/ARCHITECTURE_CONTRACT.md docs/README.md docs/plans/2026-04-29-execution-session-upgrade.md && bun run typecheck`

Status: [ ] pending

## Milestone 6: Full Gate And Cleanup

What: Run final verification and clean up temporary runtime artifacts according
to maintainer preference.

Acceptance criteria:

- TypeScript passes.
- Lint passes.
- Unit tests pass.
- Formatting is either fully clean or remaining unrelated format blockers are
  explicitly documented.
- Browser smoke test is run if the app can start in the local environment.
- Root task artifacts are ready for removal or explicit retention.

Validation: `bun run typecheck && bun run lint && bun test`

Status: [ ] pending
