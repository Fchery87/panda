# Execution Session Shell Restructure

## Summary

Restructure Panda's desktop workspace into a session-first shell inspired by T3
Code's thread-first layout, while keeping Panda's brutalist visual system and
strict feature parity.

Reference findings:

- T3 Code centers `ChatView` around a dominant thread timeline, bottom composer,
  persistent thread sidebar, optional plan sidebar, diff panel, and terminal
  drawer: <https://github.com/pingdotgg/t3code>
- Panda's current shell is split across `ProjectWorkspaceLayout`,
  `WorkspaceRuntimeProvider`, `ProjectChatPanel`, `WorkbenchRightPanel`,
  `Workbench`, and `workspaceUiStore`, with chat currently living inside the
  right rail rather than owning the desktop canvas.
- Panda's canonical domain term is `Execution Session`, so docs and planning
  should call this the `Execution Session Shell`.

## Key Changes

- Create task runtime docs first, per repo rules: `SPEC.md`, `PLAN.md`, and
  `STATUS.md`.
- Rebuild the desktop shell hierarchy:
  - Left: persistent `Execution Session` rail as the default navigation surface.
  - Center: chat/session timeline as the primary canvas.
  - Bottom of center: composer with `ask`, `plan`, `code`, `build`, model,
    attachments, approval, stop, and resume controls.
  - Right: wide contextual work tray with `Work`, `Proof`, `Changes`, `Context`,
    and `Preview`.
  - Bottom drawer: terminal only; move agent events into `Proof`.
- Preserve all current Panda surfaces:
  - Files/editor, diff review, terminal, preview, run proof, receipts, plan
    review, memory, evals, share, history, command palette, permissions, runtime
    status, contextual chat, inline chat, and mobile navigation.
- Update state/types:
  - Replace right-panel-as-chat mental model with a tray model.
  - Remove `chat` from the right tray tabs once chat is central.
  - Add/rename state around `activeTrayView`, tray open/close, tray width/focus
    mode, and terminal drawer state.
- Keep visual direction:
  - Structure follows T3's thread-first hierarchy.
  - Styling remains Panda: sharp corners, monospace controls, explicit borders,
    operational labels, no T3 visual clone.

## Implementation Shape

- Phase 1: Extract layout regions without behavior changes.
  - Introduce shell components for session rail, timeline canvas, composer
    region, work tray, and terminal drawer.
  - Keep existing components mounted through adapters so behavior remains
    stable.
- Phase 2: Move chat from right rail to center.
  - `ProjectChatPanel` becomes the central timeline/composer surface.
  - `WorkbenchRightPanel` becomes the tray host for `Work`, `Proof`, `Changes`,
    `Context`, and `Preview`.
- Phase 3: Move workbench/editor into the tray.
  - `Workbench` becomes the `Work` tray view.
  - Keep expand/focus affordance for editor-heavy work.
  - Keep `Changes` wired to artifact/diff review.
- Phase 4: Consolidate terminal/events.
  - Terminal remains a bottom drawer.
  - Agent events render under `Proof` instead of as a peer dock tab.
- Phase 5: Update docs and tests.
  - Add `Execution Session Shell` to `CONTEXT.md`.
  - Update active workspace IA docs if implementation changes terminology or
    surface mapping.

## Test Plan

- Unit/static tests:
  - Update `project-workspace-layout.test.tsx`, `project-chat-wiring.test.ts`,
    `RightPanel.test.tsx`, `workspaceUiStore.test.ts`.
  - Add coverage for tray tab routing, central composer rendering, terminal
    drawer behavior, and strict feature reachability.
- Browser/E2E:
  - Verify workbench load, send message, mode switching, plan review/approval,
    build-from-plan, file open/edit, diff review, terminal open, preview access,
    share, permissions, and mobile tabs.
- Validation gate after each milestone:
  - `bun run typecheck && bun run lint && bun run format:check && bun test`
  - For Convex-sensitive changes: `npx convex dev --once`
  - Before completion: `bun run test:e2e`

## Assumptions

- Desktop redesign is in scope; mobile should be preserved except for shared
  component fallout.
- T3 Code is a structural reference, not a visual target.
- Feature parity is strict: no existing Panda feature may disappear, even if
  moved.
- Implementation should be phased rather than a single rewrite because the
  current layout/runtime provider spans several large files and many tests.
