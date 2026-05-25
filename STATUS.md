# Status: Panda Workflow Orchestration Implementation

## Current milestone: Remaining workflow plan implementation in progress

## Last completed: Phases 1-7 from `docs/PANDA_REMAINING_WORK_IMPLEMENTATION_PLAN.md` - 2026-05-25

## Completed in this milestone

1. True `ask_user` live pause/resume for active runs.
2. Advisor enforcement in direct runtime tool calls.
3. Autopilot checkpoint integration.
4. Workflow chain runtime linkage to `agentRuns`.
5. Browser E2E coverage for file tree/advisor proof chain added.
6. Advisor reviewer UX polish.
7. Optional workflow artifact materialization helpers and UI copy affordances.

## Known hardening follow-ups

- `ask_user` live pause/resume works in the active browser session, but full browser reload recovery of an in-flight `ask_user` resolver still needs runtime checkpoint rehydration.
- Direct runtime tool advisor enforcement blocks risky work and creates review requests before execution; automatic replay of the exact blocked tool after approval remains a future hardening step.
- New Playwright specs are present/discoverable; full browser execution should be run where Convex + Next webServer startup has enough time budget.

## Validation evidence

- `bun run convex:codegen:ci` passed after schema/function changes.
- `cd apps/web && bunx tsc --noEmit --pretty false` passed.
- Focused tests passed for:
  - `ask_user` questionnaire/tool cards/Convex lifecycle,
  - direct advisor tool enforcement,
  - Autopilot checkpoint integration,
  - workflow chain runtime linkage,
  - workflow artifact materialization,
  - advisor request panel polish.
- Playwright discovery passed for `e2e/file-tree-advisor-proof.e2e-spec.ts` with 2 tests listed.
