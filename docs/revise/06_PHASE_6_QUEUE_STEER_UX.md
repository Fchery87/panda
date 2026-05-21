# Phase 6 — Mid-Stream Queue / Steer UX

**Phase ID:** 6  
**Status:** Completed — 6A Queue Follow-Up  
**Prerequisite:** Phase 5 complete  
**Next Phase:** Phase 7 — Runtime Steering and Stop-Replace

## Objective

Add advanced prompt behavior while the agent is already running, inspired by Pi's steer/follow-up queue model.

## Current Behavior

Panda blocks new sends while streaming/running. This is safe but limited.

## Target Behavior

When idle:

```txt
Send
```

When running:

```txt
Stop
Queue after current run
Steer current run
Stop and send new prompt
```

## Definitions

### Queue Follow-Up

The user message is appended after the current run completes.

### Steer Current Run

The user message becomes steering context for the active runtime loop as soon as safely possible.

### Stop and Replace

Abort current run, mark it stopped, then submit new prompt.

## Relevant Files

- `apps/web/components/chat/ChatInput.tsx`
- `apps/web/hooks/useProjectMessageWorkflow.ts`
- `apps/web/hooks/useAgent.ts`
- `apps/web/lib/agent/harness/runtime.ts`
- `convex/agentRuns.ts`
- `convex/messages.ts`

## Implementation Direction

1. Add UI design first.
2. Add queued follow-up only before steer.
3. Persist queued messages clearly.
4. Add runtime support for steering only after lifecycle is stable.
5. Ensure abort/finalization paths remain correct.

## Suggested Rollout

### 6A — Queue Follow-Up

Lower risk. Message waits until current run completes.

### 6B — Stop and Replace

Medium risk. Uses existing stop behavior, then sends new prompt.

### 6C — Steer Current Run

Highest risk. Requires runtime loop support for injecting steering context.

## Acceptance Criteria

- [x] Running-state composer behavior is explicit.
- [x] Queued messages are visible and cancellable.
- [x] Stopped runs finalize correctly. Existing stop path was preserved.
- [x] Steer behavior, if implemented, is auditable. Steer was intentionally deferred; Phase 6A shipped queue follow-up only.
- [x] No duplicate assistant messages or orphaned runs.

## Verification

- [x] `bun test apps/web/components/chat/chat-input-wiring.test.ts`
- [x] `bun test apps/web/components/projects/project-workspace-layout.test.tsx`
- [x] `bun run typecheck`

## Next Step After Completion

Proceed to `07_PHASE_7_RUNTIME_STEERING_AND_STOP_REPLACE.md`.

## Post-Phase QA

After this phase, run full validation around:

- chat send
- run stop
- run failure
- run completion
- run event persistence
- message persistence
- tool execution
- planner/spec approval
