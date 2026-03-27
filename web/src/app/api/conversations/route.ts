import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'

export async function GET() {
  const sessionId = cookies().get('session-id')?.value ?? ''

  const conversations = await prisma.conversation.findMany({
    where: { sessionId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  })

  return NextResponse.json(conversations)
}

export async function POST(req: NextRequest) {
  const sessionId = cookies().get('session-id')?.value ?? ''

  let title = 'New Chat'
  try {
    const body = await req.json()
    if (body.title) title = body.title
  } catch {
    // use default title
  }

  const conversation = await prisma.conversation.create({
    data: { title, sessionId },
  })

  return NextResponse.json(conversation, { status: 201 })
}
