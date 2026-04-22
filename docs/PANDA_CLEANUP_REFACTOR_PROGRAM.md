# Panda Cleanup & Refactor Program

> Status: proposed Date: 2026-04-21 Goal: aggressively simplify Panda without
> rewriting it, using structured planning sessions as the sole planning source
> of truth and specifications as optional execution-time verification artifacts.

## Executive decision

Panda should not be scrapped.

The codebase has meaningful architectural debt, but the dominant issues are
overlap, duplication, and unresolved transitions between generations of systems
— not a missing foundation. The cleanup program should therefore optimize for
deletion, consolidation, migration, and boundary repair rather than replacement.

This program assumes the following product workflow is canonical:

1. Direct the AI
2. Review its plan
3. Approve the plan
4. Watch execution happen
5. Inspect what changed

To support that workflow, Panda should converge on:

- Structured planning sessions as the only planning system
- Specifications as optional verification artifacts during execution, not as a
  second planning system
- One mode model
- One agent registry
- One runtime responsibility boundary
- Prove-or-delete handling for suspected dead systems

## Guiding principles

### 1. Delete before redesigning

If two systems do the same job, keep one and remove the other.

### 2. Migrate aggressively

Backward compatibility is not a product goal here. Persisted legacy data should
be normalized or migrated, then old branches removed.

### 3. One source of truth per concern

Every core concern must have a single canonical owner:

- Planning: `planningSessions`
- Execution: harness runtime + `agentRuns` / `agentRunEvents`
- Verification: `specifications` only when explicitly used for execution
  verification
- Mode selection: 4-mode runtime model
- Agent definitions: harness agent registry

### 4. Prove-or-delete

If a table, component, helper, or abstraction cannot be tied to active runtime
behavior, it should be marked for removal and deleted in a dedicated phase.

### 5. Ship in narrow, verifiable phases

Each phase must leave the repository in a working state and pass validation
before the next begins.

## What is actually wrong

## A. Duplicate agent definition systems

There are currently two agent registries:

- `apps/web/lib/agents/registry.ts`
- `apps/web/lib/agent/harness/agents.ts`

The harness registry is the active system. The older registry appears to be
legacy configuration debt and creates ambiguity about canonical agent
definitions and permission models.

### Program decision

Keep the harness registry. Remove the legacy registry and any compatibility
references.

## B. Two mode models coexist

The runtime uses a 4-mode model:

- `ask`
- `plan`
- `code`
- `build`

But Convex schema still accepts legacy modes:

- `architect`
- `discuss`
- `debug`
- `review`

This forces normalization logic into prompt/runtime layers and keeps old
branches alive.

### Program decision

Migrate all persisted chat modes to the 4-mode model, then remove legacy modes
from schema and runtime normalization helpers.

## C. Planning exists in two systems at once

Planning is currently split across:

- legacy chat-level plan fields on `chats` (`planDraft`, `planStatus`, etc.)
- structured planning state in `planningSessions`

Worse, the structured planning system mirrors back into legacy chat fields, so
both systems remain active.

### Program decision

`planningSessions` becomes the only planning system.

The `chats.plan*` fields should be treated as migration scaffolding, then
removed after the UI, hooks, and run pipeline stop depending on them.

## D. Specifications are at risk of becoming a second planning system

Specifications are valuable if they verify execution quality or capture
constraints during implementation. They are harmful if they compete with the
planning session as another approval surface.

### Program decision

Keep specifications, but narrow their role:

- optional
- execution-time only
- verification-focused
- never the primary planning artifact

## E. The workspace runtime boundary is too broad

`WorkspaceRuntimeContext` currently mixes:

- stable project identity
- active chat state
- planning state
- verification state
- shell UI state
- many callbacks

This makes ownership unclear and keeps old systems alive because everything is
wired through one oversized surface.

### Program decision

Split context boundaries by responsibility and move pure UI state fully into
store-driven state.

## F. `useAgent` and the runtime adapter are too large

The core agent execution path is spread across a very large hook and a
compatibility-heavy adapter. This makes it difficult to reason about failures in
plan approval, execution transitions, progress updates, and persistence.

### Program decision

Decompose behavior by concern while keeping the existing runtime foundation.

## G. There are likely dead systems in schema and UI

The following items were targeted for a prove-or-delete audit:

- `agentSessions`
- `messageParts`
- `permissionRequests`
- `gitSnapshots`
- legacy review surfaces and compatibility exports
- any delivery or QA abstractions not tied to live behavior

### Program decision

Require evidence of runtime use. If none exists, delete them in a dedicated
removal phase.

### Current audit result

The four first-candidate tables above are no longer present in
`convex/schema.ts` and have no runtime references under `apps/web` or `convex`.
Remaining cleanup is documentation-only unless new references are introduced.

## Target architecture

At the end of this program, Panda should have the following structure:

### Planning

- User enters Plan mode
- Planning intake runs through `planningSessions`
- A generated plan artifact is reviewed and approved from `planningSessions`
- Build/execution starts from the approved planning session artifact
- No planning state is mirrored into `chats`

### Execution

- The harness runtime remains the execution engine
- `agentRuns` and `agentRunEvents` remain the canonical persisted run timeline
- Runtime adapter only translates data and events; policy/rewrite behavior lives
  in explicit middleware or orchestration layers

### Verification

- Specifications are created only when execution requests verification or
  contract enforcement
- Specifications attach to planning sessions or runs as verification evidence,
  not as competing plan state

### UI state

- Project identity and stable workspace data live in focused project/runtime
  contexts
- Chat and run state live in agent/runtime-specific context or hooks
- Presentation-only shell state lives in Zustand stores

## Program phases

## Phase 0 — Baseline and deletion inventory

### Objective

Establish exactly what is alive, what is duplicated, and what is removable
before deleting anything.

### Deliverables

- A canonical inventory of duplicated systems
- A prove-or-delete matrix for suspicious tables, components, hooks, and
  utilities
- A dependency map for legacy plan draft usage

### Tasks

1. Inventory all imports and runtime references to:
   - `apps/web/lib/agents/registry.ts`
   - `normalizeChatMode()` and `mapLegacyMode()`
   - `planDraft` / `planStatus` / other `chats.plan*` fields
   - `agentSessions`, `messageParts`, `permissionRequests`, `gitSnapshots`
     (docs-only after audit)
2. Mark each item as one of:
   - canonical
   - migration-only
   - suspected dead
   - delete now
3. Produce a cut list for Phase 1.

### Exit criteria

- No ambiguous ownership remains for planning, modes, or agent definition
  systems
- Every suspected dead system has either evidence of use or a deletion
  recommendation

## Phase 1 — Dead code and duplicate registry removal

### Objective

Remove obviously redundant systems that do not need migration logic.

### Planned deletions

- legacy agent registry in `apps/web/lib/agents/registry.ts`
- compatibility-only exports that only rename active components without adding
  behavior
- clearly dead review or mode compatibility surfaces that are not part of live
  routing

### Tasks

1. Remove the legacy registry and redirect any surviving imports
2. Remove mode compatibility wrappers that only re-export active components
3. Audit review-related components and keep only surfaces tied to current
   product behavior
4. Re-run typecheck/lint/tests and confirm no hidden dependencies remain

### Risks

- Hidden import paths
- Tests or eval fixtures referencing legacy names

### Exit criteria

- One agent registry remains
- No production code depends on the deleted registry or compatibility exports

## Phase 2 — Mode consolidation and data migration

### Objective

Make the 4-mode model the only mode model in Panda.

### Canonical modes

- `ask`
- `plan`
- `code`
- `build`

### Migration mapping

- `architect` -> `plan`
- `discuss` -> `plan`
- `debug` -> `code`
- `review` -> `ask`

### Tasks

1. Write a Convex migration to normalize all persisted chat modes
2. Update schema to remove legacy mode literals
3. Remove normalization helpers after migration lands
4. Update tests, fixtures, and selectors so they only use the 4 canonical modes
5. Verify that all mode UIs, prompt builders, and runtime paths accept only the
   canonical set

### Risks

- Old seeded data or e2e fixtures may depend on legacy values
- Prompt tests may implicitly assert old normalization behavior

### Exit criteria

- Schema, UI, runtime, and test fixtures all agree on exactly 4 modes
- No runtime normalization of legacy modes remains

## Phase 3 — Planning pipeline unification

### Objective

Make `planningSessions` the only planning system.

### What changes

- `planningSessions` stays
- `chats.plan*` becomes migration-only, then removed
- plan approval/build actions read from structured plan artifacts only

### Tasks

1. Identify every consumer of legacy chat-level plan fields
2. Refactor UI surfaces to consume planning session state directly
3. Stop mirroring generated plans into `chats.planDraft`
4. Stop using `canApprovePlan()` / `canBuildFromPlan()` as fallback gates for
   legacy plan fields
5. Route build-from-plan exclusively from approved structured plan artifacts
6. Remove legacy plan autosave logic that persists chat-level draft state
7. Add migration for any user-visible approved plan state that must survive
   transition
8. Remove `chats.plan*` fields from schema once all consumers are gone

### Files likely involved

- `convex/planningSessions.ts`
- `convex/chats.ts`
- `convex/schema.ts`
- `apps/web/hooks/useProjectPlanDraft.ts`
- `apps/web/lib/chat/planDraft.ts`
- `apps/web/components/projects/WorkspaceRuntimeProvider.tsx`
- `apps/web/components/projects/ProjectChatPanel.tsx`
- `apps/web/components/chat/ChatActionBar.tsx`
- `apps/web/components/chat/RunProgressPanel.tsx`

### Risks

- This is the highest product-risk phase because plan review and build entry are
  central to Panda
- Existing tests may assert legacy mirrored state
- Run progress UI may still parse legacy draft strings

### Exit criteria

- Planning approval and build transitions work solely from `planningSessions`
- No chat-level plan fields are used by runtime or UI
- The core workflow remains intact: direct -> review plan -> approve -> execute
  -> inspect

## Phase 4 — Scope specifications to verification only

### Objective

Keep specs, but prevent them from acting as a second planning pipeline.

### Rules

- A planning session produces the plan
- A spec may be generated later to verify or constrain execution
- A spec never replaces plan approval

### Tasks

1. Audit all entry points that create or attach specs
2. Remove any UX copy or state that implies specs are a required planning
   artifact
3. Attach specs to execution or verification moments only
4. Ensure run progress and inspectors present specs as verification context, not
   plan ownership
5. Update tests to reflect the narrowed responsibility

### Exit criteria

- Specs remain available where useful
- The product has exactly one planning surface

## Phase 5 — Runtime boundary cleanup

### Objective

Reduce the amount of policy and post-processing embedded in the runtime adapter.

### Tasks

1. Identify behavior in `apps/web/lib/agent/runtime.ts` that is not simple
   adaptation
2. Extract plan/build rewrite handling into explicit middleware or orchestration
   helpers
3. Keep the adapter focused on:
   - message conversion
   - event conversion
   - harness invocation
4. Add focused tests for extracted middleware behavior

### Exit criteria

- Runtime adapter is materially smaller and easier to reason about
- Rewrite behavior is explicit and separately testable

## Phase 6 — Context and state boundary cleanup

### Objective

Break the workspace god-object into focused ownership zones.

### Suggested split

#### `ProjectWorkspaceContext`

Owns:

- project identity
- stable file metadata
- navigation helpers
- workspace-level capabilities

#### `AgentRuntimeContext`

Owns:

- chat messages
- run events
- progress state
- current execution state
- verification state

#### Zustand stores

Own:

- panel visibility
- shortcuts/help/composer toggles
- selected tabs
- mobile shell layout

### Tasks

1. Audit every field in `WorkspaceRuntimeContext`
2. Group fields by ownership and change frequency
3. Move pure UI state fully into stores
4. Reduce callback surface exposed from the runtime provider
5. Update consumers incrementally and delete old context shape after migration

### Exit criteria

- Contexts have narrow purpose
- Shell UI state is not mixed with execution state
- New contributors can locate ownership quickly

## Phase 7 — Hook decomposition and test hardening

### Objective

Make the execution path maintainable after architectural cleanup.

### Tasks

1. Split `useAgent` into smaller concerns such as:
   - stream handling
   - run persistence
   - progress derivation
   - spec lifecycle
   - variant orchestration
2. Keep one thin orchestrator hook at the top
3. Add focused tests around phase transitions:
   - plan generation
   - plan approval
   - build from approved plan
   - run progress reconciliation
   - optional spec verification
4. Remove tests that only validate legacy compatibility behavior

### Exit criteria

- `useAgent` is no longer the primary place where every runtime concern
  accumulates
- Critical workflow transitions are covered by focused tests

## Phase 8 — Prove-or-delete schema cleanup

### Objective

Remove suspicious persistence systems that are not actually part of live Panda
behavior.

### First candidates

- `agentSessions` - removed from schema; no runtime references found
- `messageParts` - removed from schema; no runtime references found
- `permissionRequests` - removed from schema; no runtime references found
- `gitSnapshots` - removed from schema; no runtime references found

### Prove-or-delete checklist

A system may remain only if at least one of the following is demonstrated:

- active mutation/query usage from the app
- active runtime write path
- active read path used by user-facing UI
- required migration bridge with a defined removal date

If none apply, delete it.

### Tasks

1. Trace all query/mutation/write paths for each candidate table
2. If no path exists, remove:
   - schema entries
   - indexes
   - generated references
   - tests/fixtures
   - dead helper types
3. Validate Convex codegen and test surfaces after each removal batch

### Exit criteria

- Schema contains only live product concepts or explicit near-term migration
  scaffolding

## Workstream order

Recommended implementation order:

1. Phase 0 baseline
2. Phase 1 duplicate/dead registry removal
3. Phase 2 mode consolidation
4. Phase 3 planning unification
5. Phase 4 spec scoping
6. Phase 5 runtime boundary cleanup
7. Phase 6 context cleanup
8. Phase 7 hook decomposition
9. Phase 8 schema deletion pass

This order minimizes risk because it removes clear duplication early, then
resolves the planning core before deeper runtime cleanup.

## Validation protocol

Every phase must pass:

```bash
bun run typecheck && bun run lint && bun run format:check && bun test
```

For phases touching workspace flow, also run:

```bash
bun run test:e2e
bun run build
```

Minimum manual product verification after planning-related changes:

1. Open project workspace
2. Create or open chat
3. Enter Plan mode
4. Complete planning intake
5. Review generated plan
6. Approve plan
7. Start execution from approved plan
8. Confirm run progress appears correctly
9. Inspect resulting changes/artifacts

## Success metrics

The program is successful when:

- There is exactly one agent registry
- There is exactly one mode model
- There is exactly one planning system
- Specifications are optional verification artifacts only
- No chat-level legacy plan state remains
- Runtime adapter responsibilities are narrow
- Workspace context boundaries are clear
- Suspected dead systems are either proven alive or removed
- The product workflow feels linear and comprehensible again

## Non-goals

This program does not aim to:

- rewrite the harness runtime
- redesign the entire UI from scratch
- preserve every historical compatibility branch
- introduce new delivery abstractions while old ones still exist

## Recommended first execution slice

The first implementation slice should be:

1. Phase 0 inventory
2. Phase 1 duplicate registry removal
3. Phase 2 mode migration

That slice is the best signal test. If Panda becomes easier to reason about
without destabilizing behavior, continue directly into planning unification. If
unexpected coupling appears, pause and tighten migration sequencing rather than
expanding scope.

## Final recommendation

Panda should be treated as a consolidation project, not a rewrite project.

The biggest win is not adding more architecture. It is removing competing
architecture until the product once again reflects its intended workflow with
one clear path from request to plan to approval to execution to inspection.
