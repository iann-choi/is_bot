export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import NewChatRedirect from './NewChatRedirect'

export default async function ChatPage() {
  const sessionId = cookies().get('session-id')?.value ?? ''

  const latest = await prisma.conversation.findFirst({
    where: { sessionId },
    orderBy: { updatedAt: 'desc' },
  })

  if (latest) {
    redirect(`/chat/${latest.id}`)
  }

  return <NewChatRedirect />
}
