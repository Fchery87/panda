# Status: Project Font Update

## Current milestone: Validation

## Last completed: Validation - 2026-05-02

## Decision log

- Use `Inter` from `next/font/google` for UI text because the user requested
  that source explicitly.
- Use `GeistMono` from `geist/font/mono` for monospace text because the user
  requested that source explicitly.
- Keep `--font-sans` and `--font-mono` because Tailwind and global CSS already
  consume those variables consistently.
- Do not update `CONTEXT.md` because this is a design-system implementation
  detail, not domain language.
- Do not create an ADR because the choice is reversible and not surprising
  enough to require architectural history.

## Known issues

- None currently.

## Future work (out of scope, log here)

- Revisit font feature settings only if visual QA shows unwanted glyph
  alternates or ligatures.
