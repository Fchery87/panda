import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to Panda.ai to start building with AI assistance.',
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
