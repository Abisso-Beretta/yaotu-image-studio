import { useEffect, useRef, useState } from 'react'
import type { GeneratedImage } from '@/types'

interface LightboxProps {
  images: GeneratedImage[]
  index: number
  onIndexChange: (index: number) => void
  onClose: () => void
}

const MIN_SCALE = 1
const MAX_SCALE = 4

export default function Lightbox({ images, index, onIndexChange, onClose }: LightboxProps) {
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const img = images[index]
  const canPrev = index > 0
  const canNext = index < images.length - 1

  useEffect(() => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }, [index])

  useEffect(() => {
    if (!dragging) return
    function onMove(e: MouseEvent) {
      setOffset({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y })
    }
    function onUp() {
      setDragging(false)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [dragging])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft' && index > 0) onIndexChange(index - 1)
      else if (e.key === 'ArrowRight' && index < images.length - 1) onIndexChange(index + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, images.length, onIndexChange, onClose])

  if (!img) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center overflow-hidden"
      onClick={onClose}
      onWheel={(e) => {
        e.preventDefault()
        setScale((s) => {
          const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, s + (e.deltaY < 0 ? 0.15 : -0.15)))
          if (next === MIN_SCALE) setOffset({ x: 0, y: 0 })
          return next
        })
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        title="关闭 (Esc)"
        className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white text-lg leading-none"
      >
        ×
      </button>

      {canPrev && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onIndexChange(index - 1)
          }}
          title="上一张（←）"
          className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl leading-none"
        >
          ‹
        </button>
      )}
      {canNext && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onIndexChange(index + 1)
          }}
          title="下一张（→）"
          className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl leading-none"
        >
          ›
        </button>
      )}

      <img
        src={img.url}
        alt={img.prompt || img.id}
        draggable={false}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => {
          e.stopPropagation()
          if (scale <= MIN_SCALE) return
          setDragging(true)
          dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y }
        }}
        className="max-w-[90vw] max-h-[85vh] object-contain select-none"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transition: dragging ? 'none' : 'transform 0.08s ease-out',
          cursor: scale > MIN_SCALE ? (dragging ? 'grabbing' : 'grab') : 'default',
        }}
      />

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-neutral-300 bg-black/50 px-3 py-1.5 rounded-full">
        {index + 1} / {images.length}
      </div>
    </div>
  )
}
