interface OpenRouterModelRecord {
  id?: unknown
  name?: unknown
  description?: unknown
  pricing?: {
    prompt?: unknown
    completion?: unknown
  }
}

interface OpenRouterModelsPayload {
  data?: unknown
}

const FREE_SUFFIX = ':free'

const isZeroPrice = (value: unknown): boolean => {
  if (typeof value === 'number') {
    return value === 0
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) && parsed === 0
  }

  return false
}

const isFreeModel = (model: OpenRouterModelRecord): boolean => {
  if (typeof model.id !== 'string' || model.id.length === 0) {
    return false
  }

  if (model.id.endsWith(FREE_SUFFIX)) {
    return true
  }

  return isZeroPrice(model.pricing?.prompt) && isZeroPrice(model.pricing?.completion)
}

export function extractOpenRouterFreeModelIds(payload: OpenRouterModelsPayload): string[] {
  if (!Array.isArray(payload.data)) {
    return []
  }

  const models = payload.data as OpenRouterModelRecord[]
  const seen = new Set<string>()
  const result: string[] = []

  for (const model of models) {
    if (!isFreeModel(model) || typeof model.id !== 'string') {
      continue
    }

    if (!seen.has(model.id)) {
      seen.add(model.id)
      result.push(model.id)
    }
  }

  return result
}

const CODING_KEYWORDS = [
  'code',
  'coder',
  'coding',
  'program',
  'software',
  'developer',
  'dev',
]

const isCodingModel = (model: OpenRouterModelRecord): boolean => {
  const haystack = [model.id, model.name, model.description]
    .filter((v): v is string => typeof v === 'string' && v.length > 0)
    .join(' ')
    .toLowerCase()

  return CODING_KEYWORDS.some((keyword) => haystack.includes(keyword))
}

export function extractOpenRouterFreeCodingModelIds(payload: OpenRouterModelsPayload): string[] {
  if (!Array.isArray(payload.data)) {
    return []
  }

  const models = payload.data as OpenRouterModelRecord[]
  const seen = new Set<string>()
  const result: string[] = []

  for (const model of models) {
    if (!isFreeModel(model) || !isCodingModel(model) || typeof model.id !== 'string') {
      continue
    }

    if (!seen.has(model.id)) {
      seen.add(model.id)
      result.push(model.id)
    }
  }

  return result
}
