'use client'

import { useEffect, useRef } from 'react'
import { Shield, Lock, FileText, ShieldAlert } from 'lucide-react'
import MessageBubble from './MessageBubble'
import type { Message } from '@/types'

interface Props {
  messages: Message[]
  isStreaming: boolean
  onExampleClick?: (question: string) => void
}

const EXAMPLE_QUESTIONS = [
  {
    icon: Lock,
    title: '비밀번호 정책',
    text: '비밀번호 복잡도 요구사항이 어떻게 되나요?',
  },
  {
    icon: FileText,
    title: '정보 분류 기준',
    text: '사내 문서의 보안 등급 분류 기준을 알려주세요.',
  },
  {
    icon: ShieldAlert,
    title: '보안 사고 대응',
    text: '보안 사고 발생 시 보고 절차는 어떻게 되나요?',
  },
  {
    icon: Shield,
    title: '개인정보 처리',
    text: '고객 개인정보 처리 시 주의사항은 무엇인가요?',
  },
]

export default function ChatWindow({ messages, isStreaming, onExampleClick }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change or streaming
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

  const isEmpty = messages.length === 0

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto"
      style={{ scrollbarGutter: 'stable' }}
    >
      {isEmpty ? (
        // Empty state
        <div className="flex flex-col items-center justify-center min-h-full px-4 py-12">
          {/* Logo */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
            style={{
              background: 'linear-gradient(135deg, #10a37f 0%, #0d8a6a 100%)',
              boxShadow: '0 8px 32px rgba(16, 163, 127, 0.2)',
            }}
          >
            <Shield className="w-8 h-8 text-white" strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2">안녕하세요!</h2>
          <p className="text-sm mb-10 text-center max-w-sm" style={{ color: '#777777' }}>
            정보보호 정책에 관해 궁금한 것을 물어보세요.
            <br />
            사내 보안 가이드라인과 정책을 안내해드립니다.
          </p>

          {/* Example questions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
            {EXAMPLE_QUESTIONS.map(({ icon: Icon, title, text }) => (
              <button
                key={text}
                onClick={() => onExampleClick?.(text)}
                className="flex items-start gap-3 p-4 rounded-xl text-left transition-all duration-150 active:scale-98"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: 'rgba(16, 163, 127, 0.1)' }}
                >
                  <Icon className="w-4 h-4" style={{ color: '#10a37f' }} strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: '#888888' }}>
                    {title}
                  </p>
                  <p className="text-sm leading-snug" style={{ color: '#cccccc' }}>
                    {text}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        // Messages
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-1">
          {messages.map((message, idx) => {
            const isLastAssistant =
              message.role === 'assistant' && idx === messages.length - 1
            return (
              <MessageBubble
                key={message.id}
                message={message}
                isStreaming={isStreaming && isLastAssistant}
              />
            )
          })}

          {/* Streaming loading indicator (before first token) */}
          {isStreaming && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex gap-4 px-4 py-5 animate-fade-in">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{
                  background: 'linear-gradient(135deg, #10a37f 0%, #0d8a6a 100%)',
                  boxShadow: '0 2px 8px rgba(16, 163, 127, 0.3)',
                }}
              >
                <Shield className="w-3.5 h-3.5 text-white" strokeWidth={1.5} />
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <div
                  className="w-2 h-2 rounded-full loading-dot"
                  style={{ background: '#10a37f' }}
                />
                <div
                  className="w-2 h-2 rounded-full loading-dot"
                  style={{ background: '#10a37f' }}
                />
                <div
                  className="w-2 h-2 rounded-full loading-dot"
                  style={{ background: '#10a37f' }}
                />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      )}
    </div>
  )
}
