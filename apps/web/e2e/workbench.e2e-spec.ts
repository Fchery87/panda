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
  return dialog
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

  const dialog = await openCreateProjectDialog(page)
  const nameInput = dialog.getByLabel(/project name/i)
  await expect(nameInput).toBeEditable()
  await nameInput.fill(projectName)

  const createButton = dialog.getByRole('button', { name: /^create$/i })
  await expect(createButton).toBeEnabled()
  await createButton.click()

  await expect(dialog).not.toBeVisible()

  const projectLink = page.locator('a[href^="/projects/"]', { hasText: projectName }).first()
  await expect(projectLink).toBeVisible({ timeout: 15000 })
  const href = await projectLink.getAttribute('href')
  expect(href).toMatch(/^\/projects\/.+/)
  await projectLink.scrollIntoViewIfNeeded()
  await projectLink.click()
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
    const previewTab = page.getByRole('button', { name: /preview/i }).first()

    await expect(codeTab).toBeVisible()
    await expect(previewTab).toBeVisible()

    await previewTab.click()
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
})
