import Sidebar from '@/components/layout/Sidebar'

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0d0d0d' }}>
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {children}
      </main>
    </div>
  )
}
