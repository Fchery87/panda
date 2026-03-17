# Models.dev Dynamic Provider Catalog Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Enable users to browse all 130+ providers from models.dev, add any
provider with their own API key, and use dynamic providers safely in Panda's
primary web runtime path while preserving specialized implementations for the 9
existing providers.

**Architecture:** Replace the hardcoded provider list with a dynamic catalog
sourced from models.dev. The existing 9 providers merge into the catalog with
their specialized implementations (Anthropic SDK, DeepSeek reasoning, Chutes
OAuth). All other providers instantiate via `OpenAICompatibleProvider` using
base URLs from models.dev. Provider probing and model refresh must go through
Panda-owned server routes, not direct browser calls to third-party APIs, to
avoid CORS and credential handling problems.

**Scope Decision:** Before implementation, explicitly choose whether dynamic
providers are supported only in the web runtime/settings flow for this phase, or
whether Convex HTTP/action endpoints (`convex/http.ts`, `convex/llm.ts`,
`convex/enhancePrompt.ts`) must also accept dynamic providers in the same
release. Do not imply "works everywhere" unless both paths are updated and
tested.

**Tech Stack:** Next.js (React), Convex (backend), existing LLM provider
abstraction (`apps/web/lib/llm/`), models.dev REST API
(`https://models.dev/api/models.json`)

**Scope Decision (2026-03-17):** Primary web runtime only. Dynamic providers are
supported in settings + `useProjectChatSession` + the `apps/web/lib/llm/*`
provider registry path. Convex HTTP/action endpoints remain limited to current
built-in providers for now.

**Non-goal (Phase 1):** Dynamic providers are not yet supported through legacy
Convex HTTP/action endpoints. Those paths remain restricted to the current
built-in provider set until a follow-up migration lands.

---

## Task 0: Lock Phase Scope and Runtime Boundaries

**Files:**

- Modify: `docs/plans/2026-03-16-models-dev-dynamic-provider-catalog.md` (record
  decision)
- Review: `apps/web/hooks/useProjectChatSession.ts`
- Review: `convex/http.ts`
- Review: `convex/llm.ts`
- Review: `convex/enhancePrompt.ts`

**Step 1: Decide supported execution paths for this release**

Pick one of these two options and record it in the plan before touching code:

1. **Primary web runtime only**: dynamic providers are supported in settings +
   `useProjectChatSession` + the `apps/web/lib/llm/*` provider registry path.
   Convex HTTP/action endpoints remain limited to current built-in providers for
   now.
2. **Full stack support**: dynamic providers are supported in both the primary
   web runtime and existing Convex HTTP/action endpoints.

**Step 2: If choosing primary web runtime only, add an explicit non-goal**

Add this note to the plan and PR description:

```markdown
**Non-goal (Phase 1):** Dynamic providers are not yet supported through legacy
Convex HTTP/action endpoints. Those paths remain restricted to the current
built-in provider set until a follow-up migration lands.
```

**Step 3: If choosing full stack support, add a backend task before UI work**

Insert a task covering these files:

- `convex/http.ts`
- `convex/llm.ts`
- `convex/enhancePrompt.ts`

That task must:

- remove hardcoded provider validation that rejects unknown provider IDs,
- allow dynamic `baseUrl`/`defaultModel` configuration to flow through safely,
- preserve special-case behavior for Anthropic and Z.ai,
- add tests or manual verification steps for the Convex path.

**Step 4: Commit the plan decision**

```bash
git add docs/plans/2026-03-16-models-dev-dynamic-provider-catalog.md
git commit -m "docs: clarify models.dev dynamic provider rollout scope"
```

---

## Task 1: Widen `ProviderType` to Accept Dynamic Provider IDs

**Files:**

- Modify: `apps/web/lib/llm/types.ts:14-24` (ProviderType union)
- Modify: `apps/web/lib/llm/types.ts:240-282` (getDefaultProviderCapabilities)
- Modify: `apps/web/lib/llm/model-metadata.ts:26-37`
  (PROVIDER_FALLBACK_CONTEXT_WINDOWS)

**Step 1: Change `ProviderType` from strict union to branded string**

In `apps/web/lib/llm/types.ts`, replace lines 14-24:

```typescript
/**
 * Well-known provider IDs with specialized implementations.
 * Any string is valid as a ProviderType for dynamic models.dev providers.
 */
export const KNOWN_PROVIDERS = [
  'openai',
  'openrouter',
  'together',
  'anthropic',
  'zai',
  'chutes',
  'deepseek',
  'groq',
  'fireworks',
  'custom',
] as const

export type KnownProviderType = (typeof KNOWN_PROVIDERS)[number]

/**
 * Provider type - known providers or any dynamic models.dev provider ID.
 */
export type ProviderType = KnownProviderType | (string & {})

export function isKnownProvider(type: string): type is KnownProviderType {
  return (KNOWN_PROVIDERS as readonly string[]).includes(type)
}
```

**Step 2: Update `getDefaultProviderCapabilities` to handle unknown providers**

In the same file, update the default case at line 273 to handle any string:

```typescript
export function getDefaultProviderCapabilities(
  type: ProviderType
): ProviderCapabilities {
  switch (type) {
    case 'anthropic':
      return {
        supportsReasoning: true,
        supportsInterleavedReasoning: true,
        supportsReasoningSummary: true,
        supportsToolStreaming: true,
        reasoningControl: 'budget',
      }
    case 'zai':
      return {
        supportsReasoning: true,
        supportsInterleavedReasoning: false,
        supportsReasoningSummary: false,
        supportsToolStreaming: true,
        reasoningControl: 'budget',
      }
    case 'deepseek':
      return {
        supportsReasoning: true,
        supportsInterleavedReasoning: false,
        supportsReasoningSummary: true,
        supportsToolStreaming: true,
        reasoningControl: 'effort',
      }
    default:
      return {
        supportsReasoning: false,
        supportsInterleavedReasoning: false,
        supportsReasoningSummary: false,
        supportsToolStreaming: true,
        reasoningControl: 'none',
      }
  }
}
```

**Step 3: Update `PROVIDER_FALLBACK_CONTEXT_WINDOWS` to use a Map with
fallback**

In `apps/web/lib/llm/model-metadata.ts`, replace lines 26-37:

```typescript
const PROVIDER_FALLBACK_CONTEXT_WINDOWS: Record<string, number> = {
  openai: 128000,
  openrouter: 128000,
  together: 128000,
  anthropic: 200000,
  zai: 128000,
  chutes: 128000,
  deepseek: 64000,
  groq: 128000,
  fireworks: 128000,
  custom: 32000,
}

// Update resolveContextWindow to use fallback for unknown providers
```

In `resolveContextWindow`, change the final return to:

```typescript
return {
  contextWindow: PROVIDER_FALLBACK_CONTEXT_WINDOWS[args.providerType] ?? 128000,
  source: 'fallback',
}
```

**Step 4: Fix TypeScript errors across codebase**

Search for all files that use `ProviderType` as a discriminated union in switch
statements or type guards. Key locations:

- `apps/web/lib/llm/registry.ts:50-75` — `createProvider` switch (handled in
  Task 3)
- `apps/web/lib/llm/reasoning-transform.ts` — provider-specific reasoning
  mapping
- `apps/web/hooks/useProjectChatSession.ts:111-119` — provider type annotation

For `useProjectChatSession.ts`, change the inline type at line 111:

```typescript
const providerConfig = latestSettings.providerConfigs?.[defaultProviderId] as
  | {
      enabled?: boolean
      apiKey?: string
      baseUrl?: string
      defaultModel?: string
      provider?: string // was strict union, now any string
    }
  | undefined
```

**Step 5: Run TypeScript compilation to verify**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | head -50` Expected: No errors
related to ProviderType changes (may have pre-existing errors)

**Step 6: Commit**

```bash
git add apps/web/lib/llm/types.ts apps/web/lib/llm/model-metadata.ts apps/web/hooks/useProjectChatSession.ts
git commit -m "refactor: widen ProviderType to support dynamic models.dev providers"
```

---

## Task 2: Build the Provider Catalog Module

**Files:**

- Create: `apps/web/lib/llm/provider-catalog.ts`
- Modify: `apps/web/lib/llm/models-dev.ts:15-40` (update interfaces)

**Step 1: Update models-dev.ts interfaces to match actual API shape**

The current `ModelsDevModel` interface needs updating to match the real
models.dev API response which uses TOML-derived fields. Update
`apps/web/lib/llm/models-dev.ts` — add these fields to the existing interface:

```typescript
export interface ModelsDevModel {
  id: string
  name: string
  context_length: number
  max_output_tokens?: number
  pricing?: {
    input: number
    output: number
    cache_read?: number
    cache_write?: number
  }
  capabilities?: string[]
  top_provider?: {
    max_completion_tokens?: number
    context_length?: number
  }
  // New fields from models.dev TOML
  tool_call?: boolean
  reasoning?: boolean
  structured_output?: boolean
  vision?: boolean
  attachment?: boolean
  temperature?: boolean
  knowledge?: string
  release_date?: string
  status?: 'alpha' | 'beta' | 'deprecated'
}

export interface ModelsDevProvider {
  provider_id: string
  provider_name: string
  base_url?: string
  env?: string[] // Expected env var names, e.g. ["OPENAI_API_KEY"]
  npm?: string // AI SDK npm package
  doc?: string // Documentation URL
  models: Record<string, ModelsDevModel>
}
```

**Step 2: Create the provider catalog module**

Create `apps/web/lib/llm/provider-catalog.ts`:

```typescript
/**
 * Provider Catalog — dynamic provider registry powered by models.dev
 *
 * Merges models.dev data with Panda's known provider implementations
 * to offer a browsable catalog of 130+ LLM providers.
 */

import type { ModelInfo, ProviderType, KnownProviderType } from './types'
import { isKnownProvider } from './types'
import {
  fetchModelsDevMetadata,
  mapModelsDevToModelInfo,
  type ModelsDevProvider,
  type ModelsDevResponse,
} from './models-dev'
import { appLog } from '@/lib/logger'

/**
 * A catalog entry for a single provider, combining models.dev metadata
 * with Panda-specific flags.
 */
export interface ProviderCatalogEntry {
  /** models.dev provider ID (e.g., "mistral", "openai") */
  id: string
  /** Human-readable name (e.g., "Mistral AI") */
  name: string
  /** Short description */
  description: string
  /** API base URL from models.dev */
  baseUrl?: string
  /** Expected environment variable names for API keys */
  envVars?: string[]
  /** Documentation URL */
  docUrl?: string
  /** AI SDK npm package identifier */
  npmPackage?: string
  /** Provider logo URL */
  logoUrl: string
  /** Pre-mapped model list from models.dev */
  models: ModelInfo[]
  /** Default model ID (first model in list) */
  defaultModel?: string
  /** Whether this provider has a specialized Panda implementation */
  hasSpecialImplementation: boolean
  /** The Panda provider type to use for instantiation */
  providerType: ProviderType
}

/**
 * Map of known providers that have specialized implementations in Panda.
 * These use their dedicated provider classes instead of OpenAICompatibleProvider.
 */
const SPECIAL_PROVIDER_IDS: Set<KnownProviderType> = new Set([
  'openai',
  'openrouter',
  'together',
  'anthropic',
  'zai',
  'chutes',
  'deepseek',
  'groq',
  'fireworks',
])

/**
 * Map models.dev provider IDs to Panda known provider IDs where they differ.
 */
const PROVIDER_ID_ALIASES: Record<string, KnownProviderType> = {
  zhipu: 'zai',
  'zhipu-ai': 'zai',
  'together-ai': 'together',
  'fireworks-ai': 'fireworks',
}

/** In-memory catalog cache */
let catalogCache: ProviderCatalogEntry[] | null = null
let catalogCacheTimestamp = 0
const CATALOG_CACHE_TTL = 1000 * 60 * 60 // 1 hour

/**
 * Build the full provider catalog from models.dev data.
 * Results are cached for 1 hour.
 */
export async function getProviderCatalog(): Promise<ProviderCatalogEntry[]> {
  const now = Date.now()
  if (catalogCache && now - catalogCacheTimestamp < CATALOG_CACHE_TTL) {
    return catalogCache
  }

  try {
    const data = await fetchModelsDevMetadata()
    catalogCache = buildCatalogFromResponse(data)
    catalogCacheTimestamp = now
    return catalogCache
  } catch (error) {
    appLog.error('Failed to build provider catalog:', error)
    return catalogCache || []
  }
}

/**
 * Build catalog entries from a models.dev API response.
 */
export function buildCatalogFromResponse(
  data: ModelsDevResponse
): ProviderCatalogEntry[] {
  const entries: ProviderCatalogEntry[] = []

  for (const [rawId, providerData] of Object.entries(data)) {
    if (!providerData || !providerData.models) continue

    const resolvedId = PROVIDER_ID_ALIASES[rawId] || rawId
    const isSpecial =
      isKnownProvider(resolvedId) && SPECIAL_PROVIDER_IDS.has(resolvedId)
    const models = mapModelsDevToModelInfo(rawId, data)

    // Skip providers with no models
    if (models.length === 0) continue

    const entry: ProviderCatalogEntry = {
      id: resolvedId,
      name: providerData.provider_name || rawId,
      description: `${providerData.provider_name || rawId} — ${models.length} model${models.length !== 1 ? 's' : ''} available`,
      baseUrl: providerData.base_url,
      envVars: (providerData as ModelsDevProvider).env,
      docUrl: (providerData as ModelsDevProvider).doc,
      npmPackage: (providerData as ModelsDevProvider).npm,
      logoUrl: `https://models.dev/logos/${rawId}.svg`,
      models,
      defaultModel: models[0]?.id,
      hasSpecialImplementation: isSpecial,
      providerType: isSpecial ? resolvedId : resolvedId,
    }

    entries.push(entry)
  }

  // Sort: special implementations first, then alphabetical
  entries.sort((a, b) => {
    if (a.hasSpecialImplementation && !b.hasSpecialImplementation) return -1
    if (!a.hasSpecialImplementation && b.hasSpecialImplementation) return 1
    return a.name.localeCompare(b.name)
  })

  return entries
}

/**
 * Search the catalog by name or ID.
 */
export function searchCatalog(
  catalog: ProviderCatalogEntry[],
  query: string
): ProviderCatalogEntry[] {
  if (!query.trim()) return catalog
  const q = query.toLowerCase().trim()
  return catalog.filter(
    (entry) =>
      entry.id.toLowerCase().includes(q) || entry.name.toLowerCase().includes(q)
  )
}

/**
 * Get a single catalog entry by provider ID.
 */
export function getCatalogEntry(
  catalog: ProviderCatalogEntry[],
  providerId: string
): ProviderCatalogEntry | undefined {
  const resolved = PROVIDER_ID_ALIASES[providerId] || providerId
  return catalog.find((e) => e.id === resolved)
}

/**
 * Clear the catalog cache (useful for testing or forced refresh).
 */
export function clearCatalogCache(): void {
  catalogCache = null
  catalogCacheTimestamp = 0
}
```

**Step 3: Run TypeScript compilation**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | head -30` Expected: No new errors

**Step 4: Commit**

```bash
git add apps/web/lib/llm/provider-catalog.ts apps/web/lib/llm/models-dev.ts
git commit -m "feat: add provider catalog module powered by models.dev"
```

---

## Task 3: Update Provider Registry to Support Dynamic Providers

**Files:**

- Modify: `apps/web/lib/llm/registry.ts:46-91` (createProvider switch)
- Modify: `apps/web/lib/llm/registry.ts:256-407` (createProviderFromEnv)

**Step 1: Update `createProvider` to handle unknown provider types**

In `apps/web/lib/llm/registry.ts`, update the `createProvider` method. Replace
the switch statement (lines 50-75) with:

```typescript
import { isKnownProvider } from './types'
import type { KnownProviderType } from './types'

// Inside createProvider method:
createProvider(id: string, config: ProviderConfig, setAsDefault = false): LLMProvider {
  let provider: LLMProvider

  // Known providers use specialized implementations
  if (isKnownProvider(config.provider)) {
    switch (config.provider as KnownProviderType) {
      case 'openai':
      case 'openrouter':
      case 'together':
      case 'zai':
      case 'custom':
        provider = new OpenAICompatibleProvider(config)
        break
      case 'anthropic':
        provider = new AnthropicProvider(config)
        break
      case 'chutes':
        provider = new ChutesProvider(config)
        break
      case 'deepseek':
        provider = new DeepSeekProvider(config)
        break
      case 'groq':
        provider = new GroqProvider(config)
        break
      case 'fireworks':
        provider = new FireworksProvider(config)
        break
      default:
        provider = new OpenAICompatibleProvider(config)
    }
  } else {
    // Dynamic providers from models.dev — use OpenAI-compatible base
    provider = new OpenAICompatibleProvider(config)
  }

  this.providers.set(id, {
    id,
    provider,
    config,
    createdAt: Date.now(),
  })

  if (setAsDefault) {
    this.defaultProviderId = id
  }

  return provider
}
```

**Step 2: Update imports in registry.ts**

Add the new imports at the top of the file:

```typescript
import { isKnownProvider, type KnownProviderType } from './types'
```

**Step 3: Run TypeScript compilation**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | head -30` Expected: No new errors

**Step 4: Commit**

```bash
git add apps/web/lib/llm/registry.ts
git commit -m "feat: registry supports dynamic provider instantiation via OpenAI-compatible base"
```

---

## Task 4: Create "Add Provider" Catalog Modal Component

**Files:**

- Create: `apps/web/components/settings/ProviderCatalogModal.tsx`

**Step 1: Create the modal component**

This component shows when the user clicks "Add Provider". It fetches the
catalog, displays a searchable grid, and lets the user pick a provider to
configure.

Create `apps/web/components/settings/ProviderCatalogModal.tsx`:

```typescript
'use client'

import * as React from 'react'
import { Search, Plus, Star, ExternalLink, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  getProviderCatalog,
  searchCatalog,
  type ProviderCatalogEntry,
} from '@/lib/llm/provider-catalog'

interface ProviderCatalogModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** IDs of providers already configured by the user */
  configuredProviderIds: string[]
  /** Called when user selects a provider to add */
  onSelectProvider: (entry: ProviderCatalogEntry) => void
}

export function ProviderCatalogModal({
  open,
  onOpenChange,
  configuredProviderIds,
  onSelectProvider,
}: ProviderCatalogModalProps) {
  const [catalog, setCatalog] = React.useState<ProviderCatalogEntry[]>([])
  const [loading, setLoading] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const entries = await getProviderCatalog()
        if (!cancelled) setCatalog(entries)
      } catch {
        if (!cancelled) setError('Failed to load provider catalog')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()

    return () => { cancelled = true }
  }, [open])

  const filtered = React.useMemo(() => {
    const results = searchCatalog(catalog, searchQuery)
    // Separate configured vs available
    const configured = new Set(configuredProviderIds)
    return results.filter((entry) => !configured.has(entry.id))
  }, [catalog, searchQuery, configuredProviderIds])

  const handleSelect = (entry: ProviderCatalogEntry) => {
    onSelectProvider(entry)
    onOpenChange(false)
    setSearchQuery('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Add Provider</DialogTitle>
          <DialogDescription>
            Browse {catalog.length} providers from models.dev. Select one to configure with your API key.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search providers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading providers...</span>
          </div>
        )}

        {error && (
          <div className="text-center py-8 text-sm text-destructive">{error}</div>
        )}

        {!loading && !error && (
          <ScrollArea className="h-[50vh]">
            <div className="grid grid-cols-1 gap-2 pr-4">
              {filtered.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => handleSelect(entry)}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors text-left w-full"
                >
                  {/* Provider logo */}
                  <img
                    src={entry.logoUrl}
                    alt=""
                    className="h-8 w-8 rounded object-contain flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{entry.name}</span>
                      {entry.hasSpecialImplementation && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          <Star className="h-2.5 w-2.5 mr-0.5" />
                          Enhanced
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {entry.models.length} model{entry.models.length !== 1 ? 's' : ''}
                      {entry.baseUrl ? ` · ${new URL(entry.baseUrl).hostname}` : ''}
                    </p>
                  </div>

                  <Plus className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </button>
              ))}

              {filtered.length === 0 && !loading && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  {searchQuery ? 'No providers match your search' : 'No more providers available'}
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

**Step 2: Run TypeScript compilation**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | head -30` Expected: No new errors

**Step 3: Commit**

```bash
git add apps/web/components/settings/ProviderCatalogModal.tsx
git commit -m "feat: add provider catalog modal with search for models.dev providers"
```

---

## Task 5: Integrate Catalog Modal into Settings Page

**Files:**

- Modify: `apps/web/app/settings/page.tsx:67-204` (defaultProviders object)
- Modify: `apps/web/app/settings/page.tsx:215-550` (SettingsPage component)
- Modify: `apps/web/components/settings/index.ts` (add export)

**Step 1: Add export for new component**

In `apps/web/components/settings/index.ts`, add:

```typescript
export { ProviderCatalogModal } from './ProviderCatalogModal'
```

**Step 2: Add state and imports to SettingsPage**

In `apps/web/app/settings/page.tsx`, add imports:

```typescript
import { ProviderCatalogModal } from '@/components/settings/ProviderCatalogModal'
import type { ProviderCatalogEntry } from '@/lib/llm/provider-catalog'
```

Inside the `SettingsPage` component, add state for the catalog modal:

```typescript
const [catalogModalOpen, setCatalogModalOpen] = React.useState(false)
```

**Step 3: Add handler for adding a provider from the catalog**

Add this function inside `SettingsPage`, after the `updateProvider` function:

```typescript
const addProviderFromCatalog = (entry: ProviderCatalogEntry) => {
  setFormState((prev) => {
    // Don't overwrite if already configured
    if (prev.providers[entry.id]) {
      return prev
    }

    const newProvider: ProviderConfig = {
      provider: entry.id,
      name: entry.name,
      description: entry.description,
      apiKey: '',
      enabled: false,
      defaultModel: entry.defaultModel || entry.models[0]?.id || '',
      availableModels: entry.models.map((m) => m.id),
      baseUrl: entry.baseUrl,
      testStatus: 'idle',
    }

    return {
      ...prev,
      providers: {
        ...prev.providers,
        [entry.id]: newProvider,
      },
    }
  })
}
```

**Step 4: Add "Remove Provider" handler**

Add this function for removing dynamically-added providers:

```typescript
const removeProvider = (providerKey: string) => {
  // Don't allow removing the 9 built-in providers
  if (defaultProviders[providerKey]) return

  setFormState((prev) => {
    const { [providerKey]: _, ...remainingProviders } = prev.providers
    const nextState = { ...prev, providers: remainingProviders }

    // If removing the default provider, reset to first enabled
    if (prev.defaultProvider === providerKey) {
      const firstEnabled = Object.entries(remainingProviders).find(
        ([, p]) => p.enabled
      )
      nextState.defaultProvider = firstEnabled?.[0] || 'openai'
      nextState.defaultModel = firstEnabled?.[1]?.defaultModel || 'gpt-4o-mini'
    }

    return nextState
  })
}
```

**Step 5: Add the "Add Provider" button and modal to the LLM Providers tab**

In the JSX, find the LLM Providers tab content section where provider cards are
rendered. Add before the provider cards grid:

```tsx
<div className="flex items-center justify-between mb-4">
  <div>
    <h3 className="text-lg font-medium">LLM Providers</h3>
    <p className="text-sm text-muted-foreground">
      Configure API keys for your preferred providers
    </p>
  </div>
  <Button
    variant="outline"
    size="sm"
    onClick={() => setCatalogModalOpen(true)}
  >
    <Plus className="h-4 w-4 mr-1.5" />
    Add Provider
  </Button>
</div>

<ProviderCatalogModal
  open={catalogModalOpen}
  onOpenChange={setCatalogModalOpen}
  configuredProviderIds={Object.keys(formState.providers)}
  onSelectProvider={addProviderFromCatalog}
/>
```

**Step 6: Add remove button to ProviderCard for dynamic providers**

In the provider cards rendering loop, pass a remove handler for non-built-in
providers. The exact JSX depends on the existing rendering pattern — wrap each
card:

```tsx
{
  Object.entries(formState.providers).map(([key, config]) => (
    <div key={key} className="relative">
      <ProviderCard
        provider={config}
        supportsReasoning={
          key === 'anthropic' || key === 'deepseek' || key === 'zai'
        }
        onChange={(updates) => updateProvider(key, updates)}
        onTest={() => testProvider(key)}
        onTestCompletion={
          key === 'chutes' ? () => testProviderCompletion(key) : undefined
        }
      />
      {!defaultProviders[key] && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2"
          onClick={() => removeProvider(key)}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  ))
}
```

**Step 7: Update the `handleSave` function to handle dynamic providers**

In the `handleSave` function (around line 520), update the `providersForSave`
construction to not assume `defaultProviders[key]` exists:

```typescript
const providersForSave = Object.fromEntries(
  Object.entries(formState.providers).map(([key, config]) => [
    key,
    {
      provider: config.provider || key,
      name: config.name,
      description: config.description,
      apiKey: config.apiKey,
      enabled: config.enabled,
      defaultModel: config.defaultModel,
      availableModels: config.availableModels,
      baseUrl:
        key === 'zai' && config.useCodingPlan
          ? 'https://api.z.ai/api/coding/paas/v4'
          : config.baseUrl || defaultProviders[key]?.baseUrl,
      useCodingPlan: config.useCodingPlan,
      reasoningEnabled: config.reasoningEnabled,
      reasoningMode: config.reasoningMode,
      reasoningBudget: config.reasoningBudget,
      showReasoningPanel: config.showReasoningPanel,
    },
  ])
)
```

**Step 8: Update the settings sync effect to preserve dynamic providers**

In the `React.useEffect` that syncs Convex data (around line 280-294), update
the provider merge to handle dynamic providers that aren't in
`defaultProviders`:

```typescript
providers: latestSettings.providerConfigs
  ? {
      ...defaultProviders,
      ...Object.fromEntries(
        Object.entries(latestSettings.providerConfigs).map(([key, config]) => {
          const base = defaultProviders[key] ?? {
            // Dynamic provider — reconstruct from stored config
            provider: key,
            name: (config as StoredProviderConfig).name || key,
            description: (config as StoredProviderConfig).description || '',
            apiKey: '',
            enabled: false,
            defaultModel: '',
            availableModels: [],
            testStatus: 'idle' as const,
          }
          const mergedConfig = {
            ...base,
            ...(config as StoredProviderConfig),
            testStatus: 'idle' as const,
          }
          return [key, mergedConfig]
        })
      ),
    }
  : defaultProviders,
```

**Step 9: Add Plus and X to imports**

Ensure `Plus` and `X` are in the lucide-react import at the top of the file:

```typescript
import {
  User,
  Palette,
  Bot,
  Save,
  Loader2,
  ArrowLeft,
  Settings2,
  Plus,
  X,
} from 'lucide-react'
```

**Step 10: Run TypeScript compilation and dev server**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | head -50` Run:
`cd apps/web && npm run dev` (verify the page loads and the modal opens)

**Step 11: Commit**

```bash
git add apps/web/app/settings/page.tsx apps/web/components/settings/index.ts apps/web/components/settings/ProviderCatalogModal.tsx
git commit -m "feat: integrate provider catalog modal into settings page with add/remove"
```

---

## Task 6: Wire Dynamic Providers into useProjectChatSession

**Files:**

- Modify: `apps/web/hooks/useProjectChatSession.ts:94-157` (provider creation)

**Step 1: Update provider instantiation to handle dynamic providers**

The current code at line 128 hardcodes
`provider: providerConfig.provider || 'openai'`. For dynamic providers, the
provider type IS the provider ID. Update:

```typescript
const nextProviderConfig = {
  provider: (providerConfig.provider || defaultProviderId) as ProviderType,
  auth: {
    apiKey: providerConfig.apiKey || '',
    baseUrl: providerConfig.baseUrl,
  },
  defaultModel: providerConfig.defaultModel,
}
```

Also update the type annotation at line 105-120 — remove the strict union for
`provider`:

```typescript
const providerConfig = latestSettings.providerConfigs?.[defaultProviderId] as
  | {
      enabled?: boolean
      apiKey?: string
      baseUrl?: string
      defaultModel?: string
      provider?: string
    }
  | undefined
```

**Step 2: Run TypeScript compilation**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | head -30`

**Step 3: Commit**

```bash
git add apps/web/hooks/useProjectChatSession.ts
git commit -m "feat: useProjectChatSession supports dynamic provider types"
```

---

## Task 7: Add "Refresh Models" Button to ProviderCard

**Files:**

- Modify: `apps/web/components/settings/ProviderCard.tsx` (add refresh button +
  handler)
- Modify: `apps/web/app/settings/page.tsx` (add refresh handler)
- Create: `apps/web/app/api/providers/openai-compatible/models/route.ts`

**Step 1: Add `onRefreshModels` prop to ProviderCard**

In `apps/web/components/settings/ProviderCard.tsx`, update the props interface:

```typescript
interface ProviderCardProps {
  provider: ProviderConfig
  providerKey?: string
  supportsReasoning?: boolean
  onChange: (updates: Partial<ProviderConfig>) => void
  onTest: () => void
  onTestCompletion?: () => void
  onRefreshModels?: () => void
  refreshingModels?: boolean
  className?: string
}
```

Add a "Refresh Models" button in the card, next to the model selector:

```tsx
{
  onRefreshModels && (
    <Button
      variant="ghost"
      size="sm"
      onClick={onRefreshModels}
      disabled={!provider.enabled || !provider.apiKey || refreshingModels}
    >
      {refreshingModels ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <RefreshCw className="h-3.5 w-3.5" />
      )}
      <span className="ml-1.5 text-xs">Refresh</span>
    </Button>
  )
}
```

Add `RefreshCw` to the lucide-react imports.

**Step 2: Add a server route for OpenAI-compatible model listing**

Create `apps/web/app/api/providers/openai-compatible/models/route.ts`.

This route should:

- accept `apiKey`, `baseUrl`, and optional headers in the POST body,
- validate that `baseUrl` is an absolute `https:` URL,
- normalize the target endpoint to `${baseUrl}/models` or `${baseUrl}/v1/models`
  without producing malformed URLs,
- forward the authenticated request server-side,
- return only the minimal response shape needed by the settings UI,
- redact sensitive details from logs and error responses.

This exists specifically to avoid browser CORS failures and to keep third-party
API probing behind a Panda-owned boundary.

**Step 3: Add refresh handler in SettingsPage**

In `apps/web/app/settings/page.tsx`, add a refresh handler:

```typescript
const [refreshingModels, setRefreshingModels] = React.useState<string | null>(
  null
)

const refreshModelsFromApi = async (providerKey: string) => {
  const provider = formState.providers[providerKey]
  if (!provider?.apiKey || !provider?.baseUrl) return

  setRefreshingModels(providerKey)
  try {
    const response = await fetch('/api/providers/openai-compatible/models', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: provider.apiKey,
        baseUrl: provider.baseUrl,
      }),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const payload = await response.json()
    const modelIds: string[] = (payload.data || payload || [])
      .map((m: { id?: string }) => m.id)
      .filter(Boolean)

    if (modelIds.length > 0) {
      // Merge with existing models.dev models (keep models.dev as base, add API-fetched)
      const existingSet = new Set(provider.availableModels)
      const merged = [
        ...provider.availableModels,
        ...modelIds.filter((id) => !existingSet.has(id)),
      ]
      updateProvider(providerKey, { availableModels: merged })
      toast.success(
        `Found ${modelIds.length} models from API (${merged.length} total)`
      )
    } else {
      toast.info('No additional models found from API')
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown error'
    toast.error('Failed to refresh models', { description: detail })
  } finally {
    setRefreshingModels(null)
  }
}
```

**Step 4: Pass the handler to ProviderCard**

```tsx
<ProviderCard
  provider={config}
  providerKey={key}
  supportsReasoning={key === 'anthropic' || key === 'deepseek' || key === 'zai'}
  onChange={(updates) => updateProvider(key, updates)}
  onTest={() => testProvider(key)}
  onTestCompletion={
    key === 'chutes' ? () => testProviderCompletion(key) : undefined
  }
  onRefreshModels={() => refreshModelsFromApi(key)}
  refreshingModels={refreshingModels === key}
/>
```

**Step 5: Run TypeScript compilation**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | head -30`

**Step 6: Commit**

```bash
git add apps/web/components/settings/ProviderCard.tsx apps/web/app/settings/page.tsx apps/web/app/api/providers/openai-compatible/models/route.ts
git commit -m "feat: proxy dynamic provider model refresh through server route"
```

---

## Task 8: Improve Test Connection for Dynamic Providers

**Files:**

- Modify: `apps/web/app/settings/page.tsx:409-463` (testProvider function)
- Create: `apps/web/app/api/providers/openai-compatible/test/route.ts`

**Step 1: Replace the simulated test with a proxied server-side API test**

The current `testProvider` function (line 442-446) simulates a test for
non-Chutes providers by just checking API key length. Replace it with a POST to
a Panda-owned route that probes the provider server-side.

Create `apps/web/app/api/providers/openai-compatible/test/route.ts`.

This route should:

- accept `apiKey`, `baseUrl`, and optional provider metadata,
- validate and normalize the target URL,
- attempt a server-side OpenAI-compatible `/models` call,
- return a normalized success payload with discovered model IDs when available,
- return a sanitized error payload on failure,
- enforce a timeout so the UI cannot hang indefinitely.

Then update the settings page to call that route:

```typescript
const testProvider = async (providerKey: string) => {
  const provider = formState.providers[providerKey]
  if (!provider.apiKey) {
    toast.error('Please enter an API key first')
    return
  }

  updateProvider(providerKey, {
    testStatus: 'testing',
    testStatusMessage: undefined,
  })

  try {
    let success = false

    if (providerKey === 'chutes') {
      // Existing Chutes-specific test (keep as-is)
      const payload = await testChutesViaApi({
        apiKey: provider.apiKey,
        baseUrl: provider.baseUrl,
        mode: 'models',
      })
      const models = payload.models ?? []
      success = true
      if (models.length > 0) {
        updateProvider(providerKey, {
          availableModels: models,
          defaultModel: models.includes(provider.defaultModel)
            ? provider.defaultModel
            : models[0],
          testStatusMessage: undefined,
        })
        toast.success(
          `${provider.name} connection successful! Found ${models.length} models.`
        )
      } else {
        toast.success(`${provider.name} connection successful!`)
      }
    } else if (providerKey === 'anthropic') {
      // Anthropic uses a different API shape — just validate key format
      success =
        provider.apiKey.startsWith('sk-ant-') && provider.apiKey.length > 20
      if (success) {
        toast.success(`${provider.name} API key looks valid`)
      } else {
        toast.error(`${provider.name}: API key format looks incorrect`)
      }
    } else if (provider.baseUrl) {
      const response = await fetch('/api/providers/openai-compatible/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: provider.apiKey,
          baseUrl: provider.baseUrl,
        }),
      })
      success = response.ok
      if (success) {
        const payload = await response.json()
        const modelIds: string[] = (payload.data || [])
          .map((m: { id?: string }) => m.id)
          .filter(Boolean)
        if (modelIds.length > 0) {
          const existingSet = new Set(provider.availableModels)
          const merged = [
            ...provider.availableModels,
            ...modelIds.filter((id) => !existingSet.has(id)),
          ]
          updateProvider(providerKey, { availableModels: merged })
          toast.success(
            `${provider.name} connected! Found ${modelIds.length} models.`
          )
        } else {
          toast.success(`${provider.name} connection successful!`)
        }
      } else {
        const errBody = await response.text().catch(() => '')
        throw new Error(`HTTP ${response.status}: ${errBody.slice(0, 200)}`)
      }
    } else {
      // No base URL — just validate key length
      success = provider.apiKey.length > 10
      if (success) {
        toast.success(`${provider.name} API key saved (no endpoint to test)`)
      } else {
        toast.error(`${provider.name}: API key looks too short`)
      }
    }

    updateProvider(providerKey, {
      testStatus: success ? 'success' : 'error',
      ...(success ? { testStatusMessage: undefined } : {}),
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown error'
    updateProvider(providerKey, {
      testStatus: 'error',
      testStatusMessage: detail,
    })
    toast.error(`${provider.name} connection failed`, { description: detail })
  }
}
```

Do not make direct browser requests to third-party `baseUrl` values from the
settings page.

**Step 2: Run TypeScript compilation**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | head -30`

**Step 3: Commit**

```bash
git add apps/web/app/settings/page.tsx apps/web/app/api/providers/openai-compatible/test/route.ts
git commit -m "feat: proxy dynamic provider connection tests through server route"
```

---

## Task 9: Add Integration Tests for Settings Persistence and Runtime Wiring

**Files:**

- Create: `apps/web/app/settings/page.test.tsx`
- Create: `apps/web/hooks/useProjectChatSession.test.ts`
- Review: `apps/web/components/settings/UserLLMConfig.tsx`

**Step 1: Remove the no-op `UserLLMConfig` assumption**

`UserLLMConfig` already receives `availableProviders` from
`formState.providers`, so dynamic providers should already appear if the parent
state is correct. Do not spend a dedicated implementation task on this unless
you find an actual exclusion bug.

Verify the current data flow first:

- `apps/web/app/settings/page.tsx`
- `apps/web/components/settings/UserLLMConfig.tsx`

If there is no exclusion bug, leave `UserLLMConfig` unchanged and focus testing
effort elsewhere.

**Step 2: Add a settings-page test for dynamic provider persistence**

Write a test that covers this sequence:

1. settings hydrate from Convex with a dynamic provider in `providerConfigs`,
2. the dynamic provider card is reconstructed with stored `name`, `baseUrl`,
   `defaultModel`, and `availableModels`,
3. save logic preserves that provider instead of dropping it because it is not
   in `defaultProviders`.

**Step 3: Add a `useProjectChatSession` test for dynamic provider creation**

Write a test that covers this sequence:

1. `defaultProvider` is set to a dynamic provider ID,
2. `providerConfigs[dynamicId]` contains `enabled`, `apiKey`, `baseUrl`, and
   `defaultModel`,
3. the registry creates an `OpenAICompatibleProvider`,
4. changing the config updates the registry entry instead of leaving stale
   config behind.

**Step 4: Add a regression test for known providers**

Keep one focused test proving a built-in provider such as `anthropic` or
`chutes` still uses its special handling path after the dynamic-provider
refactor.

**Step 5: Commit**

```bash
git add apps/web/app/settings/page.test.tsx apps/web/hooks/useProjectChatSession.test.ts
git commit -m "test: cover dynamic provider persistence and runtime wiring"
```

---

## Task 10: Write Tests for Provider Catalog

**Files:**

- Create: `apps/web/lib/llm/__tests__/provider-catalog.test.ts`
- Create: `apps/web/app/api/providers/openai-compatible/models/route.test.ts`
- Create: `apps/web/app/api/providers/openai-compatible/test/route.test.ts`

**Step 1: Write tests for catalog building and search**

```typescript
import { describe, it, expect } from 'vitest'
import {
  buildCatalogFromResponse,
  searchCatalog,
  getCatalogEntry,
} from '../provider-catalog'
import type { ModelsDevResponse } from '../models-dev'

const mockData: ModelsDevResponse = {
  openai: {
    provider_id: 'openai',
    provider_name: 'OpenAI',
    base_url: 'https://api.openai.com/v1',
    models: {
      'gpt-4o': {
        id: 'gpt-4o',
        name: 'GPT-4o',
        context_length: 128000,
        max_output_tokens: 16384,
        capabilities: ['tools', 'vision'],
      },
    },
  },
  mistral: {
    provider_id: 'mistral',
    provider_name: 'Mistral AI',
    base_url: 'https://api.mistral.ai/v1',
    models: {
      'mistral-large': {
        id: 'mistral-large',
        name: 'Mistral Large',
        context_length: 128000,
        capabilities: ['tools'],
      },
    },
  },
  'empty-provider': {
    provider_id: 'empty-provider',
    provider_name: 'Empty',
    models: {},
  },
}

describe('buildCatalogFromResponse', () => {
  it('builds entries for providers with models', () => {
    const catalog = buildCatalogFromResponse(mockData)
    expect(catalog.length).toBe(2) // openai + mistral, not empty-provider
  })

  it('marks known providers as having special implementation', () => {
    const catalog = buildCatalogFromResponse(mockData)
    const openai = catalog.find((e) => e.id === 'openai')
    const mistral = catalog.find((e) => e.id === 'mistral')
    expect(openai?.hasSpecialImplementation).toBe(true)
    expect(mistral?.hasSpecialImplementation).toBe(false)
  })

  it('sorts special implementations first', () => {
    const catalog = buildCatalogFromResponse(mockData)
    expect(catalog[0].id).toBe('openai')
  })

  it('includes base URL and logo URL', () => {
    const catalog = buildCatalogFromResponse(mockData)
    const mistral = catalog.find((e) => e.id === 'mistral')
    expect(mistral?.baseUrl).toBe('https://api.mistral.ai/v1')
    expect(mistral?.logoUrl).toBe('https://models.dev/logos/mistral.svg')
  })
})

describe('searchCatalog', () => {
  const catalog = buildCatalogFromResponse(mockData)

  it('returns all entries for empty query', () => {
    expect(searchCatalog(catalog, '').length).toBe(2)
  })

  it('filters by name', () => {
    const results = searchCatalog(catalog, 'mistral')
    expect(results.length).toBe(1)
    expect(results[0].id).toBe('mistral')
  })

  it('filters by ID', () => {
    const results = searchCatalog(catalog, 'openai')
    expect(results.length).toBe(1)
  })

  it('is case insensitive', () => {
    const results = searchCatalog(catalog, 'MISTRAL')
    expect(results.length).toBe(1)
  })
})

describe('getCatalogEntry', () => {
  const catalog = buildCatalogFromResponse(mockData)

  it('finds by ID', () => {
    expect(getCatalogEntry(catalog, 'openai')?.name).toBe('OpenAI')
  })

  it('resolves aliases', () => {
    // zhipu → zai (alias), but zai not in mockData so should return undefined
    expect(getCatalogEntry(catalog, 'zhipu')).toBeUndefined()
  })

  it('returns undefined for unknown ID', () => {
    expect(getCatalogEntry(catalog, 'nonexistent')).toBeUndefined()
  })
})
```

**Step 2: Run the tests**

Run:
`cd "/home/nochaserz/Documents/Coding Projects/panda" && bun test apps/web/lib/llm/__tests__/provider-catalog.test.ts`
Expected: All tests pass

**Step 3: Add route tests for URL normalization and sanitized failures**

Add focused tests for the two new API routes covering:

- `baseUrl` normalization for providers that expose `/v1`,
- rejection of invalid or non-HTTPS URLs,
- timeout/failure handling,
- response sanitization so secrets are not echoed back to the client.

**Step 4: Run the tests**

Run:
`cd "/home/nochaserz/Documents/Coding Projects/panda" && bun test apps/web/lib/llm/__tests__/provider-catalog.test.ts apps/web/app/api/providers/openai-compatible/models/route.test.ts apps/web/app/api/providers/openai-compatible/test/route.test.ts`
Expected: All tests pass

**Step 5: Commit**

```bash
git add apps/web/lib/llm/__tests__/provider-catalog.test.ts apps/web/app/api/providers/openai-compatible/models/route.test.ts apps/web/app/api/providers/openai-compatible/test/route.test.ts
git commit -m "test: add provider catalog and dynamic provider route coverage"
```

---

## Task 11: End-to-End Smoke Test

**Files:** None (manual verification)

**Step 1: Start the dev server**

Run: `cd apps/web && npm run dev`

**Step 2: Verify the happy path**

1. Open Settings → LLM Providers tab
2. Verify existing 9 provider cards still render correctly
3. Click "Add Provider" button
4. Verify the catalog modal opens with 100+ providers
5. Search for "Mistral" — verify it appears
6. Click Mistral — verify a new ProviderCard appears in settings
7. Enter a Mistral API key, click Test Connection
8. Verify the settings page calls Panda's internal test route, not the provider
   directly from the browser
9. Verify the server route successfully probes the provider and returns model
   IDs
10. Click "Refresh Models" — verify the settings page calls Panda's internal
    models route
11. Verify model list populates
12. Save settings
13. Navigate away and back — verify Mistral persists
14. Select Mistral as default provider — verify it appears in chat model
    selector
15. Remove Mistral — verify card disappears

**Step 3: Verify backward compatibility**

1. Existing providers (OpenAI, Anthropic, etc.) still work as before
2. Reasoning controls still appear for Anthropic/DeepSeek/Z.ai
3. Chutes OAuth flow still works
4. OpenRouter free models still auto-populate
5. Built-in providers still use their specialized classes instead of falling
   back to `OpenAICompatibleProvider`

**Step 4: Run repo-standard verification**

Run from repo root:

```bash
bun run typecheck
bun run lint
bun run format:check
bun test
cd apps/web && bun run build
```

Expected:

- zero TypeScript errors,
- zero lint warnings,
- formatting check passes,
- all tests pass,
- Next.js production build succeeds.

If this phase explicitly includes Convex HTTP/action support, also manually
verify the relevant Convex endpoint path after these checks.

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: models.dev dynamic provider catalog — full integration"
```

---

## Summary

| Task | Description                            | Key Files                                                                                        |
| ---- | -------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 0    | Lock runtime scope                     | `plan`, `useProjectChatSession.ts`, `convex/http.ts`, `convex/llm.ts`, `convex/enhancePrompt.ts` |
| 1    | Widen ProviderType                     | `types.ts`, `model-metadata.ts`                                                                  |
| 2    | Provider catalog module                | `provider-catalog.ts`, `models-dev.ts`                                                           |
| 3    | Registry dynamic support               | `registry.ts`                                                                                    |
| 4    | Catalog modal component                | `ProviderCatalogModal.tsx`                                                                       |
| 5    | Settings page integration              | `page.tsx`, `index.ts`                                                                           |
| 6    | useProjectChatSession wiring           | `useProjectChatSession.ts`                                                                       |
| 7    | Refresh models via server route        | `ProviderCard.tsx`, `page.tsx`, `api/providers/openai-compatible/models/route.ts`                |
| 8    | Connection testing via server route    | `page.tsx`, `api/providers/openai-compatible/test/route.ts`                                      |
| 9    | Integration tests for settings/runtime | `page.test.tsx`, `useProjectChatSession.test.ts`                                                 |
| 10   | Catalog and route tests                | `provider-catalog.test.ts`, route tests                                                          |
| 11   | Smoke test + repo verification         | Manual + full quality checks                                                                     |
