import { readFileSync } from 'node:fs'

type CommandCatalog = {
  version: number
  commands: Array<{ command: string; label: string; detail: string; proof: string }>
  recommendedProofLoop: string[]
}
const catalog = JSON.parse(readFileSync('docs/development-commands.json', 'utf8')) as CommandCatalog
const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
  scripts?: Record<string, string>
}
const readme = readFileSync('README.md', 'utf8')
const workspaceHome = readFileSync('apps/web/components/workbench/WorkspaceHome.tsx', 'utf8')
const errors: string[] = []
const scripts = packageJson.scripts ?? {}
for (const item of catalog.commands) {
  if (!item.command || !item.label || !item.detail || !item.proof)
    errors.push(`Command catalog entry is incomplete: ${JSON.stringify(item)}`)
  if (!readme.includes(`\`${item.command}\``))
    errors.push(`README.md is missing command from docs/development-commands.json: ${item.command}`)
  const match = item.command.match(/^bun run ([\w:-]+)$/)
  if (match && !scripts[match[1]])
    errors.push(`package.json is missing script referenced by catalog: ${match[1]}`)
  if (item.command === 'bun test' && !scripts.test)
    errors.push('package.json is missing test script referenced by catalog: bun test')
}
for (const command of catalog.recommendedProofLoop) {
  if (!catalog.commands.some((item) => item.command === command))
    errors.push(`recommendedProofLoop references unknown command: ${command}`)
  if (!readme.includes(command))
    errors.push(`README.md recommended proof loop is missing: ${command}`)
}
if (!workspaceHome.includes('@/lib/product/development-commands'))
  errors.push('WorkspaceHome must render commands from @/lib/product/development-commands')
const duplicates = catalog.commands
  .map((item) => item.command)
  .filter((command, index, all) => all.indexOf(command) !== index)
if (duplicates.length > 0)
  errors.push(`Duplicate commands in catalog: ${[...new Set(duplicates)].join(', ')}`)
if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join('\n'))
  process.exit(1)
}
console.log(
  `Development command catalog OK: ${catalog.commands.length} commands, ${catalog.recommendedProofLoop.length} proof-loop commands.`
)
