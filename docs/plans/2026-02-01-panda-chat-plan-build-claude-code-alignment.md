# Panda Chat: Discuss (Plan) + Build Mode Alignment (Claude Code-style)

**Date:** 2026-02-01  
**Primary worktree:** `.worktrees/plan-mode-guardrails/`  

## Why this work existed (the problems)

Panda’s chat UX was not behaving like “Claude Code”-style workflows:

1. **Discuss mode (Plan Mode) produced code** (sometimes streaming large code blocks into the chat panel).
2. **Build mode didn’t reliably execute** (often produced another plan instead of writing files / running commands).
3. **Streaming looked “chunky” / unstable** (content could “vanish then reprint”).
4. **Workbench wasn’t truly wired** to see changes (files weren’t appearing in Explorer/Editor when “Build this” was clicked).
5. **Auto-apply behavior was unclear** (user wanted Claude Code-like flow, but needed safety controls).
6. After wiring automation, we hit a **React infinite loop**:
   - `The result of getServerSnapshot should be cached to avoid an infinite loop`
   - `Maximum update depth exceeded`

The goal of the changes was to make Discuss/Build behave predictably, prevent code from appearing in the chat panel, and ensure Build actions actually materialize as files/jobs in the Workbench.

## High-level target behavior (what “good” looks like)

### Discuss mode (“Plan Mode”)
- Assistant should **plan with the user** (clarifying questions + plan draft).
- Chat should **not dump full implementation code**.
- Output should be readable and stream smoothly.
- The plan should be **captured into a Plan Draft panel**, editable by the user.

### Build mode (“Execute Mode”)
- “Build this” should **result in actions**, not a new plan:
  - write files via tools (`write_files`)
  - run commands via tools (`run_command`)
- Workbench should reflect changes:
  - Explorer shows created/modified files
  - Editor opens/edits file content
  - Terminal shows jobs/command output
- Optional: “auto apply” (like Claude Code) should exist, but must be **safe** and **configurable**.

## What we implemented (specific changes)

### 1) Runtime guardrails to keep code out of chat (Discuss + Build)

**Goal:** Ensure chat output stays “human-readable planning” and does not stream large fenced code blocks into the chat panel.

**Implementation:**
- Added detection for fenced code blocks / “implementation-y” output during streaming.
- If detected, the runtime **does not continue streaming those chunks to the UI** and triggers a **single rewrite retry** that instructs the model to respond in an acceptable format.
- Build mode has an additional retry: if the model only outputs a plan without any tool calls, retry once while nudging it to actually use tools.

**Files:**
- `.worktrees/plan-mode-guardrails/apps/web/lib/agent/runtime.ts`
- `.worktrees/plan-mode-guardrails/apps/web/lib/agent/runtime.plan-mode.test.ts`
- `.worktrees/plan-mode-guardrails/apps/web/lib/agent/runtime.build-mode.test.ts`

### 2) Fix “vanish then reprint” streaming behavior

**Goal:** Stop the UI from clearing the streaming message and then re-adding it (which looked like flicker / disappearing output).

**Implementation:**
- Adjusted the UI “reset / rewrite” handling so the user sees a stable transition:
  - when a rewrite starts, we replace content intentionally (instead of clearing to blank).

**Files:**
- `.worktrees/plan-mode-guardrails/apps/web/hooks/useAgent.ts`

### 3) Plan Draft Panel: persist and reuse plan between modes

**Goal:** Make Discuss mode generate a reusable plan that becomes the “source of truth” for Build mode, similar to Claude Code.

**Implementation:**
- Plan Draft panel is stored per chat (`chats.planDraft` + `chats.planUpdatedAt`).
- After Discuss completes, we auto-derive a plan draft from the latest assistant response.
- When user switches to Build / clicks “Build this”, Build prompts are automatically prefixed with the Plan Draft content.

**Files:**
- `.worktrees/plan-mode-guardrails/apps/web/components/chat/PlanDraftPanel.tsx`
- `.worktrees/plan-mode-guardrails/apps/web/lib/chat/planDraft.ts`
- `.worktrees/plan-mode-guardrails/apps/web/lib/chat/planDraft.test.ts`
- `.worktrees/plan-mode-guardrails/apps/web/app/(dashboard)/projects/[projectId]/page.tsx`

### 4) “Build this” should actually start execution

**Goal:** In Build mode, the assistant should do work (create files / run commands), not just talk.

**Implementation:**
- Made the “handoff” explicit so the model is instructed to apply the plan using tools.

**Files:**
- `.worktrees/plan-mode-guardrails/apps/web/components/chat/MessageList.tsx`

### 5) Artifact pipeline improvements + original file capture

**Goal:** When the model proposes file writes, we should:
- queue them as artifacts
- show diffs / have originals available (for review + revert)

**Implementation:**
- `write_files` tool now queries existing file content via `api.files.batchGet` before queueing a file write artifact, storing `originalContent` in the payload.

**Files:**
- `.worktrees/plan-mode-guardrails/apps/web/lib/agent/tools.ts`
- `.worktrees/plan-mode-guardrails/apps/web/hooks/useAgent.ts`
- `.worktrees/plan-mode-guardrails/apps/web/stores/artifactStore.ts`

### 6) Auto-apply policy (Claude Code-like, but safe and opt-in)

**Goal:** Support a Claude Code-like “auto-apply” flow while keeping safety controls.

**Key design decision:**
- Auto-apply should **not** be globally forced on by default.
- It should be **opt-in**, with separate controls for:
  - auto-apply file writes
  - auto-run commands
  - command allowlist by prefix
- It should support:
  - user defaults (Settings)
  - per-project overrides

**Implementation:**
- Policy helper resolves effective policy from user defaults + project overrides.
- Auto-apply hook listens for pending artifacts and applies eligible ones automatically:
  - file writes -> `api.files.upsert`
  - command runs -> `api.jobs.createAndExecute` + `api.jobsExecution.execute`

**Files:**
- `.worktrees/plan-mode-guardrails/apps/web/lib/agent/automationPolicy.ts`
- `.worktrees/plan-mode-guardrails/apps/web/hooks/useAutoApplyArtifacts.ts`
- `.worktrees/plan-mode-guardrails/apps/web/components/projects/AgentAutomationDialog.tsx`
- `.worktrees/plan-mode-guardrails/apps/web/app/settings/page.tsx`
- `.worktrees/plan-mode-guardrails/apps/web/app/(dashboard)/projects/[projectId]/page.tsx`

### 7) Convex schema + functions to support plan + automation persistence

**Goal:** Persist plan draft and automation settings without Convex schema validation failures.

**Implementation (schema additions):**
- `chats.planDraft?: string`
- `chats.planUpdatedAt?: number`
- `projects.agentPolicy?: { autoApplyFiles, autoRunCommands, allowedCommandPrefixes } | null`
- `settings.agentDefaults?: { autoApplyFiles, autoRunCommands, allowedCommandPrefixes } | null`

**Files:**
- `.worktrees/plan-mode-guardrails/convex/schema.ts`
- `convex/schema.ts`
- `.worktrees/plan-mode-guardrails/convex/settings.ts`
- `.worktrees/plan-mode-guardrails/convex/projects.ts`
- `convex/settings.ts`
- `convex/projects.ts`

### 8) Fix the React “infinite loop / maximum update depth”

**Goal:** Eliminate the runtime crash triggered by state sync effects re-running indefinitely.

**Root cause (actual):**
- Convex `useQuery()` results are not guaranteed to be referentially stable.
- We had effects/memos depending on the entire `settings` object (and then setting React state from it).
- This caused repeated “server snapshot” / `useSyncExternalStore` churn and React update loops.

**Fix:**
- Key syncing effects off a stable scalar (primarily `settings?.updatedAt`, plus explicit `undefined/null` sentinels).
- Use a ref (`settingsRef`) inside effects/memos so we don’t depend on unstable objects.
- Also removed a `zustand` selector pattern that created new arrays at subscription time (in `useAgent` we now derive `pendingArtifacts` via `useMemo` from a stable `artifacts` selection).

**Files:**
- `.worktrees/plan-mode-guardrails/apps/web/app/settings/page.tsx`
- `.worktrees/plan-mode-guardrails/apps/web/hooks/useStreamingChat.ts`
- `.worktrees/plan-mode-guardrails/apps/web/app/(dashboard)/projects/[projectId]/page.tsx`
- `.worktrees/plan-mode-guardrails/apps/web/hooks/useAgent.ts`

### 9) Workbench wiring fixes (Explorer + Editor now reflect Convex files)

**Goal:** When Build mode creates/updates files via Convex, the Workbench must show them immediately.

**Fixes:**
- Reworked `Workbench` to be a presentational component: it receives `files`, selection state, and file operation handlers from the project page.
- Fixed the `File` icon bug in `FileTree` (was accidentally using the global `File` constructor in JSX).
- Fixed editor saving: `EditorContainer` now saves by file path; the project page writes to Convex via `api.files.upsert`.
- `useFileContent` now clears pending debounced saves when switching file content.

**Files:**
- `.worktrees/plan-mode-guardrails/apps/web/components/workbench/Workbench.tsx`
- `.worktrees/plan-mode-guardrails/apps/web/components/workbench/FileTree.tsx`
- `.worktrees/plan-mode-guardrails/apps/web/hooks/useFileContent.ts`
- `.worktrees/plan-mode-guardrails/apps/web/app/(dashboard)/projects/[projectId]/page.tsx`

### 10) Developer experience: worktree + env + Convex gotchas

**Goal:** Avoid confusion where a worktree “stops working” because env/codegen wasn’t copied.

**Notes added:**
- Worktrees do not share untracked `.env.local`.
- `bunx convex dev` must be run from the worktree root (where `package.json` exists), not from the `.worktrees/` parent directory.

**Files:**
- `.worktrees/plan-mode-guardrails/docs/worktrees.md`

## What this enables (end-to-end flow)

1. **Discuss:** user asks → assistant streams clarifying questions + plan (no large code).
2. **Plan Draft:** plan is captured and editable.
3. **Build:** user clicks “Build this” → assistant uses tools → artifacts/files/jobs appear.
4. **Optional Auto-apply:** if enabled per settings/project, file writes and/or safe commands can be applied automatically.

## Verification we ran

From `.worktrees/plan-mode-guardrails/apps/web`:
- `bun test` (pass)
- `bun run typecheck` (pass)
- `bunx eslint .` (warnings only)

## Known non-blocking console noise (not fixed here)

These were observed but are not the primary blockers for Plan/Build behavior:
- `SES Removing unpermitted intrinsics` (sandbox/lockdown noise)
- `favicon.ico 404`, `bot-avatar.png 404`
- `data:;base64,=:1 net::ERR_INVALID_URL` (likely a preload/URL construction issue)

