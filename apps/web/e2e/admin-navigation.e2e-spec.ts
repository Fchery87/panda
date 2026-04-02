import { test, expect, type Page } from '@playwright/test'

async function ensureAdminAccess(page: Page) {
  const response = await page.request.post('/api/e2e/admin')
  expect(response.ok()).toBe(true)
}

test.describe('Admin navigation', () => {
  test.beforeEach(async ({ page }) => {
    await ensureAdminAccess(page)
    await page.goto('/admin', { waitUntil: 'domcontentloaded' })
  })

  test('admin dashboard is a hub with links to dedicated admin pages', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /admin dashboard/i, level: 1 })).toBeVisible({
      timeout: 30_000,
    })

    await expect(page.getByRole('link', { name: /user management/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /analytics/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /system controls/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /security/i })).toBeVisible()

    await expect(page.getByRole('tab', { name: /users/i })).toHaveCount(0)
    await expect(page.getByRole('tab', { name: /analytics/i })).toHaveCount(0)
    await expect(page.getByRole('tab', { name: /system/i })).toHaveCount(0)
  })

  test('admin sidebar reflects the active route', async ({ page }) => {
    await page.goto('/admin/users', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('link', { name: /user management/i })).toHaveAttribute(
      'aria-current',
      'page'
    )
    await expect(page.getByRole('link', { name: /analytics/i })).not.toHaveAttribute(
      'aria-current',
      'page'
    )
  })
})
