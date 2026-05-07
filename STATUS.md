# Status: Authenticated Page Cohesion Pass

## Current milestone: Complete

## Last completed

- Milestone 1 - Surface Audit And Shared Layout Strategy - 2026-05-07
- Milestone 2 - Shared Cohesive Page Primitives - 2026-05-07
- Milestone 3 - Apply To Projects, Settings, And Admin - 2026-05-07
- Milestone 4 - Verification - 2026-05-07
- Header And Navigation Cohesion - 2026-05-07

## Decision log

- Scope targets authenticated hub pages (`/projects`, `/settings`, `/admin`)
  because the user identified them as visually disconnected from landing.
- Preserve behavior and data/auth boundaries; this pass changes layout and
  presentation only.
- Use shared primitives where possible so future authenticated pages inherit the
  landing page rhythm.
- Landing uses a hard-framed `dot-grid` composition; `/projects` and `/settings`
  should move into a matching authenticated frame instead of remaining narrow
  standalone pages.
- Admin already has shared navigation/header components, so the cohesive update
  should happen in `app/admin/layout.tsx` and `components/admin/AdminSubNav.tsx`
  rather than rewriting every admin tool page.
- Added `AuthenticatedPageShell` and `AuthenticatedModeStrip` to carry the
  landing page frame, header band, mode strip, and dark separator gutters into
  authenticated pages.
- `/projects` now uses the shared frame with a registry panel and session-signal
  rail while preserving existing project create/open/delete behavior.
- `/settings` now uses the shared frame with settings mode strips and the
  existing section navigation/content preserved.
- Admin uses the same grid canvas and hard framed content area, with the sidebar
  shifted to dark product chrome and admin subheaders converted to framed bands.
- Header/nav follow-up: public, dashboard, and admin navigation should use the
  same hard-framed grammar as the landing hero rather than separate soft toolbar
  treatments.
- Public and dashboard headers now use a max-width hard frame, segmented nav
  cells, explicit CTA/action zones, and the same foreground border language as
  the landing hero frame.
- Admin navigation is now a framed dark console rail with rectangular active
  cells instead of a plain fixed sidebar.

## Known issues

- `mgrep` failed locally, so source inspection is using direct reads and
  targeted file search.
- `apps/web/next-env.d.ts` has an unrelated pre-existing generated diff and must
  not be treated as part of this pass.

## Verification

- `bun run typecheck` passes.
- `bun run lint` passes.
- Focused Prettier check for changed files passes.
- Header/nav follow-up: `bun run typecheck` passes.
- Header/nav follow-up: `bun run lint` passes.
- Header/nav follow-up: focused Prettier check for changed files passes.

## Future work

- Extend the same page flow to login, education, maintenance, error, not-found,
  and shared-chat after this pass if needed.
