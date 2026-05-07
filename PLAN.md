# Plan: Panda Design System Redesign

## Milestone 1: Design Contract And Global Tokens

What: Add regression coverage for the design-system contract, then replace the
global theme primitives with OKLCH channel tokens, hard grid utilities, flat
directional shadows, and non-side-stripe state indicators.

Acceptance criteria: `apps/web/app/design-system-css.test.ts` verifies the new
token and texture contract. Tailwind semantic colors resolve against OKLCH
channels.

Validation: `bun test apps/web/app/design-system-css.test.ts`

Status: [x] complete

## Milestone 2: Public Landing Surface

What: Rework the landing page composition to match the reference concept:
operational masthead, hard frame, mode strip, responsive workbench preview, and
bounded trust/proof messaging.

Acceptance criteria: Landing page remains keyboard navigable, responsive, and
uses the new design tokens without soft-card or amber remnants.

Validation: `bun run typecheck && bun run lint`

Status: [x] complete

## Milestone 3: Workbench Shell And Mobile Focus Views

What: Apply the design system to the project shell, rail, center workspace home,
right inspector, bottom dock, and mobile Session/Chat/Proof/Preview navigation.

Acceptance criteria: Desktop keeps the required regions; mobile remains focused
by view; source tests cover primary layout language and mobile labels.

Validation:
`bun test apps/web/components/projects/project-workspace-layout.test.tsx`

Status: [x] complete

## Milestone 4: Verification

What: Run the repo validation gate and repair failures before completion.

Acceptance criteria: Typecheck, lint, format check, and tests pass or any
blocker is recorded with exact output.

Validation:
`bun run typecheck && bun run lint && bun run format:check && bun test`

Status: [x] complete with recorded formatter blocker
