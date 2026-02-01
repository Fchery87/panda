# Fix Infinite Loop + Workbench Wiring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Stop the React max-update-depth loop and ensure the Workbench (Explorer/Editor) is wired to Convex files so Build mode actually produces visible files.

**Architecture:** Avoid effects/memos depending on referentially-unstable `useQuery` objects; key sync logic off stable version fields (`updatedAt`) and/or refs. Wire Workbench as a presentational component receiving files + handlers from the project page.

**Tech Stack:** Next.js App Router, React 19, Convex, Zustand, Bun.

### Task 1: Reproduce and identify the loop trigger

**Files:**
- Inspect: `apps/web/app/settings/page.tsx`
- Inspect: `apps/web/app/(dashboard)/projects/[projectId]/page.tsx`

**Step 1: Capture console warning + stack**
- Confirm presence of:
  - `The result of getServerSnapshot should be cached to avoid an infinite loop`
  - `Maximum update depth exceeded`

**Step 2: Trace which hook/effect re-runs**
- Look for `useEffect(..., [settings])` and other deps on full `useQuery` results.

### Task 2: Fix root cause (unstable deps causing repeated state sync)

**Files:**
- Modify: `apps/web/app/settings/page.tsx`
- Modify: `apps/web/hooks/useStreamingChat.ts`
- Modify: `apps/web/app/(dashboard)/projects/[projectId]/page.tsx`

**Step 1: Introduce a stable "version key"**
- Use `settings?.updatedAt` (plus explicit `undefined`/`null` sentinel values) to drive sync effects.

**Step 2: Use refs to avoid capturing unstable objects**
- Store latest `settings` in a ref and read from it inside effects/memos.

### Task 3: Wire Workbench to Convex files + editor saving

**Files:**
- Modify: `apps/web/components/workbench/Workbench.tsx`
- Modify: `apps/web/components/workbench/FileTree.tsx`
- Modify: `apps/web/hooks/useFileContent.ts`
- Modify: `apps/web/app/(dashboard)/projects/[projectId]/page.tsx`

**Step 1: Make `Workbench` accept file data + handlers**
- Pass `files`, `selectedFilePath`, and CRUD handlers from the project page.

**Step 2: Fix FileTree icon bug**
- Use `FileIcon` (Lucide) instead of the global `File` constructor.

**Step 3: Make editor saves target the correct file**
- Change save handler signature to `(filePath, content)` and clear debounce timers when switching files.

### Task 4: Make typecheck pass in Bun + fix test typing pitfalls

**Files:**
- Modify: `apps/web/tsconfig.json`
- Create: `apps/web/types/bun-test.d.ts`
- Modify: `apps/web/lib/agent/runtime.plan-mode.test.ts`
- Modify: `apps/web/lib/agent/runtime.build-mode.test.ts`

**Step 1: Include `.d.ts` files in TS config**
- Add `"**/*.d.ts"` to `include`.

**Step 2: Add minimal `bun:test` module declarations**
- Declare `describe/it/test/expect`.

**Step 3: Avoid `Extract<>` on non-union stream chunk types**
- Make helper return `StreamChunk` directly.

### Verification

Run:
- `bunx eslint .` (warnings OK; no errors)
- `bun test`
- `bun run typecheck`

