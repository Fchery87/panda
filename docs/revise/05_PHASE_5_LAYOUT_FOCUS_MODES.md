# Phase 5 — Layout Focus Modes

**Phase ID:** 5  
**Status:** Completed  
**Prerequisite:** Phase 4 complete  
**Next Phase:** Phase 6 — Mid-Stream Queue / Steer UX

## Objective

Reduce workspace crowding by adding clearer focus modes for Chat, Workbench, Proof, and Changes.

## Current Issue

Panda has many powerful surfaces, but users can feel overwhelmed by simultaneous context:

- Thread
- Proof
- Work
- Sessions
- Files
- Agents
- Search
- Git
- Tasks
- Terminal
- Right panel
- Bottom dock
- Composer overlay
- Plan drawer
- Permission dialog

## Proposed First Step

Add a simple focus concept before attempting full mode-aware layout.

```txt
Focus Chat      → chat dominant
Focus Workbench → editor/files dominant
Focus Proof     → inspector/run evidence dominant
Focus Changes   → artifacts/diffs dominant
```

## Later Mode-Aware Mapping

```txt
Ask mode   → Chat dominant
Plan mode  → Plan/Context dominant
Code mode  → Split Chat + Workbench
Build mode → Workbench dominant
```

## Relevant Files

- `apps/web/components/projects/ProjectWorkspaceLayout.tsx`
- `apps/web/components/projects/ProjectWorkspaceShell.tsx`
- `apps/web/components/workbench/WorkbenchTopBar.tsx`
- `apps/web/components/workbench/WorkbenchRightPanel.tsx`
- `apps/web/stores/workspaceUiStore.ts`

## Implementation Direction

1. Add focus-mode state to workspace UI store.
2. Add unobtrusive focus switcher in top bar or workspace strip.
3. Reuse existing panels; do not build new surfaces.
4. Adjust panel sizes/default visibility based on focus.
5. Preserve mobile panel behavior.

## Acceptance Criteria

- [x] User can intentionally focus Chat, Workbench, Proof, or Changes.
- [x] Focus mode reduces visible clutter.
- [x] Existing panel state is preserved where possible.
- [x] Mobile layout remains usable.
- [x] No runtime behavior changes.

## Verification

- [x] `bun test apps/web/components/projects/project-workspace-layout.test.tsx`
- [x] `bun run typecheck`

## Next Step After Completion

Proceed to `06_PHASE_6_QUEUE_STEER_UX.md`.
