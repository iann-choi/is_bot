export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import ChatInterface from '@/components/chat/ChatInterface'
import type { Message } from '@/types'

interface Props {
  params: { id: string }
}

export default async function ChatConversationPage({ params }: Props) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
    },
  })

  if (!conversation) {
    notFound()
  }

  const initialMessages: Message[] = conversation.messages.map((m) => ({
    id: m.id,
    role: m.role as 'user' | 'assistant',
    content: m.content,
    sources: m.sources ? (m.sources as { title: string; url?: string }[]) : undefined,
    createdAt: m.createdAt,
  }))

  return (
    <ChatInterface
      conversationId={params.id}
      initialMessages={initialMessages}
    />
  )
}
