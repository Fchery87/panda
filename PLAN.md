# Plan: "Ink & Paper" redesign

## Milestone 1: Token foundation
What: Rewrite globals.css (new OKLCH tokens light+dark, `.ink-panel`, restyled utilities), extend tailwind.config.ts (display font, ink/lavender/iris/teal roles), swap fonts in app/layout.tsx (+ its test mock), pill Button, new PandaLogo, strip `rounded-none` overrides globally.
Acceptance: app compiles; design contract test updated and green.
Validation: `bun run typecheck` + `bun test apps/web/app/design-system-css.test.ts apps/web/app/layout.test.tsx`

## Milestone 2: Public surface
What: Landing page rewrite (paper/ink split hero, run-receipt ink card, workflow timeline, feature cards), PublicNav (floating pill nav), PublicFooter (ink panel), login page (centered paper card).
Acceptance: pages render, copy per sentence-case plain-verb rules.
Validation: `bun run typecheck && bun run lint`

## Milestone 3: Dashboard surface
What: DashboardHeader (clean product header), AuthenticatedPageShell (soft centered layout, keeps props API), projects page (Codex-style home: greeting, quiet search, card list, hero empty state).
Acceptance: all existing handlers/dialogs/aria kept; settings page still renders via shell.
Validation: `bun test apps/web/app` + typecheck

## Milestone 4: Workbench chrome
What: WorkbenchTopBar → ink panel; workspace shell container polish (rounded, soft shadow).
Acceptance: design-system test aria-label checks still pass.
Validation: `bun test apps/web/app/design-system-css.test.ts` + typecheck

## Milestone 5: Docs + full gate
What: Rewrite docs/DESIGN.md; run full gate; fix fallout.
Validation: `bun run typecheck && bun run lint && bun test`

Merge contract: single stream, no parallel worktrees.
