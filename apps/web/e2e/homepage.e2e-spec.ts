import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('page loads successfully', async ({ page }) => {
    await expect(page).toHaveURL('/')
    await expect(page).toHaveTitle(/Panda\.ai|AI Workbench/)
  })

  test('navigation links work', async ({ page }) => {
    const logoLink = page.getByRole('link', { name: /panda/i }).first()
    await expect(logoLink).toBeVisible()

    const launchAppButton = page.getByRole('link', { name: /launch app/i }).first()
    await expect(launchAppButton).toBeVisible()

    await launchAppButton.click()
    await expect(page).toHaveURL('/projects', { timeout: 15000 })
  })

  test('theme toggle works', async ({ page }) => {
    const themeToggle = page.getByRole('button', { name: /toggle theme/i })
    await expect(themeToggle).toBeVisible()

    const htmlElement = page.locator('html')
    const initialTheme = await htmlElement.getAttribute('class')

    await themeToggle.click()

    await page.waitForTimeout(300)

    const newTheme = await htmlElement.getAttribute('class')
    expect(newTheme).not.toBe(initialTheme)
  })

  test('hero section renders', async ({ page }) => {
    const heroHeading = page.getByRole('heading', { level: 1 })
    await expect(heroHeading).toBeVisible()
    await expect(heroHeading).toContainText(/Code|precision/)

    const heroDescription = page.getByText(/browser-based workspace|AI conversations/)
    await expect(heroDescription).toBeVisible()

    const startBuildingButton = page.getByRole('button', { name: /start building/i })
    await expect(startBuildingButton).toBeVisible()

    const viewSourceButton = page.getByRole('button', { name: /view source/i })
    await expect(viewSourceButton).toBeVisible()
  })

  test('features section renders', async ({ page }) => {
    const featuresHeading = page.getByRole('heading', {
      name: /features|everything you need/i,
      level: 2,
    })
    await expect(featuresHeading).toBeVisible()

    const featureCards = page
      .locator('[class*="grid"] > div')
      .filter({ hasText: /AI-Powered|Smart File|Integrated Terminal|Real-time/ })
    await expect(featureCards).toHaveCount(4)

    await expect(page.getByText(/AI-Powered Coding/i)).toBeVisible()
    await expect(page.getByText(/Smart File Management/i)).toBeVisible()
    await expect(page.getByText(/Integrated Terminal/i)).toBeVisible()
    await expect(page.getByText(/Real-time Sync/i)).toBeVisible()
  })

  test('CTA buttons work', async ({ page }) => {
    const ctaSection = page.locator('section').filter({ hasText: /ready to start/i })
    await expect(ctaSection).toBeVisible()

    const createProjectButton = ctaSection.getByRole('link', { name: /create project/i }).first()
    await expect(createProjectButton).toBeVisible()

    await createProjectButton.click()
    await expect(page).toHaveURL('/projects', { timeout: 15000 })
  })

  test('footer renders', async ({ page }) => {
    const footer = page.locator('footer')
    await expect(footer).toBeVisible()

    const footerLogo = footer.getByRole('img', { name: /panda/i }).or(footer.locator('svg'))
    await expect(footerLogo).toBeVisible()

    const builtByText = footer.getByText(/built by|Studio Eighty7/i)
    await expect(builtByText).toBeVisible()
  })

  test('terminal mockup is visible', async ({ page }) => {
    const terminalLabel = page.getByText(/panda\.ai\s+[—-]\s+terminal/i).first()
    await expect(terminalLabel).toBeVisible()

    const terminalCommands = [/npm create panda-project/i, /panda dev/i, /ready at http/i]

    for (const command of terminalCommands) {
      await expect(page.getByText(command)).toBeVisible()
    }
  })

  test('navigation to projects works from multiple entry points', async ({ page }) => {
    const startBuildingButton = page.getByRole('button', { name: /start building/i })
    await startBuildingButton.click()
    await expect(page).toHaveURL('/projects')

    await page.goto('/')

    const launchAppButton = page.getByRole('button', { name: /launch app/i })
    await launchAppButton.click()
    await expect(page).toHaveURL('/projects')
  })
})
