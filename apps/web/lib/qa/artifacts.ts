export function buildBrowserQaArtifactRecord(args: {
  browserSessionKey: string
  taskId: string
  runId: string
  screenshotPath?: string
  urlsTested: string[]
}) {
  return {
    artifactKey: `${args.browserSessionKey}::${args.runId}`,
    label: `Browser QA artifact for run ${args.runId}`,
    href: args.screenshotPath,
    metadata: {
      browserSessionKey: args.browserSessionKey,
      taskId: args.taskId,
      runId: args.runId,
      urlsTested: args.urlsTested.slice(),
    },
  }
}
