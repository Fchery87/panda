# Spec: Prompt System Completion

## Deliverables

- [ ] Finish modularizing the Prompt System around `prompt-modules.ts` without
      changing intended behavior.
- [ ] Preserve canonical Chat Modes: `ask`, `plan`, `code`, and `build`.
- [ ] Keep prompt enhancement bounded to clarification without inferred
      implementation scope.
- [ ] Cover Prompt System contract rules with semantic invariant tests.
- [ ] Verify each slice before moving to the next.

## Constraints

- Preserve the existing public interface: `getPromptForMode`, `getSystemPrompt`,
  `normalizeChatMode`, and `buildHandoffSystemMessage`.
- Do not introduce a prompt DSL, database-backed prompt registry, or
  runtime-native workflow skills in this pass.
- Keep tests behavior-focused and avoid full prompt snapshots.
- Do not expand user scope during prompt enhancement.

## Out of scope

- Full prompt evaluation harness.
- Runtime-native workflow skill gates.
- UI changes.
- Provider transport changes.
