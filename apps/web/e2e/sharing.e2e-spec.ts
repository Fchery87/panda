import { test, expect } from '@playwright/test'
import { openWorkbenchProjectFixture } from './helpers/workbench'

test.describe('Sharing Acceptance', () => {
  test.setTimeout(60_000)

  test('share action opens the real share dialog for the active chat', async ({ page }) => {
    await openWorkbenchProjectFixture(page, {
      name: `Sharing Fixture ${Date.now()}`,
      structuredPlanningSession: {
        status: 'accepted',
        acceptPlan: true,
        plan: {
          markdown: 'Share fixture',
        },
      },
    })

    const openChatButton = page.getByRole('button', { name: /open chat panel/i }).first()
    if (await openChatButton.isVisible().catch(() => false)) {
      await openChatButton.click()
    }

    const moreActionsButton = page.getByRole('button', { name: /more actions/i }).first()
    await expect(moreActionsButton).toBeVisible({ timeout: 15_000 })
    await moreActionsButton.click()

    const menu = page.locator('[role="menu"]').last()
    await expect(menu).toBeVisible({ timeout: 15_000 })
    await menu.getByRole('menuitem', { name: /^share$/i }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: /share chat/i })).toBeVisible({
      timeout: 15_000,
    })
    await expect(dialog.getByText(/^current chat$/i)).toBeVisible()
    await expect(
      dialog.getByRole('button', { name: /share chat|copy shared link|copy link/i })
    ).toBeVisible()
  })
})
