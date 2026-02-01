import { test, expect, Page } from '@playwright/test'

async function createProject(page: Page, name: string, description?: string) {
  const newProjectButton = page.getByRole('button', { name: /new project/i })
  await newProjectButton.click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  const nameInput = page.getByLabel(/project name/i)
  await nameInput.fill(name)

  if (description) {
    const descriptionInput = page.getByLabel(/description/i)
    await descriptionInput.fill(description)
  }

  const createButton = page.getByRole('button', { name: /create$/i })
  await createButton.click()

  await expect(dialog).not.toBeVisible()
}

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/projects')
  })

  test('dashboard loads', async ({ page }) => {
    await expect(page).toHaveURL('/projects')

    const projectsHeading = page.getByRole('heading', { name: /your work|projects/i, level: 1 })
    await expect(projectsHeading).toBeVisible()

    const newProjectButton = page.getByRole('button', { name: /new project/i })
    await expect(newProjectButton).toBeVisible()

    const searchInput = page.getByPlaceholder(/search projects/i)
    await expect(searchInput).toBeVisible()
  })

  test('can navigate to projects', async ({ page }) => {
    await page.goto('/projects')

    const projectsHeading = page.getByRole('heading', { name: /your work|projects/i })
    await expect(projectsHeading).toBeVisible()

    const newProjectButton = page.getByRole('button', { name: /new project/i })
    await expect(newProjectButton).toBeEnabled()
  })

  test('project list displays', async ({ page }) => {
    const projectsHeading = page.getByRole('heading', { name: /your work|projects/i })
    await expect(projectsHeading).toBeVisible()

    const projectList = page
      .locator('div')
      .filter({ has: page.getByText(/just now|ago|yesterday/i) })

    const emptyState = page.getByText(/no projects yet|create your first project/i)
    const hasProjects = (await projectList.count()) > 0
    const hasEmptyState = await emptyState.isVisible().catch(() => false)

    expect(hasProjects || hasEmptyState).toBeTruthy()
  })

  test('can create a new project', async ({ page }) => {
    const projectName = `Test Project ${Date.now()}`

    await createProject(page, projectName, 'A test project created by E2E tests')

    await expect(page.getByText(projectName)).toBeVisible()
  })

  test('project creation validates required fields', async ({ page }) => {
    const newProjectButton = page.getByRole('button', { name: /new project/i })
    await newProjectButton.click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    const createButton = page.getByRole('button', { name: /create$/i })
    await expect(createButton).toBeDisabled()

    const nameInput = page.getByLabel(/project name/i)
    await nameInput.fill('Valid Project Name')

    await expect(createButton).toBeEnabled()

    await nameInput.clear()
    await expect(createButton).toBeDisabled()
  })

  test('can cancel project creation', async ({ page }) => {
    const newProjectButton = page.getByRole('button', { name: /new project/i })
    await newProjectButton.click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    const cancelButton = page.getByRole('button', { name: /cancel/i })
    await cancelButton.click()

    await expect(dialog).not.toBeVisible()
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

    const projectRow = page.locator('div').filter({ hasText: projectName }).first()
    await projectRow.click()

    await expect(page).toHaveURL(/\/projects\/.+/)

    const projectTitle = page.getByText(projectName).first()
    await expect(projectTitle).toBeVisible()
  })

  test('search filters projects', async ({ page }) => {
    const projectName = `Searchable ${Date.now()}`
    await createProject(page, projectName)

    const searchInput = page.getByPlaceholder(/search projects/i)
    await searchInput.fill('NonExistentProject12345')

    await expect(page.getByText(/no projects found/i)).toBeVisible()

    await searchInput.clear()
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
      const createButton = page.getByRole('button', { name: /new project/i })
      await expect(createButton).toBeVisible()
    }
  })
})
