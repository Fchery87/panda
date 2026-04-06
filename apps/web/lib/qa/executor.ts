import { createBrowserSessionKey } from './browser-session'
import { chromium } from '@playwright/test'
import path from 'node:path'

export function buildBrowserQaRunInput(args: {
  projectId: string
  chatId: string
  taskId: string
  urlsTested: string[]
  flowNames: string[]
  baseUrl?: string
}) {
  return {
    browserSessionKey: createBrowserSessionKey({
      projectId: args.projectId,
      chatId: args.chatId,
      taskId: args.taskId,
    }),
    urlsTested: args.urlsTested,
    flowNames: args.flowNames,
    baseUrl: args.baseUrl,
  }
}

export function resolveQaBaseUrl(explicitBaseUrl?: string): string {
  return (
    explicitBaseUrl ||
    process.env.PLAYWRIGHT_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000'
  )
}

export async function runBrowserQa(args: {
  browserSessionKey: string
  urlsTested: string[]
  flowNames: string[]
  baseUrl?: string
}) {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()
  const consoleErrors: string[] = []
  const networkFailures: string[] = []
  const baseUrl = resolveQaBaseUrl(args.baseUrl)

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text())
    }
  })
  page.on('requestfailed', (request) => {
    networkFailures.push(`${request.method()} ${request.url()}`)
  })

  try {
    const urlsTested = [...args.urlsTested]
    const assertions: Array<{ label: string; status: 'passed' | 'failed' | 'skipped' }> = []

    for (const url of urlsTested) {
      const targetUrl = new URL(url, baseUrl).toString()
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 })
      await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => undefined)

      if (args.flowNames.includes('task-panel-review-loop')) {
        const reviewButton = page.getByRole('button', { name: /^review$/i }).first()
        const isVisible = await reviewButton.isVisible().catch(() => false)
        assertions.push({
          label: 'Task panel rendered',
          status: isVisible ? 'passed' : 'failed',
        })

        if (isVisible) {
          await reviewButton.click()
        }
      }
    }

    const screenshotPath = path.join(
      '/tmp',
      `${args.browserSessionKey.replace(/[^a-zA-Z0-9_-]/g, '-')}.png`
    )
    await page.screenshot({ path: screenshotPath, fullPage: true })

    return {
      browserSessionKey: args.browserSessionKey,
      urlsTested: args.urlsTested,
      flowNames: args.flowNames,
      assertions,
      consoleErrors,
      networkFailures,
      screenshotPath,
    }
  } finally {
    await context.close()
    await browser.close()
  }
}

export function normalizeBrowserQaResult(args: {
  browserSessionKey: string
  urlsTested: string[]
  flowNames: string[]
  assertions: Array<{ label: string; status: 'passed' | 'failed' | 'skipped' }>
  consoleErrors: string[]
  networkFailures: string[]
  screenshotPath?: string
}) {
  const failingAssertions = args.assertions.filter((assertion) => assertion.status === 'failed')
  const primaryRoute = args.urlsTested[0]
  const defects = [
    ...failingAssertions.map((assertion) => ({
      severity: 'high' as const,
      title: 'Browser QA assertion failed',
      detail: assertion.label,
      route: primaryRoute,
    })),
    ...args.consoleErrors.map((detail) => ({
      severity: 'medium' as const,
      title: 'Browser console errors detected',
      detail,
      route: primaryRoute,
    })),
    ...args.networkFailures.map((detail) => ({
      severity: 'medium' as const,
      title: 'Browser network failures detected',
      detail,
      route: primaryRoute,
    })),
  ]
  const hasFailures = defects.length > 0
  const summary = failingAssertions.length
    ? 'Assertion failures were detected in the browser QA session.'
    : hasFailures
      ? 'QA completed with concerns because the browser session surfaced issues.'
      : 'QA passed from the persistent browser session.'

  return {
    browserSessionKey: args.browserSessionKey,
    decision: hasFailures ? ('concerns' as const) : ('pass' as const),
    summary,
    assertions: args.assertions,
    evidence: {
      screenshotPath: args.screenshotPath,
      urlsTested: args.urlsTested,
      flowNames: args.flowNames,
      consoleErrors: args.consoleErrors,
      networkFailures: args.networkFailures,
    },
    defects: defects as Array<{
      severity: 'high' | 'medium' | 'low'
      title: string
      detail: string
      route?: string
    }>,
  }
}
