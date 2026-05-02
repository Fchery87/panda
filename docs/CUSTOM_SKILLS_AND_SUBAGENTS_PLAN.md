# Custom Skills and Subagents Plan

> Status: Partially implemented through the v1 foundation on 2026-05-02. This
> document distinguishes shipped behavior from remaining planned work.

## Goal

Implement v1 Custom Skills and improve Custom Subagents so users can configure
reusable workflow guidance and delegated workers without confusing the two.
Skills should shape how agents work. Subagents should do delegated work. The two
should compose safely through clear prompt composition, capability presets,
admin controls, and run visibility.

## Domain Model

### Skill

A Skill is reusable workflow guidance. It can change how the active agent or a
delegated Subagent approaches work, but it does not own an execution lane and it
does not execute code.

### Custom Skill

A Custom Skill is a user-created Skill stored with the user's settings. In v1 it
is a bounded workflow document, not a plugin. It may define metadata, trigger
language, applicable Chat Modes, a guidance profile, instructions, checklists,
required validation, and suggested Subagents.

### Subagent

A Subagent is a delegated worker with identity, prompt, effective capability
preset, permissions, and a delegated execution result.

### Custom Subagent

A Custom Subagent is a user-created Subagent. It can define a prompt, capability
preset, optional model preferences, and default attached Skills.

### Capability Preset

A Capability Preset is the user-facing permission level for a Subagent. Users
choose a work capability such as Research, Assistant, Builder, or Restricted
instead of editing raw tool permission rules.

### Applied Skill

An Applied Skill is a Skill selected for a specific Run or delegated Subagent
task. It may be attached by default, auto-matched by intent, required by Panda,
or required by future project policy.

## V1 Scope

Implemented v1 foundation includes:

- User-scoped Custom Skills stored in Convex.
- Intent-based auto-activation for Custom Skills.
- Soft guidance and strict workflow Skill profiles.
- Strict Custom Skill preflight notices.
- Applied-Skill disclosure in chat and detailed visibility in Run and proof
  surfaces.
- Custom Subagent capability presets.
- Default attached Skills on Custom Subagents.
- Separate Skill matching for delegated Subagent tasks.
- Admin controls for Custom Skills, strict Skills, auto-activation,
  import/export, and Subagent capability ceilings.

Remaining v1 work includes:

- Edit and duplicate flows for Custom Skills and Custom Subagents.
- File import and export for Custom Skills and Custom Subagents.
- Import preview and normalization UI.
- Per-Skill disablement controls in settings.
- Rich proof-surface detail beyond compact Applied Skill progress rows.
- Browser acceptance coverage for the full create/match/preflight/delegate flow.

V1 excludes:

- Project-scoped Skills.
- Team registries.
- Public marketplaces.
- Executable Skill plugins.
- Arbitrary code matchers.
- Required Subagent orchestration from Skills.
- Advanced raw permission editing.

## Data Model

Add a user-scoped Custom Skills table with fields for:

- User owner.
- Name and description.
- Trigger phrases or matcher text.
- Applicable Chat Modes.
- Guidance profile: soft guidance or strict workflow.
- Skill body instructions.
- Optional checklist items.
- Optional required validation guidance.
- Optional suggested Subagents.
- Auto-activation enabled flag.
- Created and updated timestamps.

Extend Custom Subagents with fields for:

- Capability preset.
- Default attached Skill identifiers.
- Skill auto-matching enabled flag.
- Optional import metadata.

Extend admin settings with controls for:

- Whether user-created Skills are allowed.
- Whether user-created Skill auto-activation is allowed.
- Whether strict user-created Skills are allowed.
- Whether import/export is allowed.
- Available Subagent capability presets.
- Per-user Custom Skill and Custom Subagent ceilings.

Persist Applied Skill summaries on Run records or Run events so proof surfaces
can explain what was applied without reconstructing the decision later.

## Prompt Composition

Prompt composition must preserve guardrails first and user customization second.

For a primary Run, compose guidance in this order:

1. Built-in safety, security, permission, validation, and governance guidance.
2. Primary Chat Mode contract.
3. Runtime and tool policy.
4. Built-in workflow Skills that match the request.
5. Future project-scoped Skills, when that capability exists.
6. User-scoped Custom Skills that match the request.
7. Active Spec and approved Plan context.
8. Project, memory, file, and chat context.
9. Current user message.

For a delegated Subagent task, compose guidance in this order:

1. Built-in safety, security, permission, validation, and governance guidance.
2. Parent inherited constraints.
3. Subagent capability and tool policy.
4. Subagent default attached Skills.
5. Auto-matched Skills relevant to the delegated prompt.
6. Subagent prompt.
7. Delegated task prompt.

User-created Skills may add stricter workflow requirements. They must not weaken
built-in safety, security, permission, validation, or governance guidance.

## Runtime Behavior

When a user submits a request, Panda matches Skills against the user request,
Chat Mode, custom instructions, and relevant project context.

Soft guidance Skills may apply without blocking execution. They should be
visible in run metadata and proof surfaces.

Strict user-created Skills emit a preflight notice before execution. The current
implementation persists and surfaces that notice as runtime metadata.
Interactive continue, skip, and disable controls remain future work.

When a Subagent receives a delegated task, Panda runs Skill matching again for
that delegated prompt. Parent safety constraints are inherited. Parent soft
guidance does not automatically leak into every delegated task unless it is
relevant to the delegated prompt.

Nested Subagent delegation is allowed only when the parent Subagent's effective
permissions allow task delegation. Delegation depth remains capped. A child
Subagent must not gain broader permissions than its parent.

Skills may suggest Subagents, but Custom Skill v1 must not require automatic
Subagent execution. Suggested Subagents guide delegation only when helpful and
permitted.

## Settings UX

Settings should provide separate management surfaces for Custom Skills and
Custom Subagents.

Custom Skill management currently supports:

- Create and delete.
- Name, description, trigger language, applicable modes, profile, instructions,
  checklist, required validation, suggested Subagents, and auto-activation
  toggle.

Custom Skill management should later add:

- Edit and duplicate.
- Import preview before saving.
- Export of non-secret configuration.
- Per-Skill disablement controls where admin policy allows.

Custom Subagent management currently supports:

- Create and delete.
- Name, description, prompt, capability preset, default attached Skills, and
  Skill auto-matching toggle.

Custom Subagent management should later add:

- Edit and duplicate.
- Model preferences where allowed.
- Import preview before saving.
- Export of non-secret configuration.

The permission UI should present capability presets first. Raw permission rules
should not be part of the primary v1 experience.

## Admin Policy

Admin policy is authoritative over all user-created and imported configuration.

Admin controls should be able to:

- Disable user-created Custom Skills independently from Custom Subagents.
- Disable Custom Skill auto-activation.
- Disable strict user-created Skills.
- Limit available Subagent capability presets.
- Disable import/export.
- Set per-user ceilings for Custom Skills and Custom Subagents.

Imported configuration must be normalized through admin policy before saving.
Runtime prompt composition must also enforce admin policy so stale or previously
allowed configuration cannot bypass newer restrictions.

## Run And Proof Visibility

Chat should stay compact. It may show a short disclosure such as applied Skills
and delegated Subagents, but it should not paste full Skill bodies or Subagent
internals into the transcript.

Run and proof surfaces currently show compact Applied Skill progress metadata.

Run and proof surfaces should later show richer detail for:

- Applied Skill name and source.
- Match reason.
- Profile.
- Whether the Skill was attached, auto-matched, required by Panda, or required
  by future project policy.
- Whether the Skill affected validation or stopping rules.
- Subagent delegation lanes or chain-aware entries.
- Subagent status, duration, effective capability preset, and output summary.

Public share projections must remain bounded and redacted. Owner-only execution
details, private files, provider secrets, signed URLs, checkpoint payloads, and
unsafe reasoning content must not leak into public shares.

## Migration From Current State

The current Custom Subagent flow already has user-scoped storage, an admin flag,
basic create/delete settings UI, mention picker integration, and runtime task
delegation.

The current built-in Skill resolver already matches built-in workflow Skills and
injects them into prompt composition.

Migration should preserve existing Custom Subagents. Existing raw permission
presets should be mapped to capability presets. Existing prompts, names, and
descriptions should remain intact.

The first implementation should avoid rewriting the full runtime. Add the Custom
Skill model, matching path, and disclosure metadata around the current prompt
composition and task delegation systems.

## Implementation Phases

### Phase 1: Contracts and Data

Add schema, validators, and Convex functions for Custom Skills. Extend admin
settings and Custom Subagent records with the new policy and composition fields.
Add tests for ownership, admin enforcement, and import normalization.

Validation gate: typecheck, Convex validation, and targeted Convex tests.

Status: Implemented.

### Phase 2: Skill Resolution

Extend Skill resolution to include user-scoped Custom Skills. Add deterministic
matching for trigger language and applicable modes. Implement precedence,
disablement, and admin-policy filtering.

Validation gate: unit tests for matching, precedence, disablement, and profile
handling.

Status: Implemented.

### Phase 3: Prompt Composition

Compose built-in Skills, Custom Skills, attached Skills, and delegated-task
Skills in the agreed order. Ensure user-created Skills cannot weaken built-in
guardrails.

Validation gate: semantic prompt invariant tests for ordering, inclusion, and
guardrail precedence.

Status: Implemented.

### Phase 4: Runtime Preflight and Metadata

Add strict Custom Skill preflight behavior. Persist Applied Skill summaries and
delegation-chain metadata for proof surfaces.

Validation gate: runtime tests for soft Skills, strict preflight, skipped
Skills, delegated-task matching, and depth-limited Subagent delegation.

Status: Partially implemented. Applied Skill metadata, strict preflight events,
and delegated-task matching are implemented. Interactive skip/disable controls
are not implemented.

### Phase 5: Settings UX

Build Custom Skill management. Upgrade Custom Subagent settings to capability
presets, attached Skills, and import/export previews.

Validation gate: component tests where available, typecheck, lint, and focused
manual acceptance in the settings page.

Status: Partially implemented. Create/delete settings flows and capability-first
Subagent controls are implemented. Edit, duplicate, import, and export are not
implemented.

### Phase 6: Run and Proof Visibility

Add compact chat disclosures and detailed Run/proof Applied Skill and Subagent
visibility.

Validation gate: UI tests for disclosure rendering and redaction-sensitive
projection tests.

Status: Partially implemented. Compact progress rows and persisted bounded
Applied Skill summaries are implemented. Rich proof detail and public-share
projection tests remain future work.

### Phase 7: End-to-End Acceptance

Cover a full flow: create a Custom Skill, auto-match it, accept strict
preflight, run a Custom Subagent with attached Skills, and inspect the proof
surface.

Validation gate: full typecheck, lint, format check, unit tests, and relevant
browser acceptance tests.

Status: Partially implemented. Targeted backend, resolver, prompt, runtime,
visibility, settings, typecheck, and lint gates passed. Browser acceptance tests
and full format check remain outstanding.

## Testing Plan

Test Custom Skill data access:

- Users can list only their own Custom Skills.
- Admin-disabled Custom Skills are hidden or rejected.
- Strict Skills are rejected when strict user Skills are disabled.
- Import cannot grant disallowed capabilities.

Test Skill matching:

- Trigger text matches only applicable modes.
- Disabled Skills do not match.
- Built-in safety Skills outrank user-created Skills.
- Conflicting non-safety Skills are surfaced instead of silently merged.

Test prompt composition:

- Primary Run guidance appears in the agreed order.
- Delegated Subagent guidance includes parent constraints.
- Parent soft guidance does not leak into unrelated Subagent tasks.
- User-created Skill text cannot remove guardrail sections.

Test runtime behavior:

- Soft Custom Skills apply without blocking execution.
- Strict Custom Skills show preflight before execution.
- Skipping a strict Skill affects only the current Run unless the user disables
  future auto-activation.
- Nested Subagent delegation respects depth and permission ceilings.

Test UI behavior:

- Settings create/edit/delete flows work for Custom Skills.
- Custom Subagents can attach default Skills.
- Import previews show relevant risk and capability information.
- Chat disclosures remain compact.
- Proof surfaces show applied Skill details and Subagent delegation chains.

## Open Questions

- What exact trigger matching algorithm should v1 use beyond phrase matching?
- Should imported Skill and Subagent files use one shared frontmatter schema or
  separate schemas?
- How much of the strict preflight interaction should live in chat versus the
  run approval surface?
- Which existing tests should become the canonical semantic prompt invariant
  tests for Skill composition?
