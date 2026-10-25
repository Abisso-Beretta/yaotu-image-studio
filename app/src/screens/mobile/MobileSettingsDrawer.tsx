import { useEffect, useState } from 'react'
import { App } from '@capacitor/app'
import { useGenerator } from '@/store/generator'
import { useTheme, type BackgroundTheme } from '@/store/theme'
import { checkForUpdate, type UpdateCheckResult } from '@/mobile/updateCheck'
import type { AuxiliaryInput, AuxiliaryProfile, ProfileInput, SettingsProfile } from '@/types'

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

// 辅助 API 编辑表单形状，与桌面 SettingsModal.AuxForm 一致。
interface AuxForm {
  profileId?: string
  name: string
  useActiveProfile: boolean
  baseUrl: string
  apiKey: string
  model: string
}

const EMPTY_AUX: AuxForm = {
  name: '辅助 API',
  useActiveProfile: true,
  baseUrl: 'https://api.openai.com',
  apiKey: '',
  model: 'gpt-4o-mini',
}

// 辅助 API 设置区：优化提示词 / 样图分析用的对话模型。仿桌面 SettingsModal.AuxiliarySection，
// 复用 store 的辅助配置 actions（testAuxiliary/saveAuxiliary/setActiveAuxiliary/removeAuxiliary/listAuxModels），
// 不自造逻辑，只换成手机端触控尺寸与分组样式。
function AuxiliarySection() {
  const {
    settings,
    settingsBusy,
    auxModels,
    auxModelsBusy,
    auxModelsError,
    auxTestResult,
    auxTestBusy,
    testAuxiliary,
    saveAuxiliary,
    setActiveAuxiliary,
    removeAuxiliary,
    listAuxModels,
  } = useGenerator()

  const profiles = settings?.auxiliaryProfiles || []
  const activeId = settings?.activeAuxiliaryProfileId
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<AuxForm>(EMPTY_AUX)

  function selectProfile(p: AuxiliaryProfile) {
    setEditingId(p.id)
    setForm({
      profileId: p.id,
      name: p.name,
      useActiveProfile: p.useActiveProfile,
      baseUrl: p.baseUrl,
      apiKey: '',
      model: p.model,
    })
  }

  // 首次载入把当前激活辅助配置填进表单，与桌面同逻辑。
  useEffect(() => {
    if (!settings) return
    const active = profiles.find((p) => p.id === activeId) || profiles[0]
    if (active && editingId === null) selectProfile(active)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings])

  const patch = (x: Partial<AuxForm>) => setForm((f) => ({ ...f, ...x }))
  const editing = profiles.find((p) => p.id === editingId)
  const reuse = form.useActiveProfile

  const submit = () => {
    const input: AuxiliaryInput = {
      profileId: form.profileId,
      name: form.name.trim() || '辅助 API',
      useActiveProfile: form.useActiveProfile,
      baseUrl: form.baseUrl,
      model: form.model.trim() || 'gpt-4o-mini',
      apiKey: form.apiKey || undefined,
      setActive: true,
    }
    saveAuxiliary(input)
  }

  return (
    <section className="border-t border-line pt-4 space-y-3">
      <div>
        <h3 className="text-sm font-bold text-neutral-200">辅助 API · 优化提示词 / 样图分析</h3>
        <p className="text-[11px] text-neutral-500 mt-0.5">
          这是对话模型（如 gpt-4o-mini / 各家 vision 模型），不是出图模型。优化和样图分析走这里。
        </p>
      </div>

      {/* 配置切换 */}
      <div className="flex flex-wrap gap-2">
        {profiles.map((p) => {
          const active = p.id === activeId
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
            // 给新建配置分配独立 id，否则后端回落到当前激活配置 → 覆盖旧配置（与桌面同注）。
            setForm({ ...EMPTY_AUX, profileId: `aux-${Date.now()}` })
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
        />
      </label>

      <label className="flex items-start gap-2 text-sm text-neutral-300">
        <input
          type="checkbox"
          className="mt-1"
          checked={form.useActiveProfile}
          onChange={(e) => patch({ useActiveProfile: e.target.checked })}
        />
        <span>复用当前生图配置的 Key 和地址（省事，但要求该中转也提供对话模型）</span>
      </label>

      {!reuse && (
        <>
          <label className="block">
            <span className="block text-xs text-neutral-400 mb-1.5">Base URL</span>
            <input
              className="w-full text-base"
              value={form.baseUrl}
              onChange={(e) => patch({ baseUrl: e.target.value })}
              placeholder="https://api.openai.com"
            />
          </label>
          <label className="block">
            <span className="block text-xs text-neutral-400 mb-1.5">
              API Key{' '}
              {editing?.hasApiKey && (
                <span className="text-neutral-500">（已存 {editing.apiKeyMask}，留空保持不变）</span>
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
        </>
      )}

      <label className="block">
        <span className="block text-xs text-neutral-400 mb-1.5">对话模型</span>
        <div className="flex gap-2">
          <input
            className="flex-1 text-base"
            value={form.model}
            onChange={(e) => patch({ model: e.target.value })}
            placeholder="gpt-4o-mini"
          />
          <button
            disabled={auxModelsBusy}
            onClick={() =>
              listAuxModels({
                profileId: form.profileId,
                useActiveProfile: form.useActiveProfile,
                apiKey: form.apiKey || undefined,
                baseUrl: form.baseUrl,
              })
            }
            className="min-h-[44px] px-3 rounded-lg border border-line text-sm text-neutral-200 active:border-accent-soft disabled:opacity-40 whitespace-nowrap"
          >
            {auxModelsBusy ? '拉取中…' : '拉取模型'}
          </button>
        </div>
        {auxModels.length > 0 && (
          <select
            className="w-full mt-2 text-base"
            value=""
            onChange={(e) => {
              if (e.target.value) patch({ model: e.target.value })
            }}
          >
            <option value="">— 从拉取结果选择（共 {auxModels.length} 个）—</option>
            {auxModels.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        )}
        {auxModelsError && <p className="text-[11px] text-red-400 mt-1">{auxModelsError}</p>}
      </label>

      {auxTestResult && (
        <div
          className={`text-xs px-3 py-2 rounded-lg border ${
            auxTestResult.ok
              ? 'text-emerald-300 border-emerald-900/60 bg-emerald-950/20'
              : 'text-red-300 border-red-900/60 bg-red-950/30'
          }`}
        >
          {auxTestResult.ok
            ? `连接成功${auxTestResult.model ? ` · 模型 ${auxTestResult.model}` : ''}${
                auxTestResult.text ? ` · 回声「${auxTestResult.text}」` : ''
              }`
            : `连接失败：${auxTestResult.error || '未知错误'}`}
          {auxTestResult.hint && <div className="text-neutral-500 mt-1">{auxTestResult.hint}</div>}
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          disabled={auxTestBusy || settingsBusy}
          onClick={() =>
            testAuxiliary({
              profileId: form.profileId,
              useActiveProfile: form.useActiveProfile,
              apiKey: form.apiKey || undefined,
              baseUrl: form.baseUrl,
              model: form.model.trim() || undefined,
            })
          }
          className="min-h-[44px] px-4 rounded-lg border border-line text-sm text-neutral-200 disabled:opacity-40"
        >
          {auxTestBusy ? '测试中…' : '测试连接'}
        </button>
        <button
          disabled={settingsBusy || !form.name.trim()}
          onClick={submit}
          className="min-h-[44px] px-4 rounded-lg bg-accent active:bg-accent-soft text-white text-sm disabled:opacity-40"
        >
          保存并设为当前
        </button>
        {editing && editingId !== activeId && (
          <button
            disabled={settingsBusy}
            onClick={() => setActiveAuxiliary(editing.id)}
            className="min-h-[44px] px-4 rounded-lg border border-line text-sm text-neutral-200"
          >
            设为当前
          </button>
        )}
        {editing && profiles.length > 1 && (
          <button
            disabled={settingsBusy}
            onClick={() => {
              if (confirm(`删除辅助配置「${editing.name}」？`)) {
                removeAuxiliary(editing.id)
                setEditingId(null)
                setForm({ ...EMPTY_AUX, profileId: `aux-${Date.now()}` })
              }
            }}
            className="min-h-[44px] px-4 rounded-lg border border-red-900/60 text-red-300 text-sm ml-auto"
          >
            删除
          </button>
        )}
      </div>
    </section>
  )
}

// 关于区：显示当前版本（App.getInfo 的 versionName）+ 手动「检查更新」。
// 不做启动自动检查——用户网络连 GitHub 不稳，纯手动触发，避免开设置就卡一下。
function AboutSection() {
  const [version, setVersion] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<UpdateCheckResult | null>(null)

  // 首帧异步取真实 versionName（App.getInfo 是 Promise）；取不到就留空，显示「—」。
  useEffect(() => {
    let alive = true
    App.getInfo()
      .then((info) => {
        if (alive) setVersion(String(info?.version || '').trim())
      })
      .catch(() => {
        // 桌面/浏览器预览里没有原生 App 插件，getInfo 会 reject——保持空串即可。
      })
    return () => {
      alive = false
    }
  }, [])

  const runCheck = async () => {
    setBusy(true)
    setResult(null)
    try {
      const r = await checkForUpdate()
      setResult(r)
      // 检查结果里带回的 current（versionName）比首帧更权威，回填一下。
      if (r.current) setVersion(r.current)
    } catch {
      // checkForUpdate 内部已兜住所有异常并回 status:'error'，这里是双保险。
      setResult({ status: 'error', current: version, message: '检查更新失败，稍后再试' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="border-t border-line pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-neutral-200">关于</h3>
        <span className="text-xs text-neutral-500">妖荼手机版 v{version || '—'}</span>
      </div>

      <div className="flex items-center gap-3">
        <button
          disabled={busy}
          onClick={runCheck}
          className="min-h-[44px] px-4 rounded-lg border border-line text-sm text-neutral-200 active:border-accent-soft disabled:opacity-40"
        >
          {busy ? '检查中…' : '检查更新'}
        </button>
        {/* 已是最新：行内绿字 */}
        {result?.status === 'latest' && (
          <span className="text-xs text-emerald-400">已是最新 v{result.latest || version || '—'}</span>
        )}
        {/* 出错：行内红字友好文案 */}
        {result?.status === 'error' && (
          <span className="text-xs text-red-400">{result.message || '检查更新失败，稍后再试'}</span>
        )}
      </div>

      {/* 有更新：新版本号 + 更新说明（可滚动小区域）+ 去下载 */}
      {result?.status === 'update' && (
        <div className="rounded-lg border border-accent-soft/60 bg-accent/5 p-3 space-y-2">
          <div className="text-sm text-neutral-100">
            发现新版本 <span className="font-bold text-accent-soft">v{result.latest}</span>
            <span className="text-neutral-500"> · 当前 v{result.current || version || '—'}</span>
          </div>
          {result.notes && (
            <div className="max-h-32 overflow-y-auto rounded bg-black/20 p-2 text-[11px] leading-relaxed text-neutral-300 whitespace-pre-wrap">
              {result.notes}
            </div>
          )}
          <button
            onClick={() => {
              // Capacitor 6 Android：WebView 未开 setSupportMultipleWindows，window.open 到外部 http(s)
              // 会走 shouldOverrideUrlLoading → Bridge.launchIntent → 系统 ACTION_VIEW（外部浏览器/下载器）。
              // 见报告：无需 @capacitor/browser 插件。
              if (result.apkUrl) window.open(result.apkUrl, '_blank')
            }}
            className="min-h-[44px] w-full rounded-lg bg-accent active:bg-accent-soft text-white text-sm"
          >
            去下载
          </button>
          {result.htmlUrl && (
            <button
              onClick={() => window.open(result.htmlUrl, '_blank')}
              className="text-[11px] text-neutral-500 underline"
            >
              打开 Release 页面
            </button>
          )}
        </div>
      )}
    </section>
  )
}

export default function MobileSettingsDrawer() {
  const {
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
                  setForm({ ...EMPTY, profileId: `profile-${Date.now()}` })
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

          {/* —— 辅助 API —— */}
          <AuxiliarySection />

          {/* —— 背景主题 —— */}
          <section className="border-t border-line pt-4 space-y-3">
            <h3 className="text-sm font-bold text-neutral-200">背景主题</h3>
            <ThemeSwatches />
          </section>

          {/* —— 关于 —— */}
          <AboutSection />
        </div>
      </div>
    </div>
  )
}
