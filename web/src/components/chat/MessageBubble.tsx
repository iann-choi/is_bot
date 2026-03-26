'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Shield, Copy, Check, ExternalLink, User } from 'lucide-react'
import type { Message } from '@/types'

interface Props {
  message: Message
  isStreaming?: boolean
}

function CodeBlock({
  inline,
  className,
  children,
  ...props
}: {
  inline?: boolean
  className?: string
  children?: React.ReactNode
}) {
  const [copied, setCopied] = useState(false)
  const match = /language-(\w+)/.exec(className || '')
  const language = match?.[1] || 'text'
  const code = String(children).replace(/\n$/, '')

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (inline) {
    return (
      <code
        className={className}
        style={{
          background: '#1e1e1e',
          color: '#e6db74',
          padding: '0.15em 0.4em',
          borderRadius: '4px',
          fontSize: '0.875em',
          fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
        }}
        {...props}
      >
        {children}
      </code>
    )
  }

  return (
    <div className="relative group/code" style={{ marginBottom: '1em' }}>
      {/* Language label + Copy button */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{
          background: '#111111',
          borderRadius: '8px 8px 0 0',
          border: '1px solid #2a2a2a',
          borderBottom: 'none',
        }}
      >
        <span className="text-xs font-mono" style={{ color: '#555555' }}>
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs transition-colors"
          style={{ color: copied ? '#10a37f' : '#555555' }}
          onMouseEnter={(e) => {
            if (!copied) e.currentTarget.style.color = '#aaaaaa'
          }}
          onMouseLeave={(e) => {
            if (!copied) e.currentTarget.style.color = '#555555'
          }}
        >
          {copied ? (
            <>
              <Check className="w-3 h-3" />
              복사됨
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              복사
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        customStyle={{
          margin: 0,
          borderRadius: '0 0 8px 8px',
          border: '1px solid #2a2a2a',
          borderTop: 'none',
          fontSize: '0.875rem',
        }}
        {...props}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )
}

export default function MessageBubble({ message, isStreaming }: Props) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className={`flex gap-4 px-4 py-5 group/message animate-fade-in ${
        isUser ? 'flex-row-reverse' : 'flex-row'
      }`}
      style={{
        background: isUser ? 'rgba(26, 26, 46, 0.4)' : 'transparent',
        borderRadius: '12px',
        marginBottom: '4px',
      }}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 mt-0.5">
        {isUser ? (
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <User className="w-3.5 h-3.5" style={{ color: '#aaaaaa' }} strokeWidth={1.5} />
          </div>
        ) : (
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #10a37f 0%, #0d8a6a 100%)',
              boxShadow: '0 2px 8px rgba(16, 163, 127, 0.3)',
            }}
          >
            <Shield className="w-3.5 h-3.5 text-white" strokeWidth={1.5} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 min-w-0 max-w-3xl ${isUser ? 'flex flex-col items-end' : ''}`}>
        {/* Role label */}
        <p className="text-xs font-medium mb-1.5" style={{ color: '#555555' }}>
          {isUser ? '나' : 'IS Bot'}
        </p>

        {/* Message content */}
        <div
          className={`relative ${isUser ? 'text-right' : ''}`}
          style={{ maxWidth: '100%' }}
        >
          {isUser ? (
            <div
              className="inline-block px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#ececec',
                lineHeight: '1.6',
                wordBreak: 'break-word',
                maxWidth: '480px',
              }}
            >
              {message.content}
            </div>
          ) : (
            <div className="prose-dark text-sm" style={{ maxWidth: '680px' }}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code: CodeBlock as any,
                  img: ({ src, alt }) => (
                    <span style={{ display: 'block', margin: '12px 0' }}>
                      <img
                        src={src}
                        alt={alt || ''}
                        style={{
                          maxWidth: '100%',
                          borderRadius: '8px',
                          border: '1px solid #2a2a2a',
                        }}
                      />
                      {alt && (
                        <span
                          style={{
                            display: 'block',
                            fontSize: '0.75rem',
                            color: '#555555',
                            marginTop: '4px',
                          }}
                        >
                          {alt}
                        </span>
                      )}
                    </span>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
              {isStreaming && <span className="streaming-cursor" />}
            </div>
          )}
        </div>

        {/* Sources */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-xs" style={{ color: '#555555', width: '100%', marginBottom: '4px' }}>
              참고 문서:
            </span>
            {message.sources.map((source, idx) => (
              <a
                key={idx}
                href={source.url || '#'}
                target={source.url ? '_blank' : undefined}
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all"
                style={{
                  background: 'rgba(16, 163, 127, 0.08)',
                  border: '1px solid rgba(16, 163, 127, 0.2)',
                  color: '#10a37f',
                  cursor: source.url ? 'pointer' : 'default',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => {
                  if (source.url) {
                    e.currentTarget.style.background = 'rgba(16, 163, 127, 0.15)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(16, 163, 127, 0.08)'
                }}
              >
                {source.title}
                {source.url && <ExternalLink className="w-2.5 h-2.5" />}
              </a>
            ))}
          </div>
        )}

        {/* Copy button (assistant only) */}
        {!isUser && !isStreaming && message.content && (
          <div className="mt-2 opacity-0 group-hover/message:opacity-100 transition-opacity">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs transition-colors px-2 py-1 rounded"
              style={{
                color: copied ? '#10a37f' : '#555555',
                background: 'transparent',
              }}
              onMouseEnter={(e) => {
                if (!copied) e.currentTarget.style.color = '#aaaaaa'
              }}
              onMouseLeave={(e) => {
                if (!copied) e.currentTarget.style.color = '#555555'
              }}
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3" />
                  복사됨
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  복사
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
