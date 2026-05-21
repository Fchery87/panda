# Panda Runtime + Workspace Revision — Implementation Checklist

Use this checklist to track phase completion.

## Phase 0 — Architecture Contract

- [x] Current lifecycle documented.
- [x] Target lifecycle documented.
- [x] Surface ownership documented.
- [x] Reasoning policy documented.
- [x] Tool output policy documented.
- [x] Phase sequence documented.

Next: Phase 1.

## Phase 1 — Surface Ownership Cleanup

- [x] Chat shows conversation/story.
- [x] Proof shows trace/evidence.
- [x] Changes shows artifacts/diffs.
- [x] Context shows plan/memory/evals.
- [x] Workbench shows files/editor/preview.
- [x] Terminal shows commands/logs.

Next: Phase 2.

## Phase 2 — Message Lifecycle Contract

- [x] Assistant lifecycle types defined.
- [x] Existing event applier mapped to lifecycle.
- [x] Draft message lifecycle easier to trace.
- [x] Existing streaming behavior preserved.

Next: Phase 3.

## Phase 3 — Structured Message Blocks

- [x] Optional message blocks schema added.
- [x] Existing content fallback preserved.
- [x] Client types updated.
- [x] Transcript builder supports blocks.
- [x] Existing messages render unchanged.

Next: Phase 4.

## Phase 4 — Reasoning Metadata Upgrade

- [x] Reasoning state type defined.
- [x] Redacted/summary states supported.
- [x] Provider metadata can be stored without display.
- [x] Raw CoT remains hidden by default.

Next: Phase 5.

## Phase 5 — Layout Focus Modes

- [x] Focus mode state added.
- [x] Chat/Workbench/Proof/Changes focus modes available.
- [x] Panel visibility/sizing improves clarity.
- [x] Mobile layout remains intact.

Next: Phase 6.

## Phase 6 — Mid-Stream Queue / Steer UX

- [x] Queue follow-up behavior designed.
- [x] Stop and replace behavior deferred; existing stop behavior preserved.
- [x] Steering behavior deferred for future runtime-loop work.
- [x] Queued messages visible/cancellable.
- [x] Run finalization remains correct.

Next: Phase 7.

## Phase 7 — Runtime Steering and Stop-Replace

- [ ] Running-state action menu designed.
- [ ] Stop-and-send replacement flow implemented.
- [ ] Replacement prompt waits for stopped run finalization.
- [ ] Persistent audit records designed for queue/replacement/steering actions.
- [ ] Runtime steering contract defined.
- [ ] Steering queue consumes notes only at safe runtime boundaries.
- [ ] Existing Phase 6A queue-follow-up behavior preserved.

Next: QA/polish.

## Global QA

- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Unit tests pass.
- [ ] Relevant e2e tests pass.
- [ ] Chat send works.
- [ ] Streaming works.
- [ ] Stop works.
- [ ] Tool calls work.
- [ ] Run events persist.
- [ ] Messages persist.
- [ ] Artifacts remain accessible.
