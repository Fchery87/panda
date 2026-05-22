# Panda Workbench

> Status: current guide  
> Last updated: 2026-05-22  
> Scope: project workspace layout, file opening, generated-file review, right support rail, mobile workspace destinations

Panda uses a workbench-owned file model. The central workbench is the canonical place to view, edit, and review files. Chat captures intent and the narrative record. The right rail supports review and recovery; it does not own file work.

## Current Product Contract

- Every explicit file click opens in the central workbench.
- Plan Mode documents may auto-open after planning completes.
- Non-plan generated files do not auto-open and do not steal focus.
- Generated files appear in the file tree, Changes, and Review Diff.
- Diffs are reviewed centrally in Review Diff.
- The right support rail is `Proof`, `Changes`, and `Context`.
- Mobile workspace destinations are `Work`, `Chat`, `Proof`, and `Changes`.
- Panda does not currently require a live-preview/browser-proof destination.

## Surface Ownership

| Surface | Owns | Does not own |
|---|---|---|
| Workbench | File tabs, editing, plan review, central Review Diff | Run proof, context inventory, recovery timeline |
| Chat | User intent, mode selection, session narrative, compact run summaries | Full tool logs, full receipts, full file review |
| Proof | Validation evidence, walkthrough, checkpoints, recovery affordances | Editing files or replacing Review Diff |
| Changes | Compact generated-change navigation and status | Per-file editing or full diff review |
| Context | Plan/context/spec/memory inputs and audit state | Generated-file editing |
| File tree | Project file source of truth and generated/change badges | Applying or rejecting generated artifacts directly |

## File Opening Rules

File-opening entry points should route through the same workbench selection behavior:

1. Set the workspace focus to `workbench`.
2. Set the center tab to `editor`.
3. Set the mobile primary panel to `work`.
4. Select the file path.
5. Add or focus the file tab.

This applies to source files, Markdown files, generated files, artifact links, Changes links, Proof links, Context links, and diff-to-file navigation.

## Generated Files

Generated non-plan files should be discoverable without causing tab spam.

Expected behavior:

- file tree shows pending/generated/modified state
- Changes shows compact status and navigation
- Review Diff shows the central diff and accept/reject actions
- explicit `Open File` opens the file in the workbench
- generated non-plan files do not auto-open when artifacts arrive

Plan documents are the exception because they are the approval handoff. When Plan Mode completes, the generated plan document should open in the workbench and focus the editor surface.

## Review Diff

Review Diff is the primary generated-change review surface.

It should support:

- all pending generated changes
- focused line hunks instead of whole-file replacement whenever possible
- per-file open navigation
- hunk-to-file navigation
- accept/reject wiring through artifact IDs when available
- recovery affordance that routes to Proof/checkpoints instead of duplicating restore logic

## Proof And Recovery

Proof should summarize what happened and how to recover:

- latest run receipt
- files written
- commands run
- validation evidence
- known issues
- runtime/checkpoint state
- snapshot timeline and restore actions

Proof is the correct place for recovery and walkthrough evidence. Browser screenshots, DOM checks, console/network checks, and visual live-preview proof are intentionally out of scope unless Panda reintroduces a browser preview feature.

## Plan Documents

Plan documents render with `.plan.md` conventions documented in [PLAN_DOCUMENT_FORMAT.md](./PLAN_DOCUMENT_FORMAT.md):

- YAML frontmatter for metadata and task state
- readable Markdown body
- Mermaid diagrams
- tables/checklists for implementation detail
- Review/Edit mode with Save Draft
- Approve/Build behavior for registered plan artifacts

Current implementation still uses synthetic `plan:<sessionId>` workbench paths for plan tabs. The intended follow-up is to persist registered plans as real `.panda/plans/*.plan.md` workspace files while preserving Approve/Build behavior.

## Relevant Implementation Areas

| Area | Files |
|---|---|
| Workspace shell | `apps/web/components/projects/ProjectWorkspaceLayout.tsx` |
| Workbench | `apps/web/components/workbench/Workbench.tsx` |
| Right rail | `apps/web/components/panels/RightPanel.tsx`, `apps/web/components/workbench/WorkbenchRightPanel.tsx` |
| File tree | `apps/web/components/workbench/FileTree.tsx` |
| File opening | `apps/web/hooks/useProjectWorkbenchFiles.ts` |
| Plan auto-open | `apps/web/hooks/usePlanArtifactSync.ts` |
| Generated artifact lifecycle | `apps/web/hooks/useArtifactLifecycle.ts` |
| Diff review | `apps/web/components/workbench/DiffTab.tsx`, `apps/web/components/workbench/artifact-preview.ts` |
| Plan rendering | `apps/web/components/workbench/PlanArtifactTab.tsx`, `apps/web/lib/planning/types.ts` |
| Proof/walkthrough | `apps/web/components/projects/ProjectChatInspector.tsx` |

## Validation Checklist

Use targeted checks when changing workbench behavior:

```bash
cd apps/web
bunx tsc --noEmit --pretty false
bun test \
  components/panels/RightPanel.test.tsx \
  components/workbench/artifact-preview.test.ts \
  components/workbench/PlanArtifactTab.test.tsx \
  components/projects/project-workspace-layout.test.tsx \
  components/projects/project-chat-wiring.test.ts \
  components/workbench/workbench.integration.test.ts \
  components/workbench/FileTree.test.tsx \
  components/workbench/DiffTab.test.tsx \
  components/artifacts/ArtifactCard.test.tsx \
  components/projects/ProjectChatInspectorPlanLifecycle.test.tsx \
  components/projects/ProjectChatInspectorWalkthrough.test.tsx
```
