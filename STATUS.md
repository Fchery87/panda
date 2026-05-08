# Status: Execution Session Shell Restructure

## Current phase: Phase 5 - Docs And Final Verification

## Last completed: Phase 4 - Consolidate Terminal And Proof - 2026-05-07

## Completed phases

- Phase 1 - Extract Shell Regions - 2026-05-07
- Phase 2 - Move Chat To Center - 2026-05-07
- Phase 3 - Move Workbench Into Tray - 2026-05-07
- Phase 4 - Consolidate Terminal And Proof - 2026-05-07

## Decision log

- Use the referenced
  `docs/plans/2026-05-07-execution-session-shell-restructure.md` as frozen scope
  because it already defines the phase sequence, parity target, and structural
  reference.
- Treat existing dirty workspace layout files as pre-existing work and preserve
  them unless they directly need changes for this restructure.
- Phase 1 keeps existing surfaces mounted while adding named shell region
  wrappers for the execution session rail, timeline/composer region, work tray,
  and terminal drawer.
- Chat now renders in the central execution session timeline region.
- The right tray defaults to Work and hosts the existing workbench/editor
  surface so files, diffs, and implementation detail remain reachable after
  moving chat.
- Persisted `rightPanelTab: chat` values migrate to `work` because chat is no
  longer a right-tray tab.
- The bottom dock now contains terminal only; agent events moved into the Proof
  run surface.

## Validation log

- Phase 1 gate passed: `bun run typecheck`, `bun run lint`, and
  `bun test apps/web/components/projects/project-workspace-layout.test.tsx`.
- Phase 2/3 focused tests passed:
  `bun test apps/web/components/projects/project-workspace-layout.test.tsx apps/web/components/panels/RightPanel.test.tsx apps/web/stores/workspaceUiStore.test.ts apps/web/components/projects/project-chat-wiring.test.ts`.
- Phase 2/3 gate passed: `bun run lint` and `bun run typecheck` after rerunning
  typecheck with a 240s timeout because the first 120s run timed out during
  Convex/codegen and TypeScript.
- Phase 4 gate passed: `bun run typecheck`, `bun run lint`, and focused shell
  tests covering terminal-only dock and proof agent events.

## Known issues

- The worktree already had modified workspace layout files before this execution
  session started.

## Future work (out of scope, log here)

- None yet.
