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

describe('Panda "Ink & Paper" (Red Ink) design system CSS contract', () => {
  test('uses the Red Ink OKLCH channel tokens as the theme source', () => {
    // Paper: near-pure white canvas (whisper of cool, hue ≈ 255), raised near-white card
    expect(globalsCss).toContain('--background: 98.5% 0.002 255;')
    expect(globalsCss).toContain('--card: 99.7% 0.001 255;')
    // Oxblood is the signature red-ink action color in light mode (AA in both directions)
    expect(globalsCss).toContain('--primary: 40% 0.155 25;')
    // Oxblood lifts to a brighter garnet as the action color in dark mode
    expect(globalsCss).toContain('--primary: 62% 0.16 26;')
    // Accent + run-evidence roles exist
    expect(globalsCss).toContain('--oxblood:')
    expect(globalsCss).toContain('--teal:')
    // Soft product radius, not broadsheet zero
    expect(globalsCss).toContain('--radius: 12px;')
    expect(tailwindConfig).toContain("background: 'oklch(var(--background))'")
    expect(tailwindConfig).toContain('primary: {')
    expect(tailwindConfig).toContain("DEFAULT: 'oklch(var(--primary))'")
    expect(tailwindConfig).toContain("oxblood: 'oklch(var(--oxblood))'")
  })

  test('never uses the vibe-coded AI palette (no violet/indigo/lavender tokens)', () => {
    // The old warm-paper + violet-ink + lavender tokens must be fully gone.
    expect(globalsCss).not.toContain('--lavender')
    expect(globalsCss).not.toContain('--iris')
    expect(tailwindConfig).not.toContain("lavender:")
    expect(tailwindConfig).not.toContain("iris:")
    // No color-tinted glow shadows: shadows must be neutral (oklch near-black / pure black),
    // never the old hardcoded violet `oklch(21% 0.07 285 …)`.
    expect(globalsCss).not.toContain('oklch(21% 0.07 285')
    expect(compactGlobalsCss).not.toContain('oklch(79.5% 0.095 295')
  })

  test('defines the ink-panel signature surface', () => {
    expect(globalsCss).toContain('.ink-panel {')
    // The panel re-themes descendants by re-declaring core variables locally
    expect(compactGlobalsCss).toMatch(/\.ink-panel \{[^}]*--background:/)
    expect(compactGlobalsCss).toMatch(/\.ink-panel \{[^}]*--primary:/)
  })

  test('loads the display and body typefaces of the system', () => {
    const rootLayout = readFileSync(resolve(repoRoot, 'apps/web/app/layout.tsx'), 'utf8')
    expect(rootLayout).toContain('Bricolage_Grotesque')
    expect(rootLayout).toContain('Schibsted_Grotesk')
    expect(tailwindConfig).toContain("display: ['var(--font-display)'")
  })

  test('keeps the quiet paper-grain texture and avoids decorative glows', () => {
    expect(globalsCss).toContain('radial-gradient(')
    expect(compactGlobalsCss).toContain('background-size: 28px 28px, auto')
    expect(globalsCss).not.toContain('.accent-glow')
  })

  test('does not use forbidden colored side-stripe state bands', () => {
    expect(globalsCss).not.toContain('border-l-4')
    expect(globalsCss).not.toContain('border-left-color')
  })

  test('keeps mobile workbench navigation as focused views', () => {
    expect(workspaceLayout).toContain('aria-label="Show editor"')
    expect(workspaceLayout).toContain('aria-label="Show chat timeline"')
    expect(workspaceLayout).toContain('aria-label="Show run evidence"')
    expect(workspaceLayout).toContain('aria-label="Show generated changes"')
  })
})
