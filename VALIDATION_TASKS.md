# Validation Tasks & Health Record - Panda

**Last Updated:** 2026-03-13  
**Scope:** Panda web app only  
**Current State:** Stabilization Tasks 1-7 complete

---

## Current Verification Status

| Command                | Status | Notes                                                 |
| ---------------------- | ------ | ----------------------------------------------------- |
| `bun run typecheck`    | PASS   | Root Turbo typecheck is green                         |
| `bun run lint`         | PASS   | Source lint is green                                  |
| `bun run format:check` | PASS   | Source formatting is current                          |
| `bun test`             | PASS   | 384 tests passing                                     |
| `bun run build`        | PASS   | Production build verified in this stabilization cycle |
| `bun run test:e2e`     | PASS   | 20/20 focused browser acceptance tests passing        |

---

## Current Browser Acceptance Bar

Panda’s browser acceptance suite now covers these core journeys:

1. Review an approved plan and build from it
2. Resume a recoverable run from checkpoints
3. Open run history in the inspector
4. Review and resolve risky browser permission requests
5. Open the real share dialog for the active chat
6. Open the workbench, inspect layout surfaces, and navigate core panels
7. Open, edit, and save a seeded file

Current E2E spec coverage:

- [apps/web/e2e/workbench.e2e-spec.ts](/home/nochaserz/Documents/Coding%20Projects/panda/apps/web/e2e/workbench.e2e-spec.ts)
- [apps/web/e2e/agent-run.e2e-spec.ts](/home/nochaserz/Documents/Coding%20Projects/panda/apps/web/e2e/agent-run.e2e-spec.ts)
- [apps/web/e2e/permissions.e2e-spec.ts](/home/nochaserz/Documents/Coding%20Projects/panda/apps/web/e2e/permissions.e2e-spec.ts)
- [apps/web/e2e/sharing.e2e-spec.ts](/home/nochaserz/Documents/Coding%20Projects/panda/apps/web/e2e/sharing.e2e-spec.ts)

---

## Reliable Commands

- Unit/integration: `bun run test:web`
- Browser E2E: `bun run test:e2e`
- Full web verification: `bun run validate:web`

Optional E2E modes:

- `cd apps/web && bun run test:e2e:all-browsers`
- `cd apps/web && bun run test:e2e:reuse-server`

---

## Closed in the Web Stabilization Pass

- Repo typecheck, lint, format, unit, and E2E verification are green
- The web runtime now follows one canonical harness-backed execution path
- Project workspace orchestration was split out of oversized page and hook files
- Browser permission UX now reflects the active runtime contract
- Persistence contracts were tightened for the active web runtime
- Placeholder share/history/resume flows were replaced with working browser
  flows
- Focused Playwright acceptance now verifies the current web workbench product

---

## Task 7 Exit Criteria

Task 7 is complete because all of the following are true:

1. `bun run typecheck` passes
2. `bun run lint` passes
3. `bun run format:check` passes
4. `bun test` passes
5. `bun run build` passes
6. `bun run test:e2e` passes
7. This validation record no longer carries unresolved stale stabilization
   blockers
