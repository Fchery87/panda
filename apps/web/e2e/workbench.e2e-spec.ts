import { test, expect, type Page } from '@playwright/test'
import { openWorkbenchProjectFixture } from './helpers/workbench'

async function openWorkbenchSmokeFixture(page: Page, name: string) {
  await openWorkbenchProjectFixture(page, { name })
  return name
}

test.describe('Workbench', () => {
  test.setTimeout(90_000)

  test('workbench page loads', async ({ page }) => {
    await openWorkbenchSmokeFixture(page, 'Workbench Smoke Page')

    await expect(page).toHaveURL(/\/projects\/.+/)
    await expect(page.getByRole('navigation', { name: /breadcrumb/i })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByRole('heading', { name: /workspace|get started/i }).first()).toBeVisible({
      timeout: 15_000,
    })
  })

  test('file tree is visible', async ({ page }) => {
    await openWorkbenchSmokeFixture(page, 'Workbench Smoke Explorer')

    await expect(page.getByRole('button', { name: /^files$/i }).first()).toBeVisible()
    await expect(page.getByText(/get started/i).first()).toBeVisible()
  })

  test('editor area is present', async ({ page }) => {
    await openWorkbenchSmokeFixture(page, 'Workbench Smoke Editor')

    const getStartedMessage = page.getByText(/begin working on your project/i)
    const createFileButton = page.getByRole('button', { name: /create file/i }).first()
    const editorTab = page.getByRole('button', { name: /^editor$/i }).first()

    await Promise.any([
      getStartedMessage.waitFor({ state: 'visible', timeout: 15_000 }),
      createFileButton.waitFor({ state: 'visible', timeout: 15_000 }),
      editorTab.waitFor({ state: 'visible', timeout: 15_000 }),
    ])
  })

  test('terminal area is present', async ({ page }) => {
    await openWorkbenchSmokeFixture(page, 'Workbench Smoke Terminal')

    const terminalHeader = page.getByText(/terminal/i).first()
    await expect(terminalHeader).toBeVisible()

    const terminalContainer = page.locator('div').filter({ has: terminalHeader }).first()
    await expect(terminalContainer).toBeVisible()
  })

  test('can navigate between tabs', async ({ page }) => {
    await openWorkbenchSmokeFixture(page, 'Workbench Smoke Tabs')

    const editorButton = page.getByRole('button', { name: /^editor$/i }).first()
    const diffButton = page.getByRole('button', { name: /^diff$/i }).first()
    const previewButton = page.getByRole('button', { name: /^preview$/i }).first()

    await expect(editorButton).toBeVisible()
    await expect(diffButton).toBeVisible()
    await expect(previewButton).toBeVisible()

    await diffButton.click()
    await expect(diffButton).toBeVisible()
    await editorButton.click()
    await expect(editorButton).toBeVisible()
  })

  test('chat panel is visible', async ({ page }) => {
    await openWorkbenchSmokeFixture(page, 'Workbench Smoke Chat')

    const composer = page.getByPlaceholder(/ask anything, @ to mention, \/ for workflows/i).first()
    if (!(await composer.isVisible().catch(() => false))) {
      const chatTab = page.getByRole('button', { name: /^chat$/i }).first()
      if (await chatTab.isVisible().catch(() => false)) {
        await chatTab.click()
      } else {
        await page.getByRole('button', { name: /open chat panel/i }).first().click()
      }
    }

    await expect(page.getByRole('button', { name: /open command palette/i }).first()).toBeVisible()
    await expect(composer).toBeVisible()
  })

  test('top navigation works', async ({ page }) => {
    await openWorkbenchSmokeFixture(page, 'Workbench Smoke Navigation')

    const backButton = page.getByRole('button', { name: /back to projects/i }).first()
    await expect(backButton).toBeVisible({ timeout: 15000 })
    await page.goto('/projects?e2eBypass=1', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/projects(\?.*)?$/, { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: /your work/i, level: 1 })).toBeVisible({
      timeout: 15_000,
    })
  })

  test('workbench layout has resizable panels', async ({ page }) => {
    await openWorkbenchSmokeFixture(page, 'Workbench Smoke Layout')

    const resizeHandle = page.locator('.w-px.bg-border').first()
    await expect(resizeHandle).toBeVisible()
  })

  test('project name is displayed in header', async ({ page }) => {
    const projectName = await openWorkbenchSmokeFixture(page, 'Workbench Smoke Header')

    const headerProjectName = page
      .getByRole('navigation', { name: /breadcrumb/i })
      .getByRole('link', { name: projectName })
    await expect(headerProjectName).toBeVisible({ timeout: 15000 })
  })

  test('can access workbench from project list', async ({ page }) => {
    const projectName = 'Workbench Smoke Project List'
    await openWorkbenchProjectFixture(page, { name: projectName })
    await page.goto('/projects?e2eBypass=1', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/projects(\?.*)?$/, { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: /your work/i, level: 1 })).toBeVisible({
      timeout: 15_000,
    })

    const projectLink = page.locator('a[href^="/projects/"]', { hasText: projectName }).first()
    await expect(projectLink).toBeVisible({ timeout: 30_000 })
    const href = await projectLink.getAttribute('href')
    expect(href).toMatch(/^\/projects\/.+/)
    await page.goto(`${href!}?e2eBypass=1`, { waitUntil: 'commit' })

    await expect(page).toHaveURL(/\/projects\/.+/, { timeout: 15_000 })
    await expect(page.getByText(/get started/i).first()).toBeVisible({
      timeout: 15_000,
    })
  })

  test('automation button is visible', async ({ page }) => {
    await openWorkbenchSmokeFixture(page, 'Workbench Smoke Reset')

    await expect(page.getByRole('button', { name: /^auto$/i })).toBeVisible({
      timeout: 15_000,
    })
  })

  test('artifacts toggle is visible', async ({ page }) => {
    await openWorkbenchSmokeFixture(page, 'Workbench Smoke Artifacts')

    await expect(page.getByRole('button', { name: /chat actions/i })).toBeVisible({
      timeout: 15_000,
    })
  })

  test('seeded file can be opened and saved from the editor', async ({ page }) => {
    test.setTimeout(90_000)
    const fixture = await openWorkbenchProjectFixture(page, {
      filePath: 'e2e-fixture.ts',
      fileContent: 'export const value = 1\n',
    })

    await page.goto(`/projects/${fixture.projectId}?e2eBypass=1&filePath=e2e-fixture.ts`, {
      waitUntil: 'domcontentloaded',
    })

    const editor = page.getByRole('textbox', { name: /file editor/i })
    await expect(editor).toBeVisible({ timeout: 20000 })
    await expect(page.getByRole('tab', { name: /e2e-fixture\.ts/i })).toBeVisible({
      timeout: 20_000,
    })
    await editor.fill('export const value = 2\n')

    await expect(page.getByText(/unsaved changes/i)).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/unsaved changes/i)).not.toBeVisible({ timeout: 15000 })
  })

  test('seeded pending artifact opens a workspace preview overlay that can be applied', async ({
    page,
  }) => {
    test.setTimeout(180_000)
    await openWorkbenchProjectFixture(page, {
      filePath: 'e2e-artifact.ts',
      fileContent: 'export const value = 1\n',
      artifactContent: 'export const value = 2\n',
      autoApplyFiles: false,
    })

    const pendingArtifactOverlay = page
      .locator('div')
      .filter({ hasText: /pending artifact preview/i })
      .first()
    await expect(pendingArtifactOverlay).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText(/e2e-artifact\.ts/i).first()).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('+1')).toBeVisible({ timeout: 10_000 })

    await pendingArtifactOverlay
      .getByRole('button', { name: /^apply$/i })
      .first()
      .click()
    await expect(page.getByText(/pending artifact preview/i)).not.toBeVisible({ timeout: 20_000 })
  })

  test('seeded plan workflow can be reviewed, approved, and built from plan', async ({ page }) => {
    test.setTimeout(180_000)
    await openWorkbenchProjectFixture(page, {
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
    await expect(planReviewCard).toBeVisible({ timeout: 20000 })

    await page
      .getByRole('button', { name: /^review$/i })
      .last()
      .click()
    await page.getByRole('button', { name: /^plan$/i }).click()

    const planEditor = page
      .getByRole('tabpanel', { name: /^edit$/i })
      .getByRole('textbox')
      .first()
    await expect(planEditor).toHaveValue(/ship the seeded plan workflow/i, {
      timeout: 10_000,
    })

    await page
      .getByRole('button', { name: /approve plan/i })
      .first()
      .click()

    const buildFromPlanButton = page.getByRole('button', { name: /build from plan/i }).first()
    await expect(buildFromPlanButton).toBeVisible({ timeout: 20_000 })
    await expect(buildFromPlanButton).toBeEnabled({ timeout: 20_000 })
    await buildFromPlanButton.click()

    await expect(page.getByText(/plan executing/i).first()).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText(/build in progress/i).first()).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText(/executing/i).first()).toBeVisible({
      timeout: 20_000,
    })
  })

  test('store-backed workspace mounts and persists right panel state across reload', async ({
    page,
  }) => {
    await openWorkbenchSmokeFixture(page, 'Workbench Store State')

    await expect(page.getByTestId('workspace-shell')).toBeVisible({ timeout: 15_000 })

    // Right panel should start closed — open it
    const openChatBtn = page.getByRole('button', { name: /open chat panel/i }).first()
    await expect(openChatBtn).toBeVisible({ timeout: 10_000 })
    await openChatBtn.click()

    // Right panel should now be visible
    await expect(page.getByTestId('right-panel')).toBeVisible({ timeout: 10_000 })

    // Reload — zustand persist should restore the right-panel-open state
    await page.reload()
    await expect(page.getByTestId('workspace-shell')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('right-panel')).toBeVisible({ timeout: 10_000 })
  })
})
