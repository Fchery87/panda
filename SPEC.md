# Spec: Admin/User Policy Settings UI and Docs

## Deliverables

- [x] Add admin settings support for command-family defaults.
- [x] Add user settings support for stricter command-family preferences inside
      the admin ceiling.
- [x] Show effective Harness Policy summaries in user settings.
- [x] Show admin MCP transport ceilings in user MCP settings and prevent users
      from selecting blocked transports in the UI.
- [x] Keep admin settings audit entries redacted and focused on changed policy
      keys.
- [x] Update active docs to explain policy layers, command-family settings, MCP
      transport ceilings, and Unattended Execution behavior.

## Constraints

- Do not expose secrets, raw command strings, MCP headers, provider tokens,
  signed URLs, raw tool args, or raw reasoning in settings, audit entries, or
  docs examples.
- User preferences may only make command-family behavior stricter than admin
  defaults; they must not loosen an admin ask or deny.
- Project-scoped MCP remains recommendation-only until project/team governance
  exists.
- Convex schema changes must be widen-first and existing rows must remain valid.
- Convex query payloads must remain bounded/redacted.
- Preserve existing admin and user settings UX unless adding policy summaries or
  admin ceiling explanations.

## Out of scope (log here during the run, do not act on)

- Wiring command-family settings into production runtime enforcement beyond the
  existing resolved Harness Policy path.
- Project/team governance for project-scoped MCP activation.
- Secret storage or encrypted MCP env management.
- Full MCP marketplace/discovery UX.
