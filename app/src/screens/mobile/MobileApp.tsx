import { useEffect, useLayoutEffect, useState } from 'react'
import { useGenerator } from '@/store/generator'
import { useTheme } from '@/store/theme'
import type { GeneratedImage } from '@/types'
import MobileHeader from './MobileHeader'
import MobilePromptCard from './MobilePromptCard'
import MobileGenerateBar from './MobileGenerateBar'
import MobileGallery from './MobileGallery'
import MobileViewer from './MobileViewer'
import MobileSettingsDrawer from './MobileSettingsDrawer'
import { saveImageToAlbum } from '@/mobile/mediaSave'

// 图库累积：store.loadGallery(page) 语义是「整页替换」，为了实现手机上的「加载更多」
// 又不改动 store 逻辑，这里把每页结果按 id 去重后累加到一份纯 UI 列表里。
// 顺序保持「新→旧」：第 1 页最新在顶，后续页更旧的追加在后。
function appendUnique(prev: GeneratedImage[], next: GeneratedImage[]): GeneratedImage[] {
  const seen = new Set(prev.map((i) => i.id))
  return [...prev, ...next.filter((i) => !seen.has(i.id))]
}

export default function MobileApp() {
  const loadConfig = useGenerator((s) => s.loadConfig)
  const loadGallery = useGenerator((s) => s.loadGallery)
  const gallery = useGenerator((s) => s.gallery)
  const page = useGenerator((s) => s.page)
  const notice = useGenerator((s) => s.notice)
  const error = useGenerator((s) => s.error)
  const deleteImage = useGenerator((s) => s.deleteImage)
  const reroll = useGenerator((s) => s.reroll)
  const openSettings = useGenerator((s) => s.openSettings)
  const settingsOpen = useGenerator((s) => s.settingsOpen)
  const backgroundTheme = useTheme((s) => s.backgroundTheme)
  const loadTheme = useTheme((s) => s.loadTheme)

  // items：图库的纯 UI 累积视图；viewerIndex：大图查看器打开的图在 items 中的下标。
  const [items, setItems] = useState<GeneratedImage[]>([])
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)

  useEffect(() => {
    loadConfig()
    loadGallery(1)
    loadTheme()
  }, [loadConfig, loadGallery, loadTheme])

  // 与桌面 App 一致：把背景主题写到 documentElement，index.css 的浅色/强调色规则据此生效。
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = backgroundTheme
  }, [backgroundTheme])

  // 第 1 页（首屏 / 生成后 store 会 loadGallery(1)）整体重置；后续页追加。
  // appendUnique 幂等，StrictMode 双跑也不会重复。
  useEffect(() => {
    setItems((prev) => (page <= 1 ? gallery : appendUnique(prev, gallery)))
  }, [gallery, page])

  // 删除走 store.deleteImage（自带二次确认 window.confirm）。它只在真正删成功时把 total-1，
  // 因此对比前后 total 就能判断用户是否确认删除，再据此同步纯 UI 的 items——不改 store 逻辑。
  const handleDelete = async (img: GeneratedImage) => {
    const before = useGenerator.getState().total
    await deleteImage(img.id)
    if (useGenerator.getState().total < before) {
      setItems((prev) => prev.filter((i) => i.id !== img.id))
    }
  }

  const handleReroll = (img: GeneratedImage) => {
    // 重 Roll 会生成新批次并 loadGallery(1) 重置图库，此时查看器里的旧下标已失效，直接关闭。
    void reroll(img)
    setViewerIndex(null)
  }

  // 保存到相册：img.url 已是 convertFileSrc 转换后的显示 url，不能直接读；而 img.id 恒为
  // '<batchId>/<file>' 形态（见 engine 生成/图库两条路径），转换前的相对路径就是 'outputs/' + id。
  // 失败向上抛给 MobileViewer 转成可见反馈（这里不动全局 notice，避让生成/重 Roll 的通知）。
  const handleSave = async (img: GeneratedImage) => {
    await saveImageToAlbum(`outputs/${img.id}`)
  }

  const viewerOpen = viewerIndex !== null && items.length > 0

  return (
    <div className="relative min-h-screen bg-ink text-neutral-200">
      {backgroundTheme !== 'none' && (
        <div
          className="fixed inset-0 -z-10 bg-cover bg-center"
          style={{ backgroundImage: `url(${import.meta.env.BASE_URL}backgrounds/${backgroundTheme}.png)` }}
        />
      )}

      {/* 顶栏 + 通知：合成一个 sticky 区域固定在顶部（含刘海 safe-area）。 */}
      <div className="sticky top-0 z-30">
        <MobileHeader onOpenSettings={openSettings} />
        {(notice || error) && (
          <div
            className={`px-4 py-2 text-sm border-b backdrop-blur-sm ${
              error
                ? 'text-red-200 border-red-900/60 bg-red-950/70'
                : 'text-emerald-200 border-emerald-900/60 bg-emerald-950/70'
            }`}
          >
            {error || notice}
          </div>
        )}
      </div>

      {/* 主体单列滚动；底部 pb 预留空间避开固定生成栏。 */}
      <main className="px-4 pt-4 pb-40 space-y-4">
        <MobilePromptCard />
        <MobileGallery items={items} onOpen={(i) => setViewerIndex(i)} />
      </main>

      <MobileGenerateBar />

      {viewerOpen && (
        <MobileViewer
          images={items}
          index={Math.min(viewerIndex as number, items.length - 1)}
          onIndexChange={setViewerIndex}
          onClose={() => setViewerIndex(null)}
          onReroll={handleReroll}
          onDelete={handleDelete}
          onSave={handleSave}
        />
      )}

      {settingsOpen && <MobileSettingsDrawer />}
    </div>
  )
}
