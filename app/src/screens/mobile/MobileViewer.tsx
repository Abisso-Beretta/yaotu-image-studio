import { useEffect, useState } from 'react'
import type { GeneratedImage } from '@/types'

// 保存到相册的即时状态：仅供查看器内部反馈用，不进全局 store（避免和生成/重 Roll 的 notice 抢显示）。
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

// 全屏大图查看器：object-contain 完整显示，底部操作条 保存 / 重 Roll / 删除 / 关闭。
// 所有动作走 store（经 MobileApp 传入的 onReroll / onDelete / onSave），本组件只管展示与交互。
export default function MobileViewer({
  images,
  index,
  onIndexChange,
  onClose,
  onReroll,
  onDelete,
  onSave,
}: {
  images: GeneratedImage[]
  index: number
  onIndexChange: (index: number) => void
  onClose: () => void
  onReroll: (img: GeneratedImage) => void
  onDelete: (img: GeneratedImage) => void
  onSave: (img: GeneratedImage) => Promise<void>
}) {
  const img = images[index]

  // 保存反馈状态：切换到别的图时重置，避免上一张的「已保存 ✓」残留在当前图上。
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  useEffect(() => {
    setSaveStatus('idle')
  }, [index])

  // 打开查看器时锁背景滚动，关闭时恢复。
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  // 保存中防重复点击：saving 时直接忽略再次点击。成功/失败都落到可见文案，2 秒后回到 idle。
  const handleSave = async () => {
    if (!img || saveStatus === 'saving') return
    setSaveStatus('saving')
    try {
      await onSave(img)
      setSaveStatus('saved')
    } catch {
      setSaveStatus('error')
    }
    window.setTimeout(() => setSaveStatus('idle'), 2000)
  }

  const saveLabel =
    saveStatus === 'saving' ? '保存中…' : saveStatus === 'saved' ? '已保存 ✓' : saveStatus === 'error' ? '保存失败' : '保存'

  if (!img) return null

  const canPrev = index > 0
  const canNext = index < images.length - 1

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      {/* 顶部：计数 + 关闭，避让刘海 */}
      <div
        className="flex items-center justify-between px-4 pb-2 text-neutral-300"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 10px)' }}
      >
        <span className="text-sm">
          {index + 1} / {images.length}
        </span>
        <button
          onClick={onClose}
          aria-label="关闭"
          className="w-11 h-11 -mr-2 flex items-center justify-center text-2xl leading-none active:text-white"
        >
          ×
        </button>
      </div>

      {/* 图片区：object-contain，点空白关闭；点图不关。左右点按翻页（不依赖 hover）。 */}
      <div className="flex-1 relative min-h-0 flex items-center justify-center" onClick={onClose}>
        <img
          src={img.url}
          alt={img.prompt || img.id}
          onClick={(e) => e.stopPropagation()}
          className="max-w-full max-h-full object-contain"
        />
        {canPrev && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onIndexChange(index - 1)
            }}
            aria-label="上一张"
            className="absolute left-2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 text-white text-2xl leading-none active:bg-white/20"
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
            aria-label="下一张"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 text-white text-2xl leading-none active:bg-white/20"
          >
            ›
          </button>
        )}
      </div>

      {/* 底部操作条：保存 / 重 Roll / 删除 / 关闭，避让底部手势区 */}
      <div
        className="flex items-center gap-2 px-4 pt-3 border-t border-white/10"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
      >
        <button
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
          className={`flex-1 min-h-[48px] rounded-xl font-semibold border ${
            saveStatus === 'error'
              ? 'text-red-200 border-red-800/70 bg-red-950/40'
              : saveStatus === 'saved'
                ? 'text-emerald-200 border-emerald-800/70 bg-emerald-950/40'
                : 'text-neutral-200 border-line active:text-white'
          } disabled:opacity-60`}
        >
          {saveLabel}
        </button>
        <button
          onClick={() => onReroll(img)}
          className="flex-1 min-h-[48px] rounded-xl font-semibold text-white bg-accent active:bg-accent-soft"
        >
          重 Roll
        </button>
        <button
          onClick={() => onDelete(img)}
          className="flex-1 min-h-[48px] rounded-xl font-semibold text-red-200 border border-red-800/70 bg-red-950/40 active:bg-red-900/50"
        >
          删除
        </button>
        <button
          onClick={onClose}
          className="px-5 min-h-[48px] rounded-xl text-neutral-300 border border-line active:text-white"
        >
          关闭
        </button>
      </div>
    </div>
  )
}
