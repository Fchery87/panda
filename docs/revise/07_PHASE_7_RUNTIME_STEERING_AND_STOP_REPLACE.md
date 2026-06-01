# Phase 7 — Runtime Steering and Stop-Replace

**Phase ID:** 7  
**Status:** Planned  
**Prerequisite:** Phase 6 complete — 6A Queue Follow-Up  
**Next Phase:** Post-phase QA and polish

## Objective

Add the remaining advanced running-state prompt behaviors that were
intentionally deferred from Phase 6:

```txt
Stop and send new prompt
Steer current run
Persistent queued-message audit records
```

Phase 6A shipped the low-risk queue-follow-up path. Phase 7 should handle the
higher-risk runtime semantics deliberately.

## Current State After Phase 6A

When idle:

```txt
Send
```

When running:

```txt
Type follow-up
Queue follow-up
Cancel queued follow-up
Stop current run
```

Queued follow-ups are local composer state and dispatch through the normal
`onSendMessage(...)` path after `isStreaming` becomes false.

## Target Behavior

When running, the composer should offer explicit choices:

```txt
Queue after current run
Steer current run
Stop and send new prompt
Stop
```

## Definitions

### Queue After Current Run

Already implemented in Phase 6A.

The user message waits until the active run completes, then sends through the
existing message workflow.

### Stop and Send New Prompt

Abort the active run, finalize it as stopped, then submit the new prompt once
the stop finalization path completes.

This must not create duplicate assistant messages or orphaned runs.

### Steer Current Run

Inject a user steering note into the active runtime loop as auditable context.

Steering must be visible in the run trace and should not mutate hidden runtime
state silently.

## Non-Goals

Do not in this phase:

- expose raw chain-of-thought,
- bypass existing permission gates,
- interrupt a tool mid-write without existing abort/finalization handling,
- create a second concurrent run in the same chat,
- silently merge steering text into the assistant message,
- remove Phase 6A queue behavior.

## Relevant Files

- `apps/web/components/chat/ChatInput.tsx`
- `apps/web/hooks/useProjectMessageWorkflow.ts`
- `apps/web/hooks/useAgent.ts`
- `apps/web/hooks/useAgent-run-lifecycle.ts`
- `apps/web/hooks/useAgent-event-applier.ts`
- `apps/web/lib/agent/harness/runtime.ts`
- `apps/web/lib/agent/harness/runtime-types.ts`
- `apps/web/lib/agent/harness/message-lifecycle.ts`
- `convex/agentRuns.ts`
- `convex/messages.ts`
- `convex/schema.ts`

## Proposed Implementation Stages

### 7A — Running-State Action Menu

Add explicit action selection in `ChatInput`.

Suggested UI:

```txt
[Queue] [More ▾] [Stop]

More:
- Steer current run
- Stop and send
```

Acceptance criteria:

- [ ] Queue remains the default safe running action.
- [ ] Stop remains immediately available.
- [ ] Steer and Stop-and-send are discoverable but clearly labeled.
- [ ] No runtime behavior change yet if this stage is UI-only.

### 7B — Stop and Send New Prompt

Implement stop-replace without runtime steering.

Suggested flow:

```txt
User chooses Stop and send
  ↓
store pending replacement prompt
  ↓
call existing stop callback
  ↓
wait until active run finalizes / isStreaming false
  ↓
send replacement prompt through existing message workflow
```

Implementation notes:

- Reuse existing stop/finalization path.
- Add a replacement queue distinct from regular follow-up queue.
- Clear replacement queue if stop fails or user cancels.
- Display the pending replacement visibly.

Acceptance criteria:

- [ ] Active run finalizes as stopped.
- [ ] Replacement prompt sends only after stop finalization.
- [ ] Replacement prompt is visible and cancellable while pending.
- [ ] No duplicate assistant messages.
- [ ] No orphaned `agentRuns` records.

### 7C — Persistent Queue / Replacement Audit Records

Persist user-visible queued/replacement lifecycle events.

Possible event types:

```txt
follow_up_queued
follow_up_cancelled
follow_up_dispatched
replacement_queued
replacement_cancelled
replacement_dispatched
```

Implementation options:

1. Add these as `agentRunEvents` rows.
2. Add lightweight message annotations.
3. Add a dedicated table only if necessary.

Preferred first approach: use `agentRunEvents` if compatible.

Acceptance criteria:

- [ ] Queue/replacement actions are auditable.
- [ ] Proof panel can show queue/replacement decisions.
- [ ] No sensitive attachment payloads are over-logged.

### 7D — Runtime Steering Contract

Define a runtime-level steering event before wiring behavior.

Potential type:

```ts
type RuntimeSteeringEvent = {
  type: 'steering_note'
  content: string
  createdAt: number
  source: 'user'
}
```

Potential lifecycle:

```txt
User submits steer note
  ↓
ChatInput sends steer action
  ↓
useAgent records steer note
  ↓
runtime steering queue receives note
  ↓
runtime loop consumes note at safe boundary
  ↓
provider prompt includes steering context on next model turn
  ↓
run event records steering consumption
```

Safe boundaries may include:

- before the next LLM call,
- after current tool execution finishes,
- after current assistant text segment completes.

Do not inject steering in the middle of an active provider stream unless the
provider/runtime explicitly supports it.

Acceptance criteria:

- [ ] Steering has a typed runtime contract.
- [ ] Steering is auditable in run events.
- [ ] Runtime consumes steering only at safe boundaries.
- [ ] User can see whether steering is pending or applied.

### 7E — Runtime Steering Implementation

Wire steering through the runtime loop.

Implementation notes:

- Add a steering queue owned by `useAgent` or the runtime controller.
- Runtime should check the queue at explicit safe points.
- Inject steering as a new user/context message in the next model request.
- Record `steering_note_received` and `steering_note_applied` events.
- If the run ends before application, record `steering_note_expired` or leave it
  queued as follow-up depending UX decision.

Acceptance criteria:

- [ ] Steering note can be submitted during a run.
- [ ] Steering note appears in Proof/run trace.
- [ ] Steering note is applied to a later runtime turn.
- [ ] If not applied, user sees that it was not applied.
- [ ] Existing queue-follow-up behavior still works.

## Data / Persistence Considerations

Before changing schema, prefer using existing structures:

- `agentRunEvents`
- message annotations
- existing message content for user-visible prompts

Only add schema if current event model cannot represent
queue/replacement/steering audit records clearly.

Potential `agentRunEvents` values:

```txt
steering_note_received
steering_note_applied
steering_note_expired
replacement_queued
replacement_dispatched
follow_up_queued
follow_up_dispatched
```

## Risk Areas

### Duplicate sends

Risk: queued/replacement prompts dispatch more than once due to React effect
re-renders.

Mitigation:

- use dispatch-in-flight refs,
- stable queue item IDs,
- clear items only after transition begins,
- test rapid state changes.

### Orphaned runs

Risk: stop-and-send starts a replacement before the stopped run finalizes.

Mitigation:

- wait for `isStreaming === false`,
- verify run lifecycle finalized,
- add test coverage around stop path if possible.

### Unsafe steering timing

Risk: steering is injected while a tool is actively mutating files.

Mitigation:

- consume steering only at safe runtime boundaries,
- never interrupt in-flight tool mutation unless abort semantics already support
  it.

### User confusion

Risk: Queue, steer, and stop-send feel similar.

Mitigation:

- labels must explain behavior:
  - `Queue after current run`
  - `Steer current run`
  - `Stop and send instead`

## Suggested Tests

Add or update tests for:

- `ChatInput` running-state action labels,
- queued follow-up still works,
- replacement pending UI,
- replacement dispatch after stop,
- steering event type mapping,
- steering queue consumption at safe boundary,
- no duplicate dispatch on re-render,
- run event persistence for steering/replacement records.

## Acceptance Criteria

- [ ] Running composer exposes Queue, Steer, Stop-and-send, and Stop clearly.
- [ ] Stop-and-send waits for stopped run finalization.
- [ ] Steering has a typed runtime contract.
- [ ] Steering actions are auditable in run events.
- [ ] No duplicate assistant messages.
- [ ] No orphaned runs.
- [ ] Existing Phase 6A queue-follow-up behavior remains intact.
- [ ] Typecheck passes.
- [ ] Focused tests pass.

## Verification Commands

Run focused checks first:

```bash
bun test apps/web/components/chat/chat-input-wiring.test.ts
bun test apps/web/lib/agent/harness/message-lifecycle.test.ts
bun test apps/web/lib/chat/transcript-blocks.test.ts
bun run typecheck
```

Then run broader validation as needed:

```bash
bun test
bun run lint
bun run build
```

## Recommended First Implementation Slice

Start with **7A + 7B only**:

```txt
Running-state action menu
Stop and send new prompt
```

Do not implement steering until stop-replace is stable.

## Next Step After Completion

Proceed to post-phase QA and polish, or create a dedicated Phase 8 for
provider/runtime steering refinements if 7D/7E are split out.
