# Panda Workspace Visibility Implementation Plan

Goal: simplify Panda's default workspace UX without removing its advanced
agentic harness capabilities.

Primary objective:

- Keep `live run`, `plan`, and `artifacts` as obvious core user workflow
- Keep `memory bank` and `project evals` available, but move them behind an
  advanced workspace visibility model
- Keep governance, analytics, security, and system operations in admin-only
  surfaces

This plan is a visibility and product-surface refactor, not a harness rewrite.
The existing memory, eval, and run systems remain intact.

## Current State

Panda currently mounts the following project inspector tabs for normal users:

- `run`
- `plan`
- `artifacts`
- `memory`
- `evals`

Relevant files:

- `apps/web/components/projects/ProjectChatInspector.tsx`
- `apps/web/app/(dashboard)/projects/[projectId]/page.tsx`
- `convex/memoryBank.ts`
- `convex/evals.ts`
- `apps/web/app/admin/layout.tsx`
- `convex/admin.ts`

Current behavior:

- `memory bank` is user-facing and project-owner scoped
- `live run` is user-facing and part of normal project chat
- `evals` are user-facing and project-owner scoped
- admin-only gating exists for the admin console and admin settings, not for
  these workspace tabs

## Product Decision

### Core Workspace

These should be visible by default to all normal users:

- `run`
- `plan`
- `artifacts`

### Advanced Workspace

These should remain available, but not be default-visible for all users:

- `memory`
- `evals`
- future deep-inspection tabs such as `snapshots`, `subagents`, or `trace`

### Admin-Only

These should remain outside the project workspace and inside admin surfaces:

- cross-user analytics
- provider operations and global model analytics
- audit logs
- security events
- system settings and rollout controls
- future org-wide eval dashboards

## Architectural Direction

Introduce a centralized visibility model that determines:

1. Whether a feature exists in the product
2. Whether a feature is visible in the current workspace
3. Whether a feature is admin-only
4. Whether a feature should be shown by default or only in advanced mode

This must be centralized so visibility does not drift across components.

## Target UX

### Default User Experience

Workspace inspector tabs:

- `Run`
- `Plan`
- `Artifacts`

Optional access:

- an `Advanced` toggle in workspace settings or user settings
- a `Show advanced tabs` control for users who want memory and evals visible

### Advanced User Experience

Workspace inspector tabs:

- `Run`
- `Plan`
- `Artifacts`
- `Memory`
- `Evals`

### Admin Experience

No change to core project workspace visibility by default. Admins keep access to
their admin console separately.

## Implementation Phases

## Phase 1: Central Visibility Model

Create a shared product visibility module.

New file:

- `apps/web/lib/product/visibility.ts`

Responsibilities:

- define feature IDs
- define visibility tiers
- resolve whether a feature is visible in the current workspace
- provide helpers reusable by workspace and settings UI

Recommended types:

```ts
export type WorkspaceFeatureId =
  | 'run'
  | 'plan'
  | 'artifacts'
  | 'memory'
  | 'evals'

export type WorkspaceComplexity = 'simple' | 'advanced'

export interface WorkspaceVisibilityContext {
  isAdmin: boolean
  workspaceComplexity: WorkspaceComplexity
  featureFlags?: Record<string, boolean>
}

export interface WorkspaceFeatureDefinition {
  id: WorkspaceFeatureId
  label: string
  defaultVisibility: 'core' | 'advanced' | 'admin'
}
```

Add helpers such as:

- `getWorkspaceFeatureDefinitions()`
- `isWorkspaceFeatureVisible(feature, context)`
- `getVisibleWorkspaceTabs(context)`

Rules:

- `run`, `plan`, `artifacts` visible in both `simple` and `advanced`
- `memory`, `evals` visible only in `advanced`
- no admin-only feature should be mounted from project chat

## Phase 2: User Preference for Workspace Complexity

Add a persistent user setting for workspace complexity.

Recommended setting:

- `workspaceComplexity: 'simple' | 'advanced'`

Default:

- `simple`

Files:

- `convex/schema.ts`
- `convex/settings.ts`
- `apps/web/app/(dashboard)/settings/page.tsx`

Behavior:

- Existing users default to `simple` unless explicitly changed
- Future migrations do not delete any memory or eval data
- This is a visibility preference only

Settings UI:

- Add a `Workspace complexity` control under general or advanced settings
- Two options:
  - `Simple`: show core tabs only
  - `Advanced`: show memory and evals in the project workspace

## Phase 3: Refactor Project Inspector to Tab Registry

Refactor the hardcoded tabs in `ProjectChatInspector.tsx` into a registry-driven
model.

Current problem:

- tabs are hardcoded directly in JSX
- feature visibility is implicit
- future gating will become brittle

Refactor target:

- define tab descriptors in one place
- filter descriptors using `visibility.ts`
- render `TabsTrigger` and `TabsContent` from the filtered list

Suggested shape:

```ts
interface ProjectInspectorTabDefinition {
  id: InspectorTab
  label: string
  visibility: 'core' | 'advanced'
  render: () => React.ReactNode
}
```

Files:

- `apps/web/components/projects/ProjectChatInspector.tsx`
- `apps/web/app/(dashboard)/projects/[projectId]/page.tsx`
- optionally `apps/web/components/review/ReviewPanel.tsx` if it should share the
  same tab strategy

Acceptance requirement:

- if a user is on `simple`, `memory` and `evals` tabs are not rendered
- if a user is on `advanced`, all current tabs render

## Phase 4: Wire Visibility Context into Workspace

The project page should resolve a workspace visibility context and pass it into
the inspector.

Files:

- `apps/web/app/(dashboard)/projects/[projectId]/page.tsx`
- `apps/web/hooks/useProjectWorkspaceUi.ts`

Responsibilities:

- read user settings
- read admin state only if needed for future policy decisions
- build a stable `WorkspaceVisibilityContext`
- ensure default selected tab is valid after filtering

Important edge case:

- if a user previously had `memory` selected and switches from `advanced` to
  `simple`, the active tab must fall back to `run` or another visible tab

## Phase 5: Optional Advanced Toggle in Workspace

After persistent settings ship, optionally add a local workspace affordance so
power users can expose advanced tabs without leaving the project.

This can be phase 5 because it is convenience, not architecture.

Possible UI:

- `Show advanced tabs` toggle near inspector header
- writes through to the same `workspaceComplexity` setting

Files:

- `apps/web/components/projects/ProjectChatPanel.tsx`
- `apps/web/components/projects/ProjectChatInspector.tsx`

## Phase 6: Separate Project Evals from Future System Evals

Keep current evals as project-scoped user features.

Do not overload current `EvalPanel` with admin analytics concerns.

Future split:

- `project evals`: user-facing advanced feature
- `system evals`: admin-only dashboard and benchmark tooling

Files for current project eval boundary:

- `convex/evals.ts`
- `apps/web/components/chat/EvalPanel.tsx`

Future admin surfaces should live under:

- `apps/web/app/admin/...`

## Data Model Changes

Update settings schema to persist workspace complexity.

Recommended addition to user settings:

```ts
workspaceComplexity: v.optional(v.union(v.literal('simple'), v.literal('advanced')))
```

No changes needed for:

- `memoryBank` storage
- `evalSuites`
- `evalRuns`
- `evalRunResults`

This is intentionally a UI/policy change, not a data migration of agent
artifacts.

## Backend Policy Position

No immediate backend auth changes are required for phase 1 through phase 4.

Reason:

- `memory bank` is already project-owner gated
- `evals` are already project-owner gated
- admin pages are already admin gated

Recommended follow-up:

- add explicit shared policy helpers for feature capability resolution so UI and
  backend terminology match

Possible future helper files:

- `convex/lib/productPolicy.ts`
- `apps/web/lib/product/visibility.ts`

## File-by-File Implementation Order

### Step 1

Add centralized visibility helpers.

- `apps/web/lib/product/visibility.ts`

### Step 2

Extend settings schema and queries.

- `convex/schema.ts`
- `convex/settings.ts`

### Step 3

Expose workspace complexity in settings UI.

- `apps/web/app/(dashboard)/settings/page.tsx`

### Step 4

Refactor inspector tabs to use a registry and filtered rendering.

- `apps/web/components/projects/ProjectChatInspector.tsx`

### Step 5

Pass user visibility context from project page into inspector.

- `apps/web/app/(dashboard)/projects/[projectId]/page.tsx`

### Step 6

Harden workspace UI state for tab fallback behavior.

- `apps/web/hooks/useProjectWorkspaceUi.ts`

### Step 7

Optionally add an inline workspace toggle for advanced tabs.

- `apps/web/components/projects/ProjectChatPanel.tsx`

## Testing Plan

### Unit Tests

Add tests for visibility resolution.

New test files:

- `apps/web/lib/product/visibility.test.ts`

Test cases:

- `simple` shows `run`, `plan`, `artifacts`
- `advanced` shows `run`, `plan`, `artifacts`, `memory`, `evals`
- unknown feature visibility fails safely

### Component Tests

Update or add tests for inspector rendering.

Files:

- `apps/web/components/review/ReviewPanel.test.tsx`
- `apps/web/components/chat/LiveRunPanel.test.ts`
- new `apps/web/components/projects/ProjectChatInspector.test.tsx`

Test cases:

- simple mode hides `Memory` and `Evals`
- advanced mode shows them
- switching modes falls back to a visible tab

### Settings Tests

Add tests for settings persistence and UI.

Files:

- `apps/web/app/(dashboard)/settings/...`
- `convex/settings.ts` tests if present or new tests if missing

Test cases:

- default workspace complexity is `simple`
- updates persist correctly
- existing settings records remain readable

### Verification Commands

Run before merge:

```bash
bun run typecheck
bun run lint
bun run format:check
bun test
```

Optional browser verification:

```bash
cd apps/web
bun run test:e2e
```

## Acceptance Criteria

- New and existing users see `Run`, `Plan`, and `Artifacts` by default
- `Memory` and `Evals` are hidden in `simple` mode
- `Memory` and `Evals` are visible in `advanced` mode
- Existing memory bank and eval data remain intact and usable
- Admin-only surfaces remain in `/admin`
- No change to project-owner authorization for memory or evals
- Active tab state falls back safely when visibility changes
- No regression in run, plan, or artifact workflows

## Non-Goals

- Rewriting the harness runtime
- Removing memory bank or eval features
- Converting project evals into admin-only tooling
- Reworking admin console IA in this phase
- Building org-tier feature entitlements in this phase

## Recommended Rollout

### Rollout 1

Ship the visibility model and `workspaceComplexity` setting with default
`simple`.

### Rollout 2

Expose advanced toggle in project workspace if needed.

### Rollout 3

Design and ship separate admin/system eval dashboards if product needs broader
benchmarking and operations tooling.

## Final Recommendation

Panda should keep its advanced harness capabilities, but it should not force all
of them into the default workspace surface.

The right product move is:

- preserve capability depth
- reduce default visual complexity
- centralize visibility logic
- separate project workflow from admin governance

That gives Panda a simpler default UX without regressing the architecture that
makes it stronger than mainstream coding-agent products.
