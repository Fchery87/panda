import { test, expect } from '@playwright/test'
import { openWorkbenchProjectFixture } from './helpers/workbench'

test.describe('File tree and advisor proof chain', () => {
  test.setTimeout(300_000)

  test('applied file artifact is visible in the file tree and editor', async ({ page }) => {
    const fixture = await openWorkbenchProjectFixture(page, {
      name: `File Tree Proof ${Date.now()}`,
      filePath: 'proof/file-tree-proof.ts',
      fileContent: 'export const value = 1\n',
      artifactContent: 'export const value = 2\n',
      autoApplyFiles: false,
    })

    await page.goto(
      `/projects/${fixture.projectId}?e2eBypass=1&filePath=proof/file-tree-proof.ts`,
      {
        waitUntil: 'domcontentloaded',
      }
    )

    const pendingArtifactOverlay = page
      .getByRole('region', { name: /pending artifact preview/i })
      .first()
    await expect(pendingArtifactOverlay).toBeVisible({ timeout: 60_000 })
    await expect(page.getByText(/proof\/file-tree-proof\.ts/i).first()).toBeVisible({
      timeout: 20_000,
    })

    const applyButton = page.getByRole('button', { name: /^apply$/i }).first()
    await expect(applyButton).toBeVisible({ timeout: 20_000 })
    await applyButton.click()
    await expect(pendingArtifactOverlay).not.toBeVisible({ timeout: 20_000 })

    await page.goto(
      `/projects/${fixture.projectId}?e2eBypass=1&filePath=proof/file-tree-proof.ts`,
      {
        waitUntil: 'domcontentloaded',
      }
    )
    await expect(page.getByText(/proof\/file-tree-proof\.ts/i).first()).toBeVisible({
      timeout: 20_000,
    })
    const editor = page.getByRole('textbox', { name: /file editor/i })
    await expect(editor).toBeVisible({ timeout: 20_000 })
    await expect(editor).toHaveValue(/export const value = 2/)
  })

  test('advisor-gated artifact apply surfaces advisor requirement instead of completing', async ({
    page,
  }) => {
    const fixture = await openWorkbenchProjectFixture(page, {
      name: `Advisor Proof ${Date.now()}`,
      filePath: 'package.json',
      fileContent: '{"scripts":{}}\n',
      artifactContent: '{"scripts":{"test":"bun test"}}\n',
      autoApplyFiles: false,
    })
    await page.goto(`/projects/${fixture.projectId}?e2eBypass=1&filePath=package.json`, {
      waitUntil: 'domcontentloaded',
    })

    const pendingArtifactOverlay = page
      .getByRole('region', { name: /pending artifact preview/i })
      .first()
    await expect(pendingArtifactOverlay).toBeVisible({ timeout: 60_000 })
    await expect(page.getByText(/package\.json/i).first()).toBeVisible({ timeout: 20_000 })

    const applyButton = page.getByRole('button', { name: /^apply$/i }).first()
    await expect(applyButton).toBeVisible({ timeout: 20_000 })
    const advisorRequirement = page
      .getByText(/advisor review is required|advisor review required|dependency_change/i)
      .first()
    await applyButton.click({ timeout: 10_000 }).catch(async (error) => {
      if (!(await advisorRequirement.isVisible().catch(() => false))) {
        throw error
      }
    })

    await expect(advisorRequirement).toBeVisible({ timeout: 20_000 })
  })
})
