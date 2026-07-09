# Status: "Ink & Paper" redesign

## Current milestone: All milestones complete (2026-07-06)

## Completed in this run

1. **M1 Token foundation** — globals.css fully rewritten (Ink & Paper OKLCH tokens, light + dark designed, `.ink-panel` signature, all legacy utility class names kept and restyled); tailwind.config.ts extended (ink/lavender/iris/teal roles, font-display, radius scale); fonts swapped to Bricolage Grotesque + Schibsted Grotesk (+ layout.test.tsx mock); Button → pill; PandaLogo → ink chop with lavender seal; `rounded-none` stripped from 111 files.
2. **M2 Public surface** — landing page rewritten (paper/ink split hero with animated run-receipt ink card, "How a run works" sequence, feature trio); PublicNav → floating pill nav; PublicFooter → ink panel; login → centered paper card.
3. **M3 Dashboard** — DashboardHeader → clean product header (pill nav, search pill, ink CTA); AuthenticatedPageShell → soft centered layout (props API unchanged); projects page → Codex-style home (display greeting, rounded search, card list with ink chops, hero empty state). All handlers/dialogs/aria preserved.
4. **M4 Workbench chrome** — WorkbenchTopBar wears `.ink-panel` (auto re-themes descendants); status pills rounded; shell frame rounded-xl.
5. **M5 Docs + gate** — docs/DESIGN.md rewritten; design-system-css.test.ts pins the new contract.

## Validation

- `bun run typecheck` — pass (exit 0)
- `bun run lint` — pass (3 pre-existing warnings in useAgent.ts, untouched)
- `bun test` (full suite) — pass (exit 0); app 78/78, components+hooks 353/353
- Visual mirror pass via Playwright on dev server: landing light/dark at 1280, light at 390 + 1920, login at 1280 — layout holds, signature in first screenful. Fixed: sign-in button centering.
- Not visually verified (auth-gated): projects page, workbench in-browser render.

## Decision log

- `.ink-panel` = local CSS-variable re-theme; portaled popovers intentionally stay paper.
- Dark mode = "all ink"; lavender becomes the action color there.
- Education/admin/settings pages inherit the new tokens + shell + button styles but did not get bespoke layouts this run.

## Future work discovered

- Bespoke ink/paper treatment for education page content and admin tables.
- Regenerate `icon.svg` favicon to match the new logo mark (lavender seal).
- Interior workbench panels (Timeline, chat, editor dock) could use ink-panel on terminal/run surfaces.
