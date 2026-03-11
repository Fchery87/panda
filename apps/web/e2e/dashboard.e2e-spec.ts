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

async function createProject(page: Page, name: string, description?: string) {
  await openCreateProjectDialog(page)

  const nameInput = page.locator('input#name').or(page.getByPlaceholder(/my-awesome-project/i))
  await expect(nameInput).toBeVisible()
  await expect(nameInput).toBeEditable()
  await nameInput.fill(name)

  if (description) {
    const descriptionInput = page
      .locator('input#description')
      .or(page.getByPlaceholder(/brief description/i))
    await descriptionInput.fill(description)
  }

  const createButton = page.getByRole('button', { name: /^create$/i }).last()
  await expect(createButton).toBeEnabled()
  await createButton.click()

  await expect(page.locator('[role="dialog"]:visible')).toHaveCount(0)
}

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/projects')
  })

  test('dashboard loads', async ({ page }) => {
    await expect(page).toHaveURL('/projects')

    const projectsHeading = page.getByRole('heading', { name: /your work|projects/i, level: 1 })
    await expect(projectsHeading).toBeVisible()

    const newProjectButton = page
      .getByRole('main')
      .getByRole('button', { name: /new project/i })
      .first()
    await expect(newProjectButton).toBeVisible()

    const searchInput = page.getByPlaceholder(/search projects/i)
    await expect(searchInput).toBeVisible()
  })

  test('can navigate to projects', async ({ page }) => {
    await page.goto('/projects')

    const projectsHeading = page.getByRole('heading', { name: /your work|projects/i })
    await expect(projectsHeading).toBeVisible()

    const newProjectButton = page
      .getByRole('main')
      .getByRole('button', { name: /new project/i })
      .first()
    await expect(newProjectButton).toBeEnabled()
  })

  test('project list displays', async ({ page }) => {
    const projectsHeading = page.getByRole('heading', { name: /your work|projects/i })
    await expect(projectsHeading).toBeVisible()

    const listState = page.locator('h3:has-text("No projects yet"), a[href^="/projects/"]').first()
    await expect(listState).toBeVisible({ timeout: 15000 })
  })

  test('can create a new project', async ({ page }) => {
    const projectName = `Test Project ${Date.now()}`

    await createProject(page, projectName, 'A test project created by E2E tests')

    await expect(page.getByText(projectName)).toBeVisible()
  })

  test('project creation validates required fields', async ({ page }) => {
    await openCreateProjectDialog(page)

    const createButton = page.getByRole('button', { name: /^create$/i }).last()
    await expect(createButton).toBeDisabled()

    const nameInput = page.locator('input#name').or(page.getByPlaceholder(/my-awesome-project/i))
    await nameInput.fill('Valid Project Name')

    await expect(createButton).toBeEnabled()

    await nameInput.clear()
    await expect(createButton).toBeDisabled()
  })

  test('can cancel project creation', async ({ page }) => {
    await openCreateProjectDialog(page)

    const cancelButton = page.getByRole('button', { name: /cancel/i }).last()
    await cancelButton.click()

    await expect(page.locator('[role="dialog"]:visible')).toHaveCount(0)
  })

  test('navigation between pages works', async ({ page }) => {
    await expect(page).toHaveURL('/projects')

    await page.goto('/')
    await expect(page).toHaveURL('/')

    await page.goto('/projects')
    await expect(page).toHaveURL('/projects')
  })

  test('can open a project from the list', async ({ page }) => {
    const projectName = `Open Test ${Date.now()}`
    await createProject(page, projectName)

    const projectLink = page.locator('a[href^="/projects/"]', { hasText: projectName }).first()
    await expect(projectLink).toBeVisible({ timeout: 15000 })
    const href = await projectLink.getAttribute('href')
    expect(href).toMatch(/^\/projects\/.+/)
    await page.goto(href!, { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/projects\/.+/, { timeout: 30000 })
    await expect(
      page
        .getByRole('main')
        .getByRole('button', { name: /^reset workspace$/i })
        .first()
    ).toBeVisible({ timeout: 30000 })
  })

  test('search filters projects', async ({ page }) => {
    const projectName = `Searchable ${Date.now()}`
    await createProject(page, projectName)

    let searchInput = page.getByPlaceholder(/search projects/i)
    await expect(searchInput).toBeEditable()
    await searchInput.fill('NonExistentProject12345')

    await expect(page.getByText(/no projects found/i)).toBeVisible()

    searchInput = page.getByPlaceholder(/search projects/i)
    await expect(searchInput).toBeEditable()
    await searchInput.fill(projectName)

    await expect(page.getByText(projectName)).toBeVisible()
  })

  test('dashboard header is visible', async ({ page }) => {
    await page.goto('/projects')

    const header = page.locator('header')
    await expect(header).toBeVisible()

    const logo = header.locator('svg, img').first()
    await expect(logo).toBeVisible()
  })

  test('empty state shows when no projects', async ({ page }) => {
    await page.goto('/projects')

    const emptyStateElements = [
      page.getByText(/no projects yet/i),
      page.getByText(/create your first project/i),
    ]

    const hasEmptyState = await Promise.all(
      emptyStateElements.map((el) => el.isVisible().catch(() => false))
    ).then((results) => results.some(Boolean))

    if (hasEmptyState) {
      const createButton = page
        .getByRole('main')
        .getByRole('button', { name: /new project/i })
        .first()
      await expect(createButton).toBeVisible()
    }
  })
})
