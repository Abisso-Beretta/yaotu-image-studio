import { useEffect, useState } from 'react'
import { useGenerator } from '@/store/generator'
import { useTheme, type BackgroundTheme } from '@/store/theme'
import type { ProfileInput, SettingsProfile } from '@/types'

// 生图接口模式，与桌面 SettingsModal 保持一致。
const ENDPOINT_MODES = [
  { v: 'images', label: 'Images API（标准）' },
  { v: 'chat', label: '聊天兼容（中转）' },
  { v: 'responses', label: 'Responses' },
]

const EMPTY: ProfileInput = {
  name: '',
  apiKey: '',
  baseUrl: 'https://api.openai.com',
  imageModel: 'gpt-image-2',
  endpointMode: 'images',
}

// 主题色圆点，沿用桌面 App.tsx 的 THEME_SWATCHES。
const THEME_SWATCHES: Array<{ key: BackgroundTheme; label: string; swatch: string }> = [
  { key: 'white', label: '白', swatch: '#eef1f5' },
  { key: 'pink', label: '粉', swatch: '#f3c9d3' },
  { key: 'purple', label: '紫', swatch: '#c9b8e6' },
  { key: 'green', label: '绿', swatch: '#b9d0c4' },
  { key: 'black', label: '黑金', swatch: '#14161f' },
]

function ThemeSwatches() {
  const backgroundTheme = useTheme((s) => s.backgroundTheme)
  const setBackgroundTheme = useTheme((s) => s.setBackgroundTheme)
  return (
    <div className="flex items-center flex-wrap gap-3">
      {THEME_SWATCHES.map((t) => (
        <button
          key={t.key}
          onClick={() => setBackgroundTheme(t.key)}
          aria-label={t.label}
          className={`w-9 h-9 rounded-full border-2 ${
            backgroundTheme === t.key ? 'border-white ring-2 ring-white/40' : 'border-white/25'
          }`}
          style={{ backgroundColor: t.swatch }}
        />
      ))}
      <button
        onClick={() => setBackgroundTheme('none')}
        className={`min-h-[36px] px-3 rounded-full border text-xs ${
          backgroundTheme === 'none'
            ? 'border-white/70 text-neutral-100'
            : 'border-white/20 text-neutral-400'
        }`}
      >
        关闭背景
      </button>
    </div>
  )
}

export default function MobileSettingsDrawer() {
  const {
    config,
    settings,
    settingsBusy,
    testResult,
    closeSettings,
    saveProfile,
    setActiveProfile,
    removeProfile,
    testConnection,
    imageModels,
    imageModelsBusy,
    imageModelsError,
    listImageModels,
  } = useGenerator()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ProfileInput>(EMPTY)

  function selectProfile(p: SettingsProfile) {
    setEditingId(p.id)
    setForm({
      profileId: p.id,
      name: p.name,
      apiKey: '',
      baseUrl: p.baseUrl,
      imageModel: p.imageModel,
      endpointMode: p.endpointMode,
    })
  }

  // 首次载入 settings 时，把当前激活配置填进编辑表单（与桌面 SettingsModal 同逻辑）。
  useEffect(() => {
    if (!settings) return
    const active =
      settings.profiles.find((p) => p.id === settings.activeProfileId) || settings.profiles[0]
    if (active && editingId === null) selectProfile(active)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings])

  const patch = (x: Partial<ProfileInput>) => setForm((f) => ({ ...f, ...x }))
  const editing = settings?.profiles.find((p) => p.id === editingId)

  return (
    <div className="fixed inset-0 z-50 bg-black/60" onClick={closeSettings}>
      {/* 底部滑出的全屏面板 */}
      <div
        className="absolute inset-x-0 bottom-0 top-10 rounded-t-2xl bg-ink border-t border-line flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b border-line"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 4px)' }}
        >
          <h2 className="text-lg font-bold text-neutral-100">设置</h2>
          <button
            onClick={closeSettings}
            aria-label="关闭"
            className="w-11 h-11 -mr-2 flex items-center justify-center text-2xl leading-none text-neutral-400 active:text-neutral-100"
          >
            ×
          </button>
        </div>

        <div
          className="flex-1 overflow-y-auto px-4 py-4 space-y-5"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}
        >
          {/* —— API 接入 —— */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-neutral-200">API 接入</h3>

            {/* 配置切换 */}
            <div className="flex flex-wrap gap-2">
              {settings?.profiles.map((p) => {
                const active = p.id === settings.activeProfileId
                const sel = p.id === editingId
                return (
                  <button
                    key={p.id}
                    onClick={() => selectProfile(p)}
                    className={`min-h-[36px] text-xs px-3 rounded-full border ${
                      sel ? 'border-accent-soft text-neutral-100' : 'border-line text-neutral-400'
                    }`}
                  >
                    {active && <span className="text-emerald-400">● </span>}
                    {p.name}
                  </button>
                )
              })}
              <button
                onClick={() => {
                  setEditingId(null)
                  setForm({ ...EMPTY })
                }}
                className="min-h-[36px] text-xs px-3 rounded-full border border-dashed border-line text-neutral-400"
              >
                + 新建
              </button>
            </div>

            <label className="block">
              <span className="block text-xs text-neutral-400 mb-1.5">配置名</span>
              <input
                className="w-full text-base"
                value={form.name}
                onChange={(e) => patch({ name: e.target.value })}
                placeholder="例如：球球"
              />
            </label>

            <label className="block">
              <span className="block text-xs text-neutral-400 mb-1.5">
                API Key{' '}
                {editing?.hasApiKey && (
                  <span className="text-neutral-500">（已存 {editing.apiKeyMask}，留空不改）</span>
                )}
              </span>
              <input
                className="w-full text-base"
                type="password"
                value={form.apiKey}
                onChange={(e) => patch({ apiKey: e.target.value })}
                placeholder={editing?.hasApiKey ? '••••（不改就留空）' : 'sk-...'}
              />
            </label>

            <label className="block">
              <span className="block text-xs text-neutral-400 mb-1.5">Base URL（中转填中转地址）</span>
              <input
                className="w-full text-base"
                value={form.baseUrl}
                onChange={(e) => patch({ baseUrl: e.target.value })}
                placeholder="https://api.openai.com"
              />
            </label>

            <label className="block">
              <span className="block text-xs text-neutral-400 mb-1.5">出图模型</span>
              <div className="flex gap-2">
                <input
                  className="flex-1 text-base"
                  value={form.imageModel}
                  onChange={(e) => patch({ imageModel: e.target.value })}
                  placeholder="gpt-image-2"
                />
                <button
                  disabled={imageModelsBusy}
                  onClick={() =>
                    listImageModels({
                      profileId: form.profileId,
                      apiKey: form.apiKey || undefined,
                      baseUrl: form.baseUrl,
                    })
                  }
                  className="min-h-[44px] px-3 rounded-lg border border-line text-sm text-neutral-200 active:border-accent-soft disabled:opacity-40 whitespace-nowrap"
                >
                  {imageModelsBusy ? '拉取中…' : '拉取模型'}
                </button>
              </div>
              {imageModels.length > 0 && (
                <select
                  className="w-full mt-2 text-base"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) patch({ imageModel: e.target.value })
                  }}
                >
                  <option value="">— 从拉取结果选择（共 {imageModels.length} 个）—</option>
                  {imageModels.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              )}
              {imageModelsError && <p className="text-[11px] text-red-400 mt-1">{imageModelsError}</p>}
            </label>

            <label className="block">
              <span className="block text-xs text-neutral-400 mb-1.5">生图接口</span>
              <select
                className="w-full text-base"
                value={form.endpointMode}
                onChange={(e) => patch({ endpointMode: e.target.value })}
              >
                {ENDPOINT_MODES.map((m) => (
                  <option key={m.v} value={m.v}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>

            {testResult && (
              <div
                className={`text-xs px-3 py-2 rounded-lg border ${
                  testResult.ok
                    ? 'text-emerald-300 border-emerald-900/60 bg-emerald-950/20'
                    : 'text-red-300 border-red-900/60 bg-red-950/30'
                }`}
              >
                {testResult.ok
                  ? `连接成功${testResult.modelCount ? ` · 可见 ${testResult.modelCount} 个模型` : ''}`
                  : `连接失败：${testResult.error || '未知错误'}`}
                {testResult.hint && <div className="text-neutral-500 mt-1">{testResult.hint}</div>}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                disabled={settingsBusy}
                onClick={() =>
                  testConnection({
                    profileId: form.profileId,
                    apiKey: form.apiKey || undefined,
                    baseUrl: form.baseUrl,
                  })
                }
                className="min-h-[44px] px-4 rounded-lg border border-line text-sm text-neutral-200 disabled:opacity-40"
              >
                测试连接
              </button>
              <button
                disabled={settingsBusy || !form.name.trim()}
                onClick={() => saveProfile(form)}
                className="min-h-[44px] px-4 rounded-lg bg-accent active:bg-accent-soft text-white text-sm disabled:opacity-40"
              >
                保存并设为当前
              </button>
              {editing && editingId !== settings?.activeProfileId && (
                <button
                  disabled={settingsBusy}
                  onClick={() => setActiveProfile(editing.id)}
                  className="min-h-[44px] px-4 rounded-lg border border-line text-sm text-neutral-200"
                >
                  设为当前
                </button>
              )}
              {editing && (settings?.profiles.length || 0) > 1 && (
                <button
                  disabled={settingsBusy}
                  onClick={() => {
                    if (confirm(`删除配置「${editing.name}」？`)) {
                      removeProfile(editing.id)
                      setEditingId(null)
                      setForm({ ...EMPTY })
                    }
                  }}
                  className="min-h-[44px] px-4 rounded-lg border border-red-900/60 text-red-300 text-sm ml-auto"
                >
                  删除
                </button>
              )}
            </div>
          </section>

          {/* —— 背景主题 —— */}
          <section className="border-t border-line pt-4 space-y-3">
            <h3 className="text-sm font-bold text-neutral-200">背景主题</h3>
            <ThemeSwatches />
          </section>

          {/* —— 关于 —— */}
          <section className="border-t border-line pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-neutral-200">关于</h3>
              <span className="text-xs text-neutral-500">妖荼手机版 v{config?.version || '—'}</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
