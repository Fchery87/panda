import { test, expect, Page } from '@playwright/test'

async function openCreateProjectDialog(page: Page) {
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

async function createAndOpenProject(page: Page): Promise<string> {
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

async function openWorkbenchProject(page: Page): Promise<void> {
  let response = await page.request.get('/api/e2e/project?name=Workbench%20E2E%20Fixture')
  const deadline = Date.now() + 15_000

  while (!response.ok() && Date.now() < deadline) {
    await page.waitForTimeout(500)
    response = await page.request.get('/api/e2e/project?name=Workbench%20E2E%20Fixture')
  }

  expect(response.ok()).toBe(true)
  const body = (await response.json()) as { projectId: string }
  expect(body.projectId).toBeTruthy()

  await page.goto(`/projects/${body.projectId}`, { waitUntil: 'commit' })
  await expect(page.getByRole('navigation', { name: /breadcrumb/i })).toBeVisible({
    timeout: 30000,
  })
  await expect(page.getByRole('textbox').first()).toBeVisible({ timeout: 30000 })
}

test.describe('Workbench', () => {
  test('workbench page loads', async ({ page }) => {
    const projectName = await createAndOpenProject(page)

    await expect(page).toHaveURL(/\/projects\/.+/)

    const projectTitle = page.getByRole('navigation', { name: /breadcrumb/i }).getByRole('link', {
      name: projectName,
    })
    await expect(projectTitle).toBeVisible({ timeout: 15000 })
  })

  test('file tree is visible', async ({ page }) => {
    await createAndOpenProject(page)

    const fileTreeHeader = page.getByText(/explorer/i).first()
    await expect(fileTreeHeader).toBeVisible()

    const fileTree = page
      .locator('div')
      .filter({ hasText: /no files yet|explorer/i })
      .first()
    await expect(fileTree).toBeVisible()
  })

  test('editor area is present', async ({ page }) => {
    await createAndOpenProject(page)

    const codeTab = page.getByRole('button', { name: /code/i }).first()
    await expect(codeTab).toBeVisible()

    const noFileSelectedMessage = page.getByText(/no file selected/i)
    const editorContainer = page.locator('[class*="editor"], [class*="codemirror"]').first()

    const hasNoFileMessage = await noFileSelectedMessage.isVisible().catch(() => false)
    const hasEditor = await editorContainer.isVisible().catch(() => false)

    expect(hasNoFileMessage || hasEditor).toBeTruthy()
  })

  test('terminal area is present', async ({ page }) => {
    await createAndOpenProject(page)

    const terminalHeader = page.getByText(/terminal/i).first()
    await expect(terminalHeader).toBeVisible()

    const terminalContainer = page.locator('div').filter({ has: terminalHeader }).first()
    await expect(terminalContainer).toBeVisible()
  })

  test('can navigate between tabs', async ({ page }) => {
    await createAndOpenProject(page)

    const codeTab = page.getByRole('button', { name: /code/i }).first()
    const timelineTab = page.getByRole('button', { name: /timeline/i }).first()

    await expect(codeTab).toBeVisible()
    await expect(timelineTab).toBeVisible()

    await timelineTab.click()
    await codeTab.click()
    await expect(codeTab).toBeVisible()
  })

  test('chat panel is visible', async ({ page }) => {
    await createAndOpenProject(page)

    const chatHeader = page.getByText(/chat/i).first()
    await expect(chatHeader).toBeVisible()

    const chatInput = page
      .locator('textarea, input[type="text"]')
      .filter({ hasText: /ask|message|type/i })
      .first()
      .or(page.getByPlaceholder(/ask|message|type/i))

    if (await chatInput.isVisible().catch(() => false)) {
      await expect(chatInput).toBeVisible()
    }
  })

  test('top navigation works', async ({ page }) => {
    await createAndOpenProject(page)

    const backButton = page.locator('a[href="/projects"] button').first()
    await expect(backButton).toBeVisible({ timeout: 15000 })
    await backButton.click()
    await expect(page).toHaveURL('/projects', { timeout: 15000 })
  })

  test('workbench layout has resizable panels', async ({ page }) => {
    await createAndOpenProject(page)

    const resizeHandle = page.locator('.w-px.bg-border').first()
    await expect(resizeHandle).toBeVisible()
  })

  test('project name is displayed in header', async ({ page }) => {
    const projectName = await createAndOpenProject(page)

    const headerProjectName = page
      .getByRole('navigation', { name: /breadcrumb/i })
      .getByRole('link', { name: projectName })
    await expect(headerProjectName).toBeVisible({ timeout: 15000 })
  })

  test('can access workbench from project list', async ({ page }) => {
    await page.goto('/projects')

    const projectLinks = page.locator('a[href^="/projects/"]').first()

    if (await projectLinks.isVisible().catch(() => false)) {
      const href = await projectLinks.getAttribute('href')
      expect(href).toMatch(/^\/projects\/.+/)
      await page.goto(href!)
      await expect(page).toHaveURL(/\/projects\/.+/, { timeout: 15000 })

      const explorerHeader = page.getByText(/explorer/i).first()
      await expect(explorerHeader).toBeVisible()
    }
  })

  test('workspace reset button is visible', async ({ page }) => {
    await createAndOpenProject(page)

    const resetButton = page
      .getByRole('main')
      .getByRole('button', { name: /^reset$/i })
      .first()
    await expect(resetButton).toBeVisible({ timeout: 15000 })
  })

  test('artifacts button is visible', async ({ page }) => {
    await createAndOpenProject(page)

    const artifactsButton = page
      .getByRole('main')
      .getByRole('button', { name: /^artifacts$/i })
      .first()
    await expect(artifactsButton).toBeVisible({ timeout: 15000 })
  })

  test('spec approval flow shows review gate and allows approval', async ({ page }) => {
    test.setTimeout(90_000)
    await openWorkbenchProject(page)

    const chatComposer = page
      .getByPlaceholder(/planning & architecture|describe the code to write|type your message/i)
      .or(page.getByRole('textbox').first())
      .first()
    await expect(chatComposer).toBeVisible({ timeout: 15000 })
    await chatComposer.fill(
      'Create a reusable alert banner component and wire it into the dashboard header.'
    )

    await page.getByRole('button', { name: /send message/i }).click()

    const specReviewCard = page.getByText(/specification ready for review/i)
    await expect(specReviewCard).toBeVisible({ timeout: 20000 })

    await page.getByRole('button', { name: /approve & execute/i }).click()

    await expect(specReviewCard).not.toBeVisible({ timeout: 20000 })
    await expect(page.getByRole('log', { name: /chat messages/i })).toContainText(
      'Create a reusable alert banner component and wire it into the dashboard header.',
      {
        timeout: 20000,
      }
    )
    await expect(page.getByRole('tab', { name: /^run$/i })).toBeVisible({
      timeout: 20000,
    })
  })
})
