# Status: Mode Selector System Scan

## Current milestone: Complete

## Last completed: Milestone 4 - Report Scan State - 2026-05-18

## Decision log

- Running a full-profile validation scan because no `validation.config.*` file
  exists.
- Scope is targeted around mode selector correctness plus standard quality
  gates, then extended by the browser IDE systems review requested in-session.
- Existing dirty/staged work is present and must be preserved.
- Inventory trace: `AgentSelector` updates `ChatInput` mode, send uses
  `manualModeOverride: true`, `useProjectMessageWorkflow` persists chat mode and
  dispatches only when store mode matches pending mode, `useAgent` routing
  preserves manual mode, `runtime.ts` maps the final prompt mode to harness
  agent and permission rules, and `mode-rulesets.ts` enforces read-only vs
  write-capable boundaries.
- Found and repaired a mode-contract defect: Code mode's handoff ritual said
  "Build mode"; it now identifies Code mode and focused-change behavior.
- Browser IDE systems review found Panda's main workspace/runtime path mostly
  wired correctly, with remaining architecture risks in run orchestration depth,
  file-corpus payload shape, and workspace navigation vocabulary.

## Known issues

- `apps/web/lib/agent/tools.ts` still uses content-returning `api.files.list`
  for directory listing, even though only paths are needed.
- `apps/web/hooks/useAgent.ts` remains a load-bearing shallow module that owns
  routing, context, prompt construction, run lifecycle, permissions,
  checkpoints, receipts, and artifacts.
- Workspace state vocabulary still drifts from canonical
  Work/Proof/Changes/Context/Preview terms.
- Repository-level Perfectionist State remains blocked by historical secret
  findings, root coverage script wiring, missing coverage thresholds, and the
  new browser IDE architecture tasks recorded in `VALIDATION_TASKS.md`.

## Validation evidence

- Focused mode scan passed:
  `bun test apps/web/lib/agent/chat-modes.test.ts apps/web/lib/agent/prompt-library.test.ts apps/web/lib/agent/routing/rules.test.ts apps/web/lib/agent/routing/types.test.ts apps/web/lib/agent/permission/mode-rulesets.test.ts apps/web/lib/agent/runtime.agent-resolution.test.ts apps/web/lib/agent/runtime.plan-mode.test.ts apps/web/lib/agent/runtime.build-mode.test.ts apps/web/lib/agent/tools.search.test.ts apps/web/lib/agent/automationPolicy.test.ts`
  with 86 passing tests.
- `bun run typecheck` passed; Turbo reported 2 successful tasks.
- `bun run lint` passed; ESLint completed successfully.
- `bun run format:check` passed; Prettier reported all matched files use
  Prettier style.
- `bun test apps/web/components/chat/chat-input-wiring.test.ts` passed with 5
  tests and 32 assertions.
- First `bun test` run failed because
  `apps/web/components/chat/chat-input-wiring.test.ts` expected
  `disabled={!hasSendContent}` while `ChatInput.tsx` now correctly guards
  `disabled={!hasSendContent || workspaceLoading}`.
- Updated that stale source-contract assertion.
- Rerun `bun test` passed with 1216 tests and 3610 assertions.

## Review artifacts

- Added `docs/reviews/panda-browser-ide-systems-review-2026-05-18.md`.
- Updated `VALIDATION_TASKS.md` with 2026-05-18 command evidence, health score
  84/100, and TASK-006 through TASK-008.

## Future work (out of scope, log here)

- Deepen Run Orchestration out of `useAgent`.
- Replace tool directory listing's full-content file query with a
  metadata/path-only query.
- Normalize workspace navigation vocabulary and add a persisted Zustand
  migration.
