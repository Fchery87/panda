# Spec: Execution Session Shell Restructure

## Deliverables

- [ ] Rebuild the desktop workspace around an Execution Session first shell.
- [ ] Keep the left side as persistent session/navigation rail.
- [ ] Promote chat/session timeline and composer to the center canvas.
- [ ] Convert the right side into a contextual work tray with Work, Proof,
      Changes, Context, and Preview views.
- [ ] Keep terminal in a bottom drawer and move agent-event review into Proof.
- [ ] Preserve feature reachability for files/editor, diff review, terminal,
      preview, run proof, receipts, plan review, memory, evals, share, history,
      command palette, permissions, runtime status, contextual chat, inline
      chat, and mobile navigation.
- [ ] Update tests and docs for the Execution Session Shell terminology and IA.

## Constraints

- Preserve existing runtime behavior and data flow unless a phase explicitly
  moves a surface.
- Keep Panda's brutalist visual system: sharp corners, monospace controls,
  explicit borders, operational labels, and no T3 visual clone.
- Implement in vertical phases; do not advance past a phase until its validation
  gate passes or a blocker is documented.
- Do not add Convex schema or persisted layout preference changes in this pass.
- Do not remove existing mobile navigation or panel switching behavior.

## Out of scope (log here during the run, do not act on)

- Rebuilding the chat engine, editor, terminal emulator, diff viewer, or preview
  runtime.
- Creating a new persisted session object model.
- Adding new AI provider or model-selection behavior.
