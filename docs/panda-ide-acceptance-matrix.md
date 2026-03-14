# Panda IDE Acceptance Matrix

> Historical acceptance reference. Some entries describe older UI assumptions;
> use the current Playwright suite and
> [VALIDATION_TASKS.md](../VALIDATION_TASKS.md) for the latest acceptance bar.

## Core Workbench

| Workflow                    | Expected Result                                       | Status Target |
| --------------------------- | ----------------------------------------------------- | ------------- |
| Open project from dashboard | Workbench loads with explorer, editor, terminal, chat | Required      |
| Desktop timeline tab        | Timeline shows run history for active chat            | Required      |
| Mobile timeline tab         | Timeline shows same run history as desktop            | Required      |
| Preview tab                 | Not present anywhere in the workbench                 | Required      |
| File create/rename/delete   | Explorer and editor state stay in sync                | Required      |
| File tab switching          | Active tab and selected file remain aligned           | Required      |

## Editing

| Workflow                        | Expected Result                                            | Status Target |
| ------------------------------- | ---------------------------------------------------------- | ------------- |
| Open file from explorer         | File content loads in editor                               | Required      |
| Save file                       | Convex file record updates and dirty state clears          | Required      |
| Jump to file location           | Cursor moves and line highlight appears                    | Required      |
| Inline chat on selection        | Selection can be transformed without breaking editor state | Stretch       |
| Edit `MEMORY_BANK.md` in editor | No silent overwrite from memory panel                      | Required      |

## Agent Runs

| Workflow               | Expected Result                                                               | Status Target |
| ---------------------- | ----------------------------------------------------------------------------- | ------------- |
| Send ask-mode prompt   | User message persists, run starts, assistant response persists                | Required      |
| Send build-mode prompt | Progress, tool calls, artifacts, and final message stay correlated to one run | Required      |
| Run progress panel     | Live steps stream during run and replay after refresh                         | Required      |
| Checkpoint badge       | Badge reflects real checkpoint state                                          | Required      |
| Resume run             | Resume action actually continues a saved session                              | Required      |
| Eval run               | Eval output is tied to the last run context                                   | Stretch       |

## Artifacts

| Workflow                            | Expected Result                                       | Status Target |
| ----------------------------------- | ----------------------------------------------------- | ------------- |
| Manual apply file artifact          | File updates once and artifact becomes completed      | Required      |
| Manual apply command artifact       | Single job created, single execution recorded         | Required      |
| Auto-apply allowed file artifact    | Same execution path as manual apply                   | Required      |
| Auto-apply allowed command artifact | Same execution path as manual apply                   | Required      |
| Apply all                           | Stops safely on first failure, statuses stay accurate | Required      |
| Reject artifact                     | Artifact cannot execute afterward                     | Required      |

## Terminal / Jobs

| Workflow                   | Expected Result                                           | Status Target |
| -------------------------- | --------------------------------------------------------- | ------------- |
| Run allowed command        | Job moves queued -> running -> completed/failed with logs | Required      |
| Run blocked command        | Route rejects with clear error and job fails safely       | Required      |
| Cancel running command     | Child process is signaled and job finishes cancelled      | Required      |
| Refresh during running job | Job logs and status recover from persisted state          | Required      |
| Command from artifact      | Uses same lifecycle as terminal-submitted job             | Required      |

## Governance / Security

| Workflow                                    | Expected Result                                  | Status Target |
| ------------------------------------------- | ------------------------------------------------ | ------------- |
| Read spec by ID from another user's project | Access denied                                    | Required      |
| Update spec in another user's project       | Access denied                                    | Required      |
| List chat specs without ownership           | Access denied                                    | Required      |
| Get subagent by foreign ID                  | Unauthorized                                     | Required      |
| Admin disables MCP                          | MCP UI hidden and backend mutations blocked      | Required      |
| Admin disables subagents                    | Subagent UI hidden and backend mutations blocked | Required      |

## Product Quality Gates

| Command                   | Expected Result       | Status Target |
| ------------------------- | --------------------- | ------------- |
| `bun run typecheck`       | exit 0                | Required      |
| `bun run lint`            | exit 0, zero warnings | Required      |
| `bun run format:check`    | exit 0                | Required      |
| `cd apps/web && bun test` | all tests pass        | Required      |
| `bun run build`           | exit 0                | Required      |
