import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface Params {
  params: { id: string }
}

export async function GET(_req: NextRequest, { params }: Params) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
    },
  })

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  return NextResponse.json(conversation)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: params.id },
  })

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  await prisma.conversation.delete({ where: { id: params.id } })

  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  let body: { title?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: params.id },
  })

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  const updated = await prisma.conversation.update({
    where: { id: params.id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
    },
  })

  return NextResponse.json(updated)
}
