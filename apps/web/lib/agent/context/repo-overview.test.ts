/**
 * Repo Overview Tests
 *
 * Tests for the repo-overview.ts module
 */

import { describe, test, expect } from 'bun:test'
import { generateRepoOverview, formatOverviewForPrompt, type FileInfo } from './repo-overview'

describe('generateRepoOverview', () => {
  test('produces correct structure from mock file list', () => {
    const files: FileInfo[] = [
      { path: 'package.json', content: '{"name": "test"}' },
      { path: 'src/index.ts', content: 'console.log("hello")' },
      { path: 'src/utils.ts', content: 'export function util() {}' },
      { path: 'README.md', content: '# Test Project' },
    ]

    const overview = generateRepoOverview(files, 'Test Project', 'A test project')

    expect(overview.projectName).toBe('Test Project')
    expect(overview.projectDescription).toBe('A test project')
    expect(overview.fileCount).toBe(4)
    expect(overview.directoryTree).toContain('src')
    expect(overview.directoryTree).toContain('package.json')
  })

  test('tech stack detection works for package.json', () => {
    const files: FileInfo[] = [
      {
        path: 'package.json',
        content: JSON.stringify({
          dependencies: { react: '^18.0.0', next: '^14.0.0' },
          devDependencies: { typescript: '^5.0.0', vite: '^5.0.0' },
        }),
      },
      { path: 'tsconfig.json', content: '{}' },
    ]

    const overview = generateRepoOverview(files, 'React App')

    expect(overview.techStack.languages).toContain('TypeScript')
    expect(overview.techStack.languages).toContain('JavaScript')
    expect(overview.techStack.frameworks).toContain('React')
    expect(overview.techStack.frameworks).toContain('Next.js')
    expect(overview.techStack.buildTools).toContain('Vite')
  })

  test('directory tree respects depth limit', () => {
    const files: FileInfo[] = [
      { path: 'a/b/c/d/e/f/file.ts', content: '' },
      { path: 'a/b/c/file2.ts', content: '' },
      { path: 'root.ts', content: '' },
    ]

    const overview = generateRepoOverview(files, 'Deep Project')

    // Tree should be limited to depth 3
    expect(overview.directoryTree).toContain('a')
    expect(overview.directoryTree).toContain('b')
    expect(overview.directoryTree).toContain('c')
    // Should show truncation for deeper levels
    expect(overview.directoryTree).toContain('[...]')
  })

  test('excludes node_modules and .git', () => {
    const files: FileInfo[] = [
      { path: 'src/index.ts', content: '' },
      { path: 'node_modules/react/index.js', content: '' },
      { path: '.git/config', content: '' },
      { path: '.env.local', content: '' },
    ]

    const overview = generateRepoOverview(files, 'Project')

    expect(overview.fileCount).toBe(1)
    expect(overview.directoryTree).toContain('src')
    expect(overview.directoryTree).not.toContain('node_modules')
    expect(overview.directoryTree).not.toContain('.git')
    expect(overview.directoryTree).not.toContain('.env.local')
  })

  test('output stays under 800-token hard cap', () => {
    // Generate many files
    const files: FileInfo[] = Array.from({ length: 100 }, (_, i) => ({
      path: `src/components/Component${i}/index.ts`,
      content: `export function Component${i}() {}`,
    }))

    const overview = generateRepoOverview(files, 'Big Project')

    // Token count should be reasonable (under 800)
    expect(overview.tokenCount).toBeLessThan(800)
  })

  test('handles empty project', () => {
    const overview = generateRepoOverview([], 'Empty Project')

    expect(overview.fileCount).toBe(0)
    expect(overview.directoryTree).toBe('')
    expect(overview.techStack.languages).toHaveLength(0)
  })

  test('handles single-file project', () => {
    const files: FileInfo[] = [{ path: 'main.py', content: 'print("hello")' }]

    const overview = generateRepoOverview(files, 'Single File')

    expect(overview.fileCount).toBe(1)
    expect(overview.directoryTree).toContain('main.py')
    expect(overview.entryPoints).toHaveLength(0) // main.py doesn't match entry point patterns
  })

  test('identifies entry points correctly', () => {
    const files: FileInfo[] = [
      { path: 'src/index.ts', content: '' },
      { path: 'src/main.tsx', content: '' },
      { path: 'server.ts', content: '' },
      { path: 'app.ts', content: '' },
      { path: 'cli.ts', content: '' },
    ]

    const overview = generateRepoOverview(files, 'Multi-Entry')

    expect(overview.entryPoints).toContain('src/index.ts')
    expect(overview.entryPoints).toContain('src/main.tsx')
    expect(overview.entryPoints).toContain('server.ts')
    expect(overview.entryPoints).toContain('app.ts')
    expect(overview.entryPoints).toContain('cli.ts')
  })

  test('extracts build and test commands from package.json', () => {
    const files: FileInfo[] = [
      {
        path: 'package.json',
        content: JSON.stringify({
          scripts: {
            build: 'next build',
            dev: 'next dev',
            start: 'next start',
            test: 'jest',
            'test:unit': 'jest --testPathPattern=unit',
            'test:e2e': 'playwright test',
          },
        }),
      },
    ]

    const overview = generateRepoOverview(files, 'NPM Project')

    expect(overview.buildCommands).toContain('npm run build')
    expect(overview.buildCommands).toContain('npm run dev')
    expect(overview.buildCommands).toContain('npm start')
    expect(overview.testCommands).toContain('npm test')
    expect(overview.testCommands).toContain('npm run test:unit')
    expect(overview.testCommands).toContain('npm run test:e2e')
  })

  test('identifies core files correctly', () => {
    const files: FileInfo[] = [
      { path: 'package.json', content: '' },
      { path: 'tsconfig.json', content: '' },
      { path: 'src/index.ts', content: '' },
      { path: 'src/app/layout.tsx', content: '' },
      { path: 'src/app/page.tsx', content: '' },
      { path: 'src/deep/nested/file.ts', content: '' },
    ]

    const overview = generateRepoOverview(files, 'Core Files')

    expect(overview.coreFiles).toContain('package.json')
    expect(overview.coreFiles).toContain('tsconfig.json')
    expect(overview.coreFiles).toContain('src/index.ts')
    expect(overview.coreFiles).toContain('src/app/layout.tsx')
    expect(overview.coreFiles).toContain('src/app/page.tsx')
    // Deep nested file shouldn't be in core files
    expect(overview.coreFiles).not.toContain('src/deep/nested/file.ts')
  })

  test('detects Rust projects', () => {
    const files: FileInfo[] = [
      { path: 'Cargo.toml', content: '[package]' },
      { path: 'src/main.rs', content: '' },
    ]

    const overview = generateRepoOverview(files, 'Rust Project')

    expect(overview.techStack.languages).toContain('Rust')
    expect(overview.techStack.buildTools).toContain('Cargo')
  })

  test('detects Go projects', () => {
    const files: FileInfo[] = [
      { path: 'go.mod', content: 'module example.com/test' },
      { path: 'main.go', content: '' },
    ]

    const overview = generateRepoOverview(files, 'Go Project')

    expect(overview.techStack.languages).toContain('Go')
  })

  test('detects Python projects', () => {
    const files: FileInfo[] = [
      { path: 'requirements.txt', content: 'requests\nnumpy' },
      { path: 'main.py', content: '' },
    ]

    const overview = generateRepoOverview(files, 'Python Project')

    expect(overview.techStack.languages).toContain('Python')
  })
})

describe('formatOverviewForPrompt', () => {
  test('renders compact markdown', () => {
    const overview = generateRepoOverview(
      [
        { path: 'package.json', content: '{"name": "test"}' },
        { path: 'src/index.ts', content: '' },
      ],
      'Test Project',
      'A test project'
    )

    const formatted = formatOverviewForPrompt(overview)

    expect(formatted).toContain('## Project: Test Project')
    expect(formatted).toContain('**Description:** A test project')
    expect(formatted).toContain('**Stack:**')
    expect(formatted).toContain('**Total Files:**')
  })

  test('truncates output exceeding token budget', () => {
    // Create a large number of files with long paths to trigger truncation
    const files: FileInfo[] = Array.from({ length: 200 }, (_, i) => ({
      path: `src/features/very-long-feature-name-${i}/components/VeryLongComponentName${i}/index.ts`,
      content: '',
    }))

    const overview = generateRepoOverview(
      files,
      'Huge Project With Very Long Name That Takes Up Space'
    )
    const formatted = formatOverviewForPrompt(overview)

    // The truncation should occur if the formatted output exceeds ~3200 chars
    // Since we're generating 200 files with long paths, this should definitely trigger truncation
    if (formatted.length >= 3200) {
      expect(formatted).toContain('[... truncated to fit token budget]')
    }
    // Verify it's under the hard limit
    expect(formatted.length).toBeLessThanOrEqual(3400)
  })

  test('handles missing description gracefully', () => {
    const overview = generateRepoOverview([{ path: 'package.json', content: '{}' }], 'No Desc')

    const formatted = formatOverviewForPrompt(overview)

    expect(formatted).toContain('## Project: No Desc')
    expect(formatted).not.toContain('**Description:**')
  })

  test('omits empty sections', () => {
    const overview = generateRepoOverview([], 'Empty')

    const formatted = formatOverviewForPrompt(overview)

    expect(formatted).toContain('## Project: Empty')
    // Should not have stack or entry points sections for empty project
    expect(formatted).not.toContain('**Stack:**')
    expect(formatted).not.toContain('**Entry Points:**')
  })
})
