# Panda Runtime + Workspace Revision Plan — Phase Sequence

Status: planning documents created for review.

Purpose: this directory contains the ordered implementation plans for
modernizing Panda's chat, runtime, reasoning, tool-event, and workspace layout
systems. Each phase has an explicit prerequisite and next phase so
implementation can proceed sequentially.

## Phase Order

1. **Phase 0 — Architecture Contract**
   - File: `00_PHASE_0_ARCHITECTURE_CONTRACT.md`
   - Outcome: shared source of truth; no runtime behavior changes.
   - Next: Phase 1.

2. **Phase 1 — Surface Ownership Cleanup**
   - File: `01_PHASE_1_SURFACE_OWNERSHIP.md`
   - Outcome: clearer separation between Chat, Proof, Changes, Context,
     Workbench, and Terminal.
   - Next: Phase 2.

3. **Phase 2 — Message Lifecycle Contract**
   - File: `02_PHASE_2_MESSAGE_LIFECYCLE.md`
   - Outcome: explicit assistant/run lifecycle events.
   - Next: Phase 3.

4. **Phase 3 — Structured Message Blocks**
   - File: `03_PHASE_3_STRUCTURED_MESSAGE_BLOCKS.md`
   - Outcome: additive durable block model while preserving existing string
     content.
   - Next: Phase 4.

5. **Phase 4 — Reasoning Metadata Upgrade**
   - File: `04_PHASE_4_REASONING_METADATA.md`
   - Outcome: safe provider-neutral reasoning representation.
   - Next: Phase 5.

6. **Phase 5 — Layout Focus Modes**
   - File: `05_PHASE_5_LAYOUT_FOCUS_MODES.md`
   - Outcome: less crowded mode-aware workspace layout.
   - Next: Phase 6.

7. **Phase 6 — Mid-Stream Queue / Steer UX**
   - File: `06_PHASE_6_QUEUE_STEER_UX.md`
   - Outcome: low-risk queue-follow-up behavior while an agent run is active.
   - Next: Phase 7.

8. **Phase 7 — Runtime Steering and Stop-Replace**
   - File: `07_PHASE_7_RUNTIME_STEERING_AND_STOP_REPLACE.md`
   - Outcome: stop-and-send replacement flow, typed steering contract, and
     auditable runtime steering.
   - Next: post-phase QA / polish.

9. **Implementation Checklist**
   - File: `99_IMPLEMENTATION_CHECKLIST.md`
   - Outcome: quick tracking checklist for implementers.

## Global Rules

- Do not expose raw chain-of-thought by default.
- Do not rewrite `useAgent.ts` wholesale in one phase.
- Keep changes incremental and testable.
- Preserve existing Convex data compatibility.
- Prefer additive schema changes before migrations.
- Keep Chat conversational; move evidence/detail into inspector surfaces.

## Source Audit Basis

This plan is based on review of:

- `/home/nochaserz/.pi` Pi agent architecture
- Panda chat/runtime/workspace implementation
- Panda provider adapter layer
- Panda Convex schema and run event model
- Panda chat transcript policy and workbench layout
