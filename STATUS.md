# Status: Architecture Deepening Program

## Current Milestone

Architecture Deepening Program complete

## Last Completed

Milestone 7: Convex Query Shape Interfaces - 2026-04-29

## Decision Log

- Treat the work as one coordinated architecture program split into seven
  independently shippable tracks because the Modules share Run, planning,
  runtime, and projection vocabulary.
- Use `Run` as the canonical term and `run orchestration` for the Module that
  owns lifecycle ordering.
- Run orchestration owns message creation ordering, Run record updates, event
  application, final receipt summary, and Plan/Spec context attachment.
- Run orchestration does not own provider stream parsing, low-level tool
  invocation, UI rendering, Convex query policy, or WebContainer/server command
  execution.
- Place the Run orchestration Seam under `apps/web/lib/agent/` rather than hooks
  or `apps/web/lib/agent/harness/`.
- Extract Run orchestration first with behavior preserved before redesigning
  surrounding Modules.
- Plan owns execution intent; Spec is verification context attached to a Run,
  not a parallel approval lifecycle unless a future product requirement creates
  one.
- Run Projection handles both live and persisted Run facts behind one Interface.
- Run Projection guarantees surface separation and safe degradation, not visual
  layout.
- Deepen harness `Runtime` internals first through tool execution scheduling.
- Tool execution scheduling should start as a pure planner Module; add executing
  Adapters only if two concrete execution paths emerge.
- Runtime Command Execution is a real Adapter-backed Seam because WebContainer
  and server-backed execution are two concrete paths.
- Split the Workspace Runtime Interface by product concept, not UI panel.
- Extract runtime availability first from the Workspace Runtime Interface.
- Active UI should be forced onto summary/detail-specific Convex Interfaces;
  broad legacy Interfaces may remain only as compatibility paths with tests and
  removal notes.
- Milestone 1 introduced `apps/web/lib/agent/run-orchestration.ts` as the first
  Run orchestration Seam. It owns behavior-preserving start-of-Run ordering for
  user message persistence, attachment records, Run creation, run buffering,
  creation notification, and the `run_started` event.
- Milestone 2 kept approved Specs in `approved` status on `spec_generated`
  persistence so Run and Plan own execution state. Drift monitoring now treats
  approved Specs as active verification context through
  `shouldMonitorSpecForDrift`.
- Milestone 3 introduced `apps/web/lib/agent/run-projection.ts` as the Run
  Projection Module. It provides explicit chat, proof, and public-share
  projection policies, keeps chat/public outputs bounded and redacted, and is
  now used by `getRunTimeline` for receipt summary counts while preserving the
  existing timeline shape.
- Milestone 4 introduced `apps/web/lib/agent/harness/tool-scheduling.ts` as a
  pure Tool Scheduling Planner Module. It owns read-only versus sequential
  scheduling, per-step deduplication, max-tool-call skip decisions, and skip
  error text while `HarnessRuntime` keeps actual tool execution, permission
  checks, and side effects.
- Milestone 5 introduced `apps/web/lib/jobs/runtime-command-execution.ts` as the
  Runtime Command Execution Adapter. It owns runtime path selection for browser
  WebContainer versus server fallback, result shaping, output streaming hooks,
  duration calculation, and execution path metadata while `executeQueuedJob`
  keeps persisted job lifecycle updates.
- Milestone 6 introduced `apps/web/lib/workspace/runtime-availability.ts` as the
  Workspace Runtime Availability Interface. It normalizes provider status into a
  small availability contract with phase, label, detail, browser-runtime
  capability, server-fallback capability, and provider status. Routing and
  status bar display now use the shared availability vocabulary.
- Milestone 7 introduced `apps/web/lib/convex/query-shapes.ts` as a small Convex
  Query Shape Interface for project boot. It centralizes the summary/detail
  contract for project file metadata and bounded recent chat summaries, while
  the loader still calls the existing Convex summary functions.

## Known Issues

- No `docs/adr/` directory exists. Active architecture docs in `docs/` are the
  current decision record.
- No prior `CONTEXT.md` existed; one was created during the grilling loop to
  capture resolved domain terms.
- Milestone 1 only moved start-of-Run ordering. Terminal Run finalization still
  uses `createRunLifecycle` and remains a future deepening target if needed.
- Some legacy Spec engine helpers still expose `markExecuting` because existing
  runtime and tests use it. Milestone 2 narrowed persistence behavior without
  removing the older in-memory lifecycle vocabulary.
- Milestone 3 only lightly wired Run Projection into the existing timeline. More
  mapper consolidation can happen later, especially around persisted run event
  summary conversion in `live-run-utils` and transcript feed block generation.
- Milestone 4 preserves existing Runtime execution shape. Parallel read-only
  tools are still iterated serially inside the current Runtime loop despite the
  historical "parallel" naming; deeper concurrency changes remain out of scope.
- Milestone 5 preserves the existing `executeQueuedJob` return shape for callers
  by stripping Adapter-only `executionPath` metadata at the compatibility
  boundary. Future UI surfaces can use the Adapter directly if they need to show
  browser/server execution path detail.
- Milestone 6 preserves existing `webcontainerStatus` prop shape at layout
  boundaries for compatibility. The deeper product Interface now exists in
  `runtime-availability.ts`; broader context consumers can migrate to the full
  availability object later.
- Milestone 7 intentionally avoided schema changes or migration-heavy query
  rewrites because the active project boot path already uses
  `files.listMetadata` and `chats.listRecent`. The deeper Interface makes that
  hot-path contract explicit and guarded by tests.

## Future Work

- Consider creating ADRs only when a future decision is hard to reverse,
  surprising without context, and the result of a real trade-off.
- After Milestone 1, revisit whether Plan/Spec lifecycle cleanup needs a narrow
  migration plan for existing persisted records.
