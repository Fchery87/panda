export function createBrowserSessionKey(args: {
  projectId: string
  chatId: string
  taskId: string
}): string {
  return `browser-session::${args.projectId}::${args.chatId}::${args.taskId}`
}

export function deriveQaReportFingerprint(args: {
  taskId: string
  runId: string
  flowNames: string[]
  urlsTested: string[]
}): string {
  return [
    args.taskId,
    args.runId,
    ...args.flowNames.slice().sort(),
    ...args.urlsTested.slice().sort(),
  ].join('::')
}

export function shouldCreateFreshQaArtifacts(args: {
  latestFingerprint: string | null
  nextFingerprint: string
}): boolean {
  return args.latestFingerprint !== args.nextFingerprint
}
