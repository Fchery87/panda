import type { AgentSkillDefinition, SkillMatchInput } from '../types'

const CLEANUP_TRIGGER =
  /\b(cleanup|clean up|refactor|deslop|de-slop|simplify|dedupe|de-duplicate|duplicate logic|dead code|bloated|over-abstracted|over abstracted|slop)\b/i

function isCleanupPrompt(input: SkillMatchInput): boolean {
  if (input.chatMode === 'ask') return false
  return (
    CLEANUP_TRIGGER.test(input.userMessage ?? '') ||
    CLEANUP_TRIGGER.test(input.customInstructions ?? '')
  )
}

export const aiSlopCleanerSkill: AgentSkillDefinition = {
  name: 'ai-slop-cleaner',
  description:
    'Use when cleanup, refactor, deslop, duplication, dead-code, or over-abstraction requests need a bounded regression-tests-first cleanup workflow.',
  appliesTo: isCleanupPrompt,
  buildInstruction: (context) => `Activated Panda workflow skill: ai-slop-cleaner

Profile: ${context.skillProfile ?? 'soft_guidance'}

Overview:
- Use this as Panda's cleanup workflow for code that works but is bloated, repetitive, noisy, weakly bounded, or obviously AI-shaped.
- Keep the pass narrow. Optimize for signal quality, not architectural churn.

When to apply it:
- The user asks to cleanup, refactor, deslop, simplify, dedupe, or remove dead code.
- The current problem is excess code quality debt rather than missing product behavior.
- The request benefits from a regression-tests-first cleanup pass rather than a rewrite.

Panda cleanup contract:
- Lock behavior with targeted regression tests before cleanup edits.
- State the cleanup scope explicitly and keep edits within that scope.
- Create a concise cleanup plan before changing code.
- Pass order:
  1. Dead code deletion
  2. Duplicate removal
  3. Naming and error-handling cleanup
  4. Test reinforcement
- Re-run targeted verification after each pass.
- Prefer deletion and simplification over new abstraction.
- Do not rewrite architecture unless the user explicitly expands scope.
${context.skillProfile === 'strict_workflow' ? '- Do not start cleanup edits until behavior is protected by targeted regression tests.\n- Treat the cleanup plan and pass order as mandatory workflow, not optional guidance.' : ''}

Quick reference:
- Scope: files or behavior being cleaned
- Behavior lock: targeted tests proving behavior is preserved
- Cleanup plan: smells to remove and pass order
- Quality gates: tests, lint, typecheck, format, relevant diagnostics

Required final report:
- Scope
- Behavior lock
- Cleanup plan
- Passes completed
- Quality gates run
- Changed files
- Remaining risks

Common mistakes:
- Folding multiple cleanup categories into one broad refactor
- Adding new wrappers or helpers instead of deleting code
- Expanding beyond the named files or behavior
- Treating manual inspection as a substitute for regression tests

Red flags:
- Editing before protecting behavior with tests
- Mixing unrelated refactors into the same pass
- Expanding beyond the named files or behavior
- Adding abstraction instead of removing slop`,
}
