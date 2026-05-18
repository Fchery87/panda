# Plan: Mode Selector System Scan

## Milestone 1: Inventory Mode Wiring

What: Trace mode selection from UI controls through Zustand/chat session state,
routing, prompt bundle, harness agent selection, and permission rules.
Acceptance criteria: every mode boundary has a source and consumer identified.
Validation: read-only inspection plus focused source references. Status: [x]
complete

## Milestone 2: Run Focused Mode Tests

What: Run existing tests for chat modes, routing, mode rulesets, runtime mode
behavior, and recent file materialization fixes. Acceptance criteria: focused
mode tests pass or produce actionable failures. Validation: focused
`bun test ...` commands. Status: [x] complete

## Milestone 3: Run Project Gates

What: Run typecheck, lint, format, and broader test/build checks feasible in
this session. Acceptance criteria: pass/fail state is recorded with exact
blockers. Validation: `bun run typecheck`, `bun run lint`,
`bun run format:check`, `bun test`, and build if feasible. Status: [x] complete

## Milestone 4: Report Scan State

What: Update `VALIDATION_TASKS.md`, `STATUS.md`, and final response with health
score, risks, and next actions. Acceptance criteria: remaining issues are
explicit and prioritized. Status: [x] complete
