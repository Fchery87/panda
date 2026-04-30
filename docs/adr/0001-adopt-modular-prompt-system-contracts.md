# 0001. Adopt Modular Prompt System Contracts

## Status

Accepted

## Context

Panda's Prompt System currently builds model-ready messages from mode-specific
prompt blocks, context assembly, workflow skill injection, active specs,
approved plans, and provider-specific message shaping.

The existing mode prompts are readable, but shared behavior is repeated across
Ask, Plan, Code, and Build modes. Repetition increases drift risk when one mode
receives stronger implementation discipline, safety boundaries, or context-use
rules while another mode keeps older wording.

## Decision

Panda will compose Chat Mode prompts from a shared instruction hierarchy and
smaller prompt modules instead of maintaining four large standalone prompt
blocks.

Static prompt modules should be plain string constants. Context-dependent
sections should be typed builder functions.

Mode prompts should become thin mode contracts composed with shared modules for
identity, environment, response style, tool policy, verification policy, context
policy, workflow skills, mode transitions, and active spec or plan injection.

## Alternatives Considered

- Keep four standalone mode prompts. This is simpler initially, but allows
  shared behavioral rules to drift between modes.
- Move prompts to a database or remote registry. This supports runtime editing,
  but adds operational complexity before Panda has a stable prompt contract.
- Introduce a prompt DSL. This could make composition explicit, but is heavier
  than the current need and would make prompt authoring harder to read.

## Consequences

- Shared implementation discipline can be strengthened once and reused by every
  relevant mode.
- Tests can assert semantic invariants and contract-sensitive ordering without
  freezing entire prompt snapshots.
- Prompt code will gain more structure, so the Prompt System contract must stay
  concise and explain where each responsibility belongs.
