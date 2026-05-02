# Plan: Custom Skills Phase 1

## Milestone 1: Contracts And Tests

What: Add task state files and targeted tests that describe Custom Skill
ownership and admin-policy behavior.

Acceptance criteria: Tests assert that Custom Skill functions require auth,
validate ownership, and respect admin policy.

Validation: `bun test convex/customSkills.auth.test.ts`

Status: [x] complete

## Milestone 2: Convex Data Functions

What: Add Custom Skill schema and Convex functions for
list/get/add/update/remove.

Acceptance criteria: Functions use server-derived auth, user-scoped indexes,
bounded list results, duplicate-name checks, and admin-policy gates.

Validation: `bun test convex/customSkills.auth.test.ts`

Status: [x] complete

## Milestone 3: Admin Policy Defaults

What: Extend admin settings schema, admin update/query functions, and effective
settings outputs for Custom Skill policy.

Acceptance criteria: Defaults are exposed consistently and updateSettings
accepts the new policy fields.

Validation: `bun run typecheck && bun test convex/customSkills.auth.test.ts`

Status: [x] complete

## Milestone 4: Final Verification

What: Run narrow final verification for this phase and update STATUS.md.

Acceptance criteria: Targeted tests pass; any broader gate failures are reported
with exact output.

Validation: `bun run typecheck && bun test convex/customSkills.auth.test.ts`

Status: [x] complete

## Milestone 5: Skill Resolution

What: Extend Skill resolution to include user-scoped Custom Skills with deterministic phrase matching, mode filtering, disablement, and admin-policy filtering.

Acceptance criteria: Resolver tests cover Custom Skill matching, strict-skill policy filtering, and user disablement.

Validation: `bun test apps/web/lib/agent/skills/resolver.test.ts apps/web/lib/agent/skills/matcher.test.ts && bun run typecheck && bun run lint`

Status: [x] complete

## Milestone 6: Prompt Composition

What: Compose Custom Skills into primary prompts and delegated Subagent task prompts while preserving guardrail ordering and parent constraints.

Acceptance criteria: Prompt tests cover Custom Skill injection and policy blocking; Subagent composition tests cover attached and auto-matched delegated-task Skills.

Validation: `bun test apps/web/lib/agent/prompt-library.test.ts apps/web/lib/agent/skills/resolver.test.ts apps/web/lib/agent/skills/matcher.test.ts apps/web/lib/agent/skills/subagent-composition.test.ts apps/web/lib/agent/harness/runtime.test.ts && bun run typecheck && bun run lint`

Status: [x] complete

## Milestone 7: Runtime Preflight And Metadata

What: Emit Applied Skill summaries and strict Custom Skill preflight metadata before execution, and preserve bounded runtime metadata for later UI/proof surfaces.

Acceptance criteria: Runtime tests cover applied skill metadata and strict Custom Skill preflight events.

Validation: `bun test apps/web/lib/agent/skills/applied-skills.test.ts apps/web/lib/agent/harness/runtime.test.ts && bun run typecheck && bun run lint`

Status: [x] complete

## Milestone 8: Settings UX

What: Add Custom Skill management and upgrade Custom Subagent settings with capability presets, default attached Skills, and task-specific auto-matching controls.

Acceptance criteria: Settings UI exposes Custom Skills and capability-first Subagent controls; tests cover the expected controls.

Validation: `bun test apps/web/components/settings/CustomSkillEditor.test.ts apps/web/components/settings/SubagentEditor.test.ts convex/customSkills.auth.test.ts && bun run typecheck && bun run lint`

Status: [x] complete

## Milestone 9: Run And Proof Visibility

What: Surface Applied Skills and strict Skill preflight as compact run progress and persist bounded Applied Skill summaries for proof surfaces.

Acceptance criteria: Runtime mapping and persisted run event shapes include Applied Skill summaries without full prompt or instruction payloads.

Validation: `bun test apps/web/lib/agent/applied-skills-events.test.ts apps/web/lib/agent/skills/applied-skills.test.ts apps/web/lib/agent/harness/runtime.test.ts && bun run typecheck && bun run lint`

Status: [x] complete

## Milestone 10: Final Acceptance

What: Run the cross-phase acceptance suite and repository gates for the Custom Skills and Custom Subagents v1 implementation.

Acceptance criteria: New backend, resolver, prompt, runtime, visibility, and settings coverage passes with typecheck and lint.

Validation: `bun test convex/customSkills.auth.test.ts apps/web/lib/agent/skills/resolver.test.ts apps/web/lib/agent/skills/matcher.test.ts apps/web/lib/agent/prompt-library.test.ts apps/web/lib/agent/skills/subagent-composition.test.ts apps/web/lib/agent/skills/applied-skills.test.ts apps/web/lib/agent/applied-skills-events.test.ts apps/web/components/settings/CustomSkillEditor.test.ts apps/web/components/settings/SubagentEditor.test.ts apps/web/lib/agent/harness/runtime.test.ts && bun run typecheck && bun run lint`

Status: [x] complete
