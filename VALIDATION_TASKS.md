# Validation Tasks & Health Record - Panda

**Last Updated:** 2026-05-18 **Selected Profile:** browser IDE systems review +
core gates **Validation Health Score:** 84/100 **Target Score:** 95/100  
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

| Command                                                       | Status | Notes                                                                                                                    |
| ------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------ |
| `bun run typecheck`                                           | PASS   | Convex codegen and Turbo typecheck completed successfully; 2 Turbo tasks succeeded.                                      |
| `bun run lint`                                                | PASS   | ESLint completed successfully.                                                                                           |
| `bun run format:check`                                        | PASS   | Prettier reported all matched files use Prettier style.                                                                  |
| `bun test`                                                    | PASS   | 1216 tests passed across 259 files after updating one stale ChatInput source-contract assertion.                         |
| `bun run build`                                               | PASS   | Initial 300s run timed out after successful compile/static generation; rerun with longer timeout completed successfully. |
| `bun audit --audit-level=moderate`                            | PASS   | No audit findings were reported.                                                                                         |
| `semgrep --config p/owasp-top-ten .`                          | PASS   | 0 findings, 0 blocking findings.                                                                                         |
| `bun run coverage`                                            | FAIL   | Root Turbo coverage script references a missing `test:coverage` task for at least one workspace.                         |
| `cd apps/web && bun run test:coverage`                        | PASS   | 1053 tests passed across 205 files with coverage output generated. No configured coverage threshold was observed.        |
| `gitleaks detect --source .`                                  | FAIL   | 9 historical leaks found in git history.                                                                                 |
| `bun test apps/web/components/chat/chat-input-wiring.test.ts` | PASS   | 5 tests and 32 assertions passed after aligning the send-disabled assertion with current workspace loading behavior.     |

---

## Open Task Table

| ID       | Status | Severity | Category     | Scope                 | Location                                                                                  | Summary                                                                                                                                    |
| -------- | ------ | -------- | ------------ | --------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| TASK-001 | todo   | critical | secrets      | history               | `convex/seed.ts` historical commits                                                       | Real-looking provider API keys are present in git history.                                                                                 |
| TASK-002 | todo   | high     | secrets      | history               | `apps/web/.next-e2e3/**` historical commits                                               | Generated Next.js/E2E build artifacts with signing/encryption keys are present in git history.                                             |
| TASK-003 | todo   | medium   | config       | global                | `package.json`, `packages/sdk/package.json`                                               | Root `coverage` script is miswired for Turbo because not every package exposes `test:coverage`.                                            |
| TASK-004 | todo   | medium   | coverage     | global                | `apps/web`                                                                                | Web coverage runs, but no repository coverage threshold is configured.                                                                     |
| TASK-005 | todo   | low      | secrets      | local ignored outputs | `.next/**`, `.next-e2e3/**`, `apps/web/certificates/localhost-key.pem`                    | Current-tree no-git secrets scan timed out on ignored/generated outputs and local dev certificate material.                                |
| TASK-006 | todo   | high     | architecture | browser IDE runtime   | `apps/web/hooks/useAgent.ts`, `apps/web/components/projects/WorkspaceRuntimeProvider.tsx` | `useAgent` owns too many seams: routing, context, prompt construction, run lifecycle, persistence, checkpoints, runtime adapter, receipts. |
| TASK-007 | todo   | high     | bandwidth    | file corpus           | `apps/web/lib/agent/tools.ts`, `convex/files.ts`                                          | Agent `listDirectory` uses content-returning `api.files.list` even though it only needs paths.                                             |
| TASK-008 | todo   | medium   | workspace IA | workspace navigation  | `apps/web/stores/workspaceUiStore.ts`, `apps/web/components/panels/RightPanel.tsx`        | Internal tab vocabulary still drifts from canonical Work/Proof/Changes/Context/Preview contract.                                           |

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

### TASK-006 - `useAgent` is a load-bearing shallow module

- **Severity:** high
- **Evidence:** Browser IDE systems review found `useAgent` owns mode routing,
  prompt history filtering, context retrieval, prompt bundle construction, run
  orchestration, checkpoint persistence, runtime adapter creation, permission
  audit, receipts, variants, and artifact interactions.
- **Why it matters:** A maintainer changing one execution behavior must reason
  about most of the IDE runtime at once, reducing locality and increasing
  regression risk.
- **Suggested fix:** Deepen a non-React Run Orchestration module behind a narrow
  `startWorkspaceRun`-style interface and keep React hooks focused on UI state
  and event subscription.
- **Auto-fix:** Not applied. This is a load-bearing refactor that should be
  sliced behind tests.

### TASK-007 - Agent directory listing reads full file content payloads

- **Severity:** high
- **Evidence:** `apps/web/lib/agent/tools.ts` calls `api.files.list` in
  `listDirectory`, while `convex/files.ts` documents `list` as content-including
  and returns up to 2000 file docs.
- **Why it matters:** Directory listing is a metadata/path operation; content
  payloads amplify Convex bandwidth and make future hot-path regressions easy.
- **Suggested fix:** Add or reuse a path/metadata-only file query for agent
  directory listing and update bandwidth guard tests to forbid `api.files.list`
  in tool directory listing.
- **Auto-fix:** Not applied. Requires changing the tool API reference contract
  and generated Convex bindings.

### TASK-008 - Workspace tab vocabulary drift

- **Severity:** medium
- **Evidence:** `workspaceUiStore` uses `run` for Proof and `workspace` for
  mobile Work; `RightPanel` contains preview label handling but the right panel
  tab type excludes `preview`.
- **Why it matters:** The UI mostly works today, but product concepts are
  translated in multiple places, making future tray/mobile wiring error-prone.
- **Suggested fix:** Normalize state unions to canonical
  Work/Proof/Changes/Context/Preview and mobile Work/Chat/Proof/Preview, with a
  persisted Zustand migration from legacy names.
- **Auto-fix:** Not applied. Needs a deliberate migration and source-contract
  test updates.

---

## Resolved During This Run

- Applied Prettier formatting across files reported by `bun run format:check`.
- Restored the mobile runtime preview tab contract in `ProjectWorkspaceLayout`
  and widened the corresponding mobile panel types.
- Aligned stable source-contract tests with current product copy and Tailwind
  class ordering.
- Fixed `apps/web/lib/convex/bandwidth-guard.test.ts` so it resolves
  `convex/sharing.ts` correctly when run from `apps/web` during coverage.
- Updated `apps/web/components/chat/chat-input-wiring.test.ts` so the send
  button source-contract assertion includes the current workspace-loading guard.
- Added `docs/reviews/panda-browser-ide-systems-review-2026-05-18.md` with
  browser IDE wiring evidence and deepening candidates.

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
5. Browser IDE architecture tasks remain open around run orchestration depth,
   metadata-only file corpus operations, and workspace navigation vocabulary.

---

## Scan History

| Date       | Profile                                 |      Score | Result            | Notes                                                                                                               |
| ---------- | --------------------------------------- | ---------: | ----------------- | ------------------------------------------------------------------------------------------------------------------- |
| 2026-05-18 | browser IDE systems review + core gates |         84 | Not perfectionist | Core gates pass; review added architecture/bandwidth/workspace IA tasks and repaired one stale ChatInput assertion. |
| 2026-05-09 | full + coverage/security                |         82 | Not perfectionist | Core quality gates pass; blockers are historical secrets, root coverage config, and coverage policy.                |
| 2026-04-27 | redesign snapshot                       | not scored | Green snapshot    | Historical entry reported typecheck, lint, format, unit tests, Convex, and E2E passing after chat-first redesign.   |
