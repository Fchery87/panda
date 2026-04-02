import { expect, test, type Page } from '@playwright/test'

async function ensureAdminAccess(page: Page) {
  const response = await page.request.post('/api/e2e/admin')
  expect(response.ok()).toBe(true)
}

test.describe('Admin analytics', () => {
  test.describe.configure({ timeout: 120_000 })

  test.beforeEach(async ({ page }) => {
    await ensureAdminAccess(page)
    await page.goto('/admin/analytics', { waitUntil: 'domcontentloaded', timeout: 120_000 })
    await expect(page.getByRole('heading', { name: /analytics/i, level: 1 })).toBeVisible({
      timeout: 120_000,
    })
  })

  test('persists tab and date range state in the URL', async ({ page }) => {
    await page.getByRole('tab', { name: /providers/i }).click()
    await page.getByLabel(/from date/i).fill('2026-03-01')
    await page.getByLabel(/to date/i).fill('2026-03-31')

    await expect(page).toHaveURL(/tab=providers/)
    await expect(page).toHaveURL(/from=2026-03-01/)
    await expect(page).toHaveURL(/to=2026-03-31/)

    await page.reload({ waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: /analytics/i, level: 1 })).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByRole('tablist')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole('tab', { name: /providers/i })).toHaveAttribute(
      'data-state',
      'active',
      {
        timeout: 30_000,
      }
    )
    await expect(page.getByLabel(/from date/i)).toHaveValue('2026-03-01')
    await expect(page.getByLabel(/to date/i)).toHaveValue('2026-03-31')
  })
})
