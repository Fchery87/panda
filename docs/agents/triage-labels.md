# Triage Labels

This repo uses the default canonical triage label vocabulary.

## Label Mapping

| Role                        | Label             |
| --------------------------- | ----------------- |
| Needs maintainer evaluation | `needs-triage`    |
| Waiting on reporter         | `needs-info`      |
| Ready for an AFK agent      | `ready-for-agent` |
| Ready for a human           | `ready-for-human` |
| Will not be actioned        | `wontfix`         |

## Consumer Rules

The `triage` skill should apply these exact labels when moving issues through
the triage state machine.

Do not invent duplicate labels for the same roles. If the repo changes label
names later, update this file before running triage workflows.
