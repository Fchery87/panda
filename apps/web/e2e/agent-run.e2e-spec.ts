import { test, expect } from '@playwright/test'
import {
  clickPlanAcceptControl,
  clickPlanBuildControl,
  expectPlanTabPresent,
  openWorkbenchProjectFixture,
  seedWorkbenchExecutionUpdates,
} from './helpers/workbench'

test.describe('Agent Run Acceptance', () => {
  test('seeded plan workflow can be reviewed, approved, and built from plan', async ({ page }) => {
    test.setTimeout(420_000)
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

    await expectPlanTabPresent(page, planTitle)
    await expect(
      page.getByRole('region', { name: new RegExp(`Plan artifact ${planTitle}`, 'i') })
    ).toBeVisible({
      timeout: 15_000,
    })

    await clickPlanAcceptControl(page)
    await clickPlanBuildControl(page)

    const reviewTab = page.getByRole('button', { name: /^review$/i }).first()
    if (await reviewTab.isVisible().catch(() => false)) {
      await reviewTab.click()
    }

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

    const reviewTab = page.getByRole('button', { name: /^review$/i }).first()
    if (await reviewTab.isVisible().catch(() => false)) {
      await reviewTab.click()
    }

    const resumeReadyBadge = page.getByText(/resume available/i).first()
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
      structuredPlanningSession: {
        status: 'accepted',
        acceptPlan: true,
        plan: {
          markdown: 'History fixture',
        },
      },
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
    test.setTimeout(180_000)
    const fixtureName = `Agent Run Execution Cards ${Date.now()}`

    await openWorkbenchProjectFixture(page, {
      name: fixtureName,
    })
    await seedWorkbenchExecutionUpdates(page, fixtureName)

    const openChatButton = page.getByRole('button', { name: /open chat panel/i }).first()
    if (await openChatButton.isVisible().catch(() => false)) {
      await openChatButton.click()
    }

    const reviewTab = page.getByRole('button', { name: /^review$/i }).first()
    if (await reviewTab.isVisible().catch(() => false)) {
      await reviewTab.click()
    }

    const chatLog = page.getByRole('log', { name: /chat messages/i })
    await expect(chatLog).toContainText(/work/i, { timeout: 20_000 })
    await expect(chatLog).toContainText(/tool completed: write_files/i, { timeout: 20_000 })
    await expect(page.getByRole('button', { name: /inspect changes/i }).first()).toBeVisible({
      timeout: 20_000,
    })
    await expect(chatLog).toContainText(/validation/i, { timeout: 20_000 })
    await expect(chatLog).toContainText(/tool completed: run_command/i, { timeout: 20_000 })
    await expect(chatLog).toContainText(/receipt/i, { timeout: 20_000 })
    await expect(chatLog).toContainText(/run complete/i, { timeout: 20_000 })
    await expect(page.getByRole('button', { name: /open run proof/i }).first()).toBeVisible({
      timeout: 20_000,
    })
    await expect(chatLog).toContainText(/next action/i, { timeout: 20_000 })
    await expect(page.getByText(/^spec approved$/i)).toHaveCount(0)
  })
})
