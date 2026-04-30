# Plan: Prompt System Completion

## Slice 1: Mode Prompt Contracts

What: Move static Ask, Plan, Code, Build prompt contracts into
`prompt-modules.ts` while preserving public prompt-library behavior.

Acceptance criteria: Prompt tests pass and `prompt-library.ts` delegates static
prompt content to prompt modules.

Validation:
`bun test apps/web/lib/agent/prompt-library.test.ts apps/web/lib/agent/enhance-prompt.test.ts`

Status: [x] complete

## Slice 2: Contract Invariants

What: Add missing semantic invariant tests for Ask, Plan, Code, and Build
behavior from `docs/PROMPT_SYSTEM_CONTRACT.md`.

Acceptance criteria: Tests cover Ask repository citation guidance, Plan
conversational default, implementation quiet/no-code-chat behavior, and prompt
enhancement scope boundaries.

Validation:
`bun test apps/web/lib/agent/prompt-library.test.ts apps/web/lib/agent/enhance-prompt.test.ts`

Status: [x] complete

## Slice 3: Prompt Assembly Cleanup

What: Tighten prompt assembly names and docs after extraction without changing
behavior.

Acceptance criteria: Dynamic context builder names match contract terminology
and provider embedding order remains tested.

Validation:
`bun test apps/web/lib/agent/prompt-library.test.ts apps/web/lib/agent/enhance-prompt.test.ts`

Status: [x] complete

## Final Gate

What: Run formatting, linting, typecheck, and targeted prompt tests.

Validation:
`bun test apps/web/lib/agent/prompt-library.test.ts apps/web/lib/agent/enhance-prompt.test.ts && bun run typecheck && bun run lint && bun run format:check`

Status: [x] complete
