# Validation Tasks & Health Record - Panda

**Last Updated:** 2026-03-13  
**Scope:** Panda web app only  
**Current State:** Stabilization Tasks 1-6 complete, Task 7 in progress

---

## Current Verification Status

| Command                           | Status                                         | Notes                                           |
| --------------------------------- | ---------------------------------------------- | ----------------------------------------------- |
| `bun run typecheck`               | PASS                                           | Root Turbo typecheck is green                   |
| `bun run lint`                    | PASS                                           | Zero warnings                                   |
| `bun run format:check`            | PASS                                           | Formatting is current                           |
| `bun test`                        | PASS                                           | 381 tests passing                               |
| `bun run build`                   | Previously passing in this stabilization cycle | Not re-run in the final Task 7 slice yet        |
| `cd apps/web && bun run test:e2e` | Blocked in this Codex sandbox                  | Browser launch fails before test logic executes |

---

## Minimum Web Acceptance Suite

The browser acceptance bar for Panda is now defined around these journeys:

1. Create and open a project
2. Open, edit, and save a file in the workbench
3. Run an agent request through the browser chat flow
4. Inspect run progress and history
5. Review and act on risky permission requests
6. Resume a recoverable run from runtime checkpoints
7. Share the active chat through the browser share dialog

Current E2E spec coverage:

- [apps/web/e2e/workbench.e2e-spec.ts](/home/nochaserz/Documents/Coding%20Projects/panda/apps/web/e2e/workbench.e2e-spec.ts)
- [apps/web/e2e/agent-run.e2e-spec.ts](/home/nochaserz/Documents/Coding%20Projects/panda/apps/web/e2e/agent-run.e2e-spec.ts)
- [apps/web/e2e/permissions.e2e-spec.ts](/home/nochaserz/Documents/Coding%20Projects/panda/apps/web/e2e/permissions.e2e-spec.ts)
- [apps/web/e2e/sharing.e2e-spec.ts](/home/nochaserz/Documents/Coding%20Projects/panda/apps/web/e2e/sharing.e2e-spec.ts)

---

## Reliable Commands

Use these as the current source of truth:

- Unit/integration: `bun run test:web`
- Browser E2E: `bun run test:e2e`
- Full web verification: `bun run validate:web`

Optional E2E modes:

- `cd apps/web && bun run test:e2e:all-browsers`
- `cd apps/web && bun run test:e2e:reuse-server`

---

## Remaining True Blockers

### BLOCKER-001: Playwright browser launch is blocked in this Codex sandbox

- **Status:** Open
- **Severity:** High for local browser verification in this environment
- **Scope:** Execution environment, not Panda application logic
- **Observed Failure:**
  - Chromium launch exits before tests run
  - Headless shell path fails with `sandbox_host_linux.cc:41`
  - Chromium channel path fails on crashpad socket setup with
    `Operation not permitted`
- **Impact:**
  - The new browser acceptance specs exist, but I could not complete a passing
    `bun run test:e2e` from this sandbox
  - CI and normal local environments remain the intended verification path
- **Recommended Next Check:**
  - Run `bun run test:e2e` outside this restricted sandbox, or in CI

### BLOCKER-002: Final Task 7 build + E2E confirmation still needs one unrestricted run

- **Status:** Open
- **Severity:** Medium
- **Scope:** Final acceptance sign-off
- **Required Commands:**
  - `bun run build`
  - `bun run test:e2e`
- **Reason:**
  - Task 7 should close only after the browser acceptance suite and build are
    both re-confirmed from an environment that can launch Playwright

---

## Closed During This Stabilization Pass

- Repo typecheck, lint, format, and unit test failures
- Legacy runtime split in the web app
- Overloaded project page and `useAgent` browser orchestration
- Placeholder share flow in the project workspace
- Hidden resume flow for recoverable runtime checkpoints
- Dead history action in the chat surface
- Legacy browser permission defaults path
- Loose persistence contracts for the active web runtime path
- Missing root-level web verification scripts

---

## Task 7 Exit Criteria

Task 7 can be marked complete when all of the following are true:

1. `bun run typecheck` passes
2. `bun run lint` passes
3. `bun run format:check` passes
4. `bun test` passes
5. `bun run build` passes
6. `bun run test:e2e` passes in an environment that can launch Playwright
7. This validation record no longer lists any stale failures from before the
   stabilization work
