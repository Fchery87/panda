import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'How It Works',
  description:
    'Learn how Panda.ai works — explore the four workbench surfaces (Explorer, Workspace, Chat, Inspector), the build workflow, plan review, and browser-native approvals.',
  openGraph: {
    title: 'How Panda Works',
    description:
      'Panda is a browser-based AI coding workbench with four surfaces: Explorer, Workspace, Chat Panel, and Inspector. Learn how they fit together.',
    type: 'website',
  },
}

export default function EducationLayout({ children }: { children: React.ReactNode }) {
  return children
}
