# Status: Chat-First Woven Coding Workspace

## Current milestone: Complete

## Last completed: Milestone 8: Full Verification and Regression Gate - 2026-04-27

## Decision log

- The workspace will be chat-first because Codex- and Claude-style operational
  workflows treat the agent session as the command surface, with files, diffs,
  terminal, preview, and receipts orbiting the session.
- The implementation must be woven through existing run/chat architecture
  because Panda already has `useAgent`, `agentRuns`, routing decisions, run
  events, execution receipts, review slots, and WebContainer adapters.
- The chat timeline is the primary surface because users should experience a
  single coherent sequence from intent to proof rather than scattered panels.
- The review surface should be consolidated instead of expanded because the
  current many-tab model risks dashboard bloat and makes supporting artifacts
  feel equal to the primary work.
- Receipts remain the durable proof surface because they make agentic work
  inspectable, reviewable, and trustworthy.
- WebContainer state should inform routing and receipts without becoming a
  global blocker because Panda must preserve existing fallback behavior.
- The visual direction is calm operational brutalism because Panda should feel
  focused, premium, technical, and trustworthy, not playful or decorative.
- UI and design work must invoke `frontend-design` first because the workspace
  redesign needs a distinctive, production-grade interface and must avoid
  generic AI IDE or dashboard aesthetics.
- Milestone 1 defines the active workspace IA in
  `docs/plans/2026-04-26-chat-first-workspace-ia.md` because implementation
  needs a durable reference for hierarchy, surface mapping, and anti-bolted-on
  constraints.
- Milestone 2 uses a small deep module, `getRunTimeline`, because callers need a
  trivial default API while the implementation hides noisy run event, progress,
  receipt, validation, and next-action grouping.
- The run timeline view model stays pure and React/Convex-free because it should
  be testable independently and reusable by chat, proof, history, and future
  admin surfaces.
- Milestone 3 consolidates the visible proof surface to `Run`, `Changes`,
  `Context`, and `Preview` because plan, memory, eval, changed-work, and runtime
  inspection are support surfaces for the active run rather than equal-weight
  dashboard tabs.
- Legacy plan and artifact entry points now route to `Context` and `Changes`
  respectively because existing flows should keep working while the user-facing
  IA moves to fewer run-aware views.
- Milestone 4 derives chat operational rows from `getRunTimeline` instead of the
  older ad hoc milestone summaries because the transcript should share the same
  user-facing run contract as the proof surface.
- Inline chat proof rows can open `Run` or `Changes` because receipt and
  artifact review should be reachable from the timeline location where the work
  appears, without adding a modal or standalone cockpit.
- Milestone 5 keeps session status derived from bounded recent run summaries and
  active chat state because the rail should reveal background/blocked/review
  work without becoming a separate agent-state system.
- The task/history rail now uses `chats.listRecent` and run summaries rather
  than full chat or run documents because rail indicators are hot UI and must
  keep Convex payloads bounded.
- Milestone 6 keeps mobile chat-primary with explicit `Work`, `Chat`, `Proof`,
  and `Preview` access because small screens still need reachable run proof,
  workspace, and preview surfaces without returning to an editor-first cockpit.
- Desktop E2E expectations now assert the current Preview access path through
  `Deploy & Preview` because Preview is no longer a center workspace tab.
- Execution-card E2E assertions now target the shared run timeline contract
  (`Work`, `Validation`, `Receipt`, `Next action`) because chat rows are derived
  from `getRunTimeline` rather than older ad hoc copy.
- Milestone 7 refined the existing shell rather than redesigning it because the
  workspace was functionally complete; the pass focused on mobile tab semantics,
  touch feedback, operational transcript tone, and bounded-query guard
  ownership.
- Mobile `Proof` and `Preview` now expose distinct selected states because both
  routes share the review panel while representing different user destinations.
- Execution update cards use semantic tone, icon color, and lighter surface
  treatment because timeline proof should feel operational without repeating
  dashboard-style card chrome.
- Milestone 8 ran the complete regression gate because the workspace redesign is
  only complete when typecheck, lint, formatting, unit tests, Convex validation,
  and E2E all pass together after the final code changes.

## Known issues

- Existing planning files described the completed routing and receipt milestone;
  they have been replaced with the new chat-first workspace scope.
- The exact session rail behavior for background/parallel work needs design in
  Milestone 1 before implementation.
- The existing `ReviewPanel` receives slot content, so the actual run content
  owner must be identified before code changes.
- Each UI/design milestone now carries an explicit `frontend-design` skill
  requirement; future agents should treat that as part of the acceptance
  process.

## Validation log

- 2026-04-26 Milestone 1: `bun run typecheck` passed. Result: 2 typecheck tasks
  successful, 2 cached.
- 2026-04-26 Milestone 2 focused test:
  `bun test apps/web/components/chat/run-timeline.test.ts` passed. Result: 4
  pass, 0 fail.
- 2026-04-26 Milestone 2 validation:
  `bun run typecheck && bun test apps/web/components/chat apps/web/lib/agent`
  passed. Result: typecheck successful; targeted tests 514 pass, 0 fail.
- 2026-04-26 Milestone 3 validation:
  `bun run typecheck && bun run lint && bun test apps/web/components` passed
  after removing one unused helper warning. Result: typecheck successful; lint
  clean; component tests 165 pass, 0 fail.
- 2026-04-26 Milestone 4 validation:
  `bun run typecheck && bun run lint && bun test apps/web/hooks apps/web/components/chat`
  passed. Result: typecheck successful; lint clean; 125 tests pass, 0 fail.
- 2026-04-26 Milestone 5 validation:
  `bun run typecheck && bun run lint && bun test apps/web/components apps/web/stores`
  passed after rerunning lint separately when the first combined gate hit the
  shell timeout. Result: typecheck successful; lint clean; 181 tests pass, 0
  fail.
- 2026-04-27 Milestone 6 focused validation:
  `bun test apps/web/components/projects/project-workspace-layout.test.tsx apps/web/stores/workspaceUiStore.test.ts`
  passed. Result: 7 pass, 0 fail.
- 2026-04-27 Milestone 6 non-E2E gate:
  `bun run typecheck && bun run lint && bun test apps/web/components` passed.
  Result: typecheck successful; lint clean; component tests 169 pass, 0 fail.
- 2026-04-27 Milestone 6 E2E validation: `bun run test:e2e` passed after
  updating stale E2E assertions for the new Preview access path and run timeline
  copy. Result: 23 passed, 0 failed.
- 2026-04-27 Milestone 7 focused validation:
  `bun test apps/web/lib/convex/bandwidth-guard.test.ts apps/web/components/projects/project-workspace-layout.test.tsx apps/web/lib/chat/transcript-blocks.test.ts apps/web/components/chat/run-timeline.test.ts`
  passed. Result: 17 pass, 0 fail.
- 2026-04-27 Milestone 7 full validation:
  `bun run typecheck && bun run lint && bun run format:check && bun test` passed
  after formatting reported files and updating the bandwidth guard for the
  session rail hook ownership. Result: typecheck successful; lint clean; format
  check clean; 1035 pass, 0 fail.
- 2026-04-27 Milestone 8 final non-E2E gate:
  `bun run typecheck && bun run lint && bun run format:check && bun test`
  passed. Result: typecheck successful; lint clean; format check clean; 1035
  pass, 0 fail.
- 2026-04-27 Milestone 8 Convex verification: `npx convex dev --once` passed.
  Result: Convex functions ready.
- 2026-04-27 Milestone 8 E2E validation: `bun run test:e2e` passed after
  stopping a stale Next server on port 3000. Result: 23 passed, 0 failed.

## Future work

- Consider LLM routing classification after the deterministic routing baseline
  has product telemetry.
- Consider PR monitoring, scheduled tasks, or remote sessions as future
  milestones after the chat-first workspace is stable.
- Consider a dedicated summary/detail query split for receipts if the redesigned
  run proof surface needs more data than current summary queries should carry.
