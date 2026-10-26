import { useState } from 'react'
import { useGenerator } from '@/store/generator'
import SelectionEditor from '@/components/SelectionEditor'
import { builtInStylePresets, purposePresets } from '@/data/presets'
import { takePhoto, pickFromGallery, isCameraCancel } from './cameraInput'
import { isAuxConfigured } from './auxStatus'

// 尺寸枚举沿用桌面 Generator.tsx 的 SIZES，保持可选项一致。
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

// 参考图数量上限：与 store.addRefFiles 的 .slice(0, 16) 保持一致，UI 侧提前卡住并禁用按钮。
const REF_LIMIT = 16

// 优化提示词的三种模式，文案照搬桌面 Generator.tsx。
const OPTIMIZE_MODES = [
  { v: 'conservative', label: '保守优化（保留原意）' },
  { v: 'quality', label: '完整扩写（适合主观描述）' },
  { v: 'continuity', label: '连续性优先' },
]

// 样图分析四种模式，文案照搬桌面。
const ANALYSIS_MODES = [
  { v: 'prompt', label: '提示词' },
  { v: 'keywords', label: '关键词' },
  { v: 'style', label: '风格 DNA' },
  { v: 'scene', label: '场景' },
]

// 风格强度枚举照搬桌面 Generator.tsx 的下拉。
const STRENGTHS = [
  { v: 'low', label: '低强度' },
  { v: 'medium', label: '中强度' },
  { v: 'high', label: '高强度（带样图，可能继承角色）' },
]

// 手机端统一的字段标签样式。
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs text-neutral-400 mb-1.5">{label}</span>
      {children}
    </label>
  )
}

// 折叠区：手机上默认收起，点标题展开。用原生 details/summary，无需额外状态。
function Collapsible({
  title,
  defaultOpen = false,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  return (
    <details open={defaultOpen} className="rounded-2xl border border-line bg-panel/60">
      <summary className="cursor-pointer select-none list-none px-4 py-3.5 text-sm text-neutral-300 flex items-center justify-between">
        <span>{title}</span>
        <span className="text-neutral-500 text-xs transition-transform">▾</span>
      </summary>
      <div className="px-4 pb-4 pt-1 space-y-4">{children}</div>
    </details>
  )
}

// 「先在设置里配辅助 API」引导条：点一下直接打开设置抽屉。优化/分析未配置辅助 API 时替代报错。
function AuxGate({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <button
      onClick={onOpenSettings}
      className="w-full text-left text-xs leading-5 px-3 py-2.5 rounded-xl border border-dashed border-amber-700/50 text-amber-300/90 active:bg-amber-950/30"
    >
      先在设置里配辅助 API（优化提示词 / 样图分析需要对话模型）— 点此去设置
    </button>
  )
}

export default function MobilePromptCard() {
  const form = useGenerator((s) => s.form)
  const setForm = useGenerator((s) => s.setForm)
  const config = useGenerator((s) => s.config)
  const savedStyles = useGenerator((s) => s.savedStyles)
  const settings = useGenerator((s) => s.settings)
  const openSettings = useGenerator((s) => s.openSettings)

  // 参考图：完全复用桌面同款 store 字段/动作（refs 里 dataUrl/url 两种形态，removeRef 按 id 删）。
  const refs = useGenerator((s) => s.refs)
  const addRefFiles = useGenerator((s) => s.addRefFiles)
  const removeRef = useGenerator((s) => s.removeRef)
  const clearRefs = useGenerator((s) => s.clearRefs)
  const generate = useGenerator((s) => s.generate)

  // 优化提示词：走 store.optimize，与生成互斥禁用。
  const optimize = useGenerator((s) => s.optimize)
  const optimizing = useGenerator((s) => s.optimizing)
  const generating = useGenerator((s) => s.generating)

  // 样图分析：全部复用 store 既有 state/actions，不自造。
  const analysisImages = useGenerator((s) => s.analysisImages)
  const analysisMode = useGenerator((s) => s.analysisMode)
  const analysisBusy = useGenerator((s) => s.analysisBusy)
  const analysisResult = useGenerator((s) => s.analysisResult)
  const addAnalysisFiles = useGenerator((s) => s.addAnalysisFiles)
  const removeAnalysisImage = useGenerator((s) => s.removeAnalysisImage)
  const clearAnalysis = useGenerator((s) => s.clearAnalysis)
  const setAnalysisMode = useGenerator((s) => s.setAnalysisMode)
  const runAnalysis = useGenerator((s) => s.runAnalysis)
  const useAnalysisAsPrompt = useGenerator((s) => s.useAnalysisAsPrompt)
  const saveAnalysisAsStyle = useGenerator((s) => s.saveAnalysisAsStyle)

  const [showNegative, setShowNegative] = useState(false)
  const [optimizeMode, setOptimizeMode] = useState('conservative')
  // 取图忙碌标记（拍照/相册取图 + 转 File 期间禁用按钮，避免重复触发）。
  const [refPicking, setRefPicking] = useState(false)
  const [analysisPicking, setAnalysisPicking] = useState(false)
  // 「存为风格」的内嵌小表单：名称 + 强度。
  const [showSaveStyle, setShowSaveStyle] = useState(false)
  const [styleName, setStyleName] = useState('')
  const [styleStrength, setStyleStrength] = useState('medium')
  const [selection, setSelection] = useState<{ source: string; name: string } | null>(null)

  // 输出格式为 jpeg/webp 时才显示压缩，与桌面口径一致。
  const showCompression = form.outputFormat === 'jpeg' || form.outputFormat === 'webp'
  const auxReady = isAuxConfigured(settings)
  // 样图分析：提示词模式限 1 张，其余模式最多 8 张（与 store.addAnalysisFiles 的 8 张上限对齐）。
  const analysisLimit = analysisMode === 'prompt' ? 1 : 8
  const busy = generating || optimizing

  // 拍照/相册 → File[] → 交给 store 既有的 addRefFiles / addAnalysisFiles。
  // remaining 用于把本次选取截断在剩余额度内（相册可能多选），保证不超上限也不越过提示词模式的 1 张。
  async function pickImages(target: 'ref' | 'analysis', source: 'camera' | 'gallery') {
    const remaining =
      target === 'ref' ? REF_LIMIT - refs.length : analysisLimit - analysisImages.length
    if (remaining <= 0) return
    const setPicking = target === 'ref' ? setRefPicking : setAnalysisPicking
    setPicking(true)
    try {
      const files = source === 'camera' ? await takePhoto() : await pickFromGallery(remaining)
      const clamped = files.slice(0, remaining)
      if (clamped.length === 0) return
      if (target === 'ref') await addRefFiles(clamped)
      else await addAnalysisFiles(clamped)
    } catch (e) {
      // 用户取消取图不算错误；其余失败写进 store.error 走顶部通知条。
      if (!isCameraCancel(e)) {
        useGenerator.setState({ error: `取图失败：${(e as Error)?.message || '未知错误'}` })
      }
    } finally {
      setPicking(false)
    }
  }

  // 取图按钮组（拍照 / 相册），供参考图与样图分析共用。达上限时禁用并显示提示。
  function PickButtons({
    target,
    picking,
    atLimit,
  }: {
    target: 'ref' | 'analysis'
    picking: boolean
    atLimit: boolean
  }) {
    return (
      <div className="flex gap-2">
        <button
          disabled={picking || atLimit}
          onClick={() => pickImages(target, 'camera')}
          className="flex-1 min-h-[44px] rounded-xl border border-dashed border-line text-sm text-neutral-300 active:border-accent-soft disabled:opacity-40"
        >
          拍照
        </button>
        <button
          disabled={picking || atLimit}
          onClick={() => pickImages(target, 'gallery')}
          className="flex-1 min-h-[44px] rounded-xl border border-dashed border-line text-sm text-neutral-300 active:border-accent-soft disabled:opacity-40"
        >
          相册
        </button>
      </div>
    )
  }

  // 横向滚动缩略图条，右上角移除钮 ≥32px。参考图与样图分析共用同一渲染。
  function Thumbs({
    items,
    onRemove,
    onEdit,
  }: {
    items: { id: string; name: string; dataUrl?: string; url?: string }[]
    onRemove: (id: string) => void
    onEdit?: (item: { name: string; dataUrl?: string; url?: string }) => void
  }) {
    if (items.length === 0) return null
    return (
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {items.map((r) => (
          <div key={r.id} className="relative shrink-0">
            <img
              src={r.dataUrl || r.url}
              alt={r.name}
              className="w-20 h-20 object-cover rounded-xl border border-line"
            />
            {onEdit && (
              <button
                onClick={() => onEdit(r)}
                className="absolute inset-x-1 bottom-1 min-h-9 rounded-lg bg-black/75 text-[11px] text-white"
              >
                局部修改
              </button>
            )}
            <button
              onClick={() => onRemove(r.id)}
              aria-label="移除"
              // 触控目标 ≥32px：w-8 h-8。
              className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-black/80 border border-line text-neutral-200 text-base leading-none flex items-center justify-center active:bg-black"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 提示词主卡片 */}
      <div className="rounded-2xl border border-line bg-panel/60 p-4 space-y-4">
        <Field label="画面方向">
          <textarea
            value={form.prompt}
            onChange={(e) => setForm({ prompt: e.target.value })}
            placeholder="例如：冷雨夜的霓虹巷弄，一名撑伞行人的背影走向尽头亮着暖灯的门廊，路面积水映出蓝紫色招牌。"
            // 字号 ≥16px 防 iOS 聚焦自动缩放；min-h 约 8 行。
            className="w-full resize-y min-h-[9rem] text-base leading-relaxed"
          />
        </Field>

        {/* 反向提示词默认折叠 */}
        {showNegative ? (
          <Field label="反向提示词">
            <textarea
              value={form.negativePrompt}
              onChange={(e) => setForm({ negativePrompt: e.target.value })}
              placeholder="例如：文字、水印、畸形手、低清晰度"
              className="w-full resize-y min-h-[4.5rem] text-base leading-relaxed"
            />
          </Field>
        ) : (
          <button
            onClick={() => setShowNegative(true)}
            className="text-xs text-neutral-400 active:text-neutral-200"
          >
            + 添加反向提示词
          </button>
        )}

        {/* 优化提示词：模式 + 优化按钮。未配置辅助 API 时显示引导条替代报错。 */}
        <div className="space-y-2">
          <span className="block text-xs text-neutral-400">优化提示词（辅助 API）</span>
          {auxReady ? (
            <>
              <div className="flex gap-2">
                <select
                  value={optimizeMode}
                  onChange={(e) => setOptimizeMode(e.target.value)}
                  className="flex-1 text-base"
                >
                  {OPTIMIZE_MODES.map((m) => (
                    <option key={m.v} value={m.v}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <button
                  disabled={busy || !form.prompt.trim()}
                  onClick={() => optimize(optimizeMode)}
                  className="min-h-[44px] px-4 rounded-xl border border-line text-sm text-neutral-200 active:border-accent-soft disabled:opacity-40 whitespace-nowrap"
                >
                  {optimizing ? '优化中…' : '优化'}
                </button>
              </div>
              <p className="text-[11px] leading-5 text-neutral-500">
                只优化画面内容，不会另加画风；只有情绪或意象时可用「完整扩写」生成一幅具体画面。
              </p>
            </>
          ) : (
            <AuxGate onOpenSettings={openSettings} />
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="用途">
            <select
              value={form.purpose}
              onChange={(e) => setForm({ purpose: e.target.value })}
              className="w-full text-base"
            >
              {Object.entries(purposePresets).map(([k, p]) => (
                <option key={k} value={k}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="风格">
            <select
              value={form.style}
              onChange={(e) => setForm({ style: e.target.value })}
              className="w-full text-base"
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
          </Field>
        </div>
      </div>

      {/* 参考图区：拍照/相册取图，横向缩略图条 + 每张移除钮。达上限禁用按钮并提示。 */}
      <div className="rounded-2xl border border-line bg-panel/60 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-neutral-300">
            参考图 <span className="text-xs text-neutral-500">{refs.length}/{REF_LIMIT}</span>
          </span>
          {refs.length > 0 && (
            <button onClick={clearRefs} className="text-xs text-neutral-500 active:text-neutral-300">
              清空
            </button>
          )}
        </div>
        <PickButtons target="ref" picking={refPicking} atLimit={refs.length >= REF_LIMIT} />
        {refs.length >= REF_LIMIT && (
          <p className="text-[11px] text-neutral-500">已达 {REF_LIMIT} 张上限，删掉几张再加。</p>
        )}
        <Thumbs
          items={refs}
          onRemove={removeRef}
          onEdit={(item) => setSelection({ source: item.dataUrl || item.url || '', name: item.name })}
        />
      </div>

      {/* 样图分析：折叠区。未配置辅助 API 时整段替换为引导条。 */}
      <Collapsible title="样图分析（辅助 API）">
        {auxReady ? (
          <div className="space-y-3">
            <Field label="分析模式">
              <select
                value={analysisMode}
                onChange={(e) => setAnalysisMode(e.target.value)}
                className="w-full text-base"
              >
                {ANALYSIS_MODES.map((m) => (
                  <option key={m.v} value={m.v}>
                    {m.label}
                  </option>
                ))}
              </select>
            </Field>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">
                  样图 <span className="text-neutral-500">{analysisImages.length}/{analysisLimit}</span>
                  {analysisMode === 'prompt' && (
                    <span className="text-neutral-500">（提示词模式限 1 张）</span>
                  )}
                </span>
                {analysisImages.length > 0 && (
                  <button
                    onClick={clearAnalysis}
                    className="text-xs text-neutral-500 active:text-neutral-300"
                  >
                    清空
                  </button>
                )}
              </div>
              <PickButtons
                target="analysis"
                picking={analysisPicking}
                atLimit={analysisImages.length >= analysisLimit}
              />
              <Thumbs items={analysisImages} onRemove={removeAnalysisImage} />
            </div>

            <button
              onClick={runAnalysis}
              disabled={analysisBusy || analysisImages.length === 0}
              className="w-full min-h-[44px] rounded-xl bg-accent active:bg-accent-soft text-white text-sm disabled:opacity-40"
            >
              {analysisBusy ? '分析中…' : '开始分析'}
            </button>

            {analysisResult !== null && (
              <div className="space-y-2">
                {/* 结果可编辑：直接写回 store.analysisResult（复用既有字段，不新增 action），
                    这样「填入提示词 / 存为风格」用的是编辑后的文本。 */}
                <textarea
                  value={analysisResult}
                  onChange={(e) => useGenerator.setState({ analysisResult: e.target.value })}
                  className="w-full resize-y min-h-[8rem] text-base leading-relaxed"
                />
                <div className="flex gap-2">
                  <button
                    onClick={useAnalysisAsPrompt}
                    className="flex-1 min-h-[44px] rounded-xl bg-accent active:bg-accent-soft text-white text-sm"
                  >
                    填入提示词
                  </button>
                  <button
                    onClick={() => {
                      setStyleName('')
                      setStyleStrength('medium')
                      setShowSaveStyle((v) => !v)
                    }}
                    className="flex-1 min-h-[44px] rounded-xl border border-line text-sm text-neutral-200 active:border-accent-soft"
                  >
                    存为风格
                  </button>
                </div>

                {/* 存为风格内嵌表单：名称 + 强度，确认后走 store.saveAnalysisAsStyle。 */}
                {showSaveStyle && (
                  <div className="space-y-2 rounded-xl border border-line bg-ink/40 p-3">
                    <Field label="风格名称">
                      <input
                        value={styleName}
                        onChange={(e) => setStyleName(e.target.value)}
                        placeholder="给这个风格起个名字"
                        className="w-full text-base"
                      />
                    </Field>
                    <Field label="强度">
                      <select
                        value={styleStrength}
                        onChange={(e) => setStyleStrength(e.target.value)}
                        className="w-full text-base"
                      >
                        {STRENGTHS.map((s) => (
                          <option key={s.v} value={s.v}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    {styleStrength === 'high' && (
                      <p className="text-[11px] leading-5 text-amber-300/80">
                        高强度会把样图随风格发送。多张同角色图会强化身份特征，而不只是画法。
                      </p>
                    )}
                    <button
                      onClick={async () => {
                        await saveAnalysisAsStyle(styleName, styleStrength)
                        setShowSaveStyle(false)
                      }}
                      className="w-full min-h-[44px] rounded-xl bg-accent active:bg-accent-soft text-white text-sm"
                    >
                      保存风格
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <AuxGate onOpenSettings={openSettings} />
        )}
      </Collapsible>

      {/* 高级参数折叠 */}
      <Collapsible title="高级参数">
        <div className="grid grid-cols-2 gap-3">
          <Field label="尺寸">
            <select
              value={form.size}
              onChange={(e) => setForm({ size: e.target.value })}
              className="w-full text-base"
            >
              {SIZES.map((s) => (
                <option key={s.v} value={s.v}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="质量">
            <select
              value={form.quality}
              onChange={(e) => setForm({ quality: e.target.value })}
              className="w-full text-base"
            >
              <option value="auto">自动</option>
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
            </select>
          </Field>
          <Field label="数量">
            <select
              value={form.count}
              onChange={(e) => setForm({ count: Number(e.target.value) })}
              className="w-full text-base"
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n} 张
                </option>
              ))}
            </select>
          </Field>
          <Field label="格式">
            <select
              value={form.outputFormat}
              onChange={(e) => setForm({ outputFormat: e.target.value })}
              className="w-full text-base"
            >
              <option value="png">PNG</option>
              <option value="jpeg">JPEG</option>
              <option value="webp">WEBP</option>
            </select>
          </Field>
          <Field label="背景">
            <select
              value={form.background}
              onChange={(e) => setForm({ background: e.target.value })}
              className="w-full text-base"
            >
              <option value="auto">自动</option>
              <option value="opaque">不透明</option>
              <option value="transparent">透明</option>
            </select>
          </Field>
          {showCompression && (
            <Field label={`压缩 ${form.outputCompression}`}>
              <input
                type="range"
                min={0}
                max={100}
                value={form.outputCompression}
                onChange={(e) => setForm({ outputCompression: Number(e.target.value) })}
                className="w-full"
              />
            </Field>
          )}
        </div>
        <Field label="模型（留空用默认）">
          <input
            value={form.model}
            onChange={(e) => setForm({ model: e.target.value })}
            placeholder={config?.defaultModel || 'gpt-image-2'}
            className="w-full text-base"
          />
        </Field>
      </Collapsible>
      {selection && (
        <SelectionEditor
          source={selection.source}
          title={`局部修改：${selection.name}`}
          busy={generating}
          onCancel={() => setSelection(null)}
          onSubmit={(edit) => {
            setSelection(null)
            void generate({
              prompt: edit.prompt,
              referenceImages: [{ name: `${selection.name}.png`, dataUrl: edit.imageDataUrl, source: 'inpaint' }],
              maskDataUrl: edit.maskDataUrl,
            })
          }}
        />
      )}
    </div>
  )
}
