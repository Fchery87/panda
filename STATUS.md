# Status: Custom Skills Phase 1

## Current milestone: Complete

## Last completed: Final Verification — 2026-05-01

## Decision log

- Scope is Phase 1 only because the full Custom Skills and Subagents plan spans
  schema, runtime, prompt composition, settings UI, and proof surfaces.
- Existing Custom Subagent behavior must be preserved while adding Custom Skill
  foundations.
- Custom Skill v1 schema fields are additive and optional where they extend
  existing tables, so no data migration is required for this phase.

## Known issues

- `bun test convex/customSkills.auth.test.ts` passed.
- `bun run typecheck` passed.
- `bun run lint` passed.
- Touched-file Prettier check passed.
- Full `bun run format:check` still reports unrelated pre-existing formatting warnings in `.agents` skill files, `AGENTS.md`, and `CLAUDE.md`.

## Phase 2 progress

- Added Custom Skill matching inputs and policy types to the frontend skill resolver.
- Added deterministic trigger-phrase matching for user-scoped Custom Skills.
- Added policy filtering for disabled Custom Skills, disabled user Skills, disabled auto-activation, and disabled strict user Skills.
- Added prompt instruction generation for document-based Custom Skills.
- Phase 2 verification passed: resolver/matcher tests, typecheck, and lint.

## Phase 3 progress

- Added semantic prompt tests for Custom Skill injection and guardrail-before-skill ordering.
- Added delegated Subagent prompt composition for parent constraints, attached Skills, and delegated-task auto-matched Skills.
- Wired delegated Subagent runtime messages through the new composition helper.
- Phase 3 verification passed: prompt/runtime/skill tests, typecheck, and lint.

## Phase 4 progress

- Added Applied Skill summary helpers and strict Custom Skill preflight classification.
- Added runtime events for Applied Skill summaries and strict Custom Skill preflight notices before execution steps.
- Phase 4 verification passed: applied-skill/runtime tests, typecheck, and lint.

## Phase 5 progress

- Added Custom Skill settings editor for workflow document creation and deletion.
- Added Custom Skills card to the Advanced settings section with admin-policy gating.
- Upgraded Custom Subagent creation with capability presets, attached Skills, and task-specific skill auto-matching.
- Phase 5 verification passed: settings tests, Custom Skill auth test, typecheck, and lint.

## Phase 6 progress

- Mapped Applied Skill and strict Skill preflight runtime events into compact progress steps.
- Added bounded Applied Skill summaries to persisted run event schema and summaries.
- Phase 6 verification passed: visibility/runtime tests, typecheck, and lint.

## Phase 7 progress

- Final targeted acceptance suite passed across backend, resolver, prompt, runtime, visibility, and settings coverage.
- Final typecheck passed.
- Final lint passed.

## Future work (out of scope, log here)

- Prompt composition for Custom Skills.
- Strict Skill preflight UX.
- Settings UI for Custom Skill management.
- Run/proof Applied Skill disclosure.
