export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Project page has its own full-screen layout with header
  // Skip the dashboard container/padding to allow full viewport height
  return <>{children}</>
}
