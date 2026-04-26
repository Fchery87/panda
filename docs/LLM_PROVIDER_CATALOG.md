# LLM Provider Catalog

> Last updated: April 26, 2026
>
> Audience: Panda engineers maintaining provider settings, admin model
> selectors, and prompt enhancement model choices.

## Purpose

Panda uses `models.dev` as the live directory for LLM provider and model
metadata. The app normalizes that external catalog into Panda provider configs
so settings, chat sessions, admin defaults, and provider selectors stay current
as providers add or retire models.

The live source was rechecked on April 26, 2026:

- `https://models.dev` serves the public model directory.
- Panda fetches the catalog through `https://models.dev/api.json`.
- Provider logos are addressed as `https://models.dev/logos/{provider}.svg`.

## Data Flow

Provider data flows through four layers:

1. The app route fetches the upstream `models.dev` JSON catalog.
2. The catalog adapter maps provider records into Panda catalog entries.
3. The settings hydration layer merges catalog entries into saved provider
   configs.
4. UI selectors read the hydrated provider configs and shared fallback
   definitions.

This means newly added catalog providers can appear in settings/admin selectors
without a source edit, while known Panda providers can still use specialized
runtime implementations.

## Catalog Normalization

Treat every upstream field as optional unless the local adapter validates it.
The catalog adapter must tolerate:

- provider IDs that differ from Panda's runtime provider IDs
- model records that omit `id` and rely on their record key as the model ID
- missing provider API URLs, docs URLs, env var names, or package metadata
- old and new cost/limit field shapes
- deprecated or undated model records

Panda sorts provider models for display by lifecycle and freshness, then falls
back to model ID ordering. Deprecated models should appear after active models.

## Provider Config Hydration

Saved provider settings may be older than the current catalog. On settings and
admin surfaces, Panda hydrates those saved configs with current catalog data:

- existing provider configs keep user-controlled values such as API keys,
  enabled state, base URL overrides, and selected defaults
- catalog models are merged into each provider's available model list
- catalog metadata updates provider names, descriptions, and base URLs when
  available
- newly discovered catalog providers are inserted disabled by default
- provider-specific model refreshes can replace or supplement catalog models
  after the user has configured credentials

Do not persist catalog additions as enabled providers automatically. The user or
admin must explicitly enable and configure credentials.

## Static Definitions

Shared static provider definitions remain as fallbacks for known providers and
providers that are not yet represented in `models.dev`. They should not be used
as the primary source of truth for current catalog coverage or model lists.

When adding a provider manually, first check whether it can be represented by
the catalog path. Only add a static definition when Panda needs a known
fallback, special runtime behavior, or prompt enhancement support that the
catalog cannot express yet.

## UI Invariants

- Settings provider cards must not nest interactive controls inside another
  button. Switches and expand buttons are sibling controls to avoid hydration
  errors and invalid HTML.
- Admin model selectors should be built from hydrated provider definitions, not
  hardcoded model lists.
- Prompt enhancement provider choices should include configured providers that
  are valid for enhancement, including catalog-backed providers when explicitly
  supported.
- Catalog counts are informational and time-sensitive. Avoid hardcoding provider
  or model totals in UI copy or docs.

## Test Coverage To Preserve

Keep regression tests around these behaviors:

- catalog entries use the `models.dev` record key when a model record omits `id`
- catalog hydration adds newly discovered providers to saved settings disabled
  by default
- provider definitions include configured providers and fresh model lists
- admin LLM config selectors receive hydrated provider definitions
- prompt enhancement provider options include supported dynamic providers
- provider settings cards avoid nested button markup

## Operational Notes

The catalog is cached in memory for a short period to avoid repeatedly fetching
the upstream directory during a single app session. If `models.dev` is
unavailable, Panda keeps using the most recent cached catalog when one exists
and falls back to local static definitions otherwise.

When debugging stale provider data, verify both the upstream catalog and the
hydrated provider configs before changing static definitions.
