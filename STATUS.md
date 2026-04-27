# Status: Routing Engine and Execution Receipts

## Current milestone: Complete

## Last completed: Milestone 8: Test Coverage and Expansion Gate - 2026-04-27

## Decision log

- Typed receipts are required because execution receipts are the trust and audit
  layer, and untyped `v.any()` would allow malformed canonical records.
- Receipt persistence must be atomic with terminal run lifecycle mutations
  because a completed, failed, or stopped run without its canonical receipt
  would be an unreliable audit record.
- The system must distinguish `requestedMode` from `resolvedMode` because manual
  selection and routing decisions can diverge and both are meaningful for
  prompts, persistence, metrics, and UI.
- WebContainer readiness must not globally block `code` or `build` because
  existing Panda behavior supports fallback execution when WebContainer is
  unsupported or unavailable.
- Thread state should be derived at the routing boundary rather than duplicated
  in Zustand unless a specific UI-session need exists.
- Receipt data must be bounded and redacted because command strings, tool args,
  paths, and context metadata can expose sensitive information or create large
  Convex payloads.
- Phase 1 routing is deterministic only because an LLM classifier adds latency,
  failure modes, and cost before the rules baseline is proven.
- Milestone 1 introduced the routing domain as a small standalone module because
  routing decisions must be testable without React, Convex, or runtime coupling.
- Milestone 2 kept routing deterministic and rules-only because the initial
  routing baseline should be low-latency, testable, and free of LLM fallback
  costs or failure modes.
- Milestone 3 routes ordinary agent sends through the deterministic resolver
  inside `useAgent`, while composer-originated explicit sends set manual
  override so selected mode remains authoritative.
- Milestone 3 keeps programmatic and explicit send paths distinct because Panda
  needs automatic routing without breaking manual mode switching or
  approved-plan build transitions.
- Milestone 4 added a versioned `ExecutionReceiptV1` validator because receipt
  shape is part of Panda's trust contract and must be enforced by Convex rather
  than stored as an untyped blob.
- Milestone 5 extended the existing `complete`, `fail`, and `stop` terminal run
  mutations to accept optional typed receipts because receipts must be persisted
  atomically with terminal run state, not through a separate best-effort write.
- Milestone 6 added a pure receipt builder and prompt context audit output so
  receipt assembly is typed, bounded, redacted, and woven into the existing
  `useAgent` terminal lifecycle rather than bolted on after completion.
- Milestone 7 renders receipts inside the existing run progress surface because
  `InspectorRunContent` owns run-tab content and `ReviewPanel` only receives the
  run panel as a slot.

## Known issues

- The original design plan names `ReviewPanel` as the run-tab implementation
  point, but current code shows `ReviewPanel` receives `runContent`;
  implementation must identify and update the actual run content owner.
- Convex generated AI guidelines file was not present at
  `convex/_generated/ai/guidelines.md`; Convex changes still need validation
  through project tests and `npx convex dev --once`.
- No active blockers.

## Validation log

- 2026-04-26 Milestone 1:
  `bun run typecheck && bun test apps/web/lib/agent/routing` passed after
  rerunning with a longer timeout. Result: 2 typecheck tasks successful; routing
  tests 3 pass, 0 fail.
- 2026-04-26 Milestone 2:
  `bun run typecheck && bun test apps/web/lib/agent/routing` passed. Result: 2
  typecheck tasks successful; routing tests 12 pass, 0 fail.
- 2026-04-26 Milestone 3:
  `bun run typecheck && bun run lint && bun test apps/web/hooks` passed. Result:
  2 typecheck tasks successful; lint successful; hook tests 78 pass, 0 fail.
- 2026-04-26 Milestone 4: `bun run typecheck && npx convex dev --once` passed.
  Result: 2 typecheck tasks successful; Convex functions ready.
- 2026-04-26 Milestone 5:
  `bun run typecheck && bun test convex && npx convex dev --once` passed.
  Result: 2 typecheck tasks successful; Convex tests 50 pass, 0 fail; Convex
  functions ready.
- 2026-04-26 Milestone 6:
  `bun run typecheck && bun test apps/web/lib/agent apps/web/hooks` passed.
  Result: 2 typecheck tasks successful; agent and hook tests 538 pass, 0 fail.
- 2026-04-26 Milestone 7:
  `bun run typecheck && bun run lint && bun test apps/web/components` passed.
  Result: 2 typecheck tasks successful; lint successful; component tests 161
  pass, 0 fail.
- 2026-04-26 Milestone 8 focused tests:
  `bun test apps/web/lib/agent/routing apps/web/lib/agent/receipt.test.ts apps/web/hooks/useAgent-run-lifecycle.test.ts convex/agentRuns.persistence.test.ts`
  passed. Result: 19 pass, 0 fail.
- 2026-04-26 Milestone 8 full gate attempt:
  `bun run typecheck && bun run lint && bun run format:check && bun test` passed
  typecheck and lint, then failed at `format:check` on 39 remaining pre-existing
  formatting warnings outside touched routing/receipt files.
- 2026-04-27 Milestone 8 all-tests leg: `bun test` passed independently after
  the format blocker. Result: 1021 pass, 0 fail.
- 2026-04-27 Milestone 8 full gate after formatting reported files:
  `bun run typecheck && bun run lint && bun run format:check && bun test`
  passed. Result: typecheck 2/2 tasks successful; lint 1/1 task successful;
  format check clean; tests 1021 pass, 0 fail.

## Future work

- Add an LLM routing classifier behind a feature flag after deterministic
  routing telemetry shows concrete gaps.
- Consider a dedicated receipt query that returns summaries by default and full
  receipt details only when the user opens the run receipt surface.
- Consider cost-estimation improvements if existing plugin cost tracking remains
  approximate.
