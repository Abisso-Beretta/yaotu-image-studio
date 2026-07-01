import { useRef, useState } from 'react'
import { useGenerator, composePrompt } from '@/store/generator'
import { builtInStylePresets, promptLexiconGroups, purposePresets } from '@/data/presets'
import type { GeneratedImage } from '@/types'

const SIZES = [
  { v: '2160x3840', label: '9:16 4K · 2160×3840' },
  { v: '1440x2560', label: '9:16 · 1440×2560' },
  { v: '1080x1920', label: '9:16 · 1080×1920' },
  { v: '1024x1024', label: '1:1 · 1024×1024' },
  { v: '3584x2240', label: '16:10 · 3584×2240' },
  { v: '3840x2160', label: '16:9 4K · 3840×2160' },
  { v: '2560x1440', label: '16:9 · 2560×1440' },
  { v: 'auto', label: '自动' },
]

const MODELS = ['gpt-image-2', 'gpt-image-1.5', 'gpt-image-1', 'gpt-image-1-mini']

function Label({ children }: { children: React.ReactNode }) {
  return <span className="block text-xs text-neutral-400 mb-1">{children}</span>
}

function ImageCard({ img }: { img: GeneratedImage }) {
  const addRefFromImage = useGenerator((s) => s.addRefFromImage)
  const deleteImage = useGenerator((s) => s.deleteImage)
  const reroll = useGenerator((s) => s.reroll)
  return (
    <figure className="group relative rounded-lg overflow-hidden border border-line bg-panel">
      <a href={img.url} target="_blank" rel="noreferrer">
        <img
          src={img.url}
          alt={img.prompt || img.id}
          loading="lazy"
          className="w-full aspect-[3/4] object-cover"
        />
      </a>
      <figcaption className="absolute inset-x-0 bottom-0 flex flex-wrap gap-1 p-1.5 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition">
        <button
          className="text-[11px] px-2 py-1 rounded bg-accent hover:bg-accent-soft text-white"
          onClick={() => reroll(img)}
        >
          重 Roll
        </button>
        <button
          className="text-[11px] px-2 py-1 rounded bg-black/50 hover:bg-black/70 text-neutral-200"
          onClick={() => addRefFromImage(img)}
        >
          设为参考图
        </button>
        <button
          className="text-[11px] px-2 py-1 rounded bg-black/50 hover:bg-red-700 text-neutral-200"
          onClick={() => deleteImage(img.id)}
        >
          删除
        </button>
      </figcaption>
    </figure>
  )
}

export default function Generator() {
  const {
    config,
    form,
    setForm,
    refs,
    addRefFiles,
    removeRef,
    clearRefs,
    generate,
    generating,
    optimize,
    optimizing,
    notice,
    error,
    lastBatch,
    gallery,
    page,
    totalPages,
    total,
    galleryLoading,
    loadGallery,
    savedPrompts,
    recentPrompts,
    savedStyles,
    savePromptItem,
    applyPromptItem,
    removeSavedPrompt,
    removeRecentPrompt,
    removeSavedStyle,
    analysisImages,
    analysisMode,
    analysisBusy,
    analysisResult,
    addAnalysisFiles,
    removeAnalysisImage,
    clearAnalysis,
    setAnalysisMode,
    runAnalysis,
    useAnalysisAsPrompt,
    saveAnalysisAsStyle,
  } = useGenerator()
  const fileInput = useRef<HTMLInputElement>(null)
  const analysisInput = useRef<HTMLInputElement>(null)
  const [optimizeMode, setOptimizeMode] = useState('conservative')
  const [lexCat, setLexCat] = useState(promptLexiconGroups[0]?.id || '')
  const [showPreview, setShowPreview] = useState(false)
  const [styleStrength, setStyleStrength] = useState('high')

  const canGenerate = !generating && form.prompt.trim().length > 0
  const showCompression = form.outputFormat === 'jpeg' || form.outputFormat === 'webp'
  const lexGroup = promptLexiconGroups.find((g) => g.id === lexCat) || promptLexiconGroups[0]
  const appendToPrompt = (text: string) =>
    setForm({ prompt: form.prompt.trim() ? `${form.prompt.trim()}，${text}` : text })

  return (
    <div className="h-full grid grid-cols-[380px_1fr] max-[900px]:grid-cols-1">
      {/* 控制面板 */}
      <section className="border-r border-line overflow-y-auto p-5 space-y-4">
        <label className="block">
          <Label>画面方向</Label>
          <textarea
            rows={6}
            value={form.prompt}
            onChange={(e) => setForm({ prompt: e.target.value })}
            placeholder="例如：冷雨夜霓虹巷弄，撑伞青年的背影，电影感赛博朋克写实风，浅景深，胶片颗粒。"
            className="w-full resize-y"
          />
        </label>

        <label className="block">
          <Label>反向提示词</Label>
          <textarea
            rows={2}
            value={form.negativePrompt}
            onChange={(e) => setForm({ negativePrompt: e.target.value })}
            placeholder="例如：文字、水印、畸形手、低清晰度"
            className="w-full resize-y"
          />
        </label>

        <div>
          <Label>优化提示词（辅助 API）</Label>
          <div className="flex gap-2">
            <select
              value={optimizeMode}
              onChange={(e) => setOptimizeMode(e.target.value)}
              className="flex-1"
            >
              <option value="conservative">保守优化</option>
              <option value="quality">质量优先</option>
              <option value="continuity">连续性优先</option>
            </select>
            <button
              disabled={optimizing || !form.prompt.trim()}
              onClick={() => optimize(optimizeMode)}
              className="px-3 py-2 rounded-lg border border-line text-sm text-neutral-200 hover:border-accent-soft disabled:opacity-40"
            >
              {optimizing ? '优化中…' : '优化'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <Label>用途</Label>
            <select
              value={form.purpose}
              onChange={(e) => setForm({ purpose: e.target.value })}
              className="w-full"
            >
              {Object.entries(purposePresets).map(([k, p]) => (
                <option key={k} value={k}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <Label>风格</Label>
            <select
              value={form.style}
              onChange={(e) => setForm({ style: e.target.value })}
              className="w-full"
            >
              {Object.entries(builtInStylePresets).map(([k, p]) => (
                <option key={k} value={k}>
                  {p.label}
                </option>
              ))}
              {savedStyles.length > 0 && (
                <optgroup label="已存风格">
                  {savedStyles.map((s) => (
                    <option key={s.id} value={`saved:${s.id}`}>
                      {s.name}
                      {s.strength === 'high' ? ' ★' : ''}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            {form.style.startsWith('saved:') && (
              <button
                onClick={() => removeSavedStyle(form.style.slice('saved:'.length))}
                className="mt-1 text-[11px] text-neutral-500 hover:text-red-400"
              >
                删除此风格
              </button>
            )}
          </label>
        </div>

        {form.style.startsWith('saved:') &&
          savedStyles.find((s) => `saved:${s.id}` === form.style)?.strength === 'high' && (
            <p className="text-[11px] text-emerald-400/80 -mt-2">
              ★ 高强度风格：调用时会把该风格的样图作为参考图一起发送。
            </p>
          )}

        <div>
          <div className="flex items-center justify-between mb-1">
            <Label>常用词库</Label>
            <select
              value={lexCat}
              onChange={(e) => setLexCat(e.target.value)}
              className="text-xs py-1"
            >
              {promptLexiconGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {lexGroup?.items.map((it) => (
              <button
                key={it.label}
                onClick={() => appendToPrompt(it.text)}
                title={it.text}
                className="text-[11px] px-2 py-1 rounded border border-line text-neutral-300 hover:border-accent-soft"
              >
                {it.label}
              </button>
            ))}
          </div>
        </div>

        <details
          open={showPreview}
          onToggle={(e) => setShowPreview((e.target as HTMLDetailsElement).open)}
        >
          <summary className="cursor-pointer select-none text-xs text-neutral-400">
            最终提示词预览
          </summary>
          <pre className="mt-1 whitespace-pre-wrap text-[11px] text-neutral-500 bg-panel border border-line rounded p-2 max-h-40 overflow-y-auto">
            {composePrompt(form, savedStyles)}
          </pre>
        </details>

        {/* 提示词库 */}
        <details className="border-t border-line pt-3">
          <summary className="cursor-pointer select-none text-xs text-neutral-400">
            提示词库 · 收藏 {savedPrompts.length} / 最近 {recentPrompts.length}
          </summary>
          <div className="mt-2 space-y-3">
            <button
              onClick={() => {
                const name = window.prompt('给这条提示词起个名字：', form.prompt.trim().slice(0, 16))
                if (name !== null) savePromptItem(name)
              }}
              disabled={!form.prompt.trim()}
              className="w-full text-xs py-1.5 rounded border border-line text-neutral-300 hover:border-accent-soft disabled:opacity-40"
            >
              ★ 收藏当前提示词
            </button>
            {savedPrompts.length > 0 && (
              <div>
                <p className="text-[11px] text-neutral-500 mb-1">收藏</p>
                <ul className="space-y-1">
                  {savedPrompts.map((it) => (
                    <li key={it.id} className="flex items-center gap-1">
                      <button
                        onClick={() => applyPromptItem(it)}
                        title={it.text}
                        className="flex-1 text-left text-[11px] px-2 py-1 rounded border border-line text-neutral-300 hover:border-accent-soft truncate"
                      >
                        {it.name}
                      </button>
                      <button
                        onClick={() => removeSavedPrompt(it.id)}
                        className="text-neutral-600 hover:text-red-400 text-xs px-1"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {recentPrompts.length > 0 && (
              <div>
                <p className="text-[11px] text-neutral-500 mb-1">最近用过</p>
                <ul className="space-y-1">
                  {recentPrompts.slice(0, 12).map((it) => (
                    <li key={it.id} className="flex items-center gap-1">
                      <button
                        onClick={() => applyPromptItem(it)}
                        title={it.text}
                        className="flex-1 text-left text-[11px] px-2 py-1 rounded text-neutral-400 hover:text-neutral-200 truncate"
                      >
                        {it.text}
                      </button>
                      <button
                        onClick={() => removeRecentPrompt(it.id)}
                        className="text-neutral-600 hover:text-red-400 text-xs px-1"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </details>

        {/* 样图分析 */}
        <details className="border-t border-line pt-3">
          <summary className="cursor-pointer select-none text-xs text-neutral-400">
            样图分析（辅助 API）
          </summary>
          <div className="mt-2 space-y-2">
            <input
              ref={analysisInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              hidden
              onChange={(e) => {
                if (e.target.files) addAnalysisFiles(e.target.files)
                e.target.value = ''
              }}
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => analysisInput.current?.click()}
                className="flex-1 text-xs py-1.5 rounded border border-dashed border-line text-neutral-400 hover:border-accent-soft"
              >
                + 添加样图（最多 8 张）
              </button>
              {analysisImages.length > 0 && (
                <button
                  onClick={clearAnalysis}
                  className="text-[11px] text-neutral-500 hover:text-neutral-300"
                >
                  清空
                </button>
              )}
            </div>
            {analysisImages.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {analysisImages.map((r) => (
                  <div key={r.id} className="relative">
                    <img
                      src={r.dataUrl || r.url}
                      alt={r.name}
                      className="w-full aspect-square object-cover rounded border border-line"
                    />
                    <button
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black/80 text-neutral-300 text-xs leading-5"
                      onClick={() => removeAnalysisImage(r.id)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <select
                value={analysisMode}
                onChange={(e) => setAnalysisMode(e.target.value)}
                className="flex-1 text-xs"
              >
                <option value="prompt">提示词</option>
                <option value="keywords">关键词</option>
                <option value="style">风格 DNA</option>
                <option value="scene">场景</option>
              </select>
              <button
                onClick={runAnalysis}
                disabled={analysisBusy || analysisImages.length === 0}
                className="px-3 py-1.5 rounded border border-line text-xs text-neutral-200 hover:border-accent-soft disabled:opacity-40"
              >
                {analysisBusy ? '分析中…' : '分析'}
              </button>
            </div>
            {analysisResult && (
              <div className="space-y-2">
                <pre className="whitespace-pre-wrap text-[11px] text-neutral-400 bg-panel border border-line rounded p-2 max-h-48 overflow-y-auto">
                  {analysisResult}
                </pre>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={useAnalysisAsPrompt}
                    className="text-[11px] px-2 py-1 rounded bg-accent hover:bg-accent-soft text-white"
                  >
                    用作提示词
                  </button>
                  <select
                    value={styleStrength}
                    onChange={(e) => setStyleStrength(e.target.value)}
                    className="text-[11px] py-1"
                    title="风格强度"
                  >
                    <option value="low">低强度</option>
                    <option value="medium">中强度</option>
                    <option value="high">高强度（带样图）</option>
                  </select>
                  <button
                    onClick={() => {
                      const name = window.prompt('给这个风格起个名字：', '')
                      if (name !== null) saveAnalysisAsStyle(name, styleStrength)
                    }}
                    className="text-[11px] px-2 py-1 rounded border border-line text-neutral-200 hover:border-accent-soft"
                  >
                    存为风格
                  </button>
                </div>
              </div>
            )}
          </div>
        </details>

        <label className="block">
          <Label>模型</Label>
          <input
            list="modelList"
            value={form.model}
            onChange={(e) => setForm({ model: e.target.value })}
            placeholder={config?.defaultModel || 'gpt-image-2'}
            className="w-full"
          />
          <datalist id="modelList">
            {MODELS.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <Label>尺寸</Label>
            <select value={form.size} onChange={(e) => setForm({ size: e.target.value })} className="w-full">
              {SIZES.map((s) => (
                <option key={s.v} value={s.v}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <Label>质量</Label>
            <select value={form.quality} onChange={(e) => setForm({ quality: e.target.value })} className="w-full">
              <option value="auto">自动</option>
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
            </select>
          </label>
          <label className="block">
            <Label>数量</Label>
            <select
              value={form.count}
              onChange={(e) => setForm({ count: Number(e.target.value) })}
              className="w-full"
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n} 张
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <Label>格式</Label>
            <select
              value={form.outputFormat}
              onChange={(e) => setForm({ outputFormat: e.target.value })}
              className="w-full"
            >
              <option value="png">PNG</option>
              <option value="jpeg">JPEG</option>
              <option value="webp">WEBP</option>
            </select>
          </label>
          <label className="block">
            <Label>背景</Label>
            <select
              value={form.background}
              onChange={(e) => setForm({ background: e.target.value })}
              className="w-full"
            >
              <option value="auto">自动</option>
              <option value="opaque">不透明</option>
              <option value="transparent">透明</option>
            </select>
          </label>
          {showCompression && (
            <label className="block">
              <Label>压缩 {form.outputCompression}</Label>
              <input
                type="range"
                min={0}
                max={100}
                value={form.outputCompression}
                onChange={(e) => setForm({ outputCompression: Number(e.target.value) })}
                className="w-full"
              />
            </label>
          )}
        </div>

        {/* 参考图 */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label>参考图（可选）</Label>
            {refs.length > 0 && (
              <button
                className="text-[11px] text-neutral-500 hover:text-neutral-300"
                onClick={clearRefs}
              >
                清空
              </button>
            )}
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files) addRefFiles(e.target.files)
              e.target.value = ''
            }}
          />
          <button
            className="w-full text-sm py-2 rounded-lg border border-dashed border-line text-neutral-400 hover:border-accent-soft hover:text-neutral-200"
            onClick={() => fileInput.current?.click()}
          >
            + 添加参考图
          </button>
          {refs.length > 0 && (
            <div className="grid grid-cols-4 gap-2 mt-2">
              {refs.map((r) => (
                <div key={r.id} className="relative">
                  <img
                    src={r.dataUrl || r.url}
                    alt={r.name}
                    className="w-full aspect-square object-cover rounded border border-line"
                  />
                  <button
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black/80 text-neutral-300 text-xs leading-5"
                    onClick={() => removeRef(r.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          disabled={!canGenerate}
          onClick={generate}
          className="w-full py-3 rounded-lg font-bold text-white bg-accent enabled:hover:bg-accent-soft disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {generating ? '生成中…' : '生成图片'}
        </button>
        {config && !config.hasApiKey && (
          <p className="text-xs text-amber-400">
            还没配置 API Key，点右上角「设置」填一个。
          </p>
        )}
      </section>

      {/* 结果区 */}
      <section className="overflow-y-auto p-5 space-y-5">
        {(notice || error) && (
          <div
            className={`text-sm px-3 py-2 rounded-lg border ${
              error
                ? 'text-red-300 border-red-900/60 bg-red-950/30'
                : 'text-emerald-300 border-emerald-900/60 bg-emerald-950/20'
            }`}
          >
            {error || notice}
          </div>
        )}

        {lastBatch.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-neutral-300 mb-2">本次生成</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {lastBatch.map((img) => (
                <ImageCard key={img.id} img={img} />
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-neutral-300">
              图库 <span className="text-neutral-500 font-normal">· {total} 张</span>
            </h2>
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <button
                disabled={page <= 1 || galleryLoading}
                onClick={() => loadGallery(page - 1)}
                className="px-2 py-1 rounded border border-line disabled:opacity-40"
              >
                上一页
              </button>
              <span>
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages || galleryLoading}
                onClick={() => loadGallery(page + 1)}
                className="px-2 py-1 rounded border border-line disabled:opacity-40"
              >
                下一页
              </button>
            </div>
          </div>
          {gallery.length === 0 ? (
            <p className="text-sm text-neutral-500 py-8 text-center">
              {galleryLoading ? '加载中…' : '还没有图片，先生成一张。'}
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {gallery.map((img) => (
                <ImageCard key={img.id} img={img} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
