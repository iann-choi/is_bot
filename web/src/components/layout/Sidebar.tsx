'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Shield, Plus, Trash2, MessageSquare } from 'lucide-react'

interface SidebarConversation {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  _count?: { messages: number }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return '오늘'
  if (diffDays === 1) return '어제'
  if (diffDays < 7) return `${diffDays}일 전`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`
  return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
}

export default function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const [conversations, setConversations] = useState<SidebarConversation[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const activeId = pathname?.startsWith('/chat/') ? pathname.split('/chat/')[1] : null

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/conversations')
      if (res.ok) {
        const data = await res.json()
        setConversations(data)
      }
    } catch (err) {
      console.error('Failed to load conversations:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadConversations()
  }, [loadConversations, pathname])

  const handleNewChat = async () => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Chat' }),
      })
      if (res.ok) {
        const conversation = await res.json()
        await loadConversations()
        router.push(`/chat/${conversation.id}`)
      }
    } catch (err) {
      console.error('Failed to create conversation:', err)
    }
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    e.preventDefault()
    setDeletingId(id)
    try {
      const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id))
        if (activeId === id) {
          router.push('/chat')
        }
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err)
    } finally {
      setDeletingId(null)
    }
  }

  // Group conversations by date
  const today: SidebarConversation[] = []
  const yesterday: SidebarConversation[] = []
  const thisWeek: SidebarConversation[] = []
  const older: SidebarConversation[] = []

  conversations.forEach((c) => {
    const d = formatDate(c.updatedAt)
    if (d === '오늘') today.push(c)
    else if (d === '어제') yesterday.push(c)
    else if (d.includes('일 전')) thisWeek.push(c)
    else older.push(c)
  })

  const grouped: { label: string; items: SidebarConversation[] }[] = []
  if (today.length > 0) grouped.push({ label: '오늘', items: today })
  if (yesterday.length > 0) grouped.push({ label: '어제', items: yesterday })
  if (thisWeek.length > 0) grouped.push({ label: '이번 주', items: thisWeek })
  if (older.length > 0) grouped.push({ label: '이전', items: older })

  return (
    <div
      className="flex flex-col h-full select-none"
      style={{
        width: '260px',
        minWidth: '260px',
        background: '#171717',
        borderRight: '1px solid #222222',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4" style={{ borderBottom: '1px solid #222222' }}>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #10a37f 0%, #0d8a6a 100%)' }}
        >
          <Shield className="w-4 h-4 text-white" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-white leading-tight">IS Bot</h1>
          <p className="text-xs" style={{ color: '#555555' }}>
            정보보호 어시스턴트
          </p>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="px-3 py-3">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
          style={{
            background: 'rgba(16, 163, 127, 0.1)',
            border: '1px solid rgba(16, 163, 127, 0.25)',
            color: '#10a37f',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(16, 163, 127, 0.18)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(16, 163, 127, 0.1)'
          }}
        >
          <Plus className="w-4 h-4" strokeWidth={2} />
          새 대화
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div
              className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: '#333333', borderTopColor: '#10a37f' }}
            />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center py-8 px-4 text-center">
            <MessageSquare className="w-8 h-8 mb-2" style={{ color: '#333333' }} strokeWidth={1} />
            <p className="text-xs" style={{ color: '#555555' }}>
              대화 기록이 없습니다
            </p>
          </div>
        ) : (
          grouped.map(({ label, items }) => (
            <div key={label} className="mb-2">
              <p
                className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider"
                style={{ color: '#444444' }}
              >
                {label}
              </p>
              {items.map((conv) => {
                const isActive = conv.id === activeId
                const isHovered = conv.id === hoveredId
                const isDeleting = conv.id === deletingId

                return (
                  <div
                    key={conv.id}
                    className="relative flex items-center group rounded-lg mb-0.5 cursor-pointer transition-all duration-100"
                    style={{
                      background: isActive
                        ? 'rgba(255,255,255,0.06)'
                        : isHovered
                        ? 'rgba(255,255,255,0.04)'
                        : 'transparent',
                      padding: '8px 12px',
                    }}
                    onClick={() => router.push(`/chat/${conv.id}`)}
                    onMouseEnter={() => setHoveredId(conv.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <MessageSquare
                      className="w-3.5 h-3.5 mr-2.5 flex-shrink-0"
                      style={{ color: isActive ? '#10a37f' : '#444444' }}
                      strokeWidth={1.5}
                    />
                    <span
                      className="text-sm truncate flex-1"
                      style={{ color: isActive ? '#ececec' : '#aaaaaa' }}
                    >
                      {conv.title}
                    </span>

                    {(isHovered || isDeleting) && (
                      <button
                        onClick={(e) => handleDelete(e, conv.id)}
                        disabled={isDeleting}
                        className="ml-1 p-1 rounded transition-colors flex-shrink-0"
                        style={{ color: '#555555' }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#555555')}
                        title="대화 삭제"
                      >
                        {isDeleting ? (
                          <div
                            className="w-3.5 h-3.5 rounded-full border border-t-transparent animate-spin"
                            style={{ borderColor: '#555555', borderTopColor: 'transparent' }}
                          />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                        )}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
