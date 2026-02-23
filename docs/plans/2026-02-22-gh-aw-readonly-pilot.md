# GitHub Agentic Workflows Read-Only Pilot (CI Failure Doctor)

## Goal

Add a low-risk GitHub Agentic Workflow pilot that helps triage failed CI runs
without writing to the repository.

## Implemented

- Added source workflow: `.github/workflows/ci-failure-doctor.md`
- Added source workflow: `.github/workflows/pr-reviewer.md`
- Triggered on:
  - `workflow_run` for `CI` (completed)
  - `workflow_dispatch`
- Permissions: `read-all`
- No `safe-outputs` configured (read-only pilot)

## Remaining Setup (manual, outside this workspace)

1. Install the `gh aw` CLI extension (technical preview tooling).
2. Compile workflow sources:
   - `gh aw compile .github/workflows/ci-failure-doctor.md`
   - `gh aw compile .github/workflows/pr-reviewer.md`
   - or `gh aw compile` for all agentic workflow sources
3. Commit generated lock file:
   - `.github/workflows/ci-failure-doctor.lock.yml`
   - `.github/workflows/pr-reviewer.lock.yml`
4. Test on a manual dispatch run.
5. Observe signal quality for 1-2 weeks before enabling any write actions.

## Rollout Guardrails

- Keep read-only until the pilot consistently produces useful, low-noise triage
  summaries.
- Start with `ci-failure-doctor`, then enable `pr-reviewer` after validating
  noise level and usefulness.
- If write actions are later enabled, start with tightly-scoped `safe-outputs`
  (for example, comment on the triggering PR only).
- Require human review for any workflow that proposes code changes.
