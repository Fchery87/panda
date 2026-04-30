# Prompt System Contract

## Purpose

The Prompt System turns an Execution Session, Chat Mode, project context,
memory, specs, plans, skills, and user input into model-ready messages.

It owns instruction hierarchy, mode behavior, context composition, prompt safety
boundaries, and evaluation criteria. It does not own provider transport, model
inference, or runtime enforcement of hard permissions.

## Instruction Hierarchy

Prompt assembly should follow this hierarchy:

1. Base instruction hierarchy
2. Mode contract
3. Runtime and tool policy
4. Workflow skills
5. Active Spec
6. Approved Plan
7. Planning session
8. Project overview
9. Memory bank
10. Previous session context
11. Relevant files
12. Previous messages
13. Current user message

Durable behavioral rules come before task context. Hard execution contracts come
before softer memory and chat history. The latest user message stays last so the
immediate request remains salient.

## Prompt Modules

Mode prompts should be thin contracts composed from smaller modules.

Use plain string constants for static instructions:

- Identity
- Browser environment
- Response style
- Core implementation discipline
- Anti-patterns

Use typed builder functions for context-dependent sections:

- Mode contract
- Tool policy
- Workflow skills
- Active Spec
- Approved Plan
- Planning session
- Project context
- Provider-specific message shaping

Workflow skills should remain prompt-injected guidance for now. Soft guidance
skills add concise prompt guidance; strict workflow skills add mandatory prompt
steps and tests. The Prompt System should leave room for strict skills to become
first-class runtime workflows later if the product needs explicit gates.

## Mode Contracts

The canonical primary Chat Modes are `ask`, `plan`, `code`, and `build`.
Additional behaviors should enter through workflow skills, specs, planning
sessions, or mode context rather than new top-level modes unless there is a
strong product reason.

Ask Mode should inspect repository context and cite file paths when the user
asks about repository-specific behavior, symbols, files, bugs, architecture, or
how something works in the project. It should answer directly from visible
context for general engineering questions or user-provided snippets.

Plan Mode should default to conversational planning. It should produce
structured planning artifacts only when the user explicitly requests a
plan/design or when a validated planning session requires an execution-ready
artifact.

Code and Build modes should be quiet by default: brief approach, meaningful
status updates, no planning preamble, and no code blocks in chat. They should
switch to explanatory narration at decision points such as ambiguous scope,
conflicting contracts, dangerous actions, validation repair failures, unexpected
touched-file changes, security-sensitive changes, or dependency and architecture
trade-offs.

## Responsibility Split

Prompts state implementation discipline so agents understand how to work and how
to recover.

Runtime policies enforce hard boundaries such as tool permissions, mode
capabilities, out-of-scope write blocks, loop limits, checkpointing, and
approval gates.

## Contract Precedence

If an active Spec and an approved Plan both exist, the Spec is the stronger
execution contract. A Plan explains how to work; a Spec constrains what must
remain true. If they conflict, the agent should preserve the Spec and surface
the conflict rather than silently following the Plan.

Precedence:

1. User safety and security policy
2. Runtime permissions
3. Active Spec
4. Approved Plan
5. Project memory
6. Prior chat

## Prompt Enhancement

Prompt enhancement may clarify wording already present and may ask for or expose
missing context, but it must not add inferred implementation scope.

For example, `fix login` may become
`Investigate and fix the login issue. First identify the failing behavior, affected auth flow, and reproduction steps before making changes.`

It must not become a specific implementation scope such as
`Fix OAuth callback handling, refresh token persistence, and session expiry`
unless the user supplied that scope.

## Evaluation Criteria

Prompt System changes should be evaluated against lightweight semantic criteria:

- Mode boundary adherence
- Bounded first action in implementation modes
- No code blocks in Code or Build chat output
- Repository-specific Ask answers inspect and cite context
- Plan Mode asks only materially blocking questions before artifacts
- Spec-over-Plan conflict handling
- Validation and repair-forward behavior after edits
- Private reasoning and owner-only Thinking boundaries are preserved
- Provider-embedded system prompts keep the same effective section order

## Validation Rule

After meaningful code changes, agents should run the narrowest relevant
validation first. Before claiming completion, they should run the strongest
available validation gate for the changed area. If validation cannot run, they
should state why and report the residual risk.

## Assumption Rule

Agents must not invent repository state, validation results, user intent, file
contents, command output, or implementation scope. If a fact matters and is not
in context, they should inspect the project, ask one blocking question, or state
the assumption explicitly before proceeding.

## Testing Strategy

Tests should prefer semantic invariants over full prompt snapshots.

Assert required behaviors, section inclusion, and contract-sensitive ordering.
Avoid freezing every word of prompt prose.

## Anti-Patterns

- Duplicating shared behavioral rules independently in every mode prompt
- Expanding user scope during prompt enhancement
- Letting project memory override active specs or approved plans
- Treating prompt instructions as the only boundary for dangerous actions
- Producing structured plans for ordinary Plan Mode questions
- Making Code or Build modes verbose during routine execution
