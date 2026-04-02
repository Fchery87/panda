import { expect, test, type Page } from '@playwright/test'

async function ensureAdminAccess(page: Page) {
  const response = await page.request.post('/api/e2e/admin')
  expect(response.ok()).toBe(true)
}

test.describe('Admin security', () => {
  test.describe.configure({ timeout: 120_000 })

  test.beforeEach(async ({ page }) => {
    await ensureAdminAccess(page)
    await page.goto('/admin/security', { waitUntil: 'domcontentloaded', timeout: 120_000 })
    await expect(page.getByRole('heading', { name: /security/i, level: 1 })).toBeVisible({
      timeout: 120_000,
    })
  })

  test('persists filter state in the URL', async ({ page }) => {
    await page.getByRole('tab', { name: /admin actions/i }).click()
    await page.getByLabel(/actor/i).fill('e2e@example.com')
    await page.getByRole('combobox', { name: /resource filter/i }).click()
    await page.getByRole('option', { name: /user/i }).click()
    await page.getByRole('combobox', { name: /action filter/i }).click()
    await page.getByRole('option', { name: /^ban user$/i }).click()
    await page.getByLabel(/from date/i).fill('2026-03-01')
    await page.getByLabel(/to date/i).fill('2026-03-31')

    await expect(page).toHaveURL(/tab=admin/)
    await expect(page).toHaveURL(/actor=e2e%40example\.com/)
    await expect(page).toHaveURL(/resource=user/)
    await expect(page).toHaveURL(/action=BAN_USER/)
    await expect(page).toHaveURL(/from=2026-03-01/)
    await expect(page).toHaveURL(/to=2026-03-31/)

    await page.reload({ waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: /security/i, level: 1 })).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByPlaceholder(/search by user name or email/i)).toHaveValue(
      'e2e@example.com',
      { timeout: 30_000 }
    )
    await expect(page.getByLabel(/from date/i)).toHaveValue('2026-03-01', { timeout: 30_000 })
    await expect(page.getByLabel(/to date/i)).toHaveValue('2026-03-31', { timeout: 30_000 })
  })
})
