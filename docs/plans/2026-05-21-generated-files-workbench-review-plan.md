# Panda Generated Files + Workbench Review Implementation Plan

**Date:** 2026-05-21  
**Status:** Proposed  
**Scope:** Workspace/workbench generated-file UX, artifact review, right rail clarity, file tree status, proof/walkthrough surfaces  
**Primary goal:** Make Panda's existing generated-work system feel like a coherent Cursor/Antigravity-class workflow without rebuilding primitives that already exist.

---

## 1. Executive Summary

Panda already has many of the core primitives needed for a modern agentic IDE workflow:

- Pending file-write artifacts
- Artifact preview derivation
- Workbench auto-navigation to pending generated files
- `PendingArtifactOverlay` for apply/reject in the editor surface
- Central `Review Diff` tab via `DiffTab`
- Right rail `Proof / Changes / Context` model
- Artifact application to Convex files and local runtime
- Plan artifact tabs
- Runtime snapshots/checkpoint concepts
- Run/proof/event panels

The implementation work should therefore **not** be a greenfield rebuild. The work should consolidate the existing architecture into one obvious product loop:

```txt
User request
  → plan/context is prepared
  → pending file artifacts are generated
  → generated files open in the workbench
  → file tree marks them as pending/generated/modified
  → Review Diff shows all pending changes
  → user accepts/rejects per file or all
  → accepted files are applied to workspace/runtime
  → Proof shows events, snapshots, validation, and walkthrough
```

The most important change is to make each surface have a clear job:

```txt
File tree          = project file source of truth + status badges
Workbench editor  = focused file/code surface
Review Diff       = primary generated-change review surface
Right rail Changes = compact artifact/change navigator
Right rail Proof  = run state, validation, checkpoints, walkthrough
Right rail Context = plan, memory, evals, context inputs
```

---

## 2. Current Implementation Inventory

### 2.1 Existing generated file preview flow

Relevant files:

- `apps/web/hooks/useArtifactLifecycle.ts`
- `apps/web/components/workbench/artifact-preview.ts`
- `apps/web/components/workbench/PendingArtifactOverlay.tsx`
- `apps/web/components/workbench/Workbench.tsx`
- `apps/web/lib/artifacts/executeArtifact.ts`

Current behavior:

- Pending `file_write` artifacts are converted into `WorkspaceArtifactPreview` records.
- New pending previews can open/select their file path in the workbench.
- The selected pending file can render `PendingArtifactOverlay`.
- Applying a file artifact upserts into `api.files.upsert` and optionally writes to the runtime through `writeFileToRuntime`.

Conclusion:

> Panda already has generated-file workbench preview behavior. The work is to improve visibility, consistency, and control.

---

### 2.2 Existing central review diff

Relevant files:

- `apps/web/components/workbench/DiffTab.tsx`
- `apps/web/components/workbench/Workbench.tsx`
- `apps/web/components/workbench/artifact-preview.ts`

Current behavior:

- `Workbench` has center tabs:
  - `Work Surface`
  - `Review Diff`
- `derivePreviewDiffEntries(...)` converts pending artifact previews into `DiffFileEntry[]`.
- `DiffTab` supports:
  - changed file list
  - added/modified/deleted/renamed state
  - pending/accepted/rejected status
  - accept all
  - reject all
  - accept file
  - reject file
  - hunk-level UI concepts

Current gap:

- `Workbench.tsx` passes `files`, `pendingDiffCount`, and `agentLabel`, but does not appear to pass accept/reject callbacks into `DiffTab`.

Conclusion:

> Do not create a new Agent Changes view. Promote and finish the existing `Review Diff` tab.

---

### 2.3 Existing right rail model

Relevant files:

- `apps/web/stores/workspaceUiStore.ts`
- `apps/web/components/panels/RightPanel.tsx`
- `apps/web/components/workbench/WorkbenchRightPanel.tsx`
- `apps/web/components/projects/ProjectChatInspector.tsx`
- `apps/web/components/artifacts/ArtifactPanel.tsx`

Current model:

```ts
export type RightPanelTab = 'work' | 'proof' | 'changes' | 'context' | 'preview'
```

Current visible inspector tabs:

```ts
const inspectorTabs = [
  { id: 'proof', label: 'Proof' },
  { id: 'changes', label: 'Changes' },
  { id: 'context', label: 'Context' },
]
```

Current content routing:

- `Proof` → run timeline, events, snapshots, subagents, plan/spec status
- `Changes` → `ArtifactPanel`
- `Context` → plan, memory, evals

Conclusion:

> The right rail vocabulary is mostly correct. The problem is content hierarchy and product clarity, not missing tabs.

---

### 2.4 Existing planning artifacts

Relevant files:

- `apps/web/components/plan/PlanPanel.tsx`
- `apps/web/components/plan/PlanningIntakePopup.tsx`
- `apps/web/components/workbench/PlanArtifactTab.tsx`
- `apps/web/contexts/WorkspaceContext.tsx`
- `apps/web/lib/planning/types`

Current behavior:

- Panda supports `WorkspacePlanTab`.
- Plan artifacts can open in the workbench.
- Plan artifacts can support approve/build actions.

Conclusion:

> Planning is already present. The improvement is to clarify lifecycle and connect plan output to changed files and proof.

---

### 2.5 Existing checkpoints/snapshots/recovery

Relevant files:

- `apps/web/components/chat/runtime-checkpoints.ts`
- `apps/web/lib/agent/harness/checkpoint-store.ts`
- `apps/web/lib/agent/harness/convex-checkpoint-store.ts`
- `apps/web/lib/agent/harness/runtime-checkpoint.ts`
- `apps/web/components/chat/SnapshotTimeline.tsx`
- `apps/web/components/projects/ProjectChatInspector.tsx`

Current behavior:

- Runtime snapshot/checkpoint concepts exist.
- `InspectorRunContent` shows snapshot count and `SnapshotTimeline` under recovery/delegation.

Conclusion:

> Recovery exists but should be surfaced more clearly near generated-file review and proof.

---

## 3. Product Contract

This contract should guide implementation and prevent the UI from feeling duplicated.

### 3.1 File tree

The file tree is the **source of truth for project structure**.

Responsibilities:

- Show project files and directories.
- Show pending/generated/modified/rejected statuses.
- Select files into the workbench.
- Filter or highlight changed files.

Non-responsibilities:

- It should not become a diff viewer.
- It should not contain full artifact details.

---

### 3.2 Workbench editor

The editor is the **focused file/code surface**.

Responsibilities:

- Open selected files.
- Show pending preview overlay for selected generated files.
- Allow focused apply/reject for the selected pending artifact.
- Allow normal editing after apply.

Non-responsibilities:

- It should not show every changed file at once.
- It should not duplicate the entire right rail.

---

### 3.3 Review Diff

`Review Diff` is the **primary generated-change review surface**.

Responsibilities:

- Show all pending generated file changes.
- Support accept/reject all.
- Support accept/reject per file.
- Eventually support accept/reject per hunk.
- Link/select files in the workbench.

Non-responsibilities:

- It should not replace file tabs or the editor.
- It should not become a plan/proof dashboard.

---

### 3.4 Right rail Changes

`Changes` is the **compact artifact/change navigator**.

Responsibilities:

- Show pending/applied/rejected artifact cards.
- Provide quick links to open the central `Review Diff` tab.
- Provide quick links to open specific files.
- Show artifact status and action type.

Non-responsibilities:

- It should not be the primary generated-code review surface.
- It should not render large code previews as its default mode.

---

### 3.5 Right rail Proof

`Proof` is the **run-state, validation, checkpoint, and walkthrough surface**.

Responsibilities:

- Show execution state.
- Show run timeline.
- Show persisted events.
- Show snapshots/checkpoints and restore affordances.
- Show tests, terminal command outcomes, browser verification, and final walkthrough.

Non-responsibilities:

- It should not be where code is reviewed.

---

### 3.6 Right rail Context

`Context` is the **planning, memory, evals, and input-context surface**.

Responsibilities:

- Show implementation plan lifecycle.
- Show memory/context state.
- Show eval scenario actions.
- Show expected changed files before execution.

Non-responsibilities:

- It should not compete with `Review Diff` after files are generated.

---

## 4. Implementation Phases

## Phase 1 — File Tree Generated/Changed Badges

### Goal

Make pending/generated/modified agent work visible in the file tree so generated files feel like part of the workspace, not hidden artifacts.

### Files likely affected

- `apps/web/components/workbench/FileTree.tsx`
- `apps/web/components/projects/ProjectWorkspaceLayout.tsx`
- `apps/web/components/projects/WorkspaceRuntimeProvider.tsx`
- `apps/web/hooks/useArtifactLifecycle.ts`
- `apps/web/components/workbench/artifact-preview.ts`
- tests near `apps/web/components/workbench/*` and `apps/web/components/projects/*`

### Proposed types

Add a tree status model near the workbench layer:

```ts
export type WorkspaceFileChangeSource = 'agent' | 'user'

export type WorkspaceFileChangeType = 'added' | 'modified' | 'deleted' | 'renamed'

export type WorkspaceFileReviewStatus = 'pending' | 'accepted' | 'rejected'

export interface WorkspaceFileStatus {
  source?: WorkspaceFileChangeSource
  changeType?: WorkspaceFileChangeType
  reviewStatus?: WorkspaceFileReviewStatus
  artifactId?: string
}
```

`FileTreeProps` should accept:

```ts
fileStatuses?: Record<string, WorkspaceFileStatus>
```

### UI behavior

Render compact badges next to file names:

```txt
LoginForm.tsx        New
routes.ts            Modified
old-auth.ts          Deleted
```

Badge copy should be short:

- `New`
- `Modified`
- `Deleted`
- `Renamed`
- `Pending`
- `Rejected`

Use color sparingly:

- Added/new: success/accent
- Modified: warning/info
- Deleted/rejected: destructive
- Pending: muted warning

### Acceptance criteria

- Pending file-write artifacts produce visible file tree badges.
- Selecting a badged file still opens the normal workbench/editor flow.
- Empty tree behavior is unchanged.
- Existing tree context menu behavior is unchanged.
- Tests cover at least:
  - added pending file badge
  - modified pending file badge
  - no badge when status missing

---

## Phase 2 — Wire `Review Diff` Accept/Reject Actions

### Goal

Make the existing central `Review Diff` tab the primary working review surface for generated file changes.

### Files likely affected

- `apps/web/components/workbench/Workbench.tsx`
- `apps/web/components/workbench/DiffTab.tsx`
- `apps/web/hooks/useArtifactLifecycle.ts`
- `apps/web/components/projects/ProjectWorkspaceLayout.tsx`
- `apps/web/components/projects/WorkspaceRuntimeProvider.tsx`

### Current gap

`DiffTab` supports accept/reject callbacks, but `Workbench.tsx` does not pass them.

Current pattern:

```tsx
<DiffTab
  files={pendingDiffEntries}
  pendingDiffCount={pendingDiffCount}
  agentLabel="Agent"
/>
```

Desired pattern:

```tsx
<DiffTab
  files={pendingDiffEntries}
  pendingDiffCount={pendingDiffCount}
  agentLabel="Agent"
  onAcceptFile={onAcceptPendingDiffFile}
  onRejectFile={onRejectPendingDiffFile}
  onAcceptAll={onApplyAllPendingArtifacts}
  onRejectAll={onRejectAllPendingArtifacts}
/>
```

### Implementation notes

`derivePreviewDiffEntries(...)` should preserve `artifactId` or expose enough metadata to map a diff file back to its pending artifact.

Options:

1. Add `artifactId` to `DiffFileEntry`.
2. Maintain file path → artifact ID lookup in `useArtifactLifecycle`.
3. Add callbacks that receive `file.path` rather than only `fileIndex`.

Preferred approach:

```ts
export interface DiffFileEntry {
  artifactId?: string
  path: string
  status: 'added' | 'modified' | 'deleted' | 'renamed'
  hunks: DiffHunk[]
  reviewStatus: FileReviewStatus
  oldPath?: string
}
```

Then file-level actions can resolve directly.

### Acceptance criteria

- Accept file from `Review Diff` applies the corresponding artifact.
- Reject file from `Review Diff` rejects the corresponding artifact.
- Accept all applies all pending file-write artifacts.
- Reject all rejects all pending file-write artifacts.
- Badge count updates after apply/reject.
- Empty state appears when no pending diffs remain.
- Existing `PendingArtifactOverlay` apply/reject still works.

---

## Phase 3 — Clarify `Changes` vs `Review Diff`

### Goal

Remove product ambiguity between right rail `Changes`, center `Review Diff`, and editor overlay.

### Files likely affected

- `apps/web/components/workbench/WorkbenchRightPanel.tsx`
- `apps/web/components/artifacts/ArtifactPanel.tsx`
- `apps/web/components/artifacts/ArtifactCard.tsx`
- `apps/web/components/workbench/WorkspaceHome.tsx`
- `apps/web/components/projects/ProjectWorkspaceLayout.tsx`

### Desired behavior

Right rail `Changes` should be a compact navigator/status list, not the primary diff surface.

Add a clear CTA at top of `Changes`:

```txt
Session changed work
3 pending file changes
[Open Review Diff]
```

For each artifact card, provide clear actions:

- `Open file`
- `Review diff`
- `Apply`
- `Reject`

If the artifact is a command, use:

- `Run command`
- `View proof/logs`

### Product copy

Replace vague labels with explicit labels:

- `Session changed work` → okay as header
- Add subcopy: `Review generated file changes in the central Review Diff tab.`

### Acceptance criteria

- Right rail Changes includes an obvious `Open Review Diff` action.
- File artifact cards can open their file in the workbench.
- File artifact cards can route to central Review Diff.
- Right rail Changes no longer feels like a competing code review surface.

---

## Phase 4 — Make Plan Lifecycle Explicit

### Goal

Make plan draft useful by turning it into a visible lifecycle object connected to generated changes.

### Files likely affected

- `apps/web/components/projects/ProjectChatInspector.tsx`
- `apps/web/components/plan/PlanPanel.tsx`
- `apps/web/components/workbench/PlanArtifactTab.tsx`
- `apps/web/lib/chat/planDraft.ts`
- planning tests

### Desired lifecycle

```txt
Draft → Ready for review → Approved → Building → Changes generated → Verified
```

### UI structure

In the plan/context area, show:

```txt
Implementation Plan
Status: Draft

Expected files
- src/workbench/Workbench.tsx
- src/workbench/FileTree.tsx

Actions
[Approve Plan] [Revise] [Build from Plan]
```

After execution begins:

```txt
Actual changed files
- src/workbench/Workbench.tsx
- src/workbench/FileTree.tsx

[Open Review Diff]
```

### Acceptance criteria

- Plan status is visible without reading the whole draft.
- Plan expected files are distinct from actual changed files.
- Approved/building states are visually different from draft state.
- Plan view links to Review Diff after changes exist.

---

## Phase 5 — Surface Checkpoint Restore Near Review

### Goal

Make users feel safe accepting/rejecting/generated changes by exposing restore affordances near the review surfaces.

### Files likely affected

- `apps/web/components/projects/ProjectChatInspector.tsx`
- `apps/web/components/chat/SnapshotTimeline.tsx`
- `apps/web/components/workbench/DiffTab.tsx`
- runtime checkpoint hooks/stores as needed

### Desired behavior

In `Proof`:

```txt
Recovery
Latest checkpoint: before-agent-run
[Restore]
```

In `Review Diff` header:

```txt
3 files changed by Agent
[Restore checkpoint] [Reject All] [Accept All]
```

If restore is not yet technically available from this surface, show disabled state with tooltip:

```txt
Restore checkpoint available in Proof
```

### Acceptance criteria

- Latest checkpoint/snapshot is visible in Proof.
- User can understand how to roll back before applying changes.
- Review Diff does not hide recovery controls.

---

## Phase 6 — First-Class Walkthrough Artifact

### Goal

Create an Antigravity-style post-run proof artifact that summarizes what changed and how it was validated.

### Files likely affected

- `apps/web/components/artifacts/*`
- `apps/web/components/projects/ProjectChatInspector.tsx`
- `apps/web/lib/agent/harness/runtime-events.ts`
- Convex artifact schema/functions if artifact typing must expand
- tests for artifact rendering

### Proposed model

```ts
export interface WalkthroughArtifact {
  kind: 'walkthrough'
  runId?: string
  summary: string
  filesChanged: string[]
  commandsRun: Array<{
    command: string
    status: 'passed' | 'failed' | 'skipped'
    outputSummary?: string
  }>
  validation: Array<{
    label: string
    status: 'passed' | 'failed' | 'warning'
    detail?: string
  }>
  knownIssues?: string[]
  createdAt: number
}
```

### UI location

Walkthrough belongs in `Proof`, not in central code review.

`Proof` should show:

```txt
Walkthrough
- Summary
- Files changed
- Commands run
- Validation
- Known issues
```

### Acceptance criteria

- Completed meaningful agent runs can produce a walkthrough artifact.
- Proof tab shows the latest walkthrough.
- Walkthrough links to changed files and Review Diff where applicable.
- Walkthrough can be reused as a PR summary basis later.

---

## 5. Technical Notes

### 5.1 Avoid duplicate state sources

Pending generated file status should derive from existing artifact lifecycle state where possible.

Preferred source:

```ts
pendingArtifactPreviews
```

From this, derive:

- `pendingDiffEntries`
- file tree statuses
- pending count
- Review Diff list

Avoid introducing another independent generated-file store unless necessary.

---

### 5.2 Preserve existing artifact application path

File writes should continue to use the existing `applyArtifact(...)` flow:

```ts
await upsertFile(...)
await writeFileToRuntime?.(...)
await updateArtifactStatus({ status: 'completed' })
```

Do not bypass artifact status updates when accepting from `Review Diff`.

---

### 5.3 Hunk-level accept/reject can be deferred

`DiffTab` has hunk-level UI concepts, but initial implementation can focus on:

- accept all
- reject all
- accept file
- reject file

Hunk-level application is more complex because current artifact actions appear to represent full file writes.

If implementing hunk-level later, add a specific patch model rather than mutating full-file artifacts ambiguously.

---

### 5.4 Keep right rail compact

The right rail should not become a cramped code viewer. It should link to workbench surfaces.

Good right rail actions:

- `Open Review Diff`
- `Open file`
- `View proof`
- `Restore checkpoint`
- `Open walkthrough`

Avoid default large code blocks in the right rail.

---

## 6. Test Plan

### Unit/source tests

Add or update tests for:

- `deriveWorkspaceArtifactPreviews(...)`
- `derivePreviewDiffEntries(...)` including `artifactId`
- file status derivation from pending previews
- `FileTree` badge rendering
- `DiffTab` callback invocation
- `useArtifactLifecycle` bulk apply/reject helpers

### Integration tests

Add or update tests for:

- pending artifact opens a workbench tab
- selected pending file shows `PendingArtifactOverlay`
- `Review Diff` shows the same pending artifact
- accepting from `Review Diff` applies artifact
- rejecting from `Review Diff` rejects artifact
- right rail Changes links to Review Diff

### E2E targets

If feasible:

1. Trigger or seed a pending file artifact.
2. Verify file appears as a workbench tab.
3. Verify file tree badge appears.
4. Open Review Diff.
5. Accept the file.
6. Verify file exists in project files/runtime.
7. Verify pending badge/count disappears.

---

## 7. Rollout Plan

### Step 1

Implement file tree badges and status derivation.

### Step 2

Wire `DiffTab` accept/reject file and accept/reject all actions.

### Step 3

Update right rail `Changes` to route users to central review.

### Step 4

Clarify plan lifecycle and link plan to actual changed files.

### Step 5

Expose checkpoint restore in Proof and optionally Review Diff.

### Step 6

Add first-class walkthrough artifact.

---

## 8. Success Criteria

This work is successful when:

- Generated files visibly appear in the file tree and workbench.
- Users can immediately tell whether a file is pending/generated/modified.
- `Review Diff` is clearly the main generated-change review surface.
- Right rail `Changes` feels like navigation/status, not a competing editor.
- Plan/context is visibly connected to generated files and proof.
- Users can apply/reject generated changes without hunting through the UI.
- Users can find rollback/checkpoint affordances before accepting risky changes.
- Completed agent runs produce proof/walkthrough information that builds trust.

---

## 9. Non-Goals

This plan does **not** propose:

- Rebuilding the workbench from scratch.
- Replacing the existing artifact system.
- Removing the right rail.
- Creating a second file explorer.
- Implementing full hunk-level patch application in the first pass.
- Implementing multi-agent worktree isolation in this phase.
- Implementing live preview, browser proof, screenshots, DOM checks, or visual UI validation.
- Turning the right rail into a full code editor.

---

## 10. Final Recommendation

Panda is closer to a modern Cursor/Antigravity-style workflow than it first appears. The correct move is to **finish and unify the existing primitives**:

1. Add file tree generated/change badges.
2. Wire central `Review Diff` accept/reject actions.
3. Make right rail `Changes` a navigator to central review.
4. Make plan lifecycle explicit and connected to changed files.
5. Surface checkpoint restore near proof/review.
6. Add walkthrough/proof artifacts for completed runs.

This should make Panda's generated-file experience feel intentional, safe, and modern without discarding the architecture that is already in place.
