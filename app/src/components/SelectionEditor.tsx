import { useEffect, useRef, useState } from 'react'

interface Point {
  x: number
  y: number
}

interface Stroke {
  points: Point[]
  width: number
}

interface SelectionEditorProps {
  source: string
  title?: string
  initialPrompt?: string
  busy?: boolean
  onCancel: () => void
  onSubmit: (input: { imageDataUrl: string; maskDataUrl: string; prompt: string }) => void
}

export default function SelectionEditor({
  source,
  title = '局部修改',
  initialPrompt = '',
  busy = false,
  onCancel,
  onSubmit,
}: SelectionEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const activeStroke = useRef<Stroke | null>(null)
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [brush, setBrush] = useState(4)
  const [prompt, setPrompt] = useState(initialPrompt)
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const image = new Image()
    image.onload = () => {
      if (cancelled) return
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      const context = canvas.getContext('2d')
      if (!context) {
        setError('无法读取图片。')
        return
      }
      context.drawImage(image, 0, 0)
      try {
        setImageDataUrl(canvas.toDataURL('image/png'))
        imageRef.current = image
      } catch {
        setError('图片无法转换，请换一张本地图片后重试。')
      }
    }
    image.onerror = () => setError('图片加载失败。')
    image.src = source
    return () => {
      cancelled = true
      image.onload = null
      image.onerror = null
    }
  }, [source])

  useEffect(() => {
    const canvas = canvasRef.current
    const image = imageRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !image || !context) return
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    context.drawImage(image, 0, 0)
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.strokeStyle = 'rgba(255, 56, 72, 0.62)'
    for (const stroke of strokes) {
      paintStroke(context, stroke)
    }
  }, [imageDataUrl, strokes])

  function startStroke(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas || !imageRef.current) return
    canvas.setPointerCapture(event.pointerId)
    const point = canvasPoint(event, canvas)
    activeStroke.current = { points: [point], width: (Math.min(canvas.width, canvas.height) * brush) / 100 }
    setStrokes((current) => [...current, activeStroke.current!])
  }

  function continueStroke(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas || !activeStroke.current) return
    const point = canvasPoint(event, canvas)
    const active = activeStroke.current
    active.points = [...active.points, point]
    setStrokes((current) => [...current.slice(0, -1), active])
  }

  function endStroke() {
    activeStroke.current = null
  }

  function submit() {
    const image = imageRef.current
    if (!image || !imageDataUrl || !prompt.trim() || strokes.length === 0) return
    const mask = document.createElement('canvas')
    mask.width = image.naturalWidth
    mask.height = image.naturalHeight
    const context = mask.getContext('2d')
    if (!context) {
      setError('无法生成选区遮罩。')
      return
    }
    context.fillStyle = '#000'
    context.fillRect(0, 0, mask.width, mask.height)
    context.globalCompositeOperation = 'destination-out'
    for (const stroke of strokes) paintStroke(context, stroke)
    try {
      const maskDataUrl = mask.toDataURL('image/png')
      if (dataUrlByteLength(imageDataUrl) >= 50 * 1024 * 1024 || dataUrlByteLength(maskDataUrl) >= 50 * 1024 * 1024) {
        setError('原图和遮罩都必须小于 50 MB，请换用较小图片。')
        return
      }
      onSubmit({ imageDataUrl, maskDataUrl, prompt: prompt.trim() })
    } catch {
      setError('遮罩生成失败。')
    }
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/80 flex items-center justify-center p-3 sm:p-6" onClick={onCancel}>
      <section
        className="w-full max-w-4xl max-h-[95dvh] overflow-y-auto bg-panel border border-line rounded-lg p-4 sm:p-5 space-y-4"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-neutral-100">{title}</h2>
          <button className="min-w-10 min-h-10 text-neutral-300" aria-label="关闭局部修改" onClick={onCancel}>×</button>
        </header>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-neutral-400">涂抹要修改的区域</span>
          <label className="flex items-center gap-2 text-xs text-neutral-300">
            笔刷
            <input aria-label="笔刷大小" type="range" min="1" max="12" value={brush} onChange={(event) => setBrush(Number(event.target.value))} />
          </label>
          <button disabled={!strokes.length || busy} className="px-3 py-2 min-h-10 border border-line rounded text-sm disabled:opacity-40" onClick={() => setStrokes((current) => current.slice(0, -1))}>撤销</button>
          <button disabled={!strokes.length || busy} className="px-3 py-2 min-h-10 border border-line rounded text-sm disabled:opacity-40" onClick={() => setStrokes([])}>清除选区</button>
        </div>
        <div className="min-h-32 max-h-[55dvh] flex items-center justify-center overflow-hidden bg-black/30 rounded">
          {imageDataUrl ? (
            <canvas
              ref={canvasRef}
              className="block max-w-full max-h-[55dvh] w-auto h-auto touch-none cursor-crosshair"
              onPointerDown={startStroke}
              onPointerMove={continueStroke}
              onPointerUp={endStroke}
              onPointerCancel={endStroke}
            />
          ) : <span className="text-sm text-neutral-400">正在载入图片…</span>}
        </div>
        <label className="block">
          <span className="block text-xs text-neutral-400 mb-1">修改内容</span>
          <textarea className="w-full min-h-24 resize-y" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="例如：把选中区域改成一朵红色玫瑰，其他部分保持不变。" />
        </label>
        {error && <p className="text-sm text-red-300">{error}</p>}
        <footer className="flex justify-end gap-2">
          <button disabled={busy} className="min-h-10 px-4 border border-line rounded text-sm" onClick={onCancel}>取消</button>
          <button disabled={busy || !imageDataUrl || !prompt.trim() || strokes.length === 0} className="min-h-10 px-4 rounded bg-accent text-white text-sm disabled:opacity-40" onClick={submit}>{busy ? '修改中…' : '开始局部修改'}</button>
        </footer>
      </section>
    </div>
  )
}

function dataUrlByteLength(value: string): number {
  const base64 = value.slice(value.indexOf(',') + 1)
  return Math.floor((base64.length * 3) / 4) - (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0)
}

function canvasPoint(event: React.PointerEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement): Point {
  const rect = canvas.getBoundingClientRect()
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  }
}

function paintStroke(context: CanvasRenderingContext2D, stroke: Stroke) {
  const points = stroke.points
  if (points.length === 0) return
  context.lineWidth = stroke.width
  if (points.length === 1) {
    context.beginPath()
    context.arc(points[0].x, points[0].y, stroke.width / 2, 0, Math.PI * 2)
    context.fillStyle = context.globalCompositeOperation === 'destination-out' ? '#000' : 'rgba(255, 56, 72, 0.62)'
    context.fill()
    return
  }
  context.beginPath()
  context.moveTo(points[0].x, points[0].y)
  for (let index = 1; index < points.length; index += 1) context.lineTo(points[index].x, points[index].y)
  context.stroke()
}
