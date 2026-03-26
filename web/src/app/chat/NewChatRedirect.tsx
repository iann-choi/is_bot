'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Shield } from 'lucide-react'

export default function NewChatRedirect() {
  const router = useRouter()

  useEffect(() => {
    const createAndRedirect = async () => {
      try {
        const res = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'New Chat' }),
        })
        if (res.ok) {
          const conversation = await res.json()
          router.replace(`/chat/${conversation.id}`)
        }
      } catch (err) {
        console.error('Failed to create conversation:', err)
      }
    }

    createAndRedirect()
  }, [router])

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #10a37f 0%, #0d8a6a 100%)' }}
        >
          <Shield className="w-6 h-6 text-white" strokeWidth={1.5} />
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: '#333333', borderTopColor: '#10a37f' }}
          />
          <span className="text-sm" style={{ color: '#555555' }}>
            새 대화를 시작하는 중...
          </span>
        </div>
      </div>
    </div>
  )
}
