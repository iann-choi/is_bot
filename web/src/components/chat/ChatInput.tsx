'use client'

import { useRef, useEffect, KeyboardEvent } from 'react'
import { Send, Loader2 } from 'lucide-react'

interface Props {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  disabled?: boolean
  placeholder?: string
}

export default function ChatInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = 'IS Bot에게 정보보호에 관해 물어보세요...',
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const newHeight = Math.min(el.scrollHeight, 200)
    el.style.height = `${newHeight}px`
  }, [value])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!disabled && value.trim()) {
        onSubmit()
      }
    }
  }

  const handleSubmit = () => {
    if (!disabled && value.trim()) {
      onSubmit()
    }
  }

  return (
    <div className="px-4 pb-4 pt-2">
      <div
        className="relative flex items-end gap-2 rounded-2xl transition-all"
        style={{
          background: '#1e1e1e',
          border: `1px solid ${disabled ? '#222222' : '#333333'}`,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}
        onFocus={() => {}}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          rows={1}
          className="flex-1 bg-transparent text-sm resize-none py-3.5 pl-4 pr-2 outline-none"
          style={{
            color: disabled ? '#555555' : '#ececec',
            minHeight: '52px',
            maxHeight: '200px',
            lineHeight: '1.5',
            caretColor: '#10a37f',
          }}
        />

        {/* Send button */}
        <div className="pb-2 pr-2">
          <button
            onClick={handleSubmit}
            disabled={disabled || !value.trim()}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150 active:scale-90"
            style={{
              background:
                disabled || !value.trim()
                  ? 'rgba(255,255,255,0.05)'
                  : 'linear-gradient(135deg, #10a37f 0%, #0d8a6a 100%)',
              cursor: disabled || !value.trim() ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!disabled && value.trim()) {
                e.currentTarget.style.filter = 'brightness(1.1)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = 'none'
            }}
          >
            {disabled ? (
              <Loader2
                className="w-4 h-4 animate-spin"
                style={{ color: '#555555' }}
                strokeWidth={2}
              />
            ) : (
              <Send
                className="w-4 h-4"
                style={{ color: value.trim() ? 'white' : '#444444' }}
                strokeWidth={2}
              />
            )}
          </button>
        </div>
      </div>

      {/* Hint */}
      <p className="text-center text-xs mt-2" style={{ color: '#3a3a3a' }}>
        IS Bot은 정보보호 정책에 관한 질문에 답변합니다 &nbsp;·&nbsp; Shift+Enter로 줄바꿈
      </p>
    </div>
  )
}
