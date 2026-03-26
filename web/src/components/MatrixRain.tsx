'use client'

import { useEffect, useRef } from 'react'

const CHARS =
  'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン' +
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&'

const FONT_SIZE = 14
const COLUMN_WIDTH = 20
const FALL_SPEED = 1.5

export default function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    let columns: number[] = []
    let frameCount = 0

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      const numCols = Math.floor(canvas.width / COLUMN_WIDTH)
      columns = Array.from({ length: numCols }, () =>
        Math.floor(Math.random() * (canvas.height / FONT_SIZE))
      )
    }

    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      frameCount++

      // Semi-transparent black overlay to create fade trail effect
      ctx.fillStyle = 'rgba(13, 13, 13, 0.05)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Only advance every ~1.5 frames for slow fall
      if (frameCount % Math.ceil(FALL_SPEED) !== 0) {
        animationId = requestAnimationFrame(draw)
        return
      }

      ctx.font = `${FONT_SIZE}px monospace`

      for (let i = 0; i < columns.length; i++) {
        const char = CHARS[Math.floor(Math.random() * CHARS.length)]
        const x = i * COLUMN_WIDTH
        const y = columns[i] * FONT_SIZE

        // Leading character brighter
        ctx.fillStyle = 'rgba(0, 255, 65, 0.6)'
        ctx.fillText(char, x, y)

        // Reset column randomly after passing screen bottom
        if (y > canvas.height && Math.random() > 0.975) {
          columns[i] = 0
        } else {
          columns[i]++
        }
      }

      animationId = requestAnimationFrame(draw)
    }

    animationId = requestAnimationFrame(draw)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        opacity: 0.035,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    />
  )
}
