import { test, expect } from '@playwright/test'
import { emitPermissionRequest, openWorkbenchProjectFixture } from './helpers/workbench'

test.describe('Permission Acceptance', () => {
  test('risky command requests can be denied from the browser dialog', async ({ page }) => {
    await openWorkbenchProjectFixture(page, {
      name: `Permission Reject ${Date.now()}`,
      planDraft: 'Permission fixture',
      planStatus: 'approved',
    })

    await emitPermissionRequest(page)

    await expect(page.getByText(/command execution/i)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/chains multiple operations/i)).toBeVisible()

    const denyButton = page.getByRole('button', { name: /^deny$/i })
    await denyButton.click()
    await expect(denyButton).toBeDisabled({ timeout: 15_000 })
  })

  test('risky command requests can be allowed once from the browser dialog', async ({ page }) => {
    await openWorkbenchProjectFixture(page, {
      name: `Permission Allow ${Date.now()}`,
      planDraft: 'Permission fixture',
      planStatus: 'approved',
    })

    await emitPermissionRequest(page)

    await expect(page.getByText(/command execution/i)).toBeVisible({ timeout: 15_000 })
    const allowOnceButton = page.getByRole('button', { name: /allow once/i })
    await allowOnceButton.click()
    await expect(allowOnceButton).toBeDisabled({ timeout: 15_000 })
  })
})
