# Plan: Execution Session Finalization

## S01: Timeline Row Contract

What: Add a pure timeline row contract over existing Execution Session state.

Acceptance criteria:

- Rows cover intent, planning, grouped activity, changed work, validation,
  proof, preview, branch outcomes, and next action.
- Raw details are represented as expandable references, not default narrative.
- Tests cover core session phases and branch outcomes.

Validation:
`bun test apps/web/lib/workspace/execution-session-timeline.test.ts && bun run typecheck`

Status: [x] complete

## S02: Timeline Canvas UI

What: Render the center session canvas from timeline rows with one explicit next
action and links to inspector/support surfaces.

Acceptance criteria:

- The canvas renders compressed timeline rows.
- Next action is prominent.
- Changed-work/proof rows open inspector surfaces.
- Editor and diff remain reachable.

Validation:
`bun test apps/web/components/projects/project-workspace-layout.test.tsx apps/web/lib/workspace/execution-session-timeline.test.ts && bun run typecheck`

Status: [x] complete

## S03: Persistent Composer Control Plane

What: Make the composer visible and session-aware in the main session
experience.

Acceptance criteria:

- Composer is visible on desktop and mobile session surfaces.
- Mode/model/context/attachment controls remain reachable.
- Stop/retry/follow-up states are session-aware.

Validation:
`bun test apps/web/components/projects/project-workspace-layout.test.tsx && bun run typecheck`

Status: [x] complete

## S04: Contextual Support Surfaces

What: Move IDE tools into contextual support affordances rather than primary
navigation.

Acceptance criteria:

- Primary rail emphasizes sessions.
- Files/search/git/deploy become secondary or contextual affordances.
- File tree, diff, and terminal open from session/support actions.

Validation:
`bun test apps/web/components/projects/project-workspace-layout.test.tsx && bun run typecheck`

Status: [x] complete

## S05: Session-Attached Changed Work Review

What: Review changed files as work produced by the active session.

Acceptance criteria:

- Changed work groups created, modified, and deleted files.
- Diff/detail links preserve session context.
- Validation/proof summary appears near changed files.

Validation:
`bun test apps/web/lib/workspace/execution-session-timeline.test.ts apps/web/components/projects/project-workspace-layout.test.tsx && bun run typecheck`

Status: [x] complete

## S06: Resumable Session State

What: Make selected/returned sessions show goal, state, changed files, run
status, pending review, branches, and next action immediately.

Acceptance criteria:

- Rail selection restores timeline and inspector state.
- Derived state is sufficient, or a persistence blocker is documented.
- Completed, blocked, review-ready, and executing sessions produce different
  next actions.

Validation:
`bun test apps/web/lib/workspace/execution-session-view-model.test.ts apps/web/lib/workspace/execution-session-timeline.test.ts && bun run typecheck`

Status: [x] complete

## S07: Branch Strip And Merge Review

What: Render parallel branches inside the session timeline with lazy detail.

Acceptance criteria:

- Branch strip shows status, outcome, validation, and changed-file count.
- Blocked/failed branches produce action-oriented copy.
- Merge/reject/continue actions only appear when metadata supports them.

Validation:
`bun test apps/web/lib/workspace/execution-session-view-model.test.ts apps/web/lib/workspace/execution-session-timeline.test.ts && bun run typecheck`

Status: [x] complete

## S08: Browser Smoke And Responsive Proof

What: Verify final session workflow in browser on desktop and mobile sizes.

Acceptance criteria:

- Desktop smoke covers session timeline, composer, inspector, changed work, and
  support surfaces.
- Mobile smoke covers session/chat, proof, preview, and composer access.
- Console has no new runtime errors on exercised paths.
- Full repository gate passes.

Validation:
`bun run typecheck && bun run lint && bun run format:check && bun test`

Status: [x] complete
