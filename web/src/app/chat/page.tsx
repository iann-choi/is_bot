export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import NewChatRedirect from './NewChatRedirect'

export default async function ChatPage() {
  const latest = await prisma.conversation.findFirst({
    orderBy: { updatedAt: 'desc' },
  })

  if (latest) {
    redirect(`/chat/${latest.id}`)
  }

  return <NewChatRedirect />
}
