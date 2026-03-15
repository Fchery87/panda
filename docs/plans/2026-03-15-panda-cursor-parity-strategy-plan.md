# Cursor Parity Features

Goal: Implement Cursor-like features in the Panda Web AI coding workbench,
perfectly wired with the existing Chat Panel and Sidebar infrastructure.

## Phase 1: Contextual Chat (Cmd+L) & @ Asset System

### Task 1: Contextual Chat (Cmd+L)

Wire `mod+l` in CodeMirror to send the selected code to the Chat Rail.
**Files:**

- `apps/web/components/editor/CodeMirrorEditor.tsx` (Add mod+l hotkey,
  `onContextualChat` prop)
- `apps/web/components/editor/EditorContainer.tsx` (Pass `onContextualChat`)
- `apps/web/components/workbench/Workbench.tsx` (Handle `onContextualChat`,
  select chat panel, pass selection to `chatInput`)

### Task 2: The `@` Asset System

Implement an autocomplete dropdown in ChatInput for inserting file/folder
context. **Files:**

- `apps/web/components/chat/ChatInput.tsx` (Add `@` trigger listener, show
  autocomplete popover, add to `contextFiles`)
- `apps/web/components/editor/InlineChat.tsx` (Add `@` trigger)

## Phase 2: Inline Generation & Diffs

### Task 3: Inline Generation (Cmd+K) Wiring

Connect the existing `InlineChat` UI to the AI generation backend. **Files:**

- `apps/web/components/workbench/Workbench.tsx` (Implement `onInlineChat` via an
  AI API call to stream a replacement)
- `apps/web/app/api/inline-chat/route.ts` (Create or update API endpoint for
  single-file targeted edits)

### Task 4: Inline Diffs (Accept/Reject)

Instead of replacing text immediately, display an inline diff with Accept/Reject
controls. **Files:**

- `apps/web/components/editor/InlineDiffWidget.tsx` (CodeMirror
  Widget/Decoration for diffs)
- `apps/web/components/editor/CodeMirrorEditor.tsx` (Apply diff decorations
  instead of direct replacement, expose accept/reject functions)

## Phase 3: Composer Interface (Cmd+I)

### Task 5: Composer Overlay

Build a global orchestration overlay for multi-file patches. **Files:**

- `apps/web/components/composer/ComposerOverlay.tsx` (New component for
  multi-file chat and diff list)
- `apps/web/components/projects/ProjectWorkspaceLayout.tsx` (Add Composer global
  state and hotkey `mod+i`)
- `apps/web/hooks/useComposer.ts` (State management)

## Verification

- Web app compiles successfully (`bun run typecheck`)
- Check Cmd+L triggers chat rail selection
- Type `@` in chat to see file suggestions
- Highlight + Cmd+K to receive an inline diff
- Cmd+I to open Composer
