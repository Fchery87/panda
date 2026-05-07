# Status: Panda Design System Redesign

## Current milestone: Complete

## Last completed

- Milestone 1 - Design Contract And Global Tokens - 2026-05-06
- Milestone 2 - Public Landing Surface - 2026-05-06
- Milestone 3 - Workbench Shell And Mobile Focus Views - 2026-05-06
- Milestone 4 - Verification - 2026-05-06
- Color system refresh - 2026-05-07

## Decision log

- `docs/DESIGN.md` overrides the older warm amber design language in AGENTS.md.
- Scope is centered on shared tokens, public landing, and the primary workbench
  shell because those surfaces define the product redesign and are feasible to
  verify in one pass.
- Existing Convex data/query behavior stays unchanged.
- Tailwind semantic colors now use OKLCH channel variables so `docs/DESIGN.md`
  tokens are the source of truth.
- The public landing page now uses a hard-framed operational preview rather than
  the previous warm terminal hero.
- The live workbench shell now uses a high-contrast rail, hard divisions, and
  mobile Session/Chat/Proof/Preview focused views.
- Dev visual smoke now passes on desktop, tablet, and mobile screenshots after
  replacing Tailwind opacity-modifier `@apply` rules with explicit OKLCH CSS.
- The shared light and dark theme tokens now use a warm cream, orange, and dark
  navy colorway while preserving the existing layout and brutalist component
  structure.

## Known issues

- Local `mgrep` is quota-blocked, so repo inspection is using direct file reads
  and `rg`.
- `bun run format:check` fails on 80 pre-existing unformatted files outside this
  patch set. Files touched for this redesign pass `prettier --check`.

## Verification

- `bun test apps/web/app/design-system-css.test.ts` passes.
- `bun run lint` passes.
- `bun run typecheck` passes.
- Full `bun test` passes.
- Playwright screenshots pass for landing page desktop, tablet, and mobile:
  `/tmp/panda-home-desktop.png`, `/tmp/panda-home-tablet.png`, and
  `/tmp/panda-home-mobile.png`.
- Focused Prettier check for files touched in this redesign passes.
- 2026-05-07 color refresh: `bun test apps/web/app/design-system-css.test.ts`
  passes.
- 2026-05-07 color refresh: `bun run lint` passes.
- 2026-05-07 color refresh: `bun run typecheck` passes.
- 2026-05-07 color refresh: focused Prettier check for touched files passes.
- Repo-wide `bun run format:check` remains blocked by unrelated pre-existing
  formatting drift.

## Future work

- Extend the same design language to education, settings, admin, login,
  maintenance, error, not-found, and shared-chat surfaces after the shell pass.
