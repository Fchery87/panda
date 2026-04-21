import { test, expect } from '@playwright/test'
import {
  clickPlanAcceptControl,
  clickPlanBuildControl,
  expectPlanTabPresent,
  openWorkbenchProjectFixture,
} from './helpers/workbench'

test.describe('Agent Run Acceptance', () => {
  test('seeded plan workflow can be reviewed, approved, and built from plan', async ({ page }) => {
    test.setTimeout(180_000)
    const planTitle = 'Agent Run Structured Plan'
    await openWorkbenchProjectFixture(page, {
      name: `Agent Run Plan ${Date.now()}`,
      structuredPlanningSession: {
        plan: {
          title: planTitle,
          summary: 'Seeded structured plan for the agent run acceptance flow.',
          markdown: `# ${planTitle}

## Goal
Ship the seeded structured planning workflow

## Implementation Plan
1. Seed a real planning session from the fixture API.
2. Review the generated plan in the workspace.
3. Approve the plan and start build mode from the accepted artifact.

## Validation
- Verify the plan tab appears in the workspace.
- Verify approval and build controls remain available.`,
          acceptanceChecks: [
            'The generated plan opens as a workspace tab.',
            'The review panel exposes approve and build actions.',
          ],
        },
      },
    })

    const planReviewCard = page.getByText(/ready for review/i).first()
    await expect(planReviewCard).toBeVisible({ timeout: 20_000 })
    await expectPlanTabPresent(page, planTitle)
    await expect(
      page.getByRole('region', { name: new RegExp(`Plan artifact ${planTitle}`, 'i') })
    ).toBeVisible({
      timeout: 15_000,
    })

    await clickPlanAcceptControl(page)
    await clickPlanBuildControl(page)

    await expect(
      page.getByRole('textbox', { name: /message input/i }).first()
    ).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('button', { name: /^build$/i }).first()).toBeVisible({
      timeout: 20_000,
    })
  })

  test('runtime checkpoint can be resumed from run progress panel', async ({ page }) => {
    test.setTimeout(90_000)
    await openWorkbenchProjectFixture(page, {
      name: `Agent Run Resume ${Date.now()}`,
      seedRuntimeCheckpoint: true,
    })

    const openChatButton = page.getByRole('button', { name: /open chat panel/i }).first()
    if (await openChatButton.isVisible().catch(() => false)) {
      await openChatButton.click()
    }

    const resumeReadyBadge = page.getByText(/resume available/i)
    await expect(resumeReadyBadge).toBeVisible({ timeout: 20_000 })
    await page.getByRole('button', { name: /recover run|resume run/i }).click()

    await expect(page.getByText(/resume previous run/i).first()).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('button', { name: /recover run|resume run/i })).toBeVisible({
      timeout: 20_000,
    })
  })

  test('history action opens the inspector on the run tab', async ({ page }) => {
    test.setTimeout(180_000)

    await openWorkbenchProjectFixture(page, {
      name: `Agent Run History ${Date.now()}`,
      planDraft: 'History fixture',
      planStatus: 'approved',
    })

    const openChatButton = page.getByRole('button', { name: /open chat panel/i }).first()
    if (await openChatButton.isVisible().catch(() => false)) {
      await openChatButton.click()
    }

    await page.getByRole('button', { name: /chat actions/i }).click()
    await page.getByRole('menuitem', { name: /history/i }).click()

    await expect(page.getByText(/plan approved/i).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/ready for execution/i).first()).toBeVisible({
      timeout: 15_000,
    })
  })

  test('seeded execution updates render as transcript execution cards', async ({ page }) => {
    test.setTimeout(120_000)

    await openWorkbenchProjectFixture(page, {
      name: `Agent Run Execution Cards ${Date.now()}`,
      seedExecutionUpdates: true,
    })

    const openChatButton = page.getByRole('button', { name: /open chat panel/i }).first()
    if (await openChatButton.isVisible().catch(() => false)) {
      await openChatButton.click()
    }

    await expect(page.getByText(/build update/i).first()).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText(/updated files/i).first()).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText(/ran verification/i).first()).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText(/completed run/i).first()).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText(/^spec approved$/i)).toHaveCount(0)
  })
})
