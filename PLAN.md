# Plan: Harness File Materialization Review

## Milestone 1: Trace File Creation Path

What: Trace chat request -> mode routing -> run execution -> tool calls ->
project file mutations -> file tree queries. Acceptance criteria: root cause
hypothesis is grounded in source references and a reproducible boundary.
Validation: read-only source inspection plus focused existing tests. Status: [x]
complete

## Milestone 2: Add Regression Coverage

What: Add the smallest failing test that proves a file created through the
harness-visible project filesystem appears in the file-tree representation used
by the UI. Acceptance criteria: the test fails before the fix for the observed
reason. Validation: focused `bun test ...` command. Status: [x] complete

## Milestone 3: Implement Root Fix

What: Patch the source-of-truth mismatch so project file writes and file tree
refresh use the same persisted project filesystem contract. Acceptance criteria:
regression test passes without changing mode policy or adding fake UI-only
entries. Validation: focused `bun test ...` command. Status: [x] complete

## Milestone 4: Verify And Record

What: Run focused affected tests and update `STATUS.md` with evidence,
explanation, and remaining risks. Acceptance criteria: commands and root cause
are recorded. Validation: focused tests plus type/lint if impacted files require
it. Status: [x] complete
