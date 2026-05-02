# Panda Context

## Glossary

### Run

A `Run` is one agent execution lifecycle tied to a chat turn or approved plan
execution.

Use `run orchestration` for the Module that owns the lifecycle ordering of a
Run: message creation, run record updates, event application, receipt summary,
and plan/spec context attachment. Runtime execution internals, UI rendering, and
command execution remain outside run orchestration.

### Execution Session

An `Execution Session` is the user-facing work thread for one goal inside a
Project. It groups the chat narrative, planning intake, approved Plan, one or
more Runs, changed work, proof, preview, recovery, and next action into a single
continuable product object.

Use `Run` only for one execution attempt within an Execution Session. Use `Chat`
for the narrative/input surface attached to the Execution Session, not for the
whole work thread.

### Plan

A `Plan` is the reviewable strategy the user accepts before execution. An
approved Plan owns execution intent for build-from-plan work.

### Prompt System

The `Prompt System` is the product layer that turns an Execution Session, Chat
Mode, project context, memory, specs, plans, skills, and user input into
model-ready messages. It owns instruction hierarchy, mode behavior, context
composition, and prompt safety boundaries, but not provider transport or model
inference.

The Prompt System should use a shared instruction hierarchy for behavior common
to all Chat Modes, with mode-specific prompts composing from that hierarchy
rather than redefining shared rules independently.

Mode prompts should be thin mode contracts composed from smaller prompt modules
such as identity, environment, response style, tool policy, verification policy,
context policy, workflow skills, mode transitions, and active spec or plan
injection.

The first strengthening goal for the Prompt System is implementation discipline:
agents should make bounded changes, preserve scope, validate work, repair from
actual errors, and avoid unsupported assumptions. Agent reliability and answer
quality are secondary outcomes of that discipline.

Prompts state implementation discipline so agents understand how to work and how
to recover. Runtime policies enforce hard boundaries such as tool permissions,
mode capabilities, out-of-scope write blocks, loop limits, checkpointing, and
approval gates.

Prompt System behavior should be documented in `docs/PROMPT_SYSTEM_CONTRACT.md`
before substantial prompt-code reorganization. The contract should define the
instruction hierarchy, prompt modules, mode contracts, responsibility split,
context injection order, lightweight evaluation criteria, tests, and
anti-patterns.

The canonical Prompt System context injection order is: base instruction
hierarchy, mode contract, runtime/tool policy, workflow skills, active Spec,
approved Plan, planning session, project overview, memory bank, previous session
context, relevant files, previous messages, then the current user message.

When an active Spec and an approved Plan both exist, the Spec is the stronger
execution contract. A Plan explains how to work; a Spec constrains what must
remain true. If they conflict, the agent should preserve the Spec and surface
the conflict rather than silently following the Plan.

Prompt enhancement may clarify wording already present and may ask for or expose
missing context, but it must not add inferred implementation scope. Enhancement
should preserve the user's intent without silently expanding what Panda will do.

Code and Build modes should be quiet by default: brief approach, meaningful
status updates, no planning preamble, and no code blocks in chat. They should
switch to explanatory narration at decision points such as ambiguous scope,
conflicting contracts, dangerous actions, validation repair failures, unexpected
touched-file changes, security-sensitive changes, or dependency and architecture
trade-offs.

Plan Mode should default to conversational planning. It should produce
structured planning artifacts only when the user explicitly requests a
plan/design or when a validated planning session requires an execution-ready
artifact.

Ask Mode should inspect repository context and cite file paths when the user
asks about repository-specific behavior, symbols, files, bugs, architecture, or
how something works in the project. It should answer directly from visible
context for general engineering questions or user-provided snippets.

Prompt modules should use plain string constants for static instructions and
typed builder functions for context-dependent sections such as mode contracts,
tool policy, workflow skills, active specs, approved plans, planning sessions,
project context, and provider-specific message shaping.

Prompt System tests should prefer semantic invariants over full prompt
snapshots. Tests should assert required behaviors, section inclusion, and
contract-sensitive ordering without freezing every word of prompt prose.

Prompt System implementation should proceed docs/tests first: write the prompt
contract and semantic invariant tests before reorganizing prompt assembly code.

Prompted validation should be proportionate: after meaningful code changes,
agents should run the narrowest relevant validation first. Before claiming
completion, they should run the strongest available validation gate for the
changed area. If validation cannot run, they should state why and report the
residual risk.

The Prompt System should include a shared no-unsupported-assumptions rule:
agents must not invent repository state, validation results, user intent, file
contents, command output, or implementation scope. If a fact matters and is not
in context, they should inspect the project, ask one blocking question, or state
the assumption explicitly before proceeding.

The canonical primary Chat Modes are `ask`, `plan`, `code`, and `build`.
Additional behaviors should enter through workflow skills, specs, planning
sessions, or mode context rather than new top-level modes unless there is a
strong product reason.

Workflow skills should remain prompt-injected guidance for now. Soft guidance
skills add concise prompt guidance; strict workflow skills add mandatory prompt
steps and tests. The Prompt System should leave room for strict skills to become
first-class runtime workflows later if the product needs explicit gates.

### Skill

A `Skill` is reusable workflow guidance that changes how an active agent or
subagent works. Skills are not separate workers and do not own an execution
lane.

Skills may auto-activate by intent matching when the user's request or active
context indicates the skill applies. Auto-activation should inject the skill
into the Prompt System as process guidance rather than spawning a separate Run.

Skill auto-activation should be visible but not approval-gated by default. Soft
guidance skills may appear as a lightweight applied-skill disclosure in run or
proof surfaces. Strict workflow skills should be visible before execution starts
because they may impose mandatory steps, validation, or stopping rules. Approval
is only required when a skill changes permissions, invokes tools, touches
external systems, or adds scope beyond the user's request.

User-created custom Skills are bounded workflow documents, not executable
plugins. They may define metadata, trigger language, applicable Chat Modes,
guidance profile, instructions, checklists, required validation, and suggested
Subagents. They should not contain arbitrary executable matchers, direct tool
calls, hidden permission changes, shell commands, or server-side actions.

Custom Skill v1 includes user-scoped storage, intent-based auto-activation, soft
and strict profiles, strict Skill preflight notices, applied-Skill disclosures,
Subagent attached Skills, delegated-task Skill matching, file import/export, and
admin controls. Custom Skill v1 excludes project-scoped Skills, team registries,
marketplaces, executable plugins, arbitrary code matchers, required Subagent
orchestration, and advanced raw permission editing.

Custom Skills should ship as user-scoped Skills first, stored with the user's
settings and available across that user's Projects. Project-scoped Skills are a
later capability for team or workspace conventions because they require stronger
sharing, governance, and conflict rules.

When multiple Skills match, built-in safety, security, verification, and
permission-related Skills are strongest and cannot be weakened by user-created
Skills. Future project-scoped Skills should outrank user-scoped Skills for
project conventions. User-created Skills may add stricter workflow requirements
but must not weaken built-in requirements. If non-safety Skills conflict, Panda
should surface the conflict and ask rather than silently guessing.

### Subagent

A `Subagent` is a delegated assistant with its own identity, prompt,
permissions, and execution result. Subagents do work through explicit delegation
or agent-initiated task delegation, and their activity appears as delegated work
within a Run.

Use `Subagent` as the canonical product and domain term. Use `Custom Subagent`
for user-created Subagents and `Built-in Subagent` for Panda-provided delegated
workers. Avoid `custom agent`, `assistant`, and `sub-agent` in product copy when
referring to delegated workers.

Subagents and Skills are composable but distinct: Subagents are workers; Skills
are operating procedures that can guide those workers.

Custom Subagents may define default attached Skills that apply whenever the
Subagent runs. Auto-matched Skills may also apply based on the delegated task
prompt unless auto-matching is explicitly disabled for that Subagent. Attached
Skills should prevent users from duplicating workflow instructions inside every
Subagent prompt.

Subagents may delegate to other Subagents only when their permissions allow task
delegation. Nested delegation must be depth-capped, and a child Subagent must
not gain broader permissions than its parent. Proof and run surfaces should
preserve the delegation chain rather than flattening delegated work.

Subagent permissions should be presented to users as capability presets rather
than raw tool rules. Canonical presets include Research, Assistant, Builder, and
Restricted. Advanced raw permission editing is a later capability, not the
primary v1 user experience.

Custom Subagents and Skills should support file import and export as
configuration portability. Imports should preview the name, description,
capabilities, triggers, attached Skills, and strictness before saving. Imported
configuration must not auto-enable stricter workflows or grant capabilities
beyond admin policy without explicit confirmation. Exports should include only
non-secret configuration, not provider tokens, private project context, memory,
or run history.

Runs should expose applied Skills and delegated Subagents without flooding chat.
Chat may show a compact disclosure of applied Skills and delegated Subagents.
Run and proof surfaces should show full applied-Skill details, including match
reason, profile, attached-versus-auto-matched source, and validation impact.
Delegated Subagents should appear as lanes or chain-aware entries with status,
duration, effective capability preset, and output summary.

Skill matching should run separately for the primary Run and each delegated
Subagent task. A delegated Subagent should inherit parent safety constraints,
compose its default attached Skills, and then add auto-matched Skills relevant
to the delegated prompt. Parent soft guidance should not automatically leak into
every Subagent unless it is relevant to the delegated task.

Custom Subagents and Skills should not have a shared team registry or public
marketplace in the first implementation. v1 sharing should be file-based only:
one user exports non-secret configuration and another user imports it after
preview and confirmation. Team libraries, approved presets, versioning, and
trust labels are future capabilities.

Admin policy should control custom Subagents and custom Skills separately
because they have different risk profiles. Admin controls should include whether
user-created Skills are allowed, whether Skill auto-activation is allowed,
whether strict user Skills are allowed, which Subagent capability presets are
available, whether import/export is allowed, and per-user ceilings for custom
Subagents and Skills. Admin policy always wins over imported configuration, user
settings, attached Skills, and auto-activation.

When a strict user-created Skill auto-matches, Panda should show a visible
preflight notice before execution. The notice should explain the matched strict
workflow and let the user continue, skip it for the Run, or disable future
auto-activation for that Skill. If the user continues into execution, the strict
Skill becomes binding workflow guidance for that Run.

Skills may suggest Subagents, but custom Skill v1 should not require Subagents
to run automatically. Suggested Subagents may guide delegation when helpful and
permitted, but they must not bypass parent permissions or fail a Run solely
because a suggested Subagent was unavailable.

Only non-safety built-in Skills should be disableable. Built-in safety,
security, permission, validation, and governance Skills are required when
applicable. Quality and process Skills may be disabled per Run or in user
settings when admin policy allows. Skill disclosures should distinguish Skills
required by Panda, required by a future Project policy, enabled by the user, and
auto-matched for the Run.

### Spec

A `Spec` is formal requirements, constraints, and acceptance criteria. A Spec is
verification context attached to a Run, not a parallel approval lifecycle,
unless a future product requirement explicitly creates that separate lifecycle.

### Run Projection

A `Run Projection` is a surface-specific view of Run facts. Chat projections are
bounded timeline summaries. Proof projections may include inspection detail, but
remain redacted and bounded. Public share projections never include owner-only
execution detail, raw reasoning, provider secrets, signed URLs, private files,
or checkpoint payloads.

### Runtime Command Execution

`Runtime Command Execution` is browser-first with server fallback. The terminal
surface owns user intent and rendering; the command execution Adapter owns
runtime selection, status transitions, output shaping, and failure
classification across WebContainer and server-backed execution paths.

### Thinking

`Thinking` is the owner-only chat surface label for bounded model reasoning
visibility during a Run. It may stream provider-returned reasoning summaries or
safe reasoning excerpts while a trusted owner is watching the workspace, but it
is not public transcript narrative and must not be included in shared-chat
projections.

Use `reasoning content` for internal data and policy language. Avoid
`chain of thought` in product copy because the feature exposes bounded thinking
visibility, not a promise to reveal raw model chain-of-thought.

### Chat-First Workbench

A `Chat-First Workbench` is a product model where the active chat or session
timeline is the primary work surface. Files, editor tabs, terminal output,
diffs, preview, and proof surfaces support the active session rather than owning
the workspace hierarchy.

Use `IDE-first workspace` for the implemented shape where file navigation,
editor tabs, center workbench panels, and terminal-style supporting surfaces are
visually and structurally dominant over the active chat timeline.
