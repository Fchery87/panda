import { expect, test } from '@playwright/test'
import {
  clickPlanAcceptControl,
  clickPlanBuildControl,
  expectPlanTabPresent,
  openPlanningPopup,
  openWorkbenchProjectFixture,
  selectPlanningAnswer,
  typePlanningAnswer,
} from './helpers/workbench'

test.describe('Structured planning workflow', () => {
  test('popup advances one question at a time with numbered suggestions and freeform answers', async ({
    page,
  }) => {
    test.setTimeout(120_000)

    await openWorkbenchProjectFixture(page, {
      name: `Planning Workflow Popup ${Date.now()}`,
    })

    const popup = await openPlanningPopup(page)
    await expect(popup).toContainText('Question 1 of 4', { timeout: 15_000 })
    await expect(popup).toContainText('Outcome')
    await expect(popup).toContainText('1. Ship the smallest viable change')
    await expect(popup).toContainText('2. Deliver the full workflow end to end')

    await selectPlanningAnswer(page, 1)
    await expect(popup).toContainText('Question 2 of 4', { timeout: 15_000 })

    await typePlanningAnswer(page, 'Keep the current workflow and add the planning sidecar.')
    await expect(popup).toContainText('Question 3 of 4', { timeout: 15_000 })

    await selectPlanningAnswer(page, 1)
    await expect(popup).toContainText('Question 4 of 4', { timeout: 15_000 })

    await selectPlanningAnswer(page, 2)
    await expect(popup).toContainText('Generating plan', { timeout: 15_000 })
  })

  test('structured planning-session fixture opens a generated plan tab in the workspace', async ({
    page,
  }) => {
    test.setTimeout(180_000)

    const planTitle = 'Structured Planning Fixture'
    await openWorkbenchProjectFixture(page, {
      name: `Planning Workflow Structured ${Date.now()}`,
      structuredPlanningSession: {
        plan: {
          title: planTitle,
          summary: 'Seeded structured plan for workspace coverage.',
          markdown: `# ${planTitle}

## Goal
Seed a real structured planning session and surface the generated plan as a workspace tab.

## Implementation Plan
1. Create the planning session through the E2E fixture API.
2. Open the generated plan in the workspace.
3. Approve the plan and start build mode from the accepted artifact.

## Validation
- Confirm the workspace plan tab is present.
- Confirm approval and build controls remain available.`,
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
    await expect(page.getByText(/plan awaiting review/i).first()).toBeVisible({
      timeout: 15_000,
    })

    await clickPlanAcceptControl(page)
    await expect(page.getByRole('button', { name: /^build$/i }).first()).toBeVisible({
      timeout: 15_000,
    })

    await clickPlanBuildControl(page)
    await expect(page.getByText(/plan executing/i).first()).toBeVisible({
      timeout: 20_000,
    })
  })
})
