import { test, expect } from '@playwright/test'
import { emitPermissionRequest, openWorkbenchProjectFixture } from './helpers/workbench'

test.describe('Permission Acceptance', () => {
  test.setTimeout(60_000)

  test('risky command requests can be denied from the browser dialog', async ({ page }) => {
    await openWorkbenchProjectFixture(page, {
      name: `Permission Reject ${Date.now()}`,
      structuredPlanningSession: {
        status: 'accepted',
        acceptPlan: true,
        plan: {
          markdown: 'Permission fixture',
        },
      },
    })

    await emitPermissionRequest(page)

    await expect(page.getByText(/command execution/i)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/chains multiple operations/i)).toBeVisible()

    const denyButton = page.getByRole('button', { name: /^deny$/i })
    await expect(denyButton).toBeEnabled({ timeout: 15_000 })
  })

  test('risky command requests can be allowed once from the browser dialog', async ({ page }) => {
    await openWorkbenchProjectFixture(page, {
      name: `Permission Allow ${Date.now()}`,
      structuredPlanningSession: {
        status: 'accepted',
        acceptPlan: true,
        plan: {
          markdown: 'Permission fixture',
        },
      },
    })

    await emitPermissionRequest(page)

    await expect(page.getByText(/command execution/i)).toBeVisible({ timeout: 15_000 })
    const allowOnceButton = page.getByRole('button', { name: /allow once/i })
    await expect(allowOnceButton).toBeEnabled({ timeout: 15_000 })
  })
})
