import { expect, test } from '@playwright/test'

import { openWorkbenchProjectFixture } from './helpers/workbench'

test.describe('Chat workbench context bridge', () => {
  test('chat composer reflects the opened workbench file without @-mention', async ({ page }) => {
    test.setTimeout(180_000)

    const fixture = await openWorkbenchProjectFixture(page, {
      name: `Chat Context Bridge ${Date.now()}`,
      filePath: 'a.ts',
      fileContent: 'const alpha = 1\nconst beta = 2\nexport const total = alpha + beta\n',
    })

    await page.goto(
      `/projects/${fixture.projectId}?e2eBypass=1&e2eBypassSecret=playwright-e2e-secret`,
      {
        waitUntil: 'domcontentloaded',
      }
    )

    await page.getByRole('button', { name: /open command palette/i }).click()
    const paletteInput = page
      .locator('input[placeholder="Search files, commands, or settings..."]')
      .last()
    await expect(paletteInput).toBeVisible({ timeout: 10_000 })
    await paletteInput.fill('a.ts')
    await page
      .getByRole('button', { name: /^a\.ts/i })
      .first()
      .click()

    const editor = page.getByRole('textbox', { name: /file editor/i })
    await expect(editor).toBeVisible({ timeout: 20_000 })

    let chatInput = page.getByPlaceholder(/ask anything, @ to mention, \/ for workflows/i).first()
    if (!(await chatInput.isVisible().catch(() => false))) {
      const chatTab = page.getByRole('button', { name: /^chat$/i }).first()
      if (await chatTab.isVisible().catch(() => false)) {
        await chatTab.click()
      } else {
        await page
          .getByRole('button', { name: /open chat panel/i })
          .first()
          .click()
      }
      chatInput = page.getByPlaceholder(/ask anything, @ to mention, \/ for workflows/i).first()
    }
    await expect(chatInput).toBeVisible({ timeout: 10_000 })

    await expect(page.getByRole('button', { name: /^a\.ts$/i }).first()).toBeVisible({
      timeout: 10_000,
    })
  })
})
