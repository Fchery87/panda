import { test, expect } from '@playwright/test'
import { openWorkbenchProjectFixture } from './helpers/workbench'

test.describe('Agent Run Acceptance', () => {
  test('seeded plan workflow can be reviewed, approved, and built from plan', async ({ page }) => {
    test.setTimeout(180_000)
    await openWorkbenchProjectFixture(page, {
      name: `Agent Run Plan ${Date.now()}`,
      planStatus: 'awaiting_review',
      planDraft: `## Goal
Ship the seeded plan workflow

## Clarifications
- None

## Relevant Files
- apps/web/components/plan/PlanPanel.tsx
- apps/web/components/chat/ChatInput.tsx

## Implementation Plan
1. Review the seeded plan in the plan inspector.
2. Approve the plan from the review controls.
3. Start build mode from the approved plan.

## Risks
- Keep the workflow deterministic for E2E.

## Validation
- Verify the review card and plan tab update.

## Open Questions
- None`,
    })

    const planReviewCard = page.getByText(/plan awaiting review/i)
    await expect(planReviewCard).toBeVisible({ timeout: 20_000 })

    await page.getByRole('button', { name: /^review$/i }).click()
    const planInspector = page.getByRole('tabpanel', { name: /^plan$/i })
    await expect(page.getByRole('tab', { name: /^plan$/i })).toBeVisible({ timeout: 10_000 })
    await expect(planInspector.getByRole('textbox').first()).toHaveValue(
      /ship the seeded plan workflow/i,
      {
        timeout: 10_000,
      }
    )

    await planInspector.getByRole('button', { name: /approve plan/i }).click()

    const buildFromPlanButton = planInspector.getByRole('button', { name: /build from plan/i })
    await expect(buildFromPlanButton).toBeVisible({ timeout: 20_000 })
    await expect(buildFromPlanButton).toBeEnabled({ timeout: 20_000 })
    await buildFromPlanButton.click()

    await expect(page.getByText(/plan executing/i).first()).toBeVisible({
      timeout: 20_000,
    })
    await expect(page.getByRole('log', { name: /chat messages/i })).toContainText(
      'E2E agent completed approved specification.',
      {
        timeout: 20_000,
      }
    )
    await expect(planInspector.getByText(/executing/i).first()).toBeVisible({
      timeout: 20_000,
    })
  })

  test('runtime checkpoint can be resumed from run progress panel', async ({ page }) => {
    test.setTimeout(90_000)
    await openWorkbenchProjectFixture(page, {
      name: `Agent Run Resume ${Date.now()}`,
      seedRuntimeCheckpoint: true,
    })

    const resumeReadyBadge = page.getByText(/resume ready/i)
    if (!(await resumeReadyBadge.isVisible().catch(() => false))) {
      await page.getByRole('button', { name: /toggle inspector/i }).click()
    }
    await expect(resumeReadyBadge).toBeVisible({ timeout: 20_000 })
    await page.getByRole('button', { name: /resume run/i }).click()

    await expect(page.getByRole('log', { name: /chat messages/i })).toContainText(
      'Resume previous run',
      { timeout: 20_000 }
    )
    await expect(page.getByRole('log', { name: /chat messages/i })).toContainText(
      'E2E agent completed approved specification.',
      { timeout: 30_000 }
    )

    await page
      .getByRole('button', { name: /timeline/i })
      .first()
      .click()
    const timelinePanel = page.locator('div').filter({
      has: page.getByRole('heading', { name: /run timeline/i }),
    })
    await expect(timelinePanel.getByText(/resume previous run/i).first()).toBeVisible({
      timeout: 20_000,
    })
  })

  test('history action opens the inspector on the run tab', async ({ page }) => {
    await openWorkbenchProjectFixture(page, {
      name: `Agent Run History ${Date.now()}`,
      planDraft: 'History fixture',
      planStatus: 'approved',
    })

    await page.getByRole('button', { name: /chat more actions/i }).click()
    await page.getByRole('menuitem', { name: /history/i }).click()

    await expect(page.getByText(/^inspector$/i).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('tab', { name: /^run$/i, selected: true })).toBeVisible({
      timeout: 15_000,
    })
  })
})
