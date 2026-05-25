# Plan: Panda Workflow Orchestration Completion

## Milestone 1: True `ask_user` Pause/Resume

What: Convert `ask_user` from a follow-up-message pattern into a live same-run structured decision pause. Acceptance criteria: pending questions are persisted, rendered while the run is active, and option clicks resolve the active tool call. Validation: Convex contract tests, MessageBubble tests, questionnaire tool tests, and TypeScript. Status: [x] complete

## Milestone 2: Direct Runtime Advisor Enforcement

What: Add advisor preflight before risky direct runtime tools. Acceptance criteria: risky `write_files`, `run_command`, and `apply_patch` calls create advisor requests and do not execute before review. Validation: direct tool advisor enforcement tests and TypeScript. Status: [x] complete

## Milestone 3: Autopilot Checkpoints

What: Gate Agent Autopilot transitions behind advisor review when the `autopilot_checkpoint` policy applies. Acceptance criteria: Autopilot creates an advisor request, emits checkpoint events, and stops before unattended continuation. Validation: workflow checkpoint tests, useAgent integration contract test, and TypeScript. Status: [x] complete

## Milestone 4: Workflow Chain Runtime Linkage

What: Link workflow chain steps to actual `agentRuns`. Acceptance criteria: steps store `runId` and are marked running/completed/failed from run lifecycle. Validation: Convex contract tests, useAgent chain linkage test, WorkflowChainsPanel tests, and TypeScript. Status: [x] complete

## Milestone 5: Browser Proof Chain Coverage

What: Add Playwright coverage for file artifact apply → file tree/editor visibility and advisor-gated artifact surfacing. Acceptance criteria: e2e spec is present and discoverable. Validation: Playwright spec discovery and focused unit/regression tests. Status: [x] complete

## Milestone 6: Advisor Reviewer Polish

What: Improve advisor review request UX. Acceptance criteria: request cards support prompt view/copy, cancellation, running state, disabled empty manual completion, and success/error toasts. Validation: AdvisorReviewRequestsPanel tests and TypeScript. Status: [x] complete

## Milestone 7: Workflow Artifact Materialization

What: Add optional `.panda/artifacts/...` markdown materialization helpers and copy affordances while keeping Convex canonical. Acceptance criteria: deterministic materialized path/content drafts and UI copy buttons. Validation: materialization tests, WorkflowArtifactsPanel tests, and TypeScript. Status: [x] complete

## Milestone 8: Documentation And Status

What: Update the remaining implementation plan, project plan, and status tracker. Acceptance criteria: docs distinguish completed work from hardening follow-ups. Validation: direct file review. Status: [x] complete

## Milestone 9: Final Regression And Cleanup

What: Run focused regression, Convex codegen, TypeScript, and inspect generated-artifact status. Acceptance criteria: focused tests and typecheck pass; no accidental `.next`/test-result files are newly tracked. Validation: final commands recorded in `STATUS.md`. Status: [>] in progress
