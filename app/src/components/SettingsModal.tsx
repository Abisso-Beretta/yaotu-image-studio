import { useEffect, useState } from 'react'
import { useGenerator } from '@/store/generator'
import { api } from '@/lib/api'
import type {
  AuxiliaryInput,
  AuxiliaryProfile,
  ProfileInput,
  SettingsProfile,
  UpdateStatus,
} from '@/types'

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

function AuxiliarySection() {
  const {
    settings,
    settingsBusy,
    auxModels,
    auxModelsBusy,
    auxModelsError,
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
    <div className="border-t border-line pt-4 space-y-3">
      <div>
        <h3 className="text-sm font-bold text-neutral-200">辅助 API · 优化提示词 / 样图分析</h3>
        <p className="text-[11px] text-neutral-500 mt-0.5">
          这是对话模型（如 gpt-4o-mini / 各家 vision 模型），不是出图模型。优化和样图分析走这里。
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {profiles.map((p) => {
          const active = p.id === activeId
          const sel = p.id === editingId
          return (
            <button
              key={p.id}
              onClick={() => selectProfile(p)}
              className={`text-xs px-3 py-1.5 rounded-full border ${
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
            // 关键：给新建配置分配独立 id，否则后端会回落到当前激活配置 → 覆盖旧配置。
            setForm({ ...EMPTY_AUX, profileId: `aux-${Date.now()}` })
          }}
          className="text-xs px-3 py-1.5 rounded-full border border-dashed border-line text-neutral-400"
        >
          + 新建
        </button>
      </div>

      <label className="block">
        <span className="block text-xs text-neutral-400 mb-1">配置名</span>
        <input className="w-full" value={form.name} onChange={(e) => patch({ name: e.target.value })} />
      </label>

      <label className="flex items-center gap-2 text-sm text-neutral-300">
        <input
          type="checkbox"
          checked={form.useActiveProfile}
          onChange={(e) => patch({ useActiveProfile: e.target.checked })}
        />
        复用当前生图配置的 Key 和地址（省事，但要求该中转也提供对话模型）
      </label>

      {!reuse && (
        <>
          <label className="block">
            <span className="block text-xs text-neutral-400 mb-1">Base URL</span>
            <input
              className="w-full"
              value={form.baseUrl}
              onChange={(e) => patch({ baseUrl: e.target.value })}
              placeholder="https://api.openai.com"
            />
          </label>
          <label className="block">
            <span className="block text-xs text-neutral-400 mb-1">
              API Key{' '}
              {editing?.hasApiKey && (
                <span className="text-neutral-500">（已存 {editing.apiKeyMask}，留空保持不变）</span>
              )}
            </span>
            <input
              className="w-full"
              type="password"
              value={form.apiKey}
              onChange={(e) => patch({ apiKey: e.target.value })}
              placeholder={editing?.hasApiKey ? '••••（不改就留空）' : 'sk-...'}
            />
          </label>
        </>
      )}

      <label className="block">
        <span className="block text-xs text-neutral-400 mb-1">对话模型</span>
        <div className="flex gap-2">
          <input
            className="flex-1"
            value={form.model}
            onChange={(e) => patch({ model: e.target.value })}
            placeholder="gpt-4o-mini"
          />
          <button
            disabled={auxModelsBusy}
            onClick={() =>
              listAuxModels({
                useActiveProfile: form.useActiveProfile,
                apiKey: form.apiKey || undefined,
                baseUrl: form.baseUrl,
              })
            }
            className="px-3 py-2 rounded-lg border border-line text-sm text-neutral-200 hover:border-accent-soft disabled:opacity-40 whitespace-nowrap"
          >
            {auxModelsBusy ? '拉取中…' : '拉取模型'}
          </button>
        </div>
        {auxModels.length > 0 && (
          <select
            className="w-full mt-2"
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

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          disabled={settingsBusy || !form.name.trim()}
          onClick={submit}
          className="text-sm px-4 py-2 rounded-lg bg-accent hover:bg-accent-soft text-white disabled:opacity-40"
        >
          保存并设为当前
        </button>
        {editing && editingId !== activeId && (
          <button
            disabled={settingsBusy}
            onClick={() => setActiveAuxiliary(editing.id)}
            className="text-sm px-4 py-2 rounded-lg border border-line text-neutral-200"
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
            className="text-sm px-4 py-2 rounded-lg border border-red-900/60 text-red-300 ml-auto"
          >
            删除
          </button>
        )}
      </div>
    </div>
  )
}

function UpdateSection() {
  const version = useGenerator((s) => s.config?.version)
  const [status, setStatus] = useState<UpdateStatus | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.getUpdateStatus().then(setStatus).catch(() => {})
  }, [])

  async function check() {
    setBusy(true)
    try {
      setStatus(await api.checkUpdate())
    } catch (e) {
      setStatus({ enabled: false, status: 'error', message: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }

  const enabled = status?.enabled
  let line = ''
  let tone = 'text-neutral-400'
  switch (status?.status) {
    case 'available':
      line = `发现新版 ${status.availableVersion || ''}——桌面版会弹窗引导下载安装。`
      tone = 'text-emerald-300'
      break
    case 'downloaded':
      line = `新版 ${status.availableVersion || ''} 已下载，重启即安装。`
      tone = 'text-emerald-300'
      break
    case 'not-available':
      line = '已是最新版。'
      tone = 'text-emerald-300'
      break
    case 'checking':
      line = '检查中…'
      break
    case 'error':
      line = `检查失败：${status.message || status.error || '未知错误'}`
      tone = 'text-red-300'
      break
    case 'disabled':
    default:
      line = enabled ? '' : '网页版不检测更新——请在桌面版里检查/更新。更新推送已接 GitHub Releases。'
      tone = 'text-neutral-500'
  }

  return (
    <div className="border-t border-line pt-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-200">关于 · 更新</h3>
        <span className="text-xs text-neutral-500">当前版本 v{version || status?.version || '—'}</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={check}
          disabled={busy || !enabled}
          title={enabled ? '' : '仅桌面版可检查更新'}
          className="text-sm px-4 py-2 rounded-lg border border-line text-neutral-200 hover:border-accent-soft disabled:opacity-40"
        >
          {busy ? '检查中…' : '检查更新'}
        </button>
        {line && <span className={`text-xs ${tone}`}>{line}</span>}
      </div>
    </div>
  )
}

export default function SettingsModal() {
  const {
    settings,
    settingsOpen,
    settingsBusy,
    testResult,
    closeSettings,
    saveProfile,
    setActiveProfile,
    removeProfile,
    testConnection,
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

  useEffect(() => {
    if (!settingsOpen || !settings) return
    const active =
      settings.profiles.find((p) => p.id === settings.activeProfileId) || settings.profiles[0]
    if (active && editingId === null) selectProfile(active)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsOpen, settings])

  if (!settingsOpen) return null

  const patch = (x: Partial<ProfileInput>) => setForm((f) => ({ ...f, ...x }))
  const editing = settings?.profiles.find((p) => p.id === editingId)

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={closeSettings}
    >
      <div
        className="bg-ink border border-line rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-neutral-100">API 接入</h2>
          <button className="text-neutral-400 hover:text-neutral-200" onClick={closeSettings}>
            ✕
          </button>
        </div>

        {/* 配置列表 */}
        <div className="flex flex-wrap gap-2">
          {settings?.profiles.map((p) => {
            const active = p.id === settings.activeProfileId
            const sel = p.id === editingId
            return (
              <button
                key={p.id}
                onClick={() => selectProfile(p)}
                className={`text-xs px-3 py-1.5 rounded-full border ${
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
            className="text-xs px-3 py-1.5 rounded-full border border-dashed border-line text-neutral-400"
          >
            + 新建
          </button>
        </div>

        {/* 编辑表单 */}
        <div className="space-y-3">
          <label className="block">
            <span className="block text-xs text-neutral-400 mb-1">配置名</span>
            <input
              className="w-full"
              value={form.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="例如：球球"
            />
          </label>
          <label className="block">
            <span className="block text-xs text-neutral-400 mb-1">
              API Key {editing?.hasApiKey && <span className="text-neutral-500">（已存 {editing.apiKeyMask}，留空保持不变）</span>}
            </span>
            <input
              className="w-full"
              type="password"
              value={form.apiKey}
              onChange={(e) => patch({ apiKey: e.target.value })}
              placeholder={editing?.hasApiKey ? '••••（不改就留空）' : 'sk-...'}
            />
          </label>
          <label className="block">
            <span className="block text-xs text-neutral-400 mb-1">Base URL（中转填中转地址，带不带 /v1 都行）</span>
            <input
              className="w-full"
              value={form.baseUrl}
              onChange={(e) => patch({ baseUrl: e.target.value })}
              placeholder="https://api.openai.com"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs text-neutral-400 mb-1">出图模型</span>
              <input
                className="w-full"
                value={form.imageModel}
                onChange={(e) => patch({ imageModel: e.target.value })}
                placeholder="gpt-image-2"
              />
            </label>
            <label className="block">
              <span className="block text-xs text-neutral-400 mb-1">生图接口</span>
              <select
                className="w-full"
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
          </div>
        </div>

        {/* 测试结果 */}
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

        {/* 操作 */}
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            disabled={settingsBusy}
            onClick={() =>
              testConnection({
                profileId: form.profileId,
                apiKey: form.apiKey || undefined,
                baseUrl: form.baseUrl,
              })
            }
            className="text-sm px-4 py-2 rounded-lg border border-line text-neutral-200 disabled:opacity-40"
          >
            测试连接
          </button>
          <button
            disabled={settingsBusy || !form.name.trim()}
            onClick={() => saveProfile(form)}
            className="text-sm px-4 py-2 rounded-lg bg-accent hover:bg-accent-soft text-white disabled:opacity-40"
          >
            保存并设为当前
          </button>
          {editing && editingId !== settings?.activeProfileId && (
            <button
              disabled={settingsBusy}
              onClick={() => setActiveProfile(editing.id)}
              className="text-sm px-4 py-2 rounded-lg border border-line text-neutral-200"
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
              className="text-sm px-4 py-2 rounded-lg border border-red-900/60 text-red-300 ml-auto"
            >
              删除
            </button>
          )}
        </div>

        <AuxiliarySection />

        <UpdateSection />
      </div>
    </div>
  )
}
