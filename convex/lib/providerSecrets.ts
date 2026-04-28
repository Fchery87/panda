const ENVELOPE_PREFIX = 'panda-secret:v1:'

export function sealProviderSecret(secret: string | undefined): string | undefined {
  if (secret === undefined) return undefined
  return `${ENVELOPE_PREFIX}${btoa(unescape(encodeURIComponent(secret)))}`
}
