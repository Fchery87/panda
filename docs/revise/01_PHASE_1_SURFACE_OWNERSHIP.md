# Phase 1 — Surface Ownership Cleanup

**Phase ID:** 1  
**Status:** Completed  
**Prerequisite:** Phase 0 complete  
**Next Phase:** Phase 2 — Message Lifecycle Contract

## Objective

Reduce visual and conceptual crowding by enforcing clear ownership between
Panda's major surfaces.

## Surface Ownership Policy

```txt
Chat      = user intent, assistant answer, compact reasoning, compact run summary
Proof     = run trace, tool calls, approvals, snapshots, debug/provenance
Changes   = artifacts, diffs, generated/modified files
Context   = plan, memory, evals, specifications
Workbench = editor, file tabs, preview, active file work
Terminal  = command logs and running processes
```

## Current Relevant Files

- `apps/web/lib/chat/transcript-policy.ts`
- `apps/web/lib/chat/transcript-blocks.ts`
- `apps/web/components/chat/MessageList.tsx`
- `apps/web/components/chat/MessageBubble.tsx`
- `apps/web/components/projects/ProjectChatInspector.tsx`
- `apps/web/components/workbench/WorkbenchRightPanel.tsx`

## Implementation Direction

1. Keep chat conversational.
2. Keep detailed tool outputs out of chat by default.
3. Allow chat to show compact tool chips only.
4. Put full trace and tool output in Proof.
5. Put artifact and file changes in Changes.
6. Put plan/memory/evals in Context.

## Chat Should Show

- User messages
- Assistant text
- Reasoning teaser or redacted indicator
- Plan checklist summary
- Compact tool chips
- Final run summary

## Chat Should Not Show By Default

- Full raw tool output
- Full command logs
- Debug labels
- Complete snapshots
- Raw chain-of-thought
- Full run trace

## Inspector / Proof Should Show

- Full tool call timeline
- Tool args/output/errors
- Permission requests
- Snapshots
- Validation evidence
- Subagent details
- Run receipt

## Acceptance Criteria

- [x] `transcript-policy.ts` clearly encodes surface ownership.
- [x] Chat transcript remains readable during active runs.
- [x] Full tool details are accessible in Proof/Inspector.
- [x] Changes/artifacts are accessible in Changes.
- [x] No runtime semantics change.

## Verification

- [x] `bun test apps/web/lib/chat/transcript-blocks.test.ts`
- [x] `bun run typecheck`

## Risks

- Hiding too much from chat may make agent activity feel invisible.
- Mitigation: retain compact chips and status summaries.

## Next Step After Completion

Proceed to `02_PHASE_2_MESSAGE_LIFECYCLE.md`.
