export function deriveAffectedRoutes(files: string[]): string[] {
  const routes = new Set<string>()

  for (const file of files) {
    if (
      file.includes('apps/web/app/(dashboard)/projects/[projectId]/page.tsx') ||
      file.includes('apps/web/components/panels/TaskPanel.tsx') ||
      file.includes('apps/web/components/review/ReviewPanel.tsx')
    ) {
      routes.add('/projects/[projectId]')
    }
  }

  return [...routes]
}
