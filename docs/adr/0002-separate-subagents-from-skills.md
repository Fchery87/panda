# 0002. Separate Subagents from Skills

## Status

Accepted

## Context

Panda supports primary Chat Modes, delegated Subagents, and prompt-injected
workflow Skills. The existing implementation already points in this direction:
Subagents are invoked through mentions or task delegation, while Skills are
resolved by intent and injected into the Prompt System as guidance.

Without a crisp product boundary, users can reasonably confuse Custom Subagents,
Custom Skills, custom prompts, and workflow modes. That confusion makes future
permission design, auto-activation, import/export, proof surfaces, and admin
controls harder to reason about.

## Decision

Panda will treat Subagents and Skills as separate but composable concepts.

Subagents are delegated workers. A Subagent has identity, prompt, capability
preset, permissions, optional model settings, and a delegated execution result.
Subagents may be built in or user-created. Custom Subagents may define default
attached Skills.

Skills are bounded workflow documents. A Skill changes how an active agent or
Subagent works, but does not own an execution lane and does not execute code.
Custom Skills may define metadata, trigger language, applicable Chat Modes,
guidance profile, instructions, checklists, required validation, and suggested
Subagents.

Custom Skills may auto-activate by intent matching. Auto-activation is visible
but not approval-gated by default. Soft guidance Skills appear as lightweight
disclosures. Strict user-created Skills show a preflight notice before execution
and become binding workflow guidance only when the user continues.

Admin policy is authoritative. Built-in safety, security, permission,
validation, and governance Skills cannot be weakened by user-created Skills.
Imported configuration, user settings, attached Skills, and auto-activation must
respect admin policy.

## Alternatives Considered

- Make Skills executable plugins. This would enable more powerful workflows, but
  would turn auto-activation into a security boundary and require plugin
  sandboxing, permission review, and runtime orchestration.
- Treat Skills as Subagents. This would simplify the mental model initially, but
  would blur worker identity with operating procedure and duplicate workflow
  instructions across Subagent prompts.
- Require approval for every auto-matched Skill. This maximizes explicit user
  control, but would make common guidance noisy and slow down routine work.
- Launch project-scoped or team-shared Skill libraries in v1. This supports team
  conventions, but introduces ownership, sharing, versioning, trust labels, and
  conflict rules before the user-scoped model is proven.

## Consequences

- Users can customize Panda through worker configuration and reusable workflow
  guidance without conflating the two.
- Prompt composition must support built-in safety guidance, attached Skills, and
  auto-matched Skills with explicit precedence rules.
- Runtime and proof surfaces must disclose applied Skills and delegated
  Subagents without flooding chat.
- Custom Skill v1 remains safer because Skills are documents, not executable
  plugins or hidden orchestrators.
- Future project-scoped Skills, team libraries, and stricter runtime workflows
  remain possible, but are deliberately outside v1 scope.
