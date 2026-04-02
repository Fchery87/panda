import { test, expect } from '@playwright/test'

test.describe('Settings', () => {
  test.setTimeout(120_000)

  test.beforeEach(async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('button', { name: /back to projects/i })).toBeVisible({
      timeout: 30_000,
    })
  })

  test('back button returns to projects', async ({ page }) => {
    await page.getByRole('button', { name: /back to projects/i }).click()

    await expect(page).toHaveURL('/projects', { timeout: 30_000 })
  })

  test('tab selection is reflected in the url and restored on reload', async ({ page }) => {
    await page.goto('/settings?tab=appearance', { waitUntil: 'domcontentloaded' })
    const appearanceTab = page.getByRole('tab', { name: /appearance/i })
    await expect(appearanceTab).toHaveAttribute('aria-selected', 'true', { timeout: 30_000 })

    const providersTab = page.getByRole('tab', { name: /llm providers/i })
    await providersTab.click()
    await expect(page).toHaveURL(/\/settings\?tab=providers$/, { timeout: 30_000 })
    await expect(providersTab).toHaveAttribute('aria-selected', 'true', { timeout: 30_000 })

    await page.reload()
    await expect(page).toHaveURL(/\/settings\?tab=providers$/, { timeout: 30_000 })
    await expect(page.getByRole('tab', { name: /llm providers/i })).toHaveAttribute(
      'aria-selected',
      'true',
      { timeout: 30_000 }
    )
  })

  test('dirty edits warn before leaving the page', async ({ page }) => {
    const languageSelect = page.getByLabel(/language/i)
    await expect(languageSelect).toBeVisible({ timeout: 30_000 })
    await languageSelect.click()

    await page.getByRole('option', { name: /french/i }).click()
    await expect(page.getByText(/unsaved changes/i)).toBeVisible()

    let dismissedDialog = false
    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toContain('unsaved changes')
      dismissedDialog = true
      await dialog.dismiss()
    })

    await page.getByRole('button', { name: /back to projects/i }).click()
    await expect(page).toHaveURL('/settings', { timeout: 30_000 })
    expect(dismissedDialog).toBe(true)

    let acceptedDialog = false
    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toContain('unsaved changes')
      acceptedDialog = true
      await dialog.accept()
    })

    await page.getByRole('button', { name: /back to projects/i }).click()
    await expect(page).toHaveURL('/projects', { timeout: 30_000 })
    expect(acceptedDialog).toBe(true)
  })
})
