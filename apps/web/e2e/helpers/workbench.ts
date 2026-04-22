import { expect, type Locator, type Page } from '@playwright/test'
import type { GeneratedPlanArtifact, GeneratedPlanSection } from '@/lib/planning/types'

const E2E_BYPASS_SECRET = 'playwright-e2e-secret'

function withE2EBypassSecret(input: string): string {
  const url = new URL(input, 'http://localhost')
  url.searchParams.set('e2eBypassSecret', E2E_BYPASS_SECRET)
  return `${url.pathname}${url.search}`
}

async function ensureProjectCapacity(page: Page) {
  const response = await page.request.get(
    withE2EBypassSecret('/api/e2e/project?ensureCapacity=1'),
    {
      headers: { 'x-panda-e2e-bypass-secret': E2E_BYPASS_SECRET },
    }
  )
  expect(response.ok()).toBe(true)
}

export async function openCreateProjectDialog(page: Page) {
  const newProjectButton = page
    .getByRole('main')
    .getByRole('button', { name: /new project/i })
    .first()
  await expect(newProjectButton).toBeVisible()
  await newProjectButton.click()

  const dialog = page
    .locator('[role="dialog"]:visible')
    .filter({ hasText: /create new project/i })
    .first()
  await expect(dialog).toBeVisible()
}

export async function createAndOpenProject(page: Page): Promise<string> {
  const projectName = `Workbench Test ${Date.now()}`

  await page.goto('/projects')
  const notFoundHeading = page.getByRole('heading', { name: '404' })
  if (await notFoundHeading.isVisible().catch(() => false)) {
    await page.reload()
  }
  await expect(page.getByRole('heading', { name: /your work|projects/i, level: 1 })).toBeVisible({
    timeout: 20000,
  })

  await ensureProjectCapacity(page)
  await openCreateProjectDialog(page)
  const nameInput = page.locator('input#name').or(page.getByPlaceholder(/my-awesome-project/i))
  await expect(nameInput).toBeEditable()
  await nameInput.fill(projectName)

  const createButton = page.getByRole('button', { name: /^create$/i }).last()
  await expect(createButton).toBeEnabled()
  await createButton.click()

  await expect(page.locator('[role="dialog"]:visible')).toHaveCount(0, {
    timeout: 15_000,
  })

  const projectLink = page.locator('a[href^="/projects/"]', { hasText: projectName }).first()
  await expect(projectLink).toBeVisible({ timeout: 15000 })
  const href = await projectLink.getAttribute('href')
  expect(href).toMatch(/^\/projects\/.+/)
  const projectUrl = withE2EBypassSecret(href!)
  const navigationDeadline = Date.now() + 120_000
  let lastNavigationError: unknown = null

  while (Date.now() < navigationDeadline) {
    try {
      await page.goto(projectUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 })
      lastNavigationError = null
      break
    } catch (error) {
      lastNavigationError = error
      await page.waitForTimeout(500)
    }
  }

  if (lastNavigationError) {
    throw lastNavigationError
  }

  await expect(page).toHaveURL(/\/projects\/.+/, { timeout: 30_000 })
  await expect(page.getByText(/loading project/i)).not.toBeVisible({
    timeout: 30_000,
  })
  const reviewButton = page.getByRole('button', { name: /^review$/i }).first()
  const chatActionsButton = page.getByRole('button', { name: /chat actions/i }).first()
  const openChatPanelButton = page.getByRole('button', { name: /open chat panel/i }).first()
  const newTaskButton = page.getByRole('button', { name: /new task/i }).first()
  const chatComposer = page
    .getByPlaceholder(/planning & architecture|describe the code to write|type your message/i)
    .first()
    .or(page.getByRole('textbox').first())

  const readinessDeadline = Date.now() + 60_000
  while (Date.now() < readinessDeadline) {
    if (await reviewButton.isVisible().catch(() => false)) break
    if (await chatActionsButton.isVisible().catch(() => false)) break
    if (await openChatPanelButton.isVisible().catch(() => false)) break
    if (await newTaskButton.isVisible().catch(() => false)) break
    if (await chatComposer.isVisible().catch(() => false)) break

    const isLoading = await page
      .getByText(/loading project|loading/i)
      .first()
      .isVisible()
      .catch(() => false)
    if (isLoading) {
      await page.waitForTimeout(500)
      continue
    }

    await page.waitForTimeout(500)
  }

  expect(
    (await reviewButton.isVisible().catch(() => false)) ||
      (await chatActionsButton.isVisible().catch(() => false)) ||
      (await openChatPanelButton.isVisible().catch(() => false)) ||
      (await newTaskButton.isVisible().catch(() => false)) ||
      (await chatComposer.isVisible().catch(() => false))
  ).toBe(true)

  return projectName
}

export async function openWorkbenchProject(page: Page): Promise<void> {
  await openWorkbenchProjectFixture(page)
}

export async function openChatActionsMenu(page: Page) {
  const actionsButton = page.getByRole('button', { name: /chat actions/i })
  if (!(await actionsButton.isVisible().catch(() => false))) {
    const openChatButton = page.getByRole('button', { name: /open chat panel/i }).first()
    if (await openChatButton.isVisible().catch(() => false)) {
      await openChatButton.click()
    }
    const mobileChatTab = page.getByRole('button', { name: /^chat$/i }).first()
    if (await mobileChatTab.isVisible().catch(() => false)) {
      await mobileChatTab.click()
    }
  }

  if (await actionsButton.isVisible().catch(() => false)) {
    await actionsButton.click()
  } else {
    const moreActionsButton = page.getByRole('button', { name: /more actions/i }).first()
    await expect(moreActionsButton).toBeVisible({ timeout: 15000 })
    await moreActionsButton.click()
  }

  const menu = page.locator('[role="menu"]').last()
  await expect(menu).toBeVisible({ timeout: 15000 })
  return menu
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getPlanningPopup(page: Page | Locator) {
  return page.locator('section[aria-label="Planning intake popup"]')
}

export async function openPlanningPopup(page: Page) {
  const popup = getPlanningPopup(page)
  if (await popup.isVisible().catch(() => false)) {
    return popup
  }

  const startButton = page.getByRole('button', { name: /start intake/i })
  if (await startButton.isVisible().catch(() => false)) {
    await startButton.click()
    await expect(popup).toBeVisible({ timeout: 15_000 })
    return popup
  }

  const reviewButton = page.getByRole('button', { name: /^review$/i }).first()
  if (await reviewButton.isVisible().catch(() => false)) {
    await reviewButton.click()
    if (await startButton.isVisible().catch(() => false)) {
      await startButton.click()
      await expect(popup).toBeVisible({ timeout: 15_000 })
      return popup
    }
  }

  const menu = await openChatActionsMenu(page)
  await menu.getByRole('menuitem', { name: /^review$/i }).click()

  await expect(startButton).toBeVisible({ timeout: 15_000 })
  await startButton.click()
  await expect(popup).toBeVisible({ timeout: 15_000 })
  return popup
}

export async function selectPlanningAnswer(page: Page, choice: number | string) {
  const popup = getPlanningPopup(page)
  await expect(popup).toBeVisible({ timeout: 15_000 })

  const choiceLabel =
    typeof choice === 'number'
      ? new RegExp(`^${choice}\\.\\s`)
      : new RegExp(`^${escapeRegExp(choice)}$`)
  const button = popup.getByRole('button', { name: choiceLabel }).first()
  await expect(button).toBeVisible({ timeout: 15_000 })
  await button.click()
}

export async function typePlanningAnswer(page: Page, answer: string) {
  const popup = getPlanningPopup(page)
  await expect(popup).toBeVisible({ timeout: 15_000 })

  const input = popup.getByPlaceholder(/type your own answer/i)
  await expect(input).toBeVisible({ timeout: 15_000 })
  await input.fill(answer)

  const submitButton = popup.getByRole('button', { name: /submit answer/i })
  await expect(submitButton).toBeEnabled({ timeout: 15_000 })
  await submitButton.click()
}

export async function expectPlanTabPresent(page: Page, title?: string) {
  const planTab = title
    ? page.getByRole('tab', { name: new RegExp(`Plan tab .*${escapeRegExp(title)}`, 'i') })
    : page.getByRole('tab', { name: /^Plan tab /i }).first()

  await expect(planTab).toBeVisible({ timeout: 15_000 })
  return planTab
}

export async function clickPlanAcceptControl(page: Page | Locator) {
  const openChatButton = page.getByRole('button', { name: /open chat panel/i }).first()
  if (await openChatButton.isVisible().catch(() => false)) {
    await openChatButton.click()
  }

  const approveButton = page.getByRole('button', { name: /^approve(?: plan)?$/i }).first()
  await expect(approveButton).toBeVisible({ timeout: 15_000 })
  await approveButton.click()
}

export async function clickPlanBuildControl(page: Page | Locator) {
  const openChatButton = page.getByRole('button', { name: /open chat panel/i }).first()
  if (await openChatButton.isVisible().catch(() => false)) {
    await openChatButton.click()
  }

  const buildButton = page.getByRole('button', { name: /^(?:Build|Build from Plan)$/ }).first()
  await expect(buildButton).toBeVisible({ timeout: 15_000 })
  await expect(buildButton).toBeEnabled({ timeout: 15_000 })
  await buildButton.click()
}

export async function openWorkbenchProjectFixture(
  page: Page,
  options?: {
    name?: string
    filePath?: string
    fileContent?: string
    artifactContent?: string
    autoApplyFiles?: boolean
    autoRunCommands?: boolean
    seedRuntimeCheckpoint?: boolean
    seedExecutionUpdates?: boolean
    structuredPlanningSession?: {
      status?: 'ready_for_review' | 'accepted'
      plan?: {
        title?: string
        summary?: string
        markdown?: string
        sections?: GeneratedPlanSection[]
        acceptanceChecks?: string[]
      }
      acceptPlan?: boolean
    }
  }
): Promise<{
  projectId: string
  chatId?: string
  filePath?: string
  sessionID?: string
  planningSessionId?: string
  generatedPlanTitle?: string
  generatedPlanStatus?: GeneratedPlanArtifact['status']
  planTabPath?: string
}> {
  const params = new URLSearchParams({
    name: options?.name ?? `Workbench E2E Fixture ${Date.now()}`,
  })
  if (options?.filePath) {
    params.set('filePath', options.filePath)
  }
  if (options?.fileContent) {
    params.set('fileContent', options.fileContent)
  }
  if (options?.artifactContent) {
    params.set('artifactContent', options.artifactContent)
  }
  if (options?.autoApplyFiles !== undefined) {
    params.set('autoApplyFiles', options.autoApplyFiles ? '1' : '0')
  }
  if (options?.autoRunCommands !== undefined) {
    params.set('autoRunCommands', options.autoRunCommands ? '1' : '0')
  }
  if (options?.seedRuntimeCheckpoint) {
    params.set('seedRuntimeCheckpoint', '1')
  }
  if (options?.seedExecutionUpdates) {
    params.set('seedExecutionUpdates', '1')
  }
  if (options?.structuredPlanningSession) {
    params.set('structuredPlanningSession', '1')
    if (options.structuredPlanningSession.status) {
      params.set('structuredPlanningSessionStatus', options.structuredPlanningSession.status)
    }
    if (options.structuredPlanningSession.plan) {
      params.set(
        'structuredPlanningSessionPlan',
        JSON.stringify(options.structuredPlanningSession.plan)
      )
    }
    if (options.structuredPlanningSession.acceptPlan) {
      params.set('acceptStructuredPlan', '1')
    }
  }

  params.set('e2eBypassSecret', E2E_BYPASS_SECRET)

  let response = await page.request.get(`/api/e2e/project?${params.toString()}`, {
    headers: { 'x-panda-e2e-bypass-secret': E2E_BYPASS_SECRET },
  })
  const deadline = Date.now() + 60_000
  let lastErrorBody = ''

  while (!response.ok() && Date.now() < deadline) {
    lastErrorBody = await response.text().catch(() => '')
    await page.waitForTimeout(500)
    response = await page.request.get(`/api/e2e/project?${params.toString()}`, {
      headers: { 'x-panda-e2e-bypass-secret': E2E_BYPASS_SECRET },
    })
  }

  expect(
    response.ok(),
    `fixture bootstrap failed with ${response.status()} ${response.statusText()}${lastErrorBody ? `: ${lastErrorBody}` : ''}`
  ).toBe(true)
  const body = (await response.json()) as {
    projectId: string
    chatId?: string
    filePath?: string
    sessionID?: string
    planningSessionId?: string
    generatedPlanTitle?: string
    generatedPlanStatus?: GeneratedPlanArtifact['status']
    planTabPath?: string
  }
  expect(body.projectId).toBeTruthy()
  const projectUrl = withE2EBypassSecret(`/projects/${body.projectId}`)
  const navigationDeadline = Date.now() + 120_000
  let lastNavigationError: unknown = null

  while (Date.now() < navigationDeadline) {
    try {
      await page.goto(projectUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 })
      lastNavigationError = null
      break
    } catch (error) {
      lastNavigationError = error
      const message = error instanceof Error ? error.message : String(error)
      if (
        !message.includes('ERR_ABORTED') &&
        !message.includes('frame was detached') &&
        !message.includes('Timeout')
      ) {
        throw error
      }
      await page.waitForTimeout(500)
    }
  }

  if (lastNavigationError) {
    throw lastNavigationError
  }

  await expect(page).toHaveURL(/\/projects\/.+/, { timeout: 30_000 })

  const loadingText = page.getByText(/loading project/i).first()
  const stillLoading = await loadingText.isVisible().catch(() => false)
  if (stillLoading) {
    await page.waitForTimeout(5_000)
  }

  await expect(page).toHaveURL(/\/projects\/.+/, { timeout: 30_000 })
  await expect(page.getByText(/loading project/i).first()).not.toBeVisible({
    timeout: 30_000,
  })

  const workspaceShell = page.getByTestId('workspace-shell')
  const openChatPanelButton = page.getByRole('button', { name: /open chat panel/i }).first()
  const newTaskButton = page.getByRole('button', { name: /new task/i }).first()
  const commandPaletteButton = page.getByRole('button', { name: /open command palette/i }).first()

  await expect(
    workspaceShell.or(openChatPanelButton).or(newTaskButton).or(commandPaletteButton).first()
  ).toBeVisible({ timeout: 30_000 })

  return body
}

export async function seedWorkbenchExecutionUpdates(page: Page, name: string) {
  const params = new URLSearchParams({
    name,
    seedExecutionUpdates: '1',
    e2eBypassSecret: E2E_BYPASS_SECRET,
  })

  const response = await page.request.get(`/api/e2e/project?${params.toString()}`, {
    headers: { 'x-panda-e2e-bypass-secret': E2E_BYPASS_SECRET },
  })

  expect(response.ok()).toBe(true)
  return (await response.json()) as {
    projectId: string
    chatId?: string
  }
}

export async function triggerSpecReview(
  page: Page,
  prompt: string,
  options?: { fixtureName?: string }
) {
  await openWorkbenchProjectFixture(page, {
    name: options?.fixtureName ?? `Spec Review Fixture ${Date.now()}`,
  })

  const chatComposer = page
    .getByPlaceholder(/planning & architecture|describe the code to write|type your message/i)
    .or(page.getByRole('textbox').first())
    .first()
  await expect(chatComposer).toBeVisible({ timeout: 15000 })
  await chatComposer.fill(prompt)

  await page.getByRole('button', { name: /send message/i }).click()

  const specReviewCard = page.getByText(/specification ready for review/i)
  await expect(specReviewCard).toBeVisible({ timeout: 20000 })
  return specReviewCard
}

export async function emitPermissionRequest(page: Page) {
  await page.waitForFunction(() => {
    const hook = (
      window as Window & {
        __PANDA_E2E__?: {
          emitPermissionRequest?: () => void
        }
      }
    ).__PANDA_E2E__

    return typeof hook?.emitPermissionRequest === 'function'
  })

  await page.evaluate(() => {
    const hook = (
      window as Window & {
        __PANDA_E2E__?: {
          emitPermissionRequest?: () => void
        }
      }
    ).__PANDA_E2E__

    if (!hook?.emitPermissionRequest) {
      throw new Error('Panda E2E permission hook is not available')
    }

    hook.emitPermissionRequest()
  })
}
