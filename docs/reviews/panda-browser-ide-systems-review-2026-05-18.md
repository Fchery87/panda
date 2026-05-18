# Panda Browser IDE Systems Review — 2026-05-18

## Scope

Reviewed Panda as a browser-based IDE across the project workspace, workbench,
chat panel, file tree, runtime wiring, Convex query shape, WebContainer
configuration, and related tests/configuration.

This review uses the project contracts in `CONTEXT.md`,
`docs/ARCHITECTURE_CONTRACT.md`, `docs/SECURITY_TRUST_BOUNDARIES.md`,
`docs/CONVEX_BACKEND_GOVERNANCE.md`, `docs/WEBCONTAINER_RUNTIME.md`, and
workspace IA plans. It also checks current external browser IDE constraints from
WebContainers and Next.js header/CSP guidance.

External baseline references:

- WebContainers require cross-origin isolation and `SharedArrayBuffer`:
  https://webcontainers.io/guides/configuring-headers
- WebContainer browser support remains Chromium-first, with Firefox/Safari
  caveats: https://webcontainers.io/guides/browser-support
- WebContainer troubleshooting explicitly ties boot failures to COOP/COEP and
  third-party embedding/resource constraints:
  https://webcontainers.io/guides/troubleshooting
- Next.js App Router supports route-scoped response headers via `headers()`:
  https://nextjs.org/docs/app/api-reference/config/next-config-js/headers
- React 19 still expects pure render logic and minimal Effects:
  https://react.dev/reference/rules/components-and-hooks-must-be-pure and
  https://react.dev/learn/you-might-not-need-an-effect
- Convex hot query guidance favors indexes, pagination, bounded `.take(...)`,
  and payloads shaped to caller need:
  https://docs.convex.dev/database/reading-data/indexes and
  https://docs.convex.dev/database/pagination

## Executive finding

Panda is not fundamentally miswired. The main execution path is recognizable and
mostly aligned with the product contract:

1. Project boot loads metadata-shaped project data (`ProjectShellDataLoader`
   uses `api.files.listMetadata` and `api.chats.listRecent`).
2. The desktop shell keeps chat/session timeline central and uses a right work
   tray plus terminal-only bottom drawer.
3. Active chat messages use `listPaginatedLite`, not URL-resolved attachment
   payloads.
4. WebContainer is guarded by cross-origin isolation checks and route-scoped
   COOP/COEP headers for `/projects/:path*`.
5. Runtime writes go through artifact/permission paths rather than immediate
   uncontrolled file mutation.

The highest-risk problem is architectural depth, not one missing wire:
`useAgent` and `WorkspaceRuntimeProvider` own too many seams at once. That makes
the IDE brittle under future changes because routing, prompt construction,
context retrieval, run orchestration, persistence, runtime mounting, and UI
session wiring are spread through very large modules with shallow helper seams.

## Readiness score

**Browser IDE readiness: 76/100**

- **Runtime substrate:** 16/20 — COOP/COEP and `SharedArrayBuffer` guard exist;
  fallback state exists. Remaining risk is observability and browser-specific
  acceptance coverage.
- **Workspace/product contract:** 15/20 — central chat timeline and
  terminal-only dock are aligned. Work tray/mobile naming still drifts from
  canonical docs in type names and persistence migration.
- **File corpus/runtime materialization:** 15/20 — project boot is
  metadata-first and runtime mounts content lazily through `batchGet`. Tool
  directory listing still depends on content-returning `api.files.list` for a
  metadata-only need.
- **Agent/run wiring:** 13/20 — mode routing and permissions are present, but
  `useAgent` is overloaded and hard to reason about safely.
- **Backend/data shape:** 17/20 — bounded hot queries and authz are generally
  present. Some legacy full-content/list queries remain exposed and reusable by
  accident.

## Key evidence

### Workspace shell

- `ProjectWorkspaceLayout` renders mobile destinations `workspace`, `chat`,
  `review`, and `preview`, with the Preview button using
  `mobilePrimaryPanel === 'preview'` and `aria-label="Show runtime preview"`
  (`apps/web/components/projects/ProjectWorkspaceLayout.tsx:338-346`,
  `404-418`).
- Desktop uses the chat panel as the dominant center panel
  (`apps/web/components/projects/ProjectWorkspaceLayout.tsx:519-530`) and a
  right-side work tray when open
  (`apps/web/components/projects/ProjectWorkspaceLayout.tsx:532-560`).
- The bottom dock is terminal-only in the inspected layout
  (`apps/web/components/projects/ProjectWorkspaceLayout.tsx:566-593`).
- `workspaceUiStore` still names the mobile work destination `workspace`, not
  the docs' user-facing `Work`; the right panel type omits a distinct `preview`
  tab even though `RightPanel` has label handling for `preview`
  (`apps/web/stores/workspaceUiStore.ts:6-8`,
  `apps/web/components/panels/RightPanel.tsx:37-51`). This is not breaking
  current UI, but it is terminology drift.

### Chat/session/runtime path

- `WorkspaceRuntimeProvider` passes canonical chat mode and effective policy
  into `useAgent`
  (`apps/web/components/projects/WorkspaceRuntimeProvider.tsx:316-340`).
- `useProjectMessageWorkflow` dispatches to `agent.sendMessage`; `useAgent`
  resolves mode routing with `manualModeOverride` support before run
  orchestration (`apps/web/hooks/useAgent.ts:707-718`).
- Prompt building, context indexing/search, runtime config, permission rules,
  checkpoint store, run lifecycle, Convex persistence, and WebContainer
  availability are all in one hook path (`apps/web/hooks/useAgent.ts:864-983`).
  This is the clearest shallow-module candidate.

### File tree and runtime file corpus

- Project boot loads file metadata only
  (`apps/web/components/projects/ProjectShellDataLoader.tsx:17-21`).
- The left file tree maps only `_id`, `path`, `isBinary`, and `updatedAt`; it
  does not require content
  (`apps/web/components/projects/ProjectWorkspaceLayout.tsx:279-292`).
- Opening a selected file uses `api.files.getByPath`, and WebContainer mounting
  batch-loads content only after the browser runtime is ready
  (`apps/web/components/projects/WorkspaceRuntimeProvider.tsx:441-558`).
- `fs-sync` explicitly skips binary and null-content records before mounting
  (`apps/web/lib/webcontainer/fs-sync.ts:15-20`).
- The agent `listDirectory` tool still calls `api.files.list`, which returns
  full file documents including content, even though it only needs paths
  (`apps/web/lib/agent/tools.ts:563-571`, `convex/files.ts:7-16`). This is
  avoidable read amplification.

### Browser runtime and headers

- `next.config.ts` applies WebContainer security headers only to
  `/projects/:path*`, including COEP `credentialless` and COOP `same-origin`
  (`apps/web/next.config.ts:167-177`, `117-120`).
- `WebcontainerProvider` refuses to boot unless `SharedArrayBuffer` exists and
  `window.crossOriginIsolated` is true
  (`apps/web/lib/webcontainer/WebcontainerProvider.tsx:22-24`, `62-66`).
- Boot uses `WebContainer.boot({ coep: 'credentialless' })`, matching the route
  header value (`apps/web/lib/webcontainer/WebcontainerProvider.tsx:45-46`).
- Boot logging still uses direct `console.log` for import/config/boot success
  (`apps/web/lib/webcontainer/WebcontainerProvider.tsx:36-46`, `74-75`). For a
  high-reliability IDE, this should move behind the project logger/telemetry so
  fallback causes are inspectable without console noise.

### Convex hot query shape

- Active messages use `api.messages.listPaginatedLite` with
  `initialNumItems: 50` (`apps/web/hooks/useWorkbenchChatState.ts:88-92`).
- `listPaginatedLite` returns attachment metadata only and defers URL resolution
  to `getAttachmentUrl` (`convex/messages.ts:116-166`).
- `messages.list` and `messages.listPaginated` still resolve signed URLs for
  every attachment in the result (`convex/messages.ts:54-80`, `82-114`). These
  are acceptable as legacy/private paths only if callers stay off hot UI
  surfaces.

## Findings and recommended fixes

### P0 — none found in the inspected path

No inspected issue appears to make the browser IDE wholly unusable on its own.
The fresh gates show the current dirty tree compiles/lints/formats and unit
tests pass after one test-contract repair.

### P1 — `useAgent` is a load-bearing shallow module

**Files:** `apps/web/hooks/useAgent.ts`,
`apps/web/lib/agent/session-controller.ts`, `apps/web/lib/agent/runtime.ts`,
`apps/web/lib/agent/tools.ts`,
`apps/web/components/projects/WorkspaceRuntimeProvider.tsx`

**Problem:** `useAgent` exposes a wide interface and owns too many
implementation concerns: send state, mode routing, prompt history filtering,
context indexing/search, prompt bundle construction, run lifecycle, checkpoint
persistence, runtime adapter creation, permission audit, artifacts, receipts,
and variant generation. A maintainer changing one part has to reason about most
of the browser IDE execution model.

**Solution:** Deepen the `Run Orchestration` module behind a narrow interface,
for example `startWorkspaceRun(input): AsyncIterable<RunEvent>`. Keep React
state in hooks, but move run construction and lifecycle transitions into a
non-React module with explicit inputs and outputs.

**Benefits:**

- **Locality:** bugs in run creation, context pack assembly, and terminal
  receipt generation live in one module instead of a React hook.
- **Leverage:** UI callers can start/stop/resume runs without knowing
  prompt/routing/checkpoint details.
- **Test surface:** tests can exercise run orchestration without rendering hooks
  or mocking UI stores.

### P1 — Directory listing uses full file content payloads

**Files:** `apps/web/lib/agent/tools.ts`, `convex/files.ts`

**Problem:** `listDirectory` calls `api.files.list`, which returns
content-bearing file docs, then only uses `path`. This violates the Convex
bandwidth contract and creates an attractive nuisance because `files.list`
remains easy to use in future hot paths.

**Solution:** Add a metadata/path-only backend query for tool directory listing
or reuse `listMetadata` with a narrow return type, then wire `createToolContext`
to that query. Keep `files.list` only for explicitly cold operations such as
download/export, or rename it to make content cost obvious.

**Benefits:**

- **Locality:** file listing cost is constrained at the file-corpus seam.
- **Leverage:** all agent tools get safe directory listing without knowing
  Convex payload rules.
- **Test surface:** existing bandwidth guard tests can assert tool directory
  listing does not access `api.files.list`.

### P1 — Workspace vocabulary drifts from canonical Work/Proof/Changes/Context/Preview contract

**Files:** `apps/web/stores/workspaceUiStore.ts`,
`apps/web/components/panels/RightPanel.tsx`,
`apps/web/components/projects/ProjectWorkspaceLayout.tsx`,
`docs/ARCHITECTURE_CONTRACT.md`,
`docs/plans/2026-04-26-chat-first-workspace-ia.md`

**Problem:** The UI mostly presents the right user-facing concepts, but internal
state still uses `run` for Proof and `workspace` for mobile Work. `RightPanel`
knows how to label `preview`, but the `RightPanelTab` type excludes it. These
are not immediate runtime failures; they are future wiring hazards.

**Solution:** Normalize state names to product terms at the seam:
`work | proof | changes | context | preview` for the work tray and
`work | chat | proof | preview` for mobile. Migrate persisted Zustand state from
legacy names.

**Benefits:**

- **Locality:** workspace navigation semantics live in the store instead of
  scattered label mappings.
- **Leverage:** new panels can wire to canonical destinations without
  translation tables.
- **Test surface:** source-contract tests can assert canonical tab unions and
  persisted migrations.

### P2 — WebContainer fallback exists, but runtime health is not observable enough

**Files:** `apps/web/lib/webcontainer/WebcontainerProvider.tsx`,
`apps/web/lib/webcontainer/boot.ts`,
`apps/web/components/projects/WorkspaceRuntimeProvider.tsx`,
`apps/web/lib/workspace/runtime-availability.ts`

**Problem:** Browser runtime support is checked correctly, but the failure path
mostly becomes status/error state plus console warnings. For real browser IDE
support, COI/header/provider failures need structured, user-visible diagnosis
and test coverage across supported/unsupported states.

**Solution:** Replace direct console boot logs with structured app logging and a
small runtime-health event model: unsupported due to COI, disabled by env, boot
timeout, boot exception, ready. Render that reason in the status bar and runtime
controls.

**Benefits:**

- **Locality:** runtime diagnosis lives at the WebContainer seam.
- **Leverage:** UI and support workflows get consistent failure reasons.
- **Test surface:** unit tests can verify each availability state without real
  browser boot.

### P2 — Local workspace import is safe-first, but not yet a complete IDE workspace model

**Files:** `apps/web/app/api/local-workspace/files/route.ts`,
`apps/web/components/workbench/FileTree.tsx`

**Problem:** The local import API is authenticated, gated, bounded, ignores
dangerous/generated directories, and prevents path escape. It is a read/import
snapshot, not a bidirectional workspace bridge. That is fine, but the UI should
not imply full local IDE synchronization.

**Solution:** Keep this as “Import local snapshot” unless/until there is an
explicit local workspace adapter with writeback, deletion semantics, conflict
handling, and trust prompts.

**Benefits:**

- **Locality:** local-disk trust rules stay in the local workspace adapter.
- **Leverage:** future desktop/local bridge work has a clear seam.
- **Test surface:** route tests can focus on auth, bounds, ignore behavior,
  truncation, and path escape.

## Deepening candidates

1. **Run Orchestration module** — highest leverage. Move non-React execution
   construction out of `useAgent`.
2. **File Corpus module** — unify metadata, content loading, runtime mount,
   directory listing, and local import behind one file-corpus interface.
3. **Workspace Navigation module** — canonicalize
   Work/Proof/Changes/Context/Preview and mobile Work/Chat/Proof/Preview at the
   state seam.
4. **Runtime Availability module** — turn browser/server fallback into a typed,
   observable adapter rather than scattered status strings.
5. **Chat Transcript module** — make hot transcript paging, attachment metadata,
   lazy URL resolution, and prompt history snapshots a single interface.

Recommended first cut: **File Corpus module**, because it has a concrete
performance defect (`listDirectory` using full-content `files.list`) and a
bounded testable acceptance surface.

## Verification performed

Commands run from the repository root on 2026-05-18:

- `bun run typecheck` — passed; Turbo reported 2 successful tasks.
- `bun run lint` — passed; ESLint task succeeded.
- `bun run format:check` — passed; Prettier reported all matched files use
  Prettier style.
- `bun test apps/web/components/chat/chat-input-wiring.test.ts` — passed; 5
  tests, 32 assertions.
- `bun test` — passed after repairing the stale ChatInput source-contract
  assertion; 1216 tests, 3610 assertions.

One repair was applied during review:

- `apps/web/components/chat/chat-input-wiring.test.ts` now asserts the current
  send-disable condition `disabled={!hasSendContent || workspaceLoading}`. The
  component already had the safer behavior; the test still expected the older
  string.
