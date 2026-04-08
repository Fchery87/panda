import type { Browser, BrowserContext, Page } from '@playwright/test'
import { chromium } from '@playwright/test'
import { createBrowserSessionKey } from './browser-session'
import { createBrowserSessionSupervisor } from '@/lib/forge/browser-session-supervisor'
import { deriveForgeAffectedRoutes } from '@/lib/forge/route-impact'
import path from 'node:path'

type QaSessionRecord = {
  browser: Browser
  context: BrowserContext
  page: Page
}

const qaSessionRegistry = new Map<string, QaSessionRecord>()

export function buildBrowserQaRunInput(args: {
  projectId: string
  chatId: string
  taskId: string
  urlsTested: string[]
  filesInScope?: string[]
  flowNames: string[]
  environment?: string
  existingSession?: {
    browserSessionKey: string
    status: 'ready' | 'stale' | 'leased' | 'failed'
    leaseExpiresAt?: number
    updatedAt: number
  } | null
  now?: number
  baseUrl?: string
}): {
  browserSessionKey: string
  sessionStrategy: 'reuse' | 'fresh'
  environment: string
  urlsTested: string[]
  flowNames: string[]
  baseUrl?: string
} {
  const environment = args.environment ?? 'local'
  const supervisor = createBrowserSessionSupervisor()
  const sessionPlan = supervisor.resolveRunStrategy({
    projectId: args.projectId,
    environment,
    now: args.now ?? Date.now(),
    existingSession: args.existingSession ?? null,
  })
  const urlsTested =
    args.urlsTested.length > 0
      ? args.urlsTested
      : deriveForgeAffectedRoutes(args.filesInScope ?? [])

  return {
    browserSessionKey:
      sessionPlan.browserSessionKey ||
      createBrowserSessionKey({
        projectId: args.projectId,
        chatId: args.chatId,
        taskId: args.taskId,
      }),
    sessionStrategy: sessionPlan.strategy,
    environment,
    urlsTested,
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
  sessionStrategy: 'reuse' | 'fresh'
  environment?: string
  urlsTested: string[]
  flowNames: string[]
  baseUrl?: string
}) {
  const session = await getOrCreateQaSession({
    browserSessionKey: args.browserSessionKey,
    sessionStrategy: args.sessionStrategy,
  })
  const { page } = session
  const consoleErrors: string[] = []
  const networkFailures: string[] = []
  const baseUrl = resolveQaBaseUrl(args.baseUrl)
  const now = Date.now()

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
      sessionStrategy: args.sessionStrategy,
      sessionStatus: 'ready' as const,
      environment: args.environment ?? 'local',
      baseUrl,
      urlsTested: args.urlsTested,
      flowNames: args.flowNames,
      assertions,
      consoleErrors,
      networkFailures,
      screenshotPath,
      lastUsedAt: now,
      lastVerifiedAt: now,
      leaseOwner: undefined,
      leaseExpiresAt: undefined,
    }
  } finally {
    page.removeAllListeners('console')
    page.removeAllListeners('requestfailed')
  }
}

export function normalizeBrowserQaResult(args: {
  browserSessionKey: string
  sessionStatus?: 'ready' | 'stale' | 'leased' | 'failed'
  environment?: string
  baseUrl?: string
  urlsTested: string[]
  flowNames: string[]
  assertions: Array<{ label: string; status: 'passed' | 'failed' | 'skipped' }>
  consoleErrors: string[]
  networkFailures: string[]
  screenshotPath?: string
  lastUsedAt?: number
  lastVerifiedAt?: number
  leaseOwner?: string
  leaseExpiresAt?: number
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
    browserSession: {
      browserSessionKey: args.browserSessionKey,
      status: args.sessionStatus ?? ('ready' as const),
      environment: args.environment ?? 'local',
      baseUrl: resolveQaBaseUrl(args.baseUrl),
      lastRoutesTested: args.urlsTested,
      lastUsedAt: args.lastUsedAt ?? Date.now(),
      lastVerifiedAt: args.lastVerifiedAt,
      leaseOwner: args.leaseOwner,
      leaseExpiresAt: args.leaseExpiresAt,
    },
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

async function getOrCreateQaSession(args: {
  browserSessionKey: string
  sessionStrategy: 'reuse' | 'fresh'
}): Promise<QaSessionRecord> {
  const existingSession = qaSessionRegistry.get(args.browserSessionKey)
  if (args.sessionStrategy === 'reuse' && existingSession) {
    return existingSession
  }

  if (existingSession) {
    await existingSession.context.close().catch(() => undefined)
    await existingSession.browser.close().catch(() => undefined)
    qaSessionRegistry.delete(args.browserSessionKey)
  }

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()
  const session = { browser, context, page }
  qaSessionRegistry.set(args.browserSessionKey, session)
  return session
}
