# Status: Prompt System Completion

## Current milestone

Final Gate

## Last completed

Slice 3: Prompt Assembly Cleanup — clarified prompt module ownership and renamed
the provider embedding local variable. Targeted prompt tests passed.

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
