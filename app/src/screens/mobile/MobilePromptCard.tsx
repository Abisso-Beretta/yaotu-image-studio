import { useState } from 'react'
import { useGenerator } from '@/store/generator'
import { builtInStylePresets, purposePresets } from '@/data/presets'

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

export default function MobilePromptCard() {
  const form = useGenerator((s) => s.form)
  const setForm = useGenerator((s) => s.setForm)
  const config = useGenerator((s) => s.config)
  const savedStyles = useGenerator((s) => s.savedStyles)

  const [showNegative, setShowNegative] = useState(false)
  // 输出格式为 jpeg/webp 时才显示压缩，与桌面口径一致。
  const showCompression = form.outputFormat === 'jpeg' || form.outputFormat === 'webp'

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
    </div>
  )
}
