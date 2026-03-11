import { test, expect, Page } from '@playwright/test'

async function openCreateProjectDialog(page: Page) {
  const newProjectButton = page
    .getByRole('main')
    .getByRole('button', { name: /new project/i })
    .first()
  await expect(newProjectButton).toBeVisible()
  await newProjectButton.click()

  const dialog = page
    .locator('[role="dialog"]:visible')
    .filter({ hasText: /create new project/i })
    .first()
  await expect(dialog).toBeVisible()
}

async function createAndOpenProject(page: Page): Promise<string> {
  const projectName = `Workbench Test ${Date.now()}`

  await page.goto('/projects')
  const notFoundHeading = page.getByRole('heading', { name: '404' })
  if (await notFoundHeading.isVisible().catch(() => false)) {
    await page.reload()
  }
  await expect(page.getByRole('heading', { name: /your work|projects/i, level: 1 })).toBeVisible({
    timeout: 20000,
  })

  await openCreateProjectDialog(page)
  const nameInput = page.locator('input#name').or(page.getByPlaceholder(/my-awesome-project/i))
  await expect(nameInput).toBeEditable()
  await nameInput.fill(projectName)

  const createButton = page.getByRole('button', { name: /^create$/i }).last()
  await expect(createButton).toBeEnabled()
  await createButton.click()

  await expect(page.locator('[role="dialog"]:visible')).toHaveCount(0)

  const projectLink = page.locator('a[href^="/projects/"]', { hasText: projectName }).first()
  await expect(projectLink).toBeVisible({ timeout: 15000 })
  const href = await projectLink.getAttribute('href')
  expect(href).toMatch(/^\/projects\/.+/)
  await page.goto(href!, { waitUntil: 'domcontentloaded' })
  await expect(page).toHaveURL(/\/projects\/.+/, { timeout: 30000 })
  await expect(
    page
      .getByRole('main')
      .getByRole('button', { name: /^reset$/i })
      .first()
  ).toBeVisible({
    timeout: 30000,
  })

  return projectName
}

async function openWorkbenchProject(page: Page): Promise<void> {
  await openWorkbenchProjectFixture(page)
}

async function openWorkbenchProjectFixture(
  page: Page,
  options?: {
    filePath?: string
    fileContent?: string
    seedRuntimeCheckpoint?: boolean
    planDraft?: string
    planStatus?: 'awaiting_review' | 'approved' | 'stale' | 'executing'
  }
): Promise<{ projectId: string; chatId?: string; filePath?: string; sessionID?: string }> {
  const params = new URLSearchParams({ name: 'Workbench E2E Fixture' })
  if (options?.filePath) {
    params.set('filePath', options.filePath)
  }
  if (options?.fileContent) {
    params.set('fileContent', options.fileContent)
  }
  if (options?.seedRuntimeCheckpoint) {
    params.set('seedRuntimeCheckpoint', '1')
  }
  if (options?.planDraft) {
    params.set('planDraft', options.planDraft)
  }
  if (options?.planStatus) {
    params.set('planStatus', options.planStatus)
  }

  let response = await page.request.get(`/api/e2e/project?${params.toString()}`)
  const deadline = Date.now() + 15_000

  while (!response.ok() && Date.now() < deadline) {
    await page.waitForTimeout(500)
    response = await page.request.get(`/api/e2e/project?${params.toString()}`)
  }

  expect(response.ok()).toBe(true)
  const body = (await response.json()) as {
    projectId: string
    chatId?: string
    filePath?: string
    sessionID?: string
  }
  expect(body.projectId).toBeTruthy()

  const projectUrl = `/projects/${body.projectId}`
  const navigationDeadline = Date.now() + 120_000
  let lastNavigationError: unknown = null

  while (Date.now() < navigationDeadline) {
    try {
      await page.goto(projectUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 })
      lastNavigationError = null
      break
    } catch (error) {
      lastNavigationError = error
      if (
        !(error instanceof Error) ||
        (!error.message.includes('ERR_ABORTED') && !error.message.includes('frame was detached'))
      ) {
        throw error
      }
      await page.waitForTimeout(500)
    }
  }

  if (lastNavigationError) {
    throw lastNavigationError
  }

  await expect(page.getByRole('navigation', { name: /breadcrumb/i })).toBeVisible({
    timeout: 120000,
  })
  await expect(page.getByRole('textbox').first()).toBeVisible({ timeout: 120000 })
  return body
}

async function triggerSpecReview(page: Page, prompt: string) {
  await openWorkbenchProject(page)

  const chatComposer = page
    .getByPlaceholder(/planning & architecture|describe the code to write|type your message/i)
    .or(page.getByRole('textbox').first())
    .first()
  await expect(chatComposer).toBeVisible({ timeout: 15000 })
  await chatComposer.fill(prompt)

  await page.getByRole('button', { name: /send message/i }).click()

  const specReviewCard = page.getByText(/specification ready for review/i)
  await expect(specReviewCard).toBeVisible({ timeout: 20000 })
  return specReviewCard
}

test.describe('Workbench', () => {
  test('workbench page loads', async ({ page }) => {
    const projectName = await createAndOpenProject(page)

    await expect(page).toHaveURL(/\/projects\/.+/)

    const projectTitle = page.getByRole('navigation', { name: /breadcrumb/i }).getByRole('link', {
      name: projectName,
    })
    await expect(projectTitle).toBeVisible({ timeout: 15000 })
  })

  test('file tree is visible', async ({ page }) => {
    await createAndOpenProject(page)

    const fileTreeHeader = page.getByText(/explorer/i).first()
    await expect(fileTreeHeader).toBeVisible()

    const fileTree = page
      .locator('div')
      .filter({ hasText: /no files yet|explorer/i })
      .first()
    await expect(fileTree).toBeVisible()
  })

  test('editor area is present', async ({ page }) => {
    await createAndOpenProject(page)

    const codeTab = page.getByRole('button', { name: /code/i }).first()
    await expect(codeTab).toBeVisible()

    const noFileSelectedMessage = page.getByText(/no file selected/i)
    const editorContainer = page.locator('[class*="editor"], [class*="codemirror"]').first()

    const hasNoFileMessage = await noFileSelectedMessage.isVisible().catch(() => false)
    const hasEditor = await editorContainer.isVisible().catch(() => false)

    expect(hasNoFileMessage || hasEditor).toBeTruthy()
  })

  test('terminal area is present', async ({ page }) => {
    await createAndOpenProject(page)

    const terminalHeader = page.getByText(/terminal/i).first()
    await expect(terminalHeader).toBeVisible()

    const terminalContainer = page.locator('div').filter({ has: terminalHeader }).first()
    await expect(terminalContainer).toBeVisible()
  })

  test('can navigate between tabs', async ({ page }) => {
    await createAndOpenProject(page)

    const codeTab = page.getByRole('button', { name: /code/i }).first()
    const timelineTab = page.getByRole('button', { name: /timeline/i }).first()

    await expect(codeTab).toBeVisible()
    await expect(timelineTab).toBeVisible()

    await timelineTab.click()
    await codeTab.click()
    await expect(codeTab).toBeVisible()
  })

  test('chat panel is visible', async ({ page }) => {
    await createAndOpenProject(page)

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
    await createAndOpenProject(page)

    const backButton = page.locator('a[href="/projects"] button').first()
    await expect(backButton).toBeVisible({ timeout: 15000 })
    await backButton.click()
    await expect(page).toHaveURL('/projects', { timeout: 15000 })
  })

  test('workbench layout has resizable panels', async ({ page }) => {
    await createAndOpenProject(page)

    const resizeHandle = page.locator('.w-px.bg-border').first()
    await expect(resizeHandle).toBeVisible()
  })

  test('project name is displayed in header', async ({ page }) => {
    const projectName = await createAndOpenProject(page)

    const headerProjectName = page
      .getByRole('navigation', { name: /breadcrumb/i })
      .getByRole('link', { name: projectName })
    await expect(headerProjectName).toBeVisible({ timeout: 15000 })
  })

  test('can access workbench from project list', async ({ page }) => {
    await page.goto('/projects')

    const projectLinks = page.locator('a[href^="/projects/"]').first()

    if (await projectLinks.isVisible().catch(() => false)) {
      const href = await projectLinks.getAttribute('href')
      expect(href).toMatch(/^\/projects\/.+/)
      await page.goto(href!)
      await expect(page).toHaveURL(/\/projects\/.+/, { timeout: 15000 })

      const explorerHeader = page.getByText(/explorer/i).first()
      await expect(explorerHeader).toBeVisible()
    }
  })

  test('workspace reset button is visible', async ({ page }) => {
    await createAndOpenProject(page)

    const resetButton = page
      .getByRole('main')
      .getByRole('button', { name: /^reset$/i })
      .first()
    await expect(resetButton).toBeVisible({ timeout: 15000 })
  })

  test('artifacts button is visible', async ({ page }) => {
    await createAndOpenProject(page)

    const artifactsButton = page
      .getByRole('main')
      .getByRole('button', { name: /^artifacts$/i })
      .first()
    await expect(artifactsButton).toBeVisible({ timeout: 15000 })
  })

  test('spec approval flow shows review gate and allows approval', async ({ page }) => {
    test.setTimeout(90_000)
    const specReviewCard = await triggerSpecReview(
      page,
      'Create a reusable alert banner component and wire it into the dashboard header.'
    )

    await page.getByRole('button', { name: /approve & execute/i }).click()

    await expect(specReviewCard).not.toBeVisible({ timeout: 20000 })
    await expect(page.getByRole('log', { name: /chat messages/i })).toContainText(
      'Create a reusable alert banner component and wire it into the dashboard header.',
      {
        timeout: 20000,
      }
    )
    await expect(page.getByRole('tab', { name: /^run$/i })).toBeVisible({
      timeout: 20000,
    })
  })

  test('spec review can be cancelled before execution', async ({ page }) => {
    test.setTimeout(90_000)
    const specReviewCard = await triggerSpecReview(
      page,
      'Add a compact status chip component and use it in the artifact list.'
    )

    await page.getByRole('button', { name: /^cancel$/i }).click()

    await expect(specReviewCard).not.toBeVisible({ timeout: 20000 })
    await expect(
      page
        .getByPlaceholder(/planning & architecture|describe the code to write|type your message/i)
        .or(page.getByRole('textbox').first())
        .first()
    ).toBeVisible({
      timeout: 20000,
    })
    await expect(page.getByRole('log', { name: /chat messages/i })).toContainText(
      'Add a compact status chip component and use it in the artifact list.'
    )
  })

  test('spec review supports editing before execution', async ({ page }) => {
    test.setTimeout(90_000)
    await triggerSpecReview(page, 'Create a command summary panel for the terminal drawer.')

    await page.getByRole('button', { name: /^edit$/i }).click()
    await expect(page.getByText(/review the specification before execution/i)).toBeVisible({
      timeout: 20000,
    })

    await page.getByRole('button', { name: /add requirement/i }).click()
    const triggerInput = page.getByPlaceholder(/the user submits the form/i).last()
    const behaviorInput = page.getByPlaceholder(/validate all input fields/i).last()
    await triggerInput.fill('the operator opens the terminal drawer')
    await behaviorInput.fill('render a concise command summary panel')
    await page
      .getByRole('button', { name: /^save$/i })
      .last()
      .click()
    await page.getByRole('button', { name: /save changes/i }).click()
    await expect(page.getByText(/the operator opens the terminal drawer/i)).toBeVisible({
      timeout: 20000,
    })
    await expect(page.getByText(/render a concise command summary panel/i)).toBeVisible({
      timeout: 20000,
    })
  })

  test('runtime checkpoint can be resumed from run progress panel', async ({ page }) => {
    test.setTimeout(90_000)
    await openWorkbenchProjectFixture(page, { seedRuntimeCheckpoint: true })

    const resumeReadyBadge = page.getByText(/resume ready/i)
    if (!(await resumeReadyBadge.isVisible().catch(() => false))) {
      await page.getByRole('button', { name: /toggle inspector/i }).click()
    }
    await expect(resumeReadyBadge).toBeVisible({ timeout: 20000 })
    await page.getByRole('button', { name: /resume run/i }).click()

    await expect(page.getByRole('log', { name: /chat messages/i })).toContainText(
      'Resume previous run',
      { timeout: 20000 }
    )
    await expect(page.getByRole('log', { name: /chat messages/i })).toContainText(
      'E2E agent completed approved specification.',
      { timeout: 30000 }
    )

    await page
      .getByRole('button', { name: /timeline/i })
      .first()
      .click()
    const timelinePanel = page.locator('div').filter({
      has: page.getByRole('heading', { name: /run timeline/i }),
    })
    await expect(timelinePanel.getByText(/resume previous run/i).first()).toBeVisible({
      timeout: 20000,
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

    await page.getByRole('button', { name: /review plan/i }).click()
    await expect(page.getByRole('tab', { name: /^plan$/i })).toBeVisible({ timeout: 10000 })
    await expect(page.locator('textarea').first()).toHaveValue(/ship the seeded plan workflow/i, {
      timeout: 10000,
    })

    const approvePlanButton = page.getByRole('button', { name: /approve plan/i }).first()
    await approvePlanButton.click()

    const buildFromPlanButton = page.getByRole('button', { name: /build from plan/i }).first()
    await expect(buildFromPlanButton).toBeVisible({ timeout: 20000 })
    await buildFromPlanButton.click()

    await expect(page.getByRole('button', { name: /plan executing/i }).first()).toBeVisible({
      timeout: 20000,
    })
    await expect(page.getByRole('button', { name: /run progress/i }).first()).toBeVisible({
      timeout: 10000,
    })
  })
})
