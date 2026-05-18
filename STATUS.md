# Status: Harness File Materialization Review

## Current milestone: Complete

## Last completed: Milestone 4 - Verify And Record - 2026-05-18

## Decision log

- Root cause has two parts: tool execution normalizes `/docs/index.md` to
  `docs/index.md`, but persisted pending artifact application did not normalize
  the artifact path before `api.files.getByPath`, `api.files.upsert`, or
  `writeFileToRuntime`; that could persist an absolute-looking `/docs/...` path
  that the file tree treats as a blank root segment instead of the expected
  `docs` directory.
- Secondary behavior issue: write-capable prompts allowed the model to infer
  extra documentation files from a simple folder request. The prompt contract
  now explicitly says to implement only the requested change and not invent
  docs/setup/architecture files.
- Empty folders are not first-class records in the current `files` table; Panda
  represents directories only from file paths. For a requested empty folder, the
  agent must create a smallest placeholder file such as `docs/.gitkeep` rather
  than inventing a documentation set.
- Mode policy and permissions were left unchanged.

## Known issues

- None for the reported `/docs` materialization path.

## Validation evidence

- Red test observed before fix:
  `bun test apps/web/lib/artifacts/executeArtifact.test.ts apps/web/lib/agent/prompt-library.test.ts`
  failed because artifact application queried `/docs/index.md` instead of
  `docs/index.md`, and prompt text lacked literal-scope guardrails.
- Focused verification passed:
  `bun test apps/web/lib/artifacts/executeArtifact.test.ts apps/web/lib/agent/prompt-library.test.ts apps/web/lib/agent/tools.search.test.ts`
  — 38 passing tests, 113 assertions.
- Typecheck passed: `bun run typecheck` — 2 successful Turbo tasks.
- Lint passed: `bun run lint` — ESLint completed successfully.
- Format check passed: `bun run format:check` — all matched files use Prettier
  style.
- Full unit test suite passed: `bun test` — 1219 passing tests, 3621 assertions.

## Future work (out of scope, log here)

- Add first-class directory records if Panda needs true empty directories
  without placeholder files.
