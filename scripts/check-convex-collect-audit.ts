import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
type Audit = {
  files: Array<{
    file: string
    maxCollectCalls: number
    risk: string
    owner: string
    nextAction: string
  }>
}
function walk(dir: string, out: string[] = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '_generated' || e.name === 'node_modules') continue
    const p = join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (p.endsWith('.ts') && !p.endsWith('.test.ts')) out.push(p)
  }
  return out
}
const audit = JSON.parse(readFileSync('docs/convex-collect-audit.json', 'utf8')) as Audit
const by = new Map(audit.files.map((e) => [e.file, e]))
const actual = new Map<string, number>()
const errors: string[] = []
for (const file of walk('convex')) {
  const count = readFileSync(file, 'utf8').match(/\.collect\(/g)?.length ?? 0
  if (count > 0) actual.set(file, count)
}
for (const [file, count] of actual) {
  const e = by.get(file)
  if (!e)
    errors.push(
      `${file} has ${count} .collect() call(s) but is missing from docs/convex-collect-audit.json`
    )
  else {
    if (count > e.maxCollectCalls)
      errors.push(
        `${file} has ${count} .collect() call(s), exceeding audited ceiling ${e.maxCollectCalls}`
      )
    if (!e.owner || !e.nextAction)
      errors.push(`${file} audit entry must include owner and nextAction`)
  }
}
for (const e of audit.files) {
  const count = actual.get(e.file) ?? 0
  if (count === 0)
    errors.push(`${e.file} is audited for .collect() but no production .collect() calls remain`)
  if (e.maxCollectCalls < count)
    errors.push(`${e.file} audit ceiling ${e.maxCollectCalls} is below actual count ${count}`)
}
if (errors.length) {
  console.error(errors.map((e) => `- ${e}`).join('\n'))
  process.exit(1)
}
console.log(
  `Convex collect audit OK: ${actual.size} files, ${[...actual.values()].reduce((s, n) => s + n, 0)} production .collect() calls.`
)
