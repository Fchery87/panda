import { expect, type Page } from '@playwright/test'

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

  await openCreateProjectDialog(page)
  const nameInput = page.locator('input#name').or(page.getByPlaceholder(/my-awesome-project/i))
  await expect(nameInput).toBeEditable()
  await nameInput.fill(projectName)

  const createButton = page.getByRole('button', { name: /^create$/i }).last()
  await expect(createButton).toBeEnabled()
  await createButton.click()

  await expect(page.locator('[role="dialog"]:visible')).toHaveCount(0)

  const projectLink = page.locator('a[href^="/projects/"]', { hasText: projectName }).first()
  await expect(projectLink).toBeVisible({ timeout: 15000 })
  const href = await projectLink.getAttribute('href')
  expect(href).toMatch(/^\/projects\/.+/)
  await page.goto(href!, { waitUntil: 'domcontentloaded' })
  await expect(page).toHaveURL(/\/projects\/.+/, { timeout: 30000 })
  await expect(
    page
      .getByRole('main')
      .getByRole('button', { name: /^reset$/i })
      .first()
  ).toBeVisible({
    timeout: 30000,
  })

  return projectName
}

export async function openWorkbenchProject(page: Page): Promise<void> {
  await openWorkbenchProjectFixture(page)
}

export async function openChatActionsMenu(page: Page) {
  const actionsButton = page.getByRole('button', { name: /chat more actions/i })
  await expect(actionsButton).toBeVisible({ timeout: 15000 })
  await actionsButton.click()

  const menu = page.locator('[role="menu"]').last()
  await expect(menu).toBeVisible({ timeout: 15000 })
  return menu
}

export async function openWorkbenchProjectFixture(
  page: Page,
  options?: {
    name?: string
    filePath?: string
    fileContent?: string
    seedRuntimeCheckpoint?: boolean
    planDraft?: string
    planStatus?: 'awaiting_review' | 'approved' | 'stale' | 'executing'
  }
): Promise<{ projectId: string; chatId?: string; filePath?: string; sessionID?: string }> {
  const params = new URLSearchParams({
    name: options?.name ?? `Workbench E2E Fixture ${Date.now()}`,
  })
  if (options?.filePath) {
    params.set('filePath', options.filePath)
  }
  if (options?.fileContent) {
    params.set('fileContent', options.fileContent)
  }
  if (options?.seedRuntimeCheckpoint) {
    params.set('seedRuntimeCheckpoint', '1')
  }
  if (options?.planDraft) {
    params.set('planDraft', options.planDraft)
  }
  if (options?.planStatus) {
    params.set('planStatus', options.planStatus)
  }

  let response = await page.request.get(`/api/e2e/project?${params.toString()}`)
  const deadline = Date.now() + 60_000
  let lastErrorBody = ''

  while (!response.ok() && Date.now() < deadline) {
    lastErrorBody = await response.text().catch(() => '')
    await page.waitForTimeout(500)
    response = await page.request.get(`/api/e2e/project?${params.toString()}`)
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
  }
  expect(body.projectId).toBeTruthy()

  const projectUrl = `/projects/${body.projectId}`
  const navigationDeadline = Date.now() + 120_000
  let lastNavigationError: unknown = null

  while (Date.now() < navigationDeadline) {
    try {
      await page.goto(projectUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 })
      lastNavigationError = null
      break
    } catch (error) {
      lastNavigationError = error
      if (
        !(error instanceof Error) ||
        (!error.message.includes('ERR_ABORTED') && !error.message.includes('frame was detached'))
      ) {
        throw error
      }
      await page.waitForTimeout(500)
    }
  }

  if (lastNavigationError) {
    throw lastNavigationError
  }

  await expect(page.getByRole('navigation', { name: /breadcrumb/i })).toBeVisible({
    timeout: 120000,
  })
  await expect(page.getByRole('textbox').first()).toBeVisible({ timeout: 120000 })
  return body
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
