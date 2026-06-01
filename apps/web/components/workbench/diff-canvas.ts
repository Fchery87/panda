import type { DiffFileEntry } from './DiffTab'

export type DiffImportance = 'critical' | 'important' | 'routine'
export type DiffRole = 'core' | 'test' | 'docs' | 'config' | 'generated'

export interface ClassifiedDiffFile {
  file: DiffFileEntry
  fileIndex: number
  role: DiffRole
  importance: DiffImportance
  churn: number
  reason: string
}

export interface DiffCanvasGroup {
  id: DiffImportance
  label: string
  files: ClassifiedDiffFile[]
}

const GENERATED_PATTERNS = [/generated/iu, /_generated\//u, /\.snap$/u, /lock(?:file)?$/iu]
const TEST_PATTERNS = [/\.(test|spec)\.[jt]sx?$/u, /__tests__\//u]
const DOC_PATTERNS = [/\.mdx?$/u, /^docs\//u]
const CONFIG_PATTERNS = [
  /(^|\/)(package\.json|tsconfig|next\.config|tailwind\.config|eslint|prettier)/u,
]
const CORE_PATTERNS = [/^apps\//u, /^convex\//u, /^src\//u, /^lib\//u]

export function classifyDiffFile(file: DiffFileEntry, fileIndex: number): ClassifiedDiffFile {
  const churn = file.hunks.reduce(
    (total, hunk) => total + hunk.added.length + hunk.removed.length,
    0
  )
  const role = classifyRole(file.path)
  const importance = classifyImportance(file, role, churn)
  return {
    file,
    fileIndex,
    role,
    importance,
    churn,
    reason: `${role} file · ${churn} changed line${churn === 1 ? '' : 's'}`,
  }
}

export function buildDiffCanvasGroups(files: DiffFileEntry[]): DiffCanvasGroup[] {
  const classified = files.map((file, index) => classifyDiffFile(file, index))
  const groups: DiffCanvasGroup[] = [
    { id: 'critical', label: 'Critical path', files: [] },
    { id: 'important', label: 'Important review', files: [] },
    { id: 'routine', label: 'Routine / generated', files: [] },
  ]

  for (const item of classified) {
    groups.find((group) => group.id === item.importance)?.files.push(item)
  }

  return groups.filter((group) => group.files.length > 0)
}

function classifyRole(path: string): DiffRole {
  if (GENERATED_PATTERNS.some((pattern) => pattern.test(path))) return 'generated'
  if (TEST_PATTERNS.some((pattern) => pattern.test(path))) return 'test'
  if (DOC_PATTERNS.some((pattern) => pattern.test(path))) return 'docs'
  if (CONFIG_PATTERNS.some((pattern) => pattern.test(path))) return 'config'
  if (CORE_PATTERNS.some((pattern) => pattern.test(path))) return 'core'
  return 'core'
}

function classifyImportance(file: DiffFileEntry, role: DiffRole, churn: number): DiffImportance {
  if (file.status === 'deleted' && role !== 'generated') return 'critical'
  if (role === 'core' && churn >= 20) return 'critical'
  if (role === 'config') return 'critical'
  if (role === 'core') return 'important'
  if (role === 'test' || role === 'docs') return 'important'
  return 'routine'
}
