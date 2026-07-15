import { useGenerator } from '@/store/generator'
import type { GeneratedImage } from '@/types'

// 手机图库：2 列缩略图网格 + 「加载更多」。
// items 是 MobileApp 维护的纯 UI 累积视图；翻页仍复用 store.loadGallery(page)，
// 只是把「上一页/下一页」换成「加载更多」——分页 state（page/totalPages/total）语义不变。
export default function MobileGallery({
  items,
  onOpen,
}: {
  items: GeneratedImage[]
  onOpen: (index: number) => void
}) {
  const page = useGenerator((s) => s.page)
  const totalPages = useGenerator((s) => s.totalPages)
  const total = useGenerator((s) => s.total)
  const galleryLoading = useGenerator((s) => s.galleryLoading)
  const loadGallery = useGenerator((s) => s.loadGallery)

  const hasMore = page < totalPages

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between px-0.5">
        <h2 className="text-sm font-semibold text-neutral-300">图库</h2>
        <span className="text-xs text-neutral-500">{total} 张</span>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-neutral-500 py-10 text-center">
          {galleryLoading ? '加载中…' : '还没有图片，先生成一张。'}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5">
            {items.map((img, i) => (
              <button
                key={img.id}
                onClick={() => onOpen(i)}
                className="block rounded-xl overflow-hidden border border-line bg-panel active:opacity-80"
              >
                <img
                  src={img.url}
                  alt={img.prompt || img.id}
                  loading="lazy"
                  className="w-full aspect-square object-cover"
                />
              </button>
            ))}
          </div>

          {hasMore && (
            <button
              onClick={() => loadGallery(page + 1)}
              disabled={galleryLoading}
              className="w-full min-h-[44px] rounded-xl border border-line text-sm text-neutral-300 active:border-accent-soft disabled:opacity-40"
            >
              {galleryLoading ? '加载中…' : '加载更多'}
            </button>
          )}
        </>
      )}
    </section>
  )
}
