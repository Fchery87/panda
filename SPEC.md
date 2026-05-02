# Spec: Project Font Update

## Deliverables

- [ ] Use Inter as the canonical UI font through the existing sans font
      variable.
- [ ] Use GeistMono as the canonical code and monospace UI font through the
      existing mono font variable.
- [ ] Preserve existing typography class usage and font feature settings unless
      validation requires a change.

## Constraints

- Do not rewrite component-level `font-mono` or `font-sans` usage.
- Do not update domain glossary docs for this implementation-level styling
  change.
- Keep the existing CSS variable contract: `--font-sans` and `--font-mono`.

## Out of scope (log here during the run, do not act on)

- Component-by-component typography redesign.
- ADR creation for this reversible styling choice.
