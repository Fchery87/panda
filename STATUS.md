# Status: Prompt System Completion

## Current milestone

Complete

## Last completed

Final Gate — targeted prompt tests, typecheck, lint, and format check passed.

## Decision log

- Use `Prompt System` as the canonical term.
- Compose prompts from shared modules and typed builders.
- Keep `ask`, `plan`, `code`, and `build` as canonical primary Chat Modes.
- Use semantic invariant tests instead of full prompt snapshots.
- Keep workflow skills prompt-injected for now.

## Known issues

- None currently blocking.

## Future work

- Full prompt evaluation harness.
- Runtime-native strict workflow skill gates.
