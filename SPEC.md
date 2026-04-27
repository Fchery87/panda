# Spec: Routing Engine and Execution Receipts

## Deliverables

- [ ] A typed routing domain that models requested mode, resolved mode, routing
      input, routing decision, thread state, and WebContainer status.
- [ ] Deterministic routing rules that resolve common user intents without an
      LLM classifier in the first implementation phase.
- [ ] `useAgent` integration that intentionally distinguishes `requestedMode`
      from `resolvedMode` anywhere mode affects prompts, messages, run creation,
      annotations, usage metrics, runtime config, or UI state.
- [ ] Typed, versioned execution receipt validators in Convex, including
      `ExecutionReceiptV1` and its nested routing, context audit, WebContainer,
      native execution, token, and approval summary records.
- [ ] Atomic receipt persistence through the existing run terminal lifecycle so
      `complete`, `fail`, and `stop` write terminal status and receipt data
      together.
- [ ] A bounded and redacted receipt builder that assembles receipt data from
      routing decisions, prompt audit data, run/tool events, token usage,
      permission approvals, and WebContainer/native execution summaries.
- [ ] UI support for routing visibility and receipt inspection, starting with a
      routing badge and then upgrading the existing run content surface.
- [ ] Tests covering deterministic routing, manual override behavior,
      WebContainer fallback behavior, receipt validation, and receipt
      persistence for completed, failed, and stopped runs.

## Constraints

- Typed receipts are mandatory. Do not store the canonical receipt as `v.any()`.
- Receipt persistence must be atomic with terminal run state. Do not add a
  separate best-effort post-completion `storeReceipt` mutation as the canonical
  path.
- Manual mode and routed mode must be represented explicitly as `requestedMode`
  and `resolvedMode`.
- Do not globally block `code` or `build` mode on WebContainer readiness. Fall
  back to native/server execution unless the specific action truly requires
  WebContainer.
- Keep derived thread state out of Zustand unless a concrete UI-session state
  need exists. Prefer deriving it from Convex data plus WebContainer status at
  the routing boundary.
- Receipt data must be bounded and redacted. Store paths, counts, summaries,
  token stats, approvals, and redacted command summaries; do not store raw file
  content or unbounded command/tool payloads.
- Phase 1 must be deterministic rules only. Do not add an LLM routing classifier
  until a later feature-flagged phase.
- Preserve existing behavior for manual mode switching, oversight level,
  approval dialogs, planning sessions, specs, and existing WebContainer fallback
  behavior.
- Follow the 4 canonical modes: `ask`, `plan`, `code`, and `build`.
- Follow the existing brutalist UI system for new UI surfaces.

## Out of Scope

- LLM-based intent classification for routing.
- New review/inspector tabs or a parallel cockpit panel.
- Replacing the existing permission system.
- Replacing planning sessions or the specification system.
- Storing raw file contents, raw command output, raw tool arguments, provider
  secrets, tokens, or other sensitive payloads in receipts.
- Reworking WebContainer boot architecture beyond the status and execution
  summary contracts required for routing and receipts.
