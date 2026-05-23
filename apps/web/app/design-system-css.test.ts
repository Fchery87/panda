import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const repoRoot = resolve(import.meta.dir, '../../..')
const globalsCss = readFileSync(resolve(repoRoot, 'apps/web/app/globals.css'), 'utf8')
const tailwindConfig = readFileSync(resolve(repoRoot, 'apps/web/tailwind.config.ts'), 'utf8')
const workspaceLayout = readFileSync(
  resolve(repoRoot, 'apps/web/components/projects/ProjectWorkspaceLayout.tsx'),
  'utf8'
)
const compactGlobalsCss = globalsCss.replace(/\s+/g, ' ')

describe('Panda design system CSS contract', () => {
  test('uses OKLCH channel tokens from docs/DESIGN.md as the theme source', () => {
    expect(globalsCss).toContain('--background: 99.07% 0.003 270;')
    expect(globalsCss).toContain('--foreground: 14.5% 0.005 270;')
    expect(globalsCss).toContain('--primary: 63.5% 0.17 40;')
    expect(globalsCss).toContain('--primary: 72% 0.165 55;')
    expect(globalsCss).toContain('--surface-1: 97.5% 0.003 270;')
    expect(globalsCss).toContain('--surface-0: 13% 0.005 270;')
    expect(tailwindConfig).toContain("background: 'oklch(var(--background))'")
    expect(tailwindConfig).toContain('primary: {')
    expect(tailwindConfig).toContain("DEFAULT: 'oklch(var(--primary))'")
  })

  test('implements the reference hard-grid texture and avoids decorative glows', () => {
    expect(globalsCss).toContain('radial-gradient(')
    expect(compactGlobalsCss).toContain('background-size: 24px 24px, auto')
    expect(globalsCss).not.toContain('.accent-glow')
  })

  test('does not use forbidden colored side-stripe state bands', () => {
    expect(globalsCss).not.toContain('border-l-4')
    expect(globalsCss).not.toContain('border-left-color')
  })

  test('keeps mobile workbench navigation as focused views', () => {
    expect(workspaceLayout).toContain('aria-label="Show workspace"')
    expect(workspaceLayout).toContain('aria-label="Show chat timeline"')
    expect(workspaceLayout).toContain('aria-label="Show run proof"')
    expect(workspaceLayout).toContain('aria-label="Show generated changes"')
  })
})
