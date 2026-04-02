import { expect, test, type Page } from '@playwright/test'

async function ensureAdminAccess(page: Page) {
  const response = await page.request.post('/api/e2e/admin')
  expect(response.ok()).toBe(true)
}

test.describe('Admin users', () => {
  test.describe.configure({ timeout: 120_000 })

  test.beforeEach(async ({ page }) => {
    await ensureAdminAccess(page)
    await page.goto('/admin/users', { waitUntil: 'domcontentloaded', timeout: 120_000 })
    await expect(page.getByRole('heading', { name: /user management/i, level: 1 })).toBeVisible({
      timeout: 120_000,
    })
  })

  test('persists search, filter, and selection in the URL', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search by name or email/i)
    await expect(searchInput).toBeVisible({ timeout: 120_000 })
    await searchInput.fill('e2e@example.com')

    const filterTrigger = page.getByRole('combobox', { name: /user filter/i })
    await filterTrigger.click()
    await page.getByRole('option', { name: /admins/i }).click()

    const userButton = page.getByRole('button', { name: /e2e user/i }).first()
    await expect(userButton).toBeVisible({ timeout: 30_000 })
    await userButton.focus()
    await page.keyboard.press('Space')

    await expect(page).toHaveURL(/search=e2e%40example\.com/, { timeout: 30_000 })
    await expect(page).toHaveURL(/filter=admins/, { timeout: 30_000 })
    await expect(page).toHaveURL(/selectedUserId=/, { timeout: 30_000 })

    await page.reload({ waitUntil: 'domcontentloaded' })

    await expect(searchInput).toHaveValue('e2e@example.com', { timeout: 30_000 })
    await expect(page.getByRole('combobox', { name: /user filter/i })).toHaveText(/admins/i)
    await expect(page.getByRole('button', { name: /^delete user$/i })).toBeVisible({
      timeout: 30_000,
    })
  })

  test('opens a custom delete dialog instead of a native confirm dialog', async ({ page }) => {
    let nativeDialogCount = 0
    page.on('dialog', async (dialog) => {
      nativeDialogCount += 1
      await dialog.dismiss()
    })

    const userButton = page.getByRole('button', { name: /e2e user/i }).first()
    await expect(userButton).toBeVisible({ timeout: 120_000 })
    await userButton.click()

    await expect(page).toHaveURL(/selectedUserId=/, { timeout: 30_000 })
    const deleteButton = page.getByRole('button', { name: /^delete user$/i })
    await expect(deleteButton).toBeVisible({ timeout: 30_000 })
    await deleteButton.click()

    await expect(page.getByRole('dialog', { name: /delete user/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible()
    expect(nativeDialogCount).toBe(0)
  })
})
