#!/usr/bin/env bun
import { MODEL_CAPABILITIES } from '../apps/web/lib/agent/providers/model-capabilities'

const UI_MODELS: { providerId: string; modelId: string }[] = [
  { providerId: 'anthropic', modelId: 'claude-sonnet-4-6' },
  { providerId: 'anthropic', modelId: 'claude-opus-4-7' },
  { providerId: 'anthropic', modelId: 'claude-haiku-4-5-20251001' },
  { providerId: 'openai', modelId: 'gpt-4o' },
  { providerId: 'openai-compatible', modelId: 'kimi-k2.5' },
]

let failures = 0

for (const { providerId, modelId } of UI_MODELS) {
  const found = MODEL_CAPABILITIES.some(
    (c) =>
      c.providerId === providerId &&
      (typeof c.modelPattern === 'string'
        ? c.modelPattern === modelId
        : c.modelPattern.test(modelId))
  )
  if (!found) {
    console.error(`FAIL: No manifest entry for ${providerId}/${modelId}`)
    failures++
  }
}

if (failures > 0) {
  console.error(
    `\n${failures} model(s) lack manifest entries. Add them to apps/web/lib/agent/providers/model-capabilities.ts`
  )
  process.exit(1)
} else {
  console.log(`OK: All ${UI_MODELS.length} UI models have manifest entries.`)
}
