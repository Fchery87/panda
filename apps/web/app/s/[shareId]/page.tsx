import type { Metadata } from 'next'
import { SharedChatContent } from './SharedChatContent'

interface SharedChatPageProps {
  params: Promise<{ shareId: string }>
}

export async function generateMetadata({ params }: SharedChatPageProps): Promise<Metadata> {
  const { shareId } = await params
  return {
    title: 'Shared Chat',
    description: 'View a shared AI coding conversation on Panda.ai',
    openGraph: {
      title: 'Shared Chat — Panda.ai',
      description: 'An AI-assisted coding conversation shared from Panda.ai',
      type: 'article',
    },
  }
}

export default async function SharedChatPage({ params }: SharedChatPageProps) {
  const { shareId } = await params
  return <SharedChatContent shareId={shareId} />
}
