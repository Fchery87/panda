# PLAN: Panda.ai Design Redesign

## Milestone 1: Design Token Foundation

**What**: Override globals.css with new refined palette. Update
tailwind.config.ts. Update panda-logo SVG and palette. **Acceptance**: Colors,
typography, and spacing correctly applied. Logo renders cleanly. **Validation**:
`bun run typecheck && bun run lint && bun run format:check` **Status**: [ ]
pending

## Milestone 2: Shared Layout Components

**What**: Redesign PublicNav, PublicFooter, Dashboard layout. New custom icon
system. **Acceptance**: Navigation and footer render with new design tokens. All
links work. **Validation**: `bun run typecheck && bun run lint` **Status**: [ ]
pending

## Milestone 3: Landing Page

**What**: Full redesign of page.tsx — hero section, differentiation, workflow
steps, features grid, CTA. **Acceptance**: All sections render, animations work,
responsive. **Validation**: `bun run typecheck && bun run lint && bun test`
**Status**: [ ] pending

## Milestone 4: Dashboard & Projects

**What**: Redesign (dashboard)/layout.tsx, projects/page.tsx, and project
creation dialog. **Acceptance**: Project list renders, create/delete flows work,
search works. **Validation**: `bun run typecheck && bun run lint` **Status**: [
] pending

## Milestone 5: Login & Education Pages

**What**: Redesign login/page.tsx, education/page.tsx. **Acceptance**: Auth flow
works, education guide renders with new design. **Validation**:
`bun run typecheck && bun run lint` **Status**: [ ] pending

## Milestone 6: Admin Page

**What**: Redesign admin/page.tsx and admin layout. **Acceptance**: Admin
overview renders with new design, cards link to sub-pages. **Validation**:
`bun run typecheck && bun run lint` **Status**: [ ] pending

## Milestone 7: Final Validation Gate

**What**: Run full gate — typecheck, lint, format:check, test, build.
**Acceptance**: Zero errors, zero warnings, all tests pass, build succeeds.
**Validation**:
`bun run typecheck && bun run lint && bun run format:check && bun test && bun run build`
**Status**: [ ] pending
