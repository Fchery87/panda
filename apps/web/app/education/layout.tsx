import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'How It Works',
  description: 'Learn how the Panda.ai workbench helps you build software with AI — explore the interface, workflow, and features.',
}

export default function EducationLayout({ children }: { children: React.ReactNode }) {
  return children
}
