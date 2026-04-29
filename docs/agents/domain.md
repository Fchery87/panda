# Domain Docs

This repo uses a single-context domain documentation layout.

## Layout

- Domain context: `CONTEXT.md`
- ADRs: `docs/adr/` when present

## Consumer Rules

Skills that need project language or architectural context should read `CONTEXT.md` before making domain-sensitive changes.

Skills that need architectural decision history should read ADRs from `docs/adr/` when that directory exists.

This repo does not currently use `CONTEXT-MAP.md`. If the repo later moves to multiple domain contexts, create `CONTEXT-MAP.md` and update this file to describe the new routing rules.
