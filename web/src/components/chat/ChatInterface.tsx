'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ChatWindow from './ChatWindow'
import ChatInput from './ChatInput'
import type { Message, Source } from '@/types'

interface Props {
  conversationId: string
  initialMessages?: Message[]
}

function generateTempId() {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export default function ChatInterface({ conversationId, initialMessages = [] }: Props) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)

  // Reload messages when conversationId changes
  useEffect(() => {
    setMessages(initialMessages)
  }, [conversationId])

  const sendMessage = useCallback(async () => {
    const userContent = input.trim()
    if (!userContent || isStreaming) return

    setInput('')
    setIsStreaming(true)

    // Add user message immediately
    const userMessage: Message = {
      id: generateTempId(),
      role: 'user',
      content: userContent,
      createdAt: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])

    // Placeholder for assistant streaming message
    const assistantId = generateTempId()
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      createdAt: new Date(),
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userContent, conversationId }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(err.error || `HTTP ${res.status}`)
      }

      // Add empty assistant message to display
      setMessages((prev) => [...prev, { ...assistantMessage }])

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let accContent = ''
      let sources: Source[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()

          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)

            if (parsed.type === 'token' && parsed.content) {
              accContent += parsed.content
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: accContent } : m
                )
              )
            } else if (parsed.type === 'sources' && parsed.sources) {
              sources = parsed.sources
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, sources } : m
                )
              )
            } else if (parsed.type === 'done') {
              // Final
            }
          } catch {
            // raw text fallback
            if (data) {
              accContent += data
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: accContent } : m
                )
              )
            }
          }
        }
      }

      // Refresh the conversation title in the sidebar
      router.refresh()
    } catch (err) {
      console.error('Chat error:', err)
      const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred'

      // Remove the empty assistant message and show error
      setMessages((prev) => {
        const withoutEmpty = prev.filter((m) => m.id !== assistantId)
        return [
          ...withoutEmpty,
          {
            id: generateTempId(),
            role: 'assistant' as const,
            content: `죄송합니다. 오류가 발생했습니다: ${errorMsg}\n\nRAG API 서버 연결을 확인해주세요.`,
            createdAt: new Date(),
          },
        ]
      })
    } finally {
      setIsStreaming(false)
    }
  }, [input, isStreaming, conversationId, router])

  const handleExampleClick = (question: string) => {
    setInput(question)
  }

  return (
    <div className="flex flex-col h-full">
      <ChatWindow
        messages={messages}
        isStreaming={isStreaming}
        onExampleClick={handleExampleClick}
      />
      <div className="w-full">
        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={sendMessage}
          disabled={isStreaming}
        />
      </div>
    </div>
  )
}
