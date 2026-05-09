# Validation Tasks & Health Record - Panda

**Last Updated:** 2026-05-09  
**Selected Profile:** full + coverage/security add-ons  
**Validation Health Score:** 82/100  
**Target Score:** 95/100  
**Perfectionist State:** Not reached  
**Scope:** Repository root

---

## Detected Tech Stack

- Monorepo: Bun workspaces + TurboRepo
- Frontend: Next.js 16, React 19, TypeScript, Tailwind, shadcn-style UI
- Backend: Convex with generated bindings
- Tests: Bun unit/integration tests, Playwright E2E scripts available
- Validation: ESLint, Prettier, TypeScript, Next build, Bun audit, Semgrep,
  Gitleaks

---

## Command Results

| Command                                | Status | Notes                                                                                                                    |
| -------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------ |
| `bun run typecheck`                    | PASS   | Convex codegen and Turbo typecheck completed successfully.                                                               |
| `bun run lint`                         | PASS   | ESLint completed successfully.                                                                                           |
| `bun run format:check`                 | PASS   | Prettier check passed after applying safe formatting fixes.                                                              |
| `bun test`                             | PASS   | 1140 tests passed across 243 files.                                                                                      |
| `bun run build`                        | PASS   | Initial 300s run timed out after successful compile/static generation; rerun with longer timeout completed successfully. |
| `bun audit --audit-level=moderate`     | PASS   | No audit findings were reported.                                                                                         |
| `semgrep --config p/owasp-top-ten .`   | PASS   | 0 findings, 0 blocking findings.                                                                                         |
| `bun run coverage`                     | FAIL   | Root Turbo coverage script references a missing `test:coverage` task for at least one workspace.                         |
| `cd apps/web && bun run test:coverage` | PASS   | 1053 tests passed across 205 files with coverage output generated. No configured coverage threshold was observed.        |
| `gitleaks detect --source .`           | FAIL   | 9 historical leaks found in git history.                                                                                 |

---

## Open Task Table

| ID       | Status | Severity | Category | Scope                 | Location                                                               | Summary                                                                                                     |
| -------- | ------ | -------- | -------- | --------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| TASK-001 | todo   | critical | secrets  | history               | `convex/seed.ts` historical commits                                    | Real-looking provider API keys are present in git history.                                                  |
| TASK-002 | todo   | high     | secrets  | history               | `apps/web/.next-e2e3/**` historical commits                            | Generated Next.js/E2E build artifacts with signing/encryption keys are present in git history.              |
| TASK-003 | todo   | medium   | config   | global                | `package.json`, `packages/sdk/package.json`                            | Root `coverage` script is miswired for Turbo because not every package exposes `test:coverage`.             |
| TASK-004 | todo   | medium   | coverage | global                | `apps/web`                                                             | Web coverage runs, but no repository coverage threshold is configured.                                      |
| TASK-005 | todo   | low      | secrets  | local ignored outputs | `.next/**`, `.next-e2e3/**`, `apps/web/certificates/localhost-key.pem` | Current-tree no-git secrets scan timed out on ignored/generated outputs and local dev certificate material. |

---

## Task Details

### TASK-001 - Historical provider API keys in `convex/seed.ts`

- **Severity:** critical
- **Evidence:** `gitleaks detect --source . --verbose` reported historical
  `generic-api-key` matches in `convex/seed.ts` from commit
  `02db4c652790a269da33abccf60d36c61d109c7b`.
- **Why it matters:** If these were live provider keys, history exposure means
  they must be treated as compromised even if the current working tree no longer
  contains them.
- **Suggested fix:** Revoke/rotate every exposed provider key, then purge the
  secrets from git history with a coordinated history rewrite. Do not rely on
  deleting current files only.
- **Auto-fix:** Not applied. Secret rotation and history rewriting are
  external/destructive operations requiring explicit owner coordination.

### TASK-002 - Historical generated Next.js/E2E key material

- **Severity:** high
- **Evidence:** `gitleaks detect --source . --verbose` reported historical
  matches in `apps/web/.next-e2e3/dev/prerender-manifest.json`, `.rscinfo`, and
  `server-reference-manifest.json` from commits
  `3efa95252862e53078d6568e70d96243c10f2a07` and
  `e4d22c7235426bc2f9e6714d91be796834a43900`.
- **Why it matters:** Generated artifacts should not be committed. Even
  framework-generated signing/encryption values pollute history and create false
  positives/noise for future secret scanning.
- **Suggested fix:** Confirm `.next/` and `.next-e2e*/` remain ignored, purge
  those generated artifacts from git history, and add CI secret scanning to
  prevent recurrence.
- **Auto-fix:** Not applied. History rewrite is destructive and requires
  coordination.

### TASK-003 - Root coverage script is miswired

- **Severity:** medium
- **Evidence:** `bun run coverage` runs `turbo run test:coverage`, which failed
  with `Could not find task test:coverage in project`.
- **Why it matters:** The canonical root coverage command cannot be used as a
  project-wide quality gate.
- **Suggested fix:** Either add a `test:coverage` script to every Turbo package
  that should participate, or change the root `coverage` script to run only
  packages that expose coverage until all workspaces support it.
- **Auto-fix:** Not applied. This changes validation contract across packages
  and should be decided deliberately.

### TASK-004 - Coverage thresholds are not configured

- **Severity:** medium
- **Evidence:** `cd apps/web && bun run test:coverage` passed and printed
  per-file coverage, but no minimum threshold failed the command.
- **Why it matters:** Coverage output without thresholds is observational, not a
  gate.
- **Suggested fix:** Add explicit coverage thresholds for the web package and
  document which generated/provider integration files are excluded.
- **Auto-fix:** Not applied. Threshold values require team policy.

### TASK-005 - Current-tree no-git scan includes ignored/generated outputs

- **Severity:** low
- **Evidence:** `gitleaks detect --source . --no-git --verbose` timed out while
  scanning generated `.next/**`, `.next-e2e3/**`, and ignored local certificate
  output. It also found `apps/web/certificates/localhost-key.pem`, which is
  ignored by `*.pem` but present locally.
- **Why it matters:** Local scans become noisy and slow unless generated/ignored
  outputs are excluded consistently.
- **Suggested fix:** Run local no-git secret scans with a gitleaks config or
  path excludes for ignored build outputs; keep local dev certificates out of
  tracked files.
- **Auto-fix:** Not applied. Ignored local artifacts were not deleted as part of
  this validation run.

---

## Resolved During This Run

- Applied Prettier formatting across files reported by `bun run format:check`.
- Restored the mobile runtime preview tab contract in `ProjectWorkspaceLayout`
  and widened the corresponding mobile panel types.
- Aligned stable source-contract tests with current product copy and Tailwind
  class ordering.
- Fixed `apps/web/lib/convex/bandwidth-guard.test.ts` so it resolves
  `convex/sharing.ts` correctly when run from `apps/web` during coverage.

---

## Perfectionist State Assessment

Panda does **not** currently meet Perfectionist State because:

1. `gitleaks detect --source .` fails with 9 historical leaks.
2. `bun run coverage` fails from the repository root because the Turbo coverage
   task is not defined across the workspace.
3. No explicit coverage threshold is configured for the observed web coverage
   command.
4. Critical/high security tasks remain open until exposed keys are rotated and
   history is cleaned.

---

## Scan History

| Date       | Profile                  |      Score | Result            | Notes                                                                                                             |
| ---------- | ------------------------ | ---------: | ----------------- | ----------------------------------------------------------------------------------------------------------------- |
| 2026-05-09 | full + coverage/security |         82 | Not perfectionist | Core quality gates pass; blockers are historical secrets, root coverage config, and coverage policy.              |
| 2026-04-27 | redesign snapshot        | not scored | Green snapshot    | Historical entry reported typecheck, lint, format, unit tests, Convex, and E2E passing after chat-first redesign. |
