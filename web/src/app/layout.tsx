import type { Metadata } from 'next'
import './globals.css'
import MatrixRain from '@/components/MatrixRain'

export const metadata: Metadata = {
  title: 'IS Bot - 정보보호 챗봇',
  description: '사내 정보보호 정책에 관한 질문에 답변하는 AI 챗봇',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        style={{ backgroundColor: '#0d0d0d', color: '#ececec', minHeight: '100vh' }}
        className="font-sans antialiased"
      >
        <MatrixRain />
        {children}
      </body>
    </html>
  )
}
