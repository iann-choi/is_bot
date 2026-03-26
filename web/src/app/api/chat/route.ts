import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const RAG_API_URL = process.env.RAG_API_URL || 'http://localhost:8080'

export async function POST(req: NextRequest) {
  let body: { message: string; conversationId: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { message, conversationId } = body

  if (!message?.trim() || !conversationId) {
    return NextResponse.json({ error: 'message and conversationId are required' }, { status: 400 })
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { messages: { orderBy: { createdAt: 'asc' }, take: 20 } },
  })

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  // Save user message
  await prisma.message.create({
    data: { role: 'user', content: message, conversationId },
  })

  // Build OpenAI-compatible messages array
  const messages = [
    ...conversation.messages.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ]

  // Call RAG API
  let ragResponse: Response
  try {
    ragResponse = await fetch(`${RAG_API_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, stream: true, model: 'gemma3:4b' }),
    })
  } catch (err) {
    console.error('RAG API connection error:', err)
    return NextResponse.json({ error: 'Failed to connect to RAG API' }, { status: 502 })
  }

  if (!ragResponse.ok) {
    const errorText = await ragResponse.text()
    console.error('RAG API error:', ragResponse.status, errorText)
    return NextResponse.json({ error: 'RAG API error' }, { status: 502 })
  }

  const encoder = new TextEncoder()
  let fullContent = ''

  const stream = new ReadableStream({
    async start(controller) {
      const reader = ragResponse.body?.getReader()
      if (!reader) {
        controller.close()
        return
      }

      const decoder = new TextDecoder()

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue

            const data = line.slice(6).trim()

            if (data === '[DONE]') {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'))
              continue
            }

            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices?.[0]?.delta?.content
              if (content) {
                fullContent += content
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ type: 'token', content })}\n\n`
                  )
                )
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      } catch (err) {
        console.error('Stream read error:', err)
      } finally {
        reader.releaseLock()

        // Save assistant message
        if (fullContent) {
          try {
            await prisma.message.create({
              data: { role: 'assistant', content: fullContent, conversationId },
            })

            if (conversation.title === 'New Chat' && message) {
              await prisma.conversation.update({
                where: { id: conversationId },
                data: { title: message.slice(0, 40).trim() },
              })
            }
          } catch (dbErr) {
            console.error('Failed to save assistant message:', dbErr)
          }
        }

        controller.close()
      }
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
