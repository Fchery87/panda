import { test, expect } from '@playwright/test'
import { openChatActionsMenu, openWorkbenchProjectFixture } from './helpers/workbench'

test.describe('Sharing Acceptance', () => {
  test('share action opens the real share dialog for the active chat', async ({ page }) => {
    await openWorkbenchProjectFixture(page, {
      name: `Sharing Fixture ${Date.now()}`,
      planDraft: 'Share fixture',
      planStatus: 'approved',
    })

    const openChatButton = page.getByRole('button', { name: /open chat panel/i }).first()
    if (await openChatButton.isVisible().catch(() => false)) {
      await openChatButton.click()
    }

    const menu = await openChatActionsMenu(page)
    await menu.getByRole('menuitem', { name: /^share$/i }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: /share chat/i })).toBeVisible({
      timeout: 15_000,
    })
    await expect(dialog.getByText(/^current chat$/i)).toBeVisible()
    await expect(dialog.getByRole('button', { name: /copy link|create share link|copy share url/i })).toBeVisible()
  })
})
