# Plan: Execution Session Shell Restructure

## Phase 1: Extract Shell Regions

What: Introduce/adapt shell region components for session rail, timeline canvas,
composer region, work tray, and terminal drawer while keeping existing surfaces
mounted through adapters. Acceptance criteria: no behavior moves yet, but the
desktop hierarchy has named regions that later phases can target. Validation:
`bun run typecheck && bun run lint && bun test apps/web/components/projects/project-workspace-layout.test.tsx`.
Status: [x] complete

## Phase 2: Move Chat To Center

What: Make `ProjectChatPanel` the central timeline/composer surface and remove
chat from the right-tray mental model. Acceptance criteria: mode controls,
model, attachments, approval, stop/resume, share, history, and contextual chat
entry points remain reachable. Validation:
`bun run typecheck && bun run lint && bun test apps/web/components/projects/project-workspace-layout.test.tsx`
plus any focused chat wiring tests present. Status: [x] complete

## Phase 3: Move Workbench Into Tray

What: Host `Workbench` as the Work tray view, keep editor-heavy focus/expand
affordances, and keep Changes wired to artifact/diff review. Acceptance
criteria: files/editor, preview access, changes/diff review, and context
surfaces remain reachable from the tray. Validation:
`bun run typecheck && bun run lint && bun test apps/web/components/projects/project-workspace-layout.test.tsx`
plus focused workbench tests if present. Status: [x] complete

## Phase 4: Consolidate Terminal And Proof

What: Keep terminal as a bottom drawer and render agent events/proof as the
Proof tray view instead of a peer dock tab. Acceptance criteria: terminal opens
from the bottom drawer, proof/run events are available in the tray, and mobile
access is preserved. Validation:
`bun run typecheck && bun run lint && bun test apps/web/components/projects/project-workspace-layout.test.tsx`
plus focused panel/dock tests if present. Status: [x] complete

## Phase 5: Docs And Final Verification

What: Update docs and tests for Execution Session Shell terminology and feature
reachability. Acceptance criteria: docs reflect the new shell mapping and all
phase tests pass. Validation:
`bun run typecheck && bun run lint && bun run format:check && bun test`; before
final completion attempt `bun run test:e2e` if the local environment can run it.
Status: [ ] pending
