# Implementation Plan: Workbench-Owned File Opening, Plan Auto-Open, and Right Rail Cleanup

**Status:** Implemented and verified locally on 2026-05-22.

## Implementation Summary

Panda now uses a workbench-owned file model:

- The central workbench owns file viewing, editing, and Review Diff.
- Explicit file clicks route to the workbench and editor tab.
- Generated non-plan files appear in the file tree, Changes, and Review Diff without auto-opening or stealing focus.
- Generated Plan Mode artifacts continue to auto-open in the workbench.
- The right rail is support-only: `Proof`, `Changes`, and `Context`.
- Mobile navigation is `Work`, `Chat`, `Proof`, and `Changes`; product-level live `Preview` navigation has been removed.
- Plan documents now render with `.plan.md`-style frontmatter, clean metadata/task cards, styled Markdown, and Mermaid diagram support.
- Plan generation now prefers shallow headings, Mermaid architecture diagrams, tables, checklists, and fewer visible heading markers.

Verified with targeted ESLint, TypeScript, Convex planning-session tests, and targeted component/hook tests.

## Goal

Configure Panda so the central workbench is the canonical place where files are viewed, edited, and reviewed.

Product rule:

> Every file is a workbench file. Every file click opens in the workbench. Only generated Plan Mode documents auto-open. Diffs are reviewed centrally. The right rail is for navigation, proof, and context — not work/editing.

This plan is based on a Panda codebase review plus 2026 Cursor and Google Antigravity behavior.

## 2026 Product References

### Cursor takeaways

Cursor's 2026 Plan Mode and Agents Window patterns imply:

- Plan Mode produces a reviewable plan before coding.
- Plans open as editable virtual/Markdown-like documents.
- Plans can be saved to workspace, commonly under `.cursor/plans/`.
- A plan is not just a random Markdown file: registered plans retain special behavior such as Build, progress, plan preview, dirty tracking, save/copy/export, and plan revision.
- Files and diffs belong in the editor/workbench.
- Cursor 3.1 specifically improved diff-to-file navigation: users can jump from a diff to the exact line in the editor.
- Users dislike fragmented file/diff navigation or file links opening inside an agent side area instead of the editor.
- Users dislike whole-file replacement diffs when only small regions changed.

### Antigravity takeaways

Google Antigravity's 2026 model implies:

- Agent Manager / artifact surfaces are for orchestration, artifacts, review, comments, and approvals.
- Editor View is for generated files, direct editing, and Review Changes.
- Planning Mode produces Task and Implementation Plan artifacts before code.
- Review-driven development can pause after plans before file generation.
- Walkthrough artifacts summarize changes, verification commands, and results.
- Generated files are visible in the editor/workspace, not trapped in the artifact manager.

### Panda adaptation

Panda should combine these patterns while respecting project constraints:

- No browser/live preview requirement.
- No screenshot/DOM proof integration.
- Right rail stays support-oriented.
- Central workbench owns files and diffs.
- Plans auto-open because they are the user approval handoff.
- Normal generated files do not auto-open because tab spam and focus stealing hurt review.

---

## Current Panda State

Panda already has many required primitives:

- `FileTree` opens selected files through `onSelectFile`.
- `useProjectWorkbenchFiles` opens selected files in central workbench tabs.
- Pending generated files are merged into the file tree through `pendingDiffEntries`.
- `ArtifactCard` has an `Open File` action that routes through `onOpenFile`.
- `Review Diff` is a central workbench tab.
- `usePlanArtifactSync` auto-opens generated plan artifacts.
- Right rail already has support surfaces: `Proof`, `Changes`, and `Context`.
- Proof already includes walkthrough, recovery, validation, and checkpoint surfaces.

However, the deep dive found key mismatches:

1. **The Workbench currently lives inside the right panel's `Work` tab.**
   - `ProjectWorkspaceLayout` renders `chatPanel` in the center.
   - `workbench` is passed as `workContent` to `WorkbenchRightPanel`.
   - `RightPanel` renders `workContent` when active tab is `work`.
   - Therefore, removing `Work` before relocating the workbench would break file viewing.

2. **Normal generated file artifacts currently auto-open/select.**
   - `useArtifactLifecycle` watches `pendingArtifactPreviews` and may call `setOpenTabs`, `setSelectedFilePath`, and `setMobilePrimaryPanel('work')`.
   - This violates the new rule that only plans auto-open.

3. **Plan auto-open exists, but may not always make the workbench visible on desktop.**
   - `usePlanArtifactSync` sets selected file and mobile panel, but does not explicitly set desktop focus after the workbench is decoupled.

4. **Plan artifact tabs are mostly read-only.**
   - `PlanArtifactTab` renders Markdown and offers Approve/Build, but does not yet support direct editing, save, dirty tracking, or file-like plan behaviors.

5. **Plans are synthetic tabs, not real workspace files.**
   - Current paths use `plan:<sessionId>`.
   - Cursor-like behavior eventually wants `.panda/plans/*.md`, but the plan must remain a registered plan artifact, not a random Markdown file.

6. **Diff hunks are too coarse.**
   - `derivePreviewDiffEntries` currently treats modified files like whole-file replace hunks.
   - Cursor-quality review needs real hunks with context and diff-to-file navigation.

7. **Changes cleanup must preserve command/action approval flows.**
   - `ArtifactPanel` handles both `file_write` and `command_run` artifacts.
   - Simplifying Changes must not remove pending command review/execution unless another surface owns it.

8. **Preview language must be removed selectively.**
   - Product-level live preview/mobile preview should be removed or renamed.
   - Generic preview concepts such as Markdown preview, image attachment preview, and internal artifact preview can remain.

---

## User Review Required

> [!IMPORTANT]
> The first implementation step must decouple the Workbench from the right panel's `Work` tab. Do **not** remove the `Work` tab before the Workbench has a new primary home.

> [!IMPORTANT]
> Non-plan generated files should no longer auto-open or steal focus. They should appear in the file tree, Changes, and Review Diff, and open only when clicked.

> [!IMPORTANT]
> Generated Plan Mode documents should continue to auto-open when completed. This is the approval handoff from LLM to user.

> [!IMPORTANT]
> If plans later become real `.panda/plans/*.md` files, they must remain linked to registered plan metadata so Approve/Build behavior is preserved.

> [!CAUTION]
> Simplifying the Changes panel must not accidentally remove command approval or command execution review flows.

---

## Non-Goals

- No browser proof integration.
- No live preview implementation.
- No screenshot/DOM/visual validation workflow.
- No duplicate code editor inside the right rail.
- No automatic tab opening for every generated file.
- No removal of generic Markdown/image preview features that are not live-browser preview.

---

# Proposed Changes

## Phase 0 — Decouple Workbench from the Right Panel `Work` Tab

### Summary

Before removing the right rail `Work` tab, move the Workbench out of `RightPanel.workContent` and into a primary workspace area.

Current desktop layout is effectively:

```txt
Center panel: Chat timeline/composer
Right panel:
  Work tab: Workbench
  Proof tab: Proof
  Changes tab: Changes
  Context tab: Context
```

Desired desktop layout:

```txt
Primary workspace area:
  Workbench or Chat, depending focus/mode

Right rail:
  Proof
  Changes
  Context
```

The right rail should support the workbench, not contain it.

### Files

#### [MODIFY] `apps/web/components/projects/ProjectWorkspaceLayout.tsx`

Current issue:

```tsx
<Panel id="workspace-panel">
  {chatPanel}
</Panel>

<WorkbenchRightPanel
  projectId={projectId}
  workContent={workbench}
/>
```

Required behavior:

- Render `workbench` as a primary surface, not as right-panel content.
- Render `chatPanel` as its own primary/focus surface.
- `workspaceFocusMode === 'workbench'` should show/focus the workbench.
- `workspaceFocusMode === 'chat'` should show/focus chat.
- `workspaceFocusMode === 'proof' | 'changes'` can keep the workbench visible while opening the right rail support tab, unless intentionally focusing chat.

Potential transition layout:

```txt
Center primary panel:
  if workspaceFocusMode === 'chat': chatPanel
  else: workbench

Right support panel:
  Proof / Changes / Context
```

Alternative layout, if keeping chat and workbench side-by-side is desired:

```txt
Left/center: Workbench
Lower/side: Chat
Right: Proof / Changes / Context
```

But the implementation should not keep Workbench inside `RightPanel`.

#### [MODIFY] `apps/web/components/workbench/WorkbenchRightPanel.tsx`

Current props:

```ts
workContent: ReactNode
```

Required behavior:

- Remove `workContent` dependency once `ProjectWorkspaceLayout` owns Workbench rendering.
- `WorkbenchRightPanel` should only provide inspector/support content.

#### [MODIFY] `apps/web/components/panels/RightPanel.tsx`

Do not remove `work` in this phase unless Workbench has already been moved.

In this phase, prepare the component to support an inspector-only mode.

Possible intermediate API:

```ts
interface RightPanelProps {
  inspectorContent?: ReactNode
  inspectorTabs?: InspectorTabDef[]
  activeInspectorTab?: string
  // no required workContent
}
```

### Acceptance Criteria

- Workbench can render without being inside `RightPanel`.
- File tabs/editor remain accessible when the right rail is closed.
- Chat can still be accessed.
- Proof/Changes/Context still open in the right rail.
- Existing file click pathways still select workbench files.

---

## Phase 1 — Stop Auto-Opening Non-Plan Generated Files

### Summary

Generated file artifacts should appear in the file tree, Changes, and Review Diff, but should not automatically open/select in the workbench unless they are plan documents.

### Files

#### [MODIFY] `apps/web/hooks/useArtifactLifecycle.ts`

Current behavior:

- Watches `pendingArtifactPreviews`.
- Finds new generated file artifacts.
- Calls `resolveArtifactPreviewNavigation`.
- May call `setOpenTabs`.
- May call `setSelectedFilePath`.
- May call `setMobilePrimaryPanel('work')`.

Required behavior:

- Continue deriving `pendingArtifactPreviews`.
- Continue deriving `pendingDiffEntries`.
- Continue exposing `pendingArtifactPreview` when the selected file matches a pending artifact.
- Continue supporting apply/reject.
- Stop automatically opening/selecting normal generated file artifacts.

Implementation direction:

```ts
useEffect(() => {
  if (pendingArtifactPreviews.length === 0) return

  const newPreviews = pendingArtifactPreviews.filter(
    (preview) => !seenPendingArtifactIdsRef.current.has(preview.artifactId)
  )

  for (const preview of newPreviews) {
    seenPendingArtifactIdsRef.current.add(preview.artifactId)
  }

  // Do not auto-open or auto-select normal generated files.
  // File visibility is handled by pendingDiffEntries -> FileTree/Changes/Review Diff.
}, [pendingArtifactPreviews])
```

#### [MODIFY] `apps/web/components/workbench/artifact-preview.ts`

Current helper:

```ts
resolveArtifactPreviewNavigation(...)
```

Required behavior:

- Remove it if unused.
- Or replace it with an explicit policy helper that returns auto-open only for registered plan artifacts.

Preferred direction:

- Delete `resolveArtifactPreviewNavigation` after removing non-plan artifact auto-navigation.

#### [MODIFY] `apps/web/components/workbench/artifact-preview.test.ts`

Update tests from auto-navigation expectations to non-interruption expectations.

Recommended tests:

- derives active workspace previews from pending file-write artifacts.
- derives diff entries from pending previews.
- does not expose or call auto-navigation for normal generated file artifacts.

### Acceptance Criteria

- Agent generates `src/new.ts` → file appears in file tree with generated/pending status.
- File appears in Changes.
- File appears in Review Diff.
- Current selected workbench tab does not change.
- No new editor tab is created automatically.
- Clicking the file explicitly opens it in the workbench.

---

## Phase 2 — Strengthen Plan Auto-Open and Workbench Focus

### Summary

Generated Plan Mode documents should continue to auto-open, and the workbench should be visibly focused when they do.

### Files

#### [MODIFY] `apps/web/hooks/usePlanArtifactSync.ts`

Current behavior:

```ts
setOpenTabs((prev) => upsertPlanArtifactWorkspaceTab(prev, activePlanArtifact))
setSelectedFilePath(nextPlanTab.path)
setSelectedFileLocation(null)
setCursorPosition(null)
setMobilePrimaryPanel('work')
```

Required behavior after Phase 0:

- Keep plan tab upsert.
- Keep selected path update.
- Ensure desktop focus changes to workbench.
- Ensure center tab is editor, not diff/logs/tests.
- Keep mobile primary panel as work.

Possible API extension:

```ts
usePlanArtifactSync({
  activePlanArtifact,
  openTabs,
  setOpenTabs,
  setSelectedFilePath,
  setSelectedFileLocation,
  setCursorPosition,
  setMobilePrimaryPanel,
  setWorkspaceFocusMode,
  setActiveCenterTab,
})
```

Then:

```ts
setWorkspaceFocusMode('workbench')
setActiveCenterTab('editor')
```

#### [MODIFY] `apps/web/components/projects/WorkspaceRuntimeProvider.tsx`

Pass the required focus setters into `usePlanArtifactSync`.

### Acceptance Criteria

- User enters Plan Mode.
- LLM completes plan.
- Plan auto-opens in the workbench.
- Workbench is visible/focused on desktop.
- Work panel is visible on mobile.
- Normal generated files still do not auto-open.

---

## Phase 3 — Verify and Enforce All File Clicks Route to Workbench

### Summary

Every file path interaction should route to the central workbench.

### Files

#### [VERIFY/MODIFY] `apps/web/hooks/useProjectWorkbenchFiles.ts`

Current `handleFileSelect` already opens files in workbench tabs:

```ts
setSelectedFilePath(path)
setOpenTabs((prev) => {
  if (prev.some((tab) => tab.path === path)) return prev
  return [...prev, { path }]
})
```

Required additions after Phase 0:

- Ensure file selection sets `workspaceFocusMode('workbench')` on desktop, or calls a unified navigation helper that does.
- Ensure it sets `activeCenterTab('editor')` so file clicks do not leave the user in Diff/Logs/Tests when they intended to view source.

Possible helper:

```ts
openFileInWorkbench(path, location?)
```

Used by all surfaces.

#### [VERIFY/MODIFY] `apps/web/components/artifacts/ArtifactCard.tsx`

Keep:

```ts
onOpenFile(payload.filePath)
```

#### [VERIFY/MODIFY] `apps/web/components/artifacts/ArtifactPanel.tsx`

- Continue passing `onOpenFile` to file rows/cards.
- Prefer compact file rows over editor-like file previews.

#### [VERIFY/MODIFY] `apps/web/components/projects/ProjectChatInspector.tsx`

- Files listed in Proof/Walkthrough should use `onOpenFile`.
- Files listed in plan lifecycle should use `onOpenFile` where applicable.
- No file content rendering in Proof as a substitute editor.

#### [VERIFY/MODIFY] `apps/web/components/chat/RunProgressPanel.tsx`

- Run event target files already have file click affordances.
- Ensure they route to workbench focus.

#### [VERIFY/MODIFY] `apps/web/components/workbench/ProjectSearchPanel.tsx`

- Search results should continue opening files in the workbench with line/column.

### Acceptance Criteria

Clicking a file from any of these surfaces opens it in the workbench:

- File tree
- Search
- Changes
- Proof
- Context
- Artifact cards
- Run progress target file links
- Plan lifecycle expected/actual file lists
- Chat references, where wired

---

## Phase 4 — Improve Plan Tab Toward Cursor-Like Document Behavior

### Summary

Panda's auto-open plan tab should behave more like an editable plan document, while retaining registered plan metadata and Approve/Build actions.

### Files

#### [MODIFY] `apps/web/components/workbench/PlanArtifactTab.tsx`

Current behavior:

- Render full plan as Markdown.
- Render acceptance checks.
- Show Approve/Build actions.
- Mostly read-only.

Required behavior:

- Add Review/Edit modes, or connect to existing editable plan draft behavior.
- Allow the user to edit the plan before approval/build.
- Support save or update plan draft.
- Preserve Approve/Build actions.
- Add dirty-state handling if feasible.
- Consider copy/export Markdown actions.

Possible tab model:

```txt
PlanArtifactTab
  Review: rendered Markdown + checks + Approve/Build
  Edit: textarea/markdown editor + Save
```

#### [MODIFY] `apps/web/hooks/useProjectPlanningSession.ts`

If plan edits should update the registered generated plan, add/update mutation pathways here.

#### [MODIFY] `apps/web/components/plan/PlanPanel.tsx`

Avoid duplicating plan edit behavior between right rail context and workbench plan tab. Either:

- share an editable plan component, or
- route Context plan editing to the same plan state used by the workbench tab.

### Acceptance Criteria

- Auto-open plan can be reviewed and edited.
- User can save plan changes.
- Approve/Build remain available when valid.
- Plan status remains registered and not reduced to a plain Markdown file.

---

## Phase 5 — Add Real Diff Hunks and Diff-to-File Navigation

### Summary

Cursor-quality review requires focused hunks and easy navigation from diff to source file.

### Files

#### [MODIFY] `apps/web/components/workbench/artifact-preview.ts`

Current behavior:

```ts
removed: preview.originalContent ? originalLines : []
added: pendingLines
```

This can render modified files as whole-file replacements.

Required behavior:

- Generate actual diff hunks with context.
- Preserve added/modified/deleted/renamed file status.
- Include approximate start/end lines for each hunk.
- Keep output compatible with `DiffFileEntry`.

Implementation options:

- Add a small internal line diff helper.
- Use an existing dependency only if already present and acceptable.
- Keep initial implementation simple but avoid whole-file replacement for common line edits.

#### [MODIFY] `apps/web/components/workbench/DiffTab.tsx`

Add:

- `onOpenFile?: (path: string, location?: { line: number; column: number }) => void`
- `Open File` action in selected file header.
- Optional `Open at Hunk` action from each hunk.

Recommended behavior:

```txt
Review Diff -> select file -> Open File -> workbench opens file
Review Diff -> hunk -> Open at line -> workbench opens file at hunk start
```

#### [MODIFY] `apps/web/components/workbench/Workbench.tsx`

Thread `onOpenFile` into `DiffTab`.

### Acceptance Criteria

- Modified files show focused hunks, not whole-file replacement when avoidable.
- Diff view can open the selected file in the workbench.
- Diff view can jump to hunk line where line data is available.
- Accept/reject file/all behavior remains intact.

---

## Phase 6 — Remove Right Rail `Work` as a First-Class Tab

### Summary

After Phase 0, remove visible `Work` from the right rail. The right rail should be support-only.

### Files

#### [MODIFY] `apps/web/components/panels/RightPanel.tsx`

Current type:

```ts
export type RightPanelTabId = 'work' | 'proof' | 'changes' | 'context' | 'preview'
```

Recommended type:

```ts
export type RightPanelTabId = 'proof' | 'changes' | 'context'
```

Current tabs include:

```ts
{ id: 'work', label: 'Work' }
```

Required behavior:

- Remove visible `Work` tab.
- Right rail tabs should be:

```txt
Proof | Changes | Context
```

- Use `isRightPanelOpen` to control closed/open state instead of falling back to `work`.

#### [MODIFY] `apps/web/components/workbench/WorkbenchRightPanel.tsx`

- Remove `workContent` prop if not already removed.
- Remove assumptions that `activeTab !== 'work'` means drawer open.
- Treat active tab as one of Proof/Changes/Context.

#### [MODIFY] `apps/web/stores/workspaceUiStore.ts`

Current:

```ts
export type RightPanelTab = 'work' | 'proof' | 'changes' | 'context' | 'preview'
rightPanelTab: 'work'
```

Required behavior:

- Remove `work` and product-level `preview` from `RightPanelTab`.
- Default to a support tab such as `proof` or `changes` while `isRightPanelOpen` controls visibility.
- Add migration from old persisted values:

```ts
work -> proof or changes, with isRightPanelOpen possibly false
preview -> proof or context depending final UX
run -> proof
chat -> proof or unchanged closed state
```

#### [MODIFY] `apps/web/hooks/useWorkbenchPanelState.ts`

Current:

```ts
type RightPanelTab = 'work' | 'proof' | 'changes' | 'context' | 'preview'
```

Required behavior:

- Support only Proof/Changes/Context for right rail.
- Opening right rail on mobile should route to the corresponding mobile support panel, not always `proof`.

#### [MODIFY] `apps/web/components/projects/ProjectWorkspaceLayout.tsx`

Current:

```ts
openRightPanelTab(focus === 'workbench' ? 'work' : focus)
```

Required behavior:

- Workbench focus should focus primary workbench, not a right rail tab.
- Proof/Changes focus opens the right rail support tab.

### Acceptance Criteria

- Right rail no longer displays `Work`.
- Right rail displays only Proof/Changes/Context.
- Workbench remains visible/editable independently from right rail.
- File work never appears as a right rail mode.

---

## Phase 7 — Simplify `Changes` into Navigator/Status While Preserving Actions

### Summary

`Changes` should summarize generated work and route users to files or central Review Diff. It should not duplicate the editor or become the primary diff surface.

However, it must not remove command/action review flows.

### Files

#### [MODIFY] `apps/web/components/artifacts/ArtifactPanel.tsx`

Current behavior includes:

- pending/applied/rejected artifact sections
- Apply All
- Reject All
- Clear Pending Artifacts
- card snippets
- file-write and command-run artifacts

Required behavior:

- Reduce file-write artifacts into compact changed-file rows.
- Keep `Open Review Diff` prominent.
- Clicking a file opens it in the workbench.
- Keep command/action artifacts visible in a separate section if no other approval UI owns them.

Recommended layout:

```txt
Changes

Files changed
5 pending generated files
[Review Diff]

- src/Button.tsx          Pending   [Open]
- src/Button.test.tsx     Pending   [Open]
- docs/component.md       Accepted  [Open]

Pending actions
- bun test                Needs approval / queued
```

#### [MODIFY] `apps/web/components/artifacts/ArtifactCard.tsx`

- Either simplify file-write cards into rows, or keep cards but remove editor-like preview emphasis.
- Keep `Open File` and `Review Diff` navigation.
- Preserve command run details/actions where needed.

### Acceptance Criteria

- Changes panel is compact and navigational.
- Review Diff remains central for accept/reject review.
- File content is not rendered as a side editor.
- Pending command/action review remains available.

---

## Phase 8 — Remove Product-Level Live Preview Language Selectively

### Summary

Panda does not plan live preview/browser proof, so product-level `Preview` navigation should be renamed or removed.

Do **not** remove generic preview concepts like Markdown preview or image attachment preview.

### Files

#### [MODIFY] `apps/web/components/projects/ProjectWorkspaceLayout.tsx`

Current mobile nav includes:

```txt
Session | Chat | Proof | Preview
```

Recommended replacement:

```txt
Work | Chat | Changes | Proof
```

or:

```txt
Files | Chat | Diff | Proof
```

Preferred for Panda:

```txt
Work | Chat | Changes | Proof
```

#### [MODIFY] `apps/web/stores/workspaceUiStore.ts`

Current:

```ts
export type MobilePrimaryPanel = 'work' | 'chat' | 'proof' | 'preview'
```

Recommended:

```ts
export type MobilePrimaryPanel = 'work' | 'chat' | 'changes' | 'proof'
```

Migrate persisted `preview` to `work` or `changes` depending UX choice.

#### [KEEP] Generic preview usage

Keep these concepts unless separately redesigned:

- `PlanPanelTab = 'preview'`
- Markdown preview
- image attachment preview
- internal `pendingArtifactPreview` naming if used as a pending-content concept

### Acceptance Criteria

- No mobile/product-level `Preview` tab if there is no live preview feature.
- Mobile users can access Work, Chat, Changes, and Proof clearly.
- Generic preview features remain intact.

---

## Phase 9 — Real Registered Plan Files in `.panda/plans/` [Follow-Up]

### Summary

Eventually, Panda should save Plan Mode documents as real workspace files while preserving plan metadata.

Cursor's lesson: do not let plan documents become random Markdown files that lose Build/Approve behavior.

### Proposed Location

```txt
.panda/plans/<yyyy-mm-dd>-<task-slug>-plan.md
```

Example:

```txt
.panda/plans/2026-05-22-workbench-owned-file-opening-plan.md
```

### Data Model Direction

Extend `GeneratedPlanArtifact` with:

```ts
workspacePath?: string
```

The plan remains registered:

```txt
GeneratedPlanArtifact
  sessionId
  chatId
  status
  markdown
  workspacePath
```

So the same plan can be:

- visible as a real file
- editable as Markdown
- available in file tree
- source-control friendly
- still connected to Approve/Build/status

### Files Likely Involved

- `apps/web/lib/planning/types.ts`
- `apps/web/hooks/useProjectPlanningSession.ts`
- `apps/web/hooks/usePlanArtifactSync.ts`
- `apps/web/components/workbench/PlanArtifactTab.tsx`
- Convex file upsert/persistence path

### Acceptance Criteria

- Plan Mode completion creates or updates `.panda/plans/*.md`.
- That real plan file appears in the file tree.
- It auto-opens in the workbench.
- It retains Approve/Build behavior.
- Updating the plan file updates the registered plan or prompts for sync.

---

# Verification Plan

## Automated Checks

Run targeted lint/typecheck/tests after each implementation phase:

```bash
cd apps/web
bunx eslint components/panels/RightPanel.tsx \
  components/workbench/WorkbenchRightPanel.tsx \
  components/projects/ProjectWorkspaceLayout.tsx \
  hooks/useArtifactLifecycle.ts \
  hooks/usePlanArtifactSync.ts \
  hooks/useProjectWorkbenchFiles.ts \
  components/artifacts/ArtifactPanel.tsx \
  components/artifacts/ArtifactCard.tsx \
  components/workbench/artifact-preview.ts \
  components/workbench/DiffTab.tsx \
  components/workbench/PlanArtifactTab.tsx \
  --max-warnings=0

bunx tsc --noEmit --pretty false
```

Targeted tests to run/update:

```bash
cd apps/web
bun test \
  components/workbench/artifact-preview.test.ts \
  components/workbench/FileTree.test.tsx \
  components/workbench/DiffTab.test.tsx \
  components/workbench/PlanArtifactTab.test.tsx \
  components/workbench/workbench.integration.test.ts \
  components/projects/project-workspace-layout.test.tsx \
  components/projects/project-chat-wiring.test.tsx \
  components/projects/ProjectChatInspectorPlanLifecycle.test.tsx \
  components/projects/ProjectChatInspectorWalkthrough.test.tsx \
  components/artifacts/ArtifactCard.test.tsx
```

## Behavioral Checks

### File Clicks

- Click existing `.tsx` file in file tree → opens in workbench.
- Click existing `.md` file in file tree → opens in workbench.
- Click pending generated file in file tree → opens in workbench and shows pending overlay/diff affordance.
- Click file in Changes → opens in workbench.
- Click file in Proof/Walkthrough → opens in workbench.
- Click file in Context/Plan lifecycle → opens in workbench where applicable.
- Click file from Review Diff → opens source file in workbench, ideally at selected hunk line.

### Auto-Open

- Complete Plan Mode → generated plan auto-opens in visible workbench.
- Generate source file → file appears in tree/Changes/Diff but does not auto-open.
- Generate Markdown doc that is not the plan → appears in tree/Changes/Diff but does not auto-open.
- Generate multiple files → no tab spam.

### Review Diff

- Open Review Diff from Changes → central diff tab opens.
- Modified files show focused hunks where possible.
- Open File from diff works.
- Accept/reject per file works.
- Accept/reject all works where currently supported.
- Right rail does not duplicate diff review as an editor.

### Plan

- Plan auto-opens after LLM completes Plan Mode.
- Plan is visible in workbench.
- User can approve/build.
- If edit mode is implemented, user can edit and save.
- Registered plan status remains intact.

### Right Rail

- Right rail contains Proof/Changes/Context only after Phase 6.
- No visible Work tab.
- Proof shows walkthrough/validation/checkpoints.
- Changes is compact navigation/status.
- Context shows plan/memory/evals/context without owning file editing.

### Mobile

- No product-level live Preview tab.
- Mobile has clear Work/Chat/Changes/Proof navigation.

## Rollback / Recovery

If behavior regresses:

1. Keep plan auto-open via `usePlanArtifactSync.ts` throughout rollback.
2. Temporarily keep `RightPanel` `workContent` until Workbench relocation is stable.
3. Re-enable old generated artifact auto-navigation only as a temporary fallback if file visibility breaks.
4. Restore `work` tab migration if persisted UI state causes crashes.
5. Use existing checkpoint/snapshot restore UI from Proof if runtime-generated changes need recovery.

---

# Revised Implementation Order

1. **Phase 0 — Decouple Workbench from RightPanel Work tab.**
2. **Phase 1 — Stop auto-opening non-plan generated files.**
3. **Phase 2 — Strengthen plan auto-open and workbench focus.**
4. **Phase 3 — Enforce all file clicks route to workbench.**
5. **Phase 4 — Improve plan tab editability/document behavior.**
6. **Phase 5 — Add real diff hunks and diff-to-file navigation.**
7. **Phase 6 — Remove right rail Work tab.**
8. **Phase 7 — Simplify Changes while preserving command actions.**
9. **Phase 8 — Remove product-level live Preview language selectively.**
10. **Phase 9 — Follow up with real registered `.panda/plans/*.md` files.**

---

# Final Expected UX

## Plan Mode

```txt
User enters Plan Mode
User gives task
LLM researches and creates registered plan
Plan auto-opens in visible central workbench
User reviews/edits/approves plan
User clicks Build
```

## Implementation Mode

```txt
LLM generates files
Generated files appear in file tree with Generated/Pending badges
Generated files appear in Changes
Generated files appear in Review Diff
Current workbench tab does not change
User clicks any file to open it in workbench
```

## Review

```txt
User opens Review Diff
User reviews focused hunks centrally
User jumps from diff to source file when needed
User accepts/rejects generated changes
Proof shows validation/walkthrough/recovery
```

## Right Rail

```txt
Proof   -> validation, walkthrough, checkpoints
Changes -> changed-file navigator + Review Diff link + pending actions
Context -> plan, memory, evals, relevant context
```

No right rail Work editor. No auto-open tab spam. No live preview/browser proof.
