export function buildQaSummary(args: {
  decision: 'pass' | 'concerns' | 'fail'
  assertions: Array<{ label: string; status: 'passed' | 'failed' | 'skipped' }>
  evidence: {
    urlsTested: string[]
    flowNames: string[]
  }
}): string {
  const statusText =
    args.decision === 'pass'
      ? 'QA passed'
      : args.decision === 'concerns'
        ? 'QA completed with concerns'
        : 'QA failed'

  return `${statusText} on ${args.evidence.urlsTested.join(', ')}.`
}
