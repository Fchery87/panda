# Panda Context

## Glossary

### Run

A `Run` is one agent execution lifecycle tied to a chat turn or approved plan
execution.

Use `run orchestration` for the Module that owns the lifecycle ordering of a
Run: message creation, run record updates, event application, receipt summary,
and plan/spec context attachment. Runtime execution internals, UI rendering, and
command execution remain outside run orchestration.

### Plan

A `Plan` is the reviewable strategy the user accepts before execution. An
approved Plan owns execution intent for build-from-plan work.

### Spec

A `Spec` is formal requirements, constraints, and acceptance criteria. A Spec is
verification context attached to a Run, not a parallel approval lifecycle,
unless a future product requirement explicitly creates that separate lifecycle.

### Run Projection

A `Run Projection` is a surface-specific view of Run facts. Chat projections are
bounded timeline summaries. Proof projections may include inspection detail, but
remain redacted and bounded. Public share projections never include owner-only
execution detail, raw reasoning, provider secrets, signed URLs, private files,
or checkpoint payloads.

### Runtime Command Execution

`Runtime Command Execution` is browser-first with server fallback. The terminal
surface owns user intent and rendering; the command execution Adapter owns
runtime selection, status transitions, output shaping, and failure
classification across WebContainer and server-backed execution paths.
