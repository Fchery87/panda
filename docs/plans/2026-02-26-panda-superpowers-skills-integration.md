# Panda Superpowers-Style Skills Integration Implementation Plan

> Historical implementation plan. Keep this as reference for the skills
> integration effort, not as the live project status document.

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Add a Panda-native skills/workflow layer inspired by Superpowers that
improves reliability (planning, debugging, verification, review) without
degrading Panda's fast default UX.

**Architecture:** Implement skills as a harness plugin plus registry/matcher
modules, not as a hardcoded prompt blob. Start with soft guidance +
traceability, then add optional strict enforcement profiles and curated workflow
skills (debugging, verification, planning, review, parallel delegation).

**Tech Stack:** Next.js/React (UI trace), Panda agent harness (`runtime`,
`plugins`, `types`, `agents`), Convex (`agentRuns`, schema), TypeScript tests.

## Scope and Non-Goals

### In Scope

- Panda-native skill manifest format + registry
- Skill applicability matching (task/mode/tool-context based)
- Skill invocation tracing in run timeline
- Soft vs strict workflow profiles
- Curated Panda workflow skills modeled after Superpowers patterns
- Rollout with feature flags and evals

### Out of Scope (Phase 1)

- Full external Superpowers runtime compatibility
- Auto-syncing remote skill repos in production
- Mandatory workflow enforcement for all users by default
- Git worktree/PR automation UX

## Recommended Approach (why this path)

### Option A (Recommended): Panda-Native Skills Engine + Curated Ports

- Build a first-class skills system in Panda using existing harness plugin
  hooks.
- Port the highest-value Superpowers ideas as Panda-authored skills/templates.
- Add an importer later for external skill packs if needed.

Pros:

- Fits Panda's current agent modes and UI
- Safer rollout (soft mode first)
- Strong observability (trace + analytics)
- No fragile dependency on external repo conventions

Cons:

- More upfront implementation than simple prompt copy

### Option B: Prompt-Only Superpowers Emulation

- Inject large prompt instructions into Architect/Build modes.

Pros:

- Fastest to prototype

Cons:

- Hard to audit, test, or evolve
- No per-skill telemetry
- Poor UX control and harder rollback

### Option C: External Skill Runner Adapter First

- Try to execute external `SKILL.md` files directly from day 1.

Pros:

- Maximum ecosystem compatibility

Cons:

- Higher parsing/execution ambiguity
- More security/policy work early
- Delays core value delivery

## Product Decisions (default)

- Default profile: `soft_guidance`
- Optional profile: `strict_workflow` (power users / team setting)
- Initial curated skills:
  - `brainstorming-lite` (Panda architect mode compatible)
  - `writing-plans`
  - `systematic-debugging`
  - `verification-before-completion`
  - `requesting-code-review`
  - `dispatching-parallel-agents`
- First execution surface: harness plugin + run progress timeline badges/events

## Phase Roadmap

### Phase 0: Design and Contracts (1-2 days)

**Objective:** Define stable skill types and runtime insertion points before
implementation.

**Files:**

- Modify: `apps/web/lib/agent/harness/types.ts`
- Modify: `apps/web/lib/agent/harness/plugins.ts`
- Modify: `apps/web/lib/agent/harness/agents.ts`
- Modify: `apps/web/lib/agent/prompt-library.ts`
- Create: `apps/web/lib/agent/harness/skills/types.ts`
- Create: `apps/web/lib/agent/harness/skills/README.md`
- Test: `apps/web/lib/agent/harness/*.test.ts` (new tests added in later phases)

**Deliverables:**

- `SkillDefinition` / `SkillMatchResult` / `SkillInvocationRecord` types
- Workflow profile model (`off | soft_guidance | strict_workflow`)
- Clear hook contract: where skills can read/modify prompts, tool calls, and
  status events

**Acceptance criteria:**

- Type definitions compile
- No behavior change yet
- All existing harness tests still pass

### Phase 1: Skill Registry + Matcher (2-3 days)

**Objective:** Load Panda skills and decide applicability per turn/run.

**Files:**

- Create: `apps/web/lib/agent/harness/skills/registry.ts`
- Create: `apps/web/lib/agent/harness/skills/matcher.ts`
- Create:
  `apps/web/lib/agent/harness/skills/catalog/panda-brainstorming-lite.ts`
- Create: `apps/web/lib/agent/harness/skills/catalog/panda-writing-plans.ts`
- Create:
  `apps/web/lib/agent/harness/skills/catalog/panda-systematic-debugging.ts`
- Create: `apps/web/lib/agent/harness/skills/catalog/index.ts`
- Modify: `apps/web/lib/agent/harness/index.ts`
- Test: `apps/web/lib/agent/harness/skills/registry.test.ts`
- Test: `apps/web/lib/agent/harness/skills/matcher.test.ts`

**Behavior:**

- Registry exposes built-in Panda skills (metadata + applicability + policy
  tags)
- Matcher evaluates:
  - user intent (question vs build vs debug vs plan)
  - agent mode (`ask`, `architect`, `code`, `build`)
  - recent run state (e.g. failures observed)
  - tool risk / upcoming tool categories (optional later)

**Acceptance criteria:**

- Deterministic matching for representative prompts
- Mode-sensitive results (e.g. no strict planning in `ask`)
- Test coverage for false positives and false negatives

### Phase 2: Skills Plugin (Prompt/Workflow Injection) (2-4 days)

**Objective:** Apply matched skills to runs using harness hooks with soft/strict
policy.

**Files:**

- Create: `apps/web/lib/agent/harness/skills/plugin.ts`
- Create: `apps/web/lib/agent/harness/skills/context.ts`
- Create: `apps/web/lib/agent/harness/skills/policy.ts`
- Modify: `apps/web/lib/agent/harness/runtime.ts`
- Modify: `apps/web/lib/agent/harness/plugins.ts`
- Modify: `apps/web/lib/agent/runtime.ts` (adapter path that bridges app runtime
  to harness events)
- Test: `apps/web/lib/agent/harness/runtime.test.ts`
- Test: `apps/web/lib/agent/runtime.harness-adapter.test.ts`

**Behavior:**

- On run start / step start, plugin computes applicable skills
- Soft mode:
  - injects concise guidance markers/instructions
  - emits trace events (no hard blocking)
- Strict mode:
  - can require a phase transition before certain actions (e.g. plan before
    write)
  - can trigger structured user question flow when ambiguity is high
- Ensure skills do not spam repeated instructions each step

**Acceptance criteria:**

- Existing workflows remain usable with profile `off` and `soft_guidance`
- No infinite loops from repeated skill injection
- Runtime events include skill invocation metadata

### Phase 3: Run Trace + UI Visibility (1-2 days)

**Objective:** Make skill usage visible and auditable in Panda UI.

**Files:**

- Modify: `apps/web/hooks/useAgent.ts`
- Modify: `apps/web/components/chat/live-run-utils.ts`
- Modify: `apps/web/components/chat/RunProgressPanel.tsx`
- Optional: `apps/web/components/chat/ReasoningPanel.tsx`
- Modify: `convex/agentRuns.ts`
- Modify: `convex/schema.ts` (only if new persisted fields/indexes are needed)
- Test: `apps/web/components/chat/live-run-utils.test.ts`

**Behavior:**

- Persist `progress_step` events for skill actions, e.g.:
  - "Skill matched: systematic-debugging"
  - "Workflow phase: discovery"
  - "Verification gate: required checks pending"
- Add a new progress category or typed metadata for skills (recommended)
- Show compact skill badges in `RunProgressPanel`

**Acceptance criteria:**

- User can see which skills were invoked and why
- Historical replay preserves skill events
- No regression in existing run timeline grouping

### Phase 4: Curated High-Value Skills (2-5 days, staged)

**Objective:** Implement the highest ROI workflow skills first.

**Files (expected new):**

- `apps/web/lib/agent/harness/skills/catalog/panda-verification-before-completion.ts`
- `apps/web/lib/agent/harness/skills/catalog/panda-requesting-code-review.ts`
- `apps/web/lib/agent/harness/skills/catalog/panda-dispatching-parallel-agents.ts`
- `apps/web/lib/agent/harness/skills/catalog/panda-receiving-code-review.ts`
  (optional for phase 4b)
- Tests under `apps/web/lib/agent/harness/skills/*.test.ts`

**Skill-specific success criteria:**

- `systematic-debugging`: triggers on failures/errors, reduces "fix without root
  cause" loops
- `verification-before-completion`: prevents premature success claims in strict
  mode
- `writing-plans`: improves file-specific plan quality in architect/plan
  contexts
- `dispatching-parallel-agents`: increases safe parallel `task` usage where
  tasks are independent

### Phase 5: Settings, Profiles, and Rollout Controls (1-3 days)

**Objective:** Give users/team control over skills behavior.

**Files:**

- Modify: `apps/web/components/settings/*` (actual settings page/components to
  identify)
- Modify: `apps/web/app/settings/*` (if settings route owns agent preferences)
- Modify: `convex/settings.ts` (or relevant existing settings Convex module)
- Modify: `convex/schema.ts`
- Modify: `apps/web/lib/agent/runtime.ts`

**Behavior:**

- Per-user or per-project workflow profile setting
- Feature flag for skills engine
- Optional "Superpowers-inspired mode" label in UI (marketing copy only after
  behavior is stable)

**Acceptance criteria:**

- Profile changes take effect on new runs
- Safe fallback to `off`
- Settings persist via Convex (no local-only persistence)

### Phase 6: Evals, QA, and Production Hardening (2-4 days)

**Objective:** Prove value and avoid regressions.

**Files:**

- Modify: `apps/web/lib/agent/harness/evals.ts`
- Modify: `apps/web/lib/agent/harness/eval-templates.ts`
- Add tests: `apps/web/lib/agent/harness/evals.test.ts`
- Add tests: `apps/web/lib/agent/runtime.progress.test.ts`
- Add E2E: `apps/web/e2e/*skills*.spec.ts` (exact filename TBD)
- Docs: `docs/AGENTIC_HARNESS.md`

**Metrics to track:**

- % runs with at least one skill invocation
- Verification commands executed before completion
- Tool-loop frequency before vs after skills
- User interruptions / rejects per run
- Average successful completion rate for multi-step tasks

**Acceptance criteria:**

- No regression in core run success paths
- Skill invocations improve verification/debugging compliance in eval scenarios
- Documentation updated with operator guidance

## Data Model Proposal (minimal)

### Option 1 (Recommended initial): Event-only persistence

- Persist skill activity as enriched `agentRunEvents` rows
  (`type = progress_step`, metadata in args/content).
- Pros: minimal schema churn, compatible with existing `RunProgressPanel`.
- Cons: less structured querying for analytics.

### Option 2 (Later): Dedicated `agentRunSkillInvocations` table

- Track `runId`, `sessionID`, `skillName`, `phase`, `appliedAt`, `decision`,
  `reason`.
- Pros: analytics/reporting easier.
- Cons: more schema and write path complexity.

Recommendation: start with Option 1, move to Option 2 only if
analytics/reporting needs it.

## Runtime Integration Notes (Panda-specific)

- Prefer harness plugin hooks for first implementation:
  - `session.start`
  - `step.start`
  - `tool.execute.before`
  - `tool.execute.after`
  - `permission.ask`
  - `permission.decision`
- Avoid directly hardcoding Superpowers rules into `prompt-library.ts`; keep
  prompt-library mode prompts concise and let skills plugin append targeted
  instructions.
- Use `task-tool.ts` metadata + existing parallel task capability to support
  `dispatching-parallel-agents`.
- Reuse `RuntimeEvent` / `progress_step` path in `apps/web/lib/agent/runtime.ts`
  and `apps/web/hooks/useAgent.ts` for UI visibility.

## Risk Register

- **Prompt bloat / repetition:** Skills repeatedly inject guidance and reduce
  task throughput.
  - Mitigation: de-dup skill instructions per session/phase; emit trace once per
    phase transition.

- **UX regression in simple asks:** Over-structured responses for basic
  questions.
  - Mitigation: mode-aware matcher; `ask` mode mostly exempt; default
    `soft_guidance`.

- **False-positive matching:** Debugging skill triggers on benign wording.
  - Mitigation: matcher tests + conservative thresholds + telemetry.

- **Strict mode deadlocks:** Skill gate blocks progress due to ambiguous
  prerequisites.
  - Mitigation: always allow explicit user override and fallback to soft mode.

- **Schema churn:** Early dedicated skill tables complicate rollout.
  - Mitigation: start with event-only persistence.

## First Milestone (Recommended to implement first)

Ship a thin slice that proves value without behavior risk:

1. Add skills types + registry + matcher (read-only decisions)
2. Add skills plugin in `soft_guidance` mode only
3. Emit/persist skill match events to run timeline
4. Surface skill badges in `RunProgressPanel`
5. Implement only `systematic-debugging` and `verification-before-completion` as
   curated skills

This gives observability + user-visible value before any strict enforcement
logic.

## Detailed Task Breakdown (Milestone 1)

### Task 1: Add skills core types

**Files:**

- Create: `apps/web/lib/agent/harness/skills/types.ts`
- Modify: `apps/web/lib/agent/harness/types.ts`

**Steps:**

1. Define `WorkflowProfile`, `SkillDefinition`, `SkillMatchInput`,
   `SkillMatchResult`, and `SkillInvocationTrace`.
2. Add minimal harness type extension points needed for skill metadata in
   runtime/plugin paths.
3. Export new types through harness barrel if needed.
4. Run: `bun run typecheck`

### Task 2: Add registry + catalog skeleton

**Files:**

- Create: `apps/web/lib/agent/harness/skills/registry.ts`
- Create: `apps/web/lib/agent/harness/skills/catalog/index.ts`
- Create:
  `apps/web/lib/agent/harness/skills/catalog/panda-systematic-debugging.ts`
- Create:
  `apps/web/lib/agent/harness/skills/catalog/panda-verification-before-completion.ts`

**Steps:**

1. Implement a registry that returns built-in Panda skills.
2. Define metadata + matcher stubs for two skills.
3. Add unit tests for registry shape and duplicate name protection.
4. Run: `bun test apps/web/lib/agent/harness/skills/registry.test.ts`

### Task 3: Implement matcher

**Files:**

- Create: `apps/web/lib/agent/harness/skills/matcher.ts`
- Test: `apps/web/lib/agent/harness/skills/matcher.test.ts`

**Steps:**

1. Implement deterministic matching based on mode + user text + observed runtime
   signals.
2. Add tests for:
   - bug/error prompts -> debugging skill
   - completion/fixed claims -> verification skill
   - simple ask prompt -> no skill
3. Run: `bun test apps/web/lib/agent/harness/skills/matcher.test.ts`

### Task 4: Add soft-guidance skills plugin

**Files:**

- Create: `apps/web/lib/agent/harness/skills/plugin.ts`
- Modify: `apps/web/lib/agent/harness/plugins.ts`
- Modify: `apps/web/lib/agent/harness/runtime.ts`

**Steps:**

1. Register a `skills` plugin that computes matches on `session.start` /
   `step.start`.
2. Store per-session applied skill markers to prevent repeated injection.
3. Emit runtime/progress-friendly metadata when a skill is applied.
4. Run:
   `bun run typecheck && bun test apps/web/lib/agent/harness/runtime.test.ts`

### Task 5: Persist and display skill invocation events

**Files:**

- Modify: `apps/web/lib/agent/runtime.ts`
- Modify: `apps/web/hooks/useAgent.ts`
- Modify: `apps/web/components/chat/live-run-utils.ts`
- Modify: `apps/web/components/chat/RunProgressPanel.tsx`
- Modify: `convex/agentRuns.ts` (only if metadata shape expansion is needed)

**Steps:**

1. Emit `progress_step` entries for skill matches / phase transitions.
2. Preserve skill metadata through `appendEvents`.
3. Render skill labels/badges in run progress without breaking current grouping.
4. Add/update tests for progress mapping.
5. Run: `bun test apps/web/components/chat/live-run-utils.test.ts`

### Task 6: Verify and document milestone

**Files:**

- Modify: `docs/AGENTIC_HARNESS.md`
- Optional: `docs/plans/2026-02-26-panda-superpowers-skills-integration.md`
  (status notes)

**Steps:**

1. Add a short "Skills plugin (experimental)" section to harness docs.
2. Run verification:
   - `bun run typecheck`
   - `bun run lint`
   - `bun run format:check`
   - `bun test`
3. Capture any failures and either fix or log as blockers before rollout.

## Rollout Plan

1. Internal dev flag only (`off` by default)
2. Enable `soft_guidance` for selected users/projects
3. Compare eval metrics and run telemetry
4. Add more curated skills
5. Introduce `strict_workflow` as opt-in

## Open Questions (decide before Phase 2)

1. Should skill traces appear in `ReasoningPanel`, `RunProgressPanel`, or both?
2. Is workflow profile stored per-user, per-project, or per-chat?
3. Do we want Panda to support external skill packs (`SKILL.md`) in v1, or only
   curated TS skills?
4. Should strict mode be available in all primary agents or only
   `architect`/`build`?

## Execution Handoff

Plan complete and saved to
`docs/plans/2026-02-26-panda-superpowers-skills-integration.md`. Two execution
options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task,
review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans,
batch execution with checkpoints

Which approach?
