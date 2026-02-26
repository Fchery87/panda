import { describe, expect, test } from 'bun:test'
import path from 'node:path'

async function readComponent(fileName: string) {
  const fs = await import('node:fs')
  return fs.readFileSync(path.resolve(import.meta.dir, fileName), 'utf-8')
}

describe('chat selector dropdown overflow guards', () => {
  test('ModelSelector constrains dropdown content to viewport and aligns from the end', async () => {
    const content = await readComponent('ModelSelector.tsx')

    expect(content).toContain('align="end"')
    expect(content).toContain('collisionPadding={8}')
    expect(content).toContain('max-w-[calc(100vw-1rem)]')
    expect(content).toContain('SelectPrimitive.ScrollUpButton')
    expect(content).toContain('SelectPrimitive.ScrollDownButton')
    expect(content).toContain('const [showTopFade, setShowTopFade] = useState(false)')
    expect(content).toContain('const [showBottomFade, setShowBottomFade] = useState(false)')
    expect(content).toContain('onScroll={updateFadeVisibility}')
    expect(content).toContain('{showTopFade && (')
    expect(content).toContain('{showBottomFade && (')
  })

  test('VariantSelector uses collision-aware select content so it can flip and avoid clipping', async () => {
    const content = await readComponent('VariantSelector.tsx')

    expect(content).toContain('<SelectPrimitive.Content')
    expect(content).toContain('align="end"')
    expect(content).toContain('collisionPadding={8}')
    expect(content).toContain('max-w-[calc(100vw-1rem)]')
  })
})
