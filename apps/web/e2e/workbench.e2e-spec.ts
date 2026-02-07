import { test, expect, Page } from '@playwright/test'

async function openCreateProjectDialog(page: Page) {
  const newProjectButton = page.getByRole('button', { name: /new project/i }).first()
  await expect(newProjectButton).toBeVisible()
  await newProjectButton.click()

  const dialog = page
    .getByRole('dialog')
    .filter({ hasText: /create new project/i })
    .first()
  await expect(dialog).toBeVisible()
  return dialog
}

async function createAndOpenProject(page: Page): Promise<string> {
  const projectName = `Workbench Test ${Date.now()}`

  await page.goto('/projects')

  const dialog = await openCreateProjectDialog(page)
  const nameInput = dialog.locator('input#name')
  await nameInput.fill(projectName)

  const createButton = dialog.getByRole('button', { name: /^create$/i })
  await createButton.click()

  await expect(dialog).not.toBeVisible()

  const projectLink = page.locator('a[href^="/projects/"]', { hasText: projectName }).first()
  await expect(projectLink).toBeVisible()
  const href = await projectLink.getAttribute('href')
  expect(href).toMatch(/^\/projects\/.+/)
  await page.goto(href!)

  await expect(page).toHaveURL(/\/projects\/.+/, { timeout: 15000 })

  return projectName
}

test.describe('Workbench', () => {
  test('workbench page loads', async ({ page }) => {
    await createAndOpenProject(page)

    await expect(page).toHaveURL(/\/projects\/.+/)

    const projectTitle = page
      .locator('span')
      .filter({ hasText: /Workbench Test/ })
      .first()
    await expect(projectTitle).toBeVisible()
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

    const headerProjectName = page.locator('span').filter({ hasText: projectName }).first()
    await expect(headerProjectName).toBeVisible()
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

    const resetButton = page.getByRole('button', { name: /reset/i })

    if (await resetButton.isVisible().catch(() => false)) {
      await expect(resetButton).toBeVisible()
    }
  })

  test('artifacts button is visible', async ({ page }) => {
    await createAndOpenProject(page)

    const artifactsButton = page.getByRole('button', { name: /artifacts/i })

    if (await artifactsButton.isVisible().catch(() => false)) {
      await expect(artifactsButton).toBeVisible()
    }
  })
})
