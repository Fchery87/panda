/**
 * Repo Overview Generator
 *
 * Generates a structured project overview from file tree and config files.
 * Zero LLM cost - deterministic analysis.
 */

export interface FileInfo {
  path: string
  content?: string
  updatedAt?: number
}

export interface RepoOverview {
  projectName: string
  projectDescription?: string
  directoryTree: string
  techStack: TechStackInfo
  entryPoints: string[]
  buildCommands: string[]
  testCommands: string[]
  coreFiles: string[]
  fileCount: number
  tokenCount: number
}

export interface TechStackInfo {
  languages: string[]
  frameworks: string[]
  buildTools: string[]
  packageManager?: string
  runtime?: string
}

const EXCLUDED_DIRS = [
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  '.turbo',
  'coverage',
  '.coverage',
]

const EXCLUDED_FILES = [
  '.DS_Store',
  '.gitignore',
  '.env',
  '.env.local',
  '.env.development',
  '.env.production',
  'package-lock.json',
  'yarn.lock',
  'bun.lockb',
  'pnpm-lock.yaml',
]

const ENTRY_POINT_PATTERNS = [
  /^index\.(ts|tsx|js|jsx)$/i,
  /^main\.(ts|tsx|js|jsx)$/i,
  /^app\.(ts|tsx|js|jsx)$/i,
  /^server\.(ts|tsx|js|jsx)$/i,
  /^cli\.(ts|tsx|js|jsx)$/i,
]

const CONFIG_FILES = [
  'package.json',
  'tsconfig.json',
  'jsconfig.json',
  'vite.config.ts',
  'vite.config.js',
  'next.config.ts',
  'next.config.js',
  'tailwind.config.ts',
  'tailwind.config.js',
  'jest.config.ts',
  'jest.config.js',
  'vitest.config.ts',
  'vitest.config.js',
  'Cargo.toml',
  'go.mod',
  'requirements.txt',
  'pyproject.toml',
  'Dockerfile',
  'docker-compose.yml',
  'turbo.json',
]

/**
 * Generate a structured repo overview from file list
 */
export function generateRepoOverview(
  files: FileInfo[],
  projectName: string,
  projectDescription?: string
): RepoOverview {
  const validFiles = files.filter((f) => isValidFile(f.path))
  const tree = buildDirectoryTree(validFiles.map((f) => f.path))
  const techStack = detectTechStack(validFiles)
  const entryPoints = findEntryPoints(validFiles)
  const { buildCommands, testCommands } = extractCommands(validFiles, techStack.packageManager)
  const coreFiles = findCoreFiles(validFiles)

  const overview: RepoOverview = {
    projectName,
    projectDescription,
    directoryTree: tree,
    techStack,
    entryPoints,
    buildCommands,
    testCommands,
    coreFiles,
    fileCount: validFiles.length,
    tokenCount: 0, // Will be calculated after formatting
  }

  overview.tokenCount = estimateTokenCount(overview)
  return overview
}

/**
 * Format the overview as a compact markdown string
 */
export function formatOverviewForPrompt(overview: RepoOverview): string {
  const lines: string[] = []

  lines.push(`## Project: ${overview.projectName}`)
  if (overview.projectDescription) {
    lines.push(`**Description:** ${overview.projectDescription}`)
  }
  lines.push('')

  // Tech Stack
  if (overview.techStack.languages.length > 0) {
    lines.push(`**Stack:** ${overview.techStack.languages.join(', ')}`)
  }
  if (overview.techStack.frameworks.length > 0) {
    lines.push(`**Frameworks:** ${overview.techStack.frameworks.join(', ')}`)
  }
  if (overview.techStack.buildTools.length > 0) {
    lines.push(`**Build:** ${overview.techStack.buildTools.join(', ')}`)
  }
  lines.push('')

  // Directory Tree (limited depth)
  lines.push('**Structure:**')
  lines.push('```')
  lines.push(truncateTree(overview.directoryTree, 3))
  lines.push('```')
  lines.push('')

  // Entry Points
  if (overview.entryPoints.length > 0) {
    lines.push(`**Entry Points:** ${overview.entryPoints.slice(0, 5).join(', ')}`)
  }

  // Commands
  if (overview.buildCommands.length > 0) {
    lines.push(`**Build:** \`${overview.buildCommands.slice(0, 3).join('`, `')}\``)
  }
  if (overview.testCommands.length > 0) {
    lines.push(`**Test:** \`${overview.testCommands.slice(0, 3).join('`, `')}\``)
  }

  // Core Files
  if (overview.coreFiles.length > 0) {
    lines.push(`**Key Files:** ${overview.coreFiles.slice(0, 5).join(', ')}`)
  }

  lines.push(`**Total Files:** ${overview.fileCount}`)

  let output = lines.join('\n')

  // Hard cap at ~800 tokens (roughly 3200 chars)
  if (output.length > 3200) {
    output = output.slice(0, 3200) + '\n\n[... truncated to fit token budget]'
  }

  return output
}

function isValidFile(path: string): boolean {
  const parts = path.split('/')

  // Check excluded directories
  for (const part of parts) {
    if (EXCLUDED_DIRS.includes(part)) return false
  }

  // Check excluded files
  const filename = parts[parts.length - 1]
  if (EXCLUDED_FILES.includes(filename)) return false

  return true
}

function buildDirectoryTree(paths: string[]): string {
  const tree: Record<string, unknown> = {}

  for (const path of paths) {
    const parts = path.split('/').filter(Boolean)
    let current = tree
    for (const part of parts) {
      if (!current[part]) {
        current[part] = {}
      }
      current = current[part] as Record<string, unknown>
    }
  }

  return renderTree(tree, '', 0, 3)
}

function renderTree(
  node: Record<string, unknown>,
  prefix: string,
  depth: number,
  maxDepth: number
): string {
  if (depth > maxDepth) {
    return prefix + '[...]'
  }

  const entries = Object.entries(node).sort(([a], [b]) => a.localeCompare(b))
  const lines: string[] = []

  for (let i = 0; i < entries.length; i++) {
    const [name, children] = entries[i]
    const isLast = i === entries.length - 1
    const connector = isLast ? '└── ' : '├── '
    const childPrefix = isLast ? '    ' : '│   '

    lines.push(prefix + connector + name)

    const childKeys = Object.keys(children as Record<string, unknown>)
    if (childKeys.length > 0) {
      if (depth < maxDepth) {
        const childTree = renderTree(
          children as Record<string, unknown>,
          prefix + childPrefix,
          depth + 1,
          maxDepth
        )
        lines.push(childTree)
      } else {
        lines.push(prefix + childPrefix + '[...]')
      }
    }
  }

  return lines.join('\n')
}

function truncateTree(tree: string, maxLines: number): string {
  const lines = tree.split('\n')
  if (lines.length <= maxLines) return tree
  return lines.slice(0, maxLines).join('\n') + '\n...'
}

function detectTechStack(files: FileInfo[]): TechStackInfo {
  const stack: TechStackInfo = {
    languages: [],
    frameworks: [],
    buildTools: [],
  }

  const fileSet = new Set(files.map((f) => f.path.toLowerCase()))
  const hasFile = (name: string) => fileSet.has(name.toLowerCase())

  // Detect languages and frameworks
  if (hasFile('package.json')) {
    const pkgFile = files.find((f) => f.path.toLowerCase() === 'package.json')
    if (pkgFile?.content) {
      try {
        const pkg = JSON.parse(pkgFile.content)

        // Package manager
        if (hasFile('bun.lockb')) stack.packageManager = 'bun'
        else if (hasFile('pnpm-lock.yaml')) stack.packageManager = 'pnpm'
        else if (hasFile('yarn.lock')) stack.packageManager = 'yarn'
        else stack.packageManager = 'npm'

        // Runtime
        if (pkg.engines?.node) stack.runtime = `node${pkg.engines.node.replace('>=', '')}`

        // Frameworks from dependencies
        const deps = { ...pkg.dependencies, ...pkg.devDependencies }
        if (deps.next) stack.frameworks.push('Next.js')
        if (deps.react) stack.frameworks.push('React')
        if (deps.vue) stack.frameworks.push('Vue')
        if (deps['@angular/core']) stack.frameworks.push('Angular')
        if (deps.express) stack.frameworks.push('Express')
        if (deps.fastify) stack.frameworks.push('Fastify')
        if (deps.nestjs) stack.frameworks.push('NestJS')
        if (deps.convex) stack.frameworks.push('Convex')

        // Build tools
        if (deps.vite) stack.buildTools.push('Vite')
        if (deps.webpack) stack.buildTools.push('Webpack')
        if (deps.turbo) stack.buildTools.push('Turborepo')
        if (deps['@tailwindcss/postcss'] || deps.tailwindcss) stack.buildTools.push('Tailwind')
        if (deps.typescript || hasFile('tsconfig.json')) {
          if (!stack.languages.includes('TypeScript')) {
            stack.languages.push('TypeScript')
          }
        }
      } catch {
        // Ignore parse errors
      }
    }
    if (!stack.languages.includes('JavaScript')) {
      stack.languages.push('JavaScript')
    }
  }

  if (hasFile('tsconfig.json') && !stack.languages.includes('TypeScript')) {
    stack.languages.push('TypeScript')
  }

  if (hasFile('cargo.toml')) {
    stack.languages.push('Rust')
    stack.buildTools.push('Cargo')
  }

  if (hasFile('go.mod')) {
    stack.languages.push('Go')
  }

  if (hasFile('requirements.txt') || hasFile('pyproject.toml')) {
    stack.languages.push('Python')
  }

  return stack
}

function findEntryPoints(files: FileInfo[]): string[] {
  const entryPoints: string[] = []

  for (const file of files) {
    const filename = file.path.split('/').pop() || ''
    if (ENTRY_POINT_PATTERNS.some((pattern) => pattern.test(filename))) {
      entryPoints.push(file.path)
    }
  }

  return entryPoints.sort()
}

function extractCommands(
  files: FileInfo[],
  packageManager = 'npm'
): {
  buildCommands: string[]
  testCommands: string[]
} {
  const buildCommands: string[] = []
  const testCommands: string[] = []

  const pkgFile = files.find((f) => f.path.toLowerCase() === 'package.json')
  if (pkgFile?.content) {
    try {
      const pkg = JSON.parse(pkgFile.content)
      const scripts = pkg.scripts || {}

      // Determine run command based on package manager
      const runCmd = packageManager === 'npm' ? 'npm run' : `${packageManager} run`
      const startCmd = packageManager === 'npm' ? 'npm start' : `${packageManager} start`
      const testCmd = packageManager === 'npm' ? 'npm test' : `${packageManager} test`

      // Build commands
      if (scripts.build) buildCommands.push(`${runCmd} build`)
      if (scripts.dev) buildCommands.push(`${runCmd} dev`)
      if (scripts.start) buildCommands.push(startCmd)

      // Test commands
      if (scripts.test) testCommands.push(testCmd)
      if (scripts['test:unit']) testCommands.push(`${runCmd} test:unit`)
      if (scripts['test:e2e']) testCommands.push(`${runCmd} test:e2e`)
    } catch {
      // Ignore parse errors
    }
  }

  return { buildCommands, testCommands }
}

function findCoreFiles(files: FileInfo[]): string[] {
  const coreFiles: string[] = []

  for (const file of files) {
    const filename = file.path.split('/').pop() || ''
    const dirDepth = file.path.split('/').length - 1

    // Root-level config files
    if (dirDepth === 0 && CONFIG_FILES.includes(filename)) {
      coreFiles.push(file.path)
      continue
    }

    // Main application files
    if (
      filename.startsWith('main.') ||
      filename.startsWith('index.') ||
      filename.startsWith('app.') ||
      filename.startsWith('layout.') ||
      filename.startsWith('page.') ||
      filename.startsWith('route.')
    ) {
      if (dirDepth <= 2) {
        coreFiles.push(file.path)
      }
    }
  }

  return coreFiles.slice(0, 10).sort()
}

function estimateTokenCount(overview: RepoOverview): number {
  // Rough estimate: 1 token ≈ 4 characters for English text
  const formatted = formatOverviewForPrompt(overview)
  return Math.ceil(formatted.length / 4)
}
