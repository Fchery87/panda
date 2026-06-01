export interface ProjectRuleFrontmatter {
  description?: string
  globs?: string[]
  alwaysApply?: boolean
}

export interface ParsedProjectRule {
  path: string
  description?: string
  globs: string[]
  alwaysApply: boolean
  content: string
  diagnostics: ProjectRuleDiagnostic[]
}

export interface ProjectRuleDiagnostic {
  level: 'warning' | 'error'
  code: 'invalid_frontmatter' | 'rule_too_large' | 'empty_rule' | 'too_many_globs'
  message: string
}

export interface ProjectRulePromptContext {
  path: string
  description?: string
  content: string
  globs?: string[]
  alwaysApply?: boolean
}

export const PROJECT_RULES_GLOB = '.panda/rules/*.md'
export const MAX_PROJECT_RULE_BYTES = 12_000
export const MAX_PROJECT_RULES = 8
export const MAX_PROJECT_RULE_GLOBS = 12

export function parseProjectRuleFile(args: { path: string; content: string }): ParsedProjectRule {
  const diagnostics: ProjectRuleDiagnostic[] = []
  const { frontmatter, body } = splitFrontmatter(args.content, diagnostics)
  const globs = parseStringList(frontmatter.globs).slice(0, MAX_PROJECT_RULE_GLOBS)
  if (parseStringList(frontmatter.globs).length > MAX_PROJECT_RULE_GLOBS) {
    diagnostics.push({
      level: 'warning',
      code: 'too_many_globs',
      message: `Project rule has more than ${MAX_PROJECT_RULE_GLOBS} globs; extra globs were ignored.`,
    })
  }

  let content = body.trim()
  if (new TextEncoder().encode(content).byteLength > MAX_PROJECT_RULE_BYTES) {
    diagnostics.push({
      level: 'warning',
      code: 'rule_too_large',
      message: `Project rule content exceeded ${MAX_PROJECT_RULE_BYTES} bytes and was truncated.`,
    })
    content = truncateUtf8(content, MAX_PROJECT_RULE_BYTES)
  }
  if (!content) {
    diagnostics.push({ level: 'warning', code: 'empty_rule', message: 'Project rule is empty.' })
  }

  return {
    path: args.path,
    description: typeof frontmatter.description === 'string' ? frontmatter.description : undefined,
    globs,
    alwaysApply: frontmatter.alwaysApply === true,
    content,
    diagnostics,
  }
}

export function isProjectRulePath(path: string): boolean {
  return /^\.panda\/rules\/[^/]+\.md$/.test(path)
}

export function resolveProjectRulesForPrompt(args: {
  rules: ParsedProjectRule[]
  activePaths?: string[]
  maxRules?: number
}): ProjectRulePromptContext[] {
  const activePaths = args.activePaths ?? []
  return args.rules
    .filter(
      (rule) =>
        rule.alwaysApply ||
        rule.globs.some((glob) => activePaths.some((path) => globMatches(glob, path)))
    )
    .slice(0, args.maxRules ?? MAX_PROJECT_RULES)
    .map((rule) => ({
      path: rule.path,
      description: rule.description,
      content: rule.content,
      globs: rule.globs,
      alwaysApply: rule.alwaysApply,
    }))
}

export function formatProjectRulesForPrompt(rules: ProjectRulePromptContext[]): string {
  if (rules.length === 0) return ''
  return [
    '## Project Rules',
    'Apply these checked-in, path-scoped project constraints when relevant. They are rules, not optional skills.',
    ...rules.map((rule) =>
      [
        `### ${rule.path}`,
        rule.description ? `Description: ${rule.description}` : undefined,
        rule.alwaysApply
          ? 'Scope: always apply'
          : rule.globs?.length
            ? `Scope: ${rule.globs.join(', ')}`
            : undefined,
        rule.content,
      ]
        .filter((part): part is string => Boolean(part))
        .join('\n')
    ),
  ].join('\n\n')
}

function splitFrontmatter(
  raw: string,
  diagnostics: ProjectRuleDiagnostic[]
): { frontmatter: Record<string, unknown>; body: string } {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/)
  if (!match) return { frontmatter: {}, body: raw }

  try {
    return { frontmatter: parseSimpleFrontmatter(match[1] ?? ''), body: match[2] ?? '' }
  } catch (error) {
    diagnostics.push({
      level: 'error',
      code: 'invalid_frontmatter',
      message: error instanceof Error ? error.message : 'Invalid project rule frontmatter.',
    })
    return { frontmatter: {}, body: match[2] ?? '' }
  }
}

function parseSimpleFrontmatter(input: string): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const line of input.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separator = trimmed.indexOf(':')
    if (separator === -1) throw new Error(`Invalid frontmatter line: ${trimmed}`)
    const key = trimmed.slice(0, separator).trim()
    const value = trimmed.slice(separator + 1).trim()
    if (value === 'true' || value === 'false') {
      result[key] = value === 'true'
    } else if (value.startsWith('[') && value.endsWith(']')) {
      result[key] = value
        .slice(1, -1)
        .split(',')
        .map((item) => item.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean)
    } else {
      result[key] = value.replace(/^['"]|['"]$/g, '')
    }
  }
  return result
}

function parseStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

function globMatches(glob: string, path: string): boolean {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '::DOUBLE_STAR::')
    .replace(/\*/g, '[^/]*')
    .replace(/::DOUBLE_STAR::/g, '.*')
  return new RegExp(`^${escaped}$`).test(path)
}

function truncateUtf8(input: string, maxBytes: number): string {
  let output = ''
  let bytes = 0
  for (const char of input) {
    const charBytes = new TextEncoder().encode(char).byteLength
    if (bytes + charBytes > maxBytes) break
    output += char
    bytes += charBytes
  }
  return output
}
