import { test, expect, type Page } from '@playwright/test'
import { openWorkbenchProjectFixture } from './helpers/workbench'

async function openWorkbenchSmokeFixture(page: Page, name: string) {
  await openWorkbenchProjectFixture(page, { name })
  return name
}

test.describe('Workbench', () => {
  test('workbench page loads', async ({ page }) => {
    const projectName = await openWorkbenchSmokeFixture(page, 'Workbench Smoke Page')

    await expect(page).toHaveURL(/\/projects\/.+/)

    const projectTitle = page.getByRole('navigation', { name: /breadcrumb/i }).getByRole('link', {
      name: projectName,
    })
    await expect(projectTitle).toBeVisible({ timeout: 15000 })
  })

  test('file tree is visible', async ({ page }) => {
    await openWorkbenchSmokeFixture(page, 'Workbench Smoke Explorer')

    const fileTreeHeader = page.getByText(/explorer/i).first()
    await expect(fileTreeHeader).toBeVisible()

    const fileTree = page
      .locator('div')
      .filter({ hasText: /no files yet|explorer/i })
      .first()
    await expect(fileTree).toBeVisible()
  })

  test('editor area is present', async ({ page }) => {
    await openWorkbenchSmokeFixture(page, 'Workbench Smoke Editor')

    const codeTab = page.getByRole('button', { name: /code/i }).first()
    await expect(codeTab).toBeVisible()

    const noFileSelectedMessage = page.getByText(/no file selected/i)
    const editorContainer = page.locator('[class*="editor"], [class*="codemirror"]').first()

    const hasNoFileMessage = await noFileSelectedMessage.isVisible().catch(() => false)
    const hasEditor = await editorContainer.isVisible().catch(() => false)

    expect(hasNoFileMessage || hasEditor).toBeTruthy()
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

    const codeTab = page.getByRole('button', { name: /code/i }).first()
    const timelineTab = page.getByRole('button', { name: /timeline/i }).first()

    await expect(codeTab).toBeVisible()
    await expect(timelineTab).toBeVisible()

    await timelineTab.click()
    await codeTab.click()
    await expect(codeTab).toBeVisible()
  })

  test('chat panel is visible', async ({ page }) => {
    await openWorkbenchSmokeFixture(page, 'Workbench Smoke Chat')

    const chatHeader = page.getByText(/chat/i).first()
    await expect(chatHeader).toBeVisible()

    const chatInput = page
      .locator('textarea, input[type="text"]')
      .filter({ hasText: /ask|message|type/i })
      .first()
      .or(page.getByPlaceholder(/ask|message|type/i))

    if (await chatInput.isVisible().catch(() => false)) {
      await expect(chatInput).toBeVisible()
    }
  })

  test('top navigation works', async ({ page }) => {
    await openWorkbenchSmokeFixture(page, 'Workbench Smoke Navigation')

    const backButton = page.locator('a[href="/projects"] button').first()
    await expect(backButton).toBeVisible({ timeout: 15000 })
    await backButton.click()
    await expect(page).toHaveURL('/projects', { timeout: 15000 })
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
    await page.goto('/projects')

    const projectLink = page.locator('a[href^="/projects/"]', { hasText: projectName }).first()
    await expect(projectLink).toBeVisible({ timeout: 15_000 })
    const href = await projectLink.getAttribute('href')
    expect(href).toMatch(/^\/projects\/.+/)
    await page.goto(href!)
    await expect(page).toHaveURL(/\/projects\/.+/, { timeout: 15_000 })

    const explorerHeader = page.getByText(/explorer/i).first()
    await expect(explorerHeader).toBeVisible()
  })

  test('automation button is visible', async ({ page }) => {
    await openWorkbenchSmokeFixture(page, 'Workbench Smoke Reset')

    await expect(page.getByRole('button', { name: /^automation$/i })).toBeVisible({
      timeout: 15_000,
    })
  })

  test('artifacts toggle is visible', async ({ page }) => {
    await openWorkbenchSmokeFixture(page, 'Workbench Smoke Artifacts')

    await expect(page.getByRole('button', { name: /toggle artifacts panel/i })).toBeVisible({
      timeout: 15_000,
    })
  })

  test('seeded file can be opened and saved from the editor', async ({ page }) => {
    test.setTimeout(90_000)
    await openWorkbenchProjectFixture(page, {
      filePath: 'e2e-fixture.ts',
      fileContent: 'export const value = 1\n',
    })

    await page.getByRole('treeitem', { name: /e2e-fixture\.ts/i }).click()
    await expect(page.getByRole('tab', { name: /e2e-fixture\.ts/i })).toBeVisible({
      timeout: 20000,
    })

    const editor = page.locator('.cm-content').first()
    await expect(editor).toBeVisible({ timeout: 20000 })
    await editor.click()
    await page.keyboard.press('Control+A')
    await page.keyboard.type('export const value = 2\n')

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

    await expect(page.getByText(/plan executing/i).first()).toBeVisible({ timeout: 20_000 })
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
})
