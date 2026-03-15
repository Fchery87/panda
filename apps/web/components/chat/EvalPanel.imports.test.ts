import { expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

test('EvalPanel imports eval helpers directly instead of the harness barrel', () => {
  const filePath = path.resolve(import.meta.dir, 'EvalPanel.tsx')
  const source = fs.readFileSync(filePath, 'utf8')

  expect(source).toContain("from '@/lib/agent/harness/evals'")
  expect(source).toContain("from '@/lib/agent/harness/eval-templates'")
  expect(source).not.toContain("from '@/lib/agent/harness'")
})
