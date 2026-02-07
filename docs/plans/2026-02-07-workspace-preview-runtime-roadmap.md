# Workspace Preview Runtime Roadmap (In-Browser)

## Summary

Current workspace preview UI is present but not functionally wired to a runtime
URL. The `Preview` component only renders an iframe when `url` is provided, and
`Workbench` currently mounts `<Preview />` without that prop.

This plan defines a safe rollout to make preview functional with an in-browser
runtime model, starting with static + Vite support and adding Next.js in a later
phase.

## Current-State Findings

1. Preview tab exists and toggles correctly in
   `apps/web/components/workbench/Workbench.tsx`.
2. `Preview` supports iframe/device controls but requires `url`
   (`apps/web/components/workbench/Preview.tsx`).
3. No preview runtime state exists in project page/container
   (`apps/web/app/(dashboard)/projects/[projectId]/page.tsx`).
4. Terminal execution is short-lived and timeout-based via `/api/jobs/execute`,
   so it is not a persistent preview runtime.
5. No schema fields or store bindings currently track preview URL/runtime
   lifecycle.

## Product Decisions Locked

1. Preview model: **in-browser runtime**.
2. Phase 1 support: **static + Vite-first**.
3. Startup behavior: **auto-start on opening Preview tab**.
4. Next.js support: **Phase 2**, with compatibility checks and fallback UI.
5. Scope now: **save plan only, no implementation in this step**.

## Why "Open localhost" Alone Is Not Enough

In web deployments, `http://localhost:*` resolves on the end user's own machine.
A reliable workspace preview requires a runtime in the same browser context (or
a public proxy URL). This roadmap uses browser-hosted runtime URLs as the source
of truth.

## Public Interface / Contract Changes

### `PreviewProps` (apps/web/components/workbench/Preview.tsx)

Add:

1. `status: 'idle' | 'booting' | 'installing' | 'starting' | 'ready' | 'error'`
2. `url?: string`
3. `logs?: string[]`
4. `error?: string`
5. `onRetry?: () => void`

### `WorkbenchProps` (apps/web/components/workbench/Workbench.tsx)

Add:

1. `previewState` object from page-level runtime hook
2. `onOpenPreviewTab` callback to trigger lazy runtime boot

### New Hook

`apps/web/hooks/usePreviewRuntime.ts`:

1. Boot runtime lazily on first preview open.
2. Mount project files.
3. Detect supported project type (static/vite).
4. Install/start process and capture logs.
5. Expose runtime URL + status transitions.
6. Support retry and teardown on unmount.

### New Runtime Utility

`apps/web/lib/preview/runtime.ts`:

1. Runtime API wrapper.
2. Framework detection and command presets.
3. URL/port discovery helper functions.

## Implementation Plan (Decision Complete)

## Phase 1 - Functional Preview for Static + Vite

1. Add preview runtime state to `project/[projectId]/page.tsx`.
2. Thread runtime state + actions into `Workbench`.
3. Trigger auto-start when tab switches to Preview.
4. Implement runtime manager and boot lifecycle.
5. Mount Convex file list into runtime filesystem.
6. Detect and run:
   - static: serve files
   - vite: install + run dev server
7. Bind runtime URL to `Preview` iframe.
8. Show lifecycle states and logs in preview UI.
9. Add clear unsupported message for non-phase-1 frameworks.

## Phase 2 - Next.js Compatibility

1. Add Next.js detector and compatibility matrix (version/features).
2. Implement Next.js startup profile in runtime manager.
3. Add feature guards for unsupported capabilities.
4. Provide fallback guidance when runtime cannot start Next.js.
5. Expand tests with Next.js fixtures.

## Framework Support Matrix

### Phase 1 (supported)

1. Static HTML/CSS/JS projects.
2. Vite-based projects:
   - React + Vite
   - Vue + Vite
   - Svelte + Vite
   - Preact/Solid/Lit where Vite setup is valid

### Phase 2 (targeted)

1. Next.js

### Not in early scope (unless explicitly added)

1. CRA
2. Remix
3. Nuxt
4. Astro

## Testing Plan

### Unit

1. Runtime state transitions (`idle -> booting -> ... -> ready/error`).
2. Framework detection accuracy.
3. Retry and teardown behavior.

### Component

1. `Preview` renders correct UI per status.
2. Iframe renders only in `ready` with valid URL.
3. Error state shows actionable retry.

### Integration

1. Preview tab auto-starts exactly once per session.
2. Switching tabs does not reset active runtime unintentionally.

### E2E

1. Static fixture project renders in preview.
2. Vite fixture project renders in preview.
3. Unsupported framework shows fallback state.
4. Next.js scenario reserved for Phase 2 suite.

## Acceptance Criteria

1. Opening Preview auto-starts runtime for supported projects.
2. Supported projects render in iframe without manual terminal steps.
3. Runtime errors are visible and recoverable via retry.
4. Terminal jobs remain separate from preview runtime.
5. Existing code/editor/chat workflows are unaffected.

## Assumptions and Defaults

1. Runtime sessions are ephemeral per page session.
2. Default package manager in runtime is npm.
3. Phase 1 intentionally excludes Next.js until compatibility work is complete.
4. No persistence/multi-user sharing of runtime process in Phase 1.

## Risks and Mitigations

1. Risk: runtime boot/install latency.
   - Mitigation: explicit loading states + incremental logs.
2. Risk: unsupported project types confuse users.
   - Mitigation: deterministic detection + clear fallback messaging.
3. Risk: resource leaks from orphaned processes.
   - Mitigation: teardown on unmount and retry path with cleanup.
