import { useEffect, useLayoutEffect, useState } from 'react'
import { useGenerator } from '@/store/generator'
import { useTheme, type BackgroundTheme } from '@/store/theme'
import Generator from '@/screens/Generator'
import Workbench from '@/screens/Workbench'
import SettingsModal from '@/components/SettingsModal'

const THEME_SWATCHES: Array<{ key: BackgroundTheme; label: string; swatch: string }> = [
  { key: 'white', label: '白', swatch: '#eef1f5' },
  { key: 'pink', label: '粉', swatch: '#f3c9d3' },
  { key: 'purple', label: '紫', swatch: '#c9b8e6' },
  { key: 'green', label: '绿', swatch: '#b9d0c4' },
  { key: 'black', label: '黑金', swatch: '#14161f' },
]

function ThemePicker() {
  const backgroundTheme = useTheme((s) => s.backgroundTheme)
  const setBackgroundTheme = useTheme((s) => s.setBackgroundTheme)
  return (
    <div className="flex items-center gap-1.5" title="主题背景">
      {THEME_SWATCHES.map((t) => (
        <button
          key={t.key}
          onClick={() => setBackgroundTheme(t.key)}
          title={t.label}
          className={`w-4 h-4 rounded-full border ${
            backgroundTheme === t.key ? 'border-white ring-2 ring-white/50' : 'border-white/30'
          }`}
          style={{ backgroundColor: t.swatch }}
        />
      ))}
      <button
        onClick={() => setBackgroundTheme('none')}
        title="关闭背景"
        className={`text-[11px] px-1.5 py-0.5 rounded border ${
          backgroundTheme === 'none'
            ? 'border-white/70 text-neutral-100'
            : 'border-white/20 text-neutral-500 hover:text-neutral-300'
        }`}
      >
        关闭
      </button>
    </div>
  )
}

function StatusPill() {
  const { config, configError } = useGenerator()
  let text = '检查配置中…'
  let tone = 'text-neutral-400 border-line'
  if (configError) {
    text = '后端未连接'
    tone = 'text-red-300 border-red-900/60'
  } else if (config) {
    text = config.hasApiKey ? `API 已配置 · ${config.activeProfileName}` : '未配置 API Key'
    tone = config.hasApiKey
      ? 'text-emerald-300 border-emerald-900/60'
      : 'text-amber-300 border-amber-900/60'
  }
  return <span className={`text-xs px-3 py-1.5 rounded-full border ${tone}`}>{text}</span>
}

type View = 'generate' | 'workbench'

export default function App() {
  const loadConfig = useGenerator((s) => s.loadConfig)
  const loadGallery = useGenerator((s) => s.loadGallery)
  const openSettings = useGenerator((s) => s.openSettings)
  const version = useGenerator((s) => s.config?.version)
  const backgroundTheme = useTheme((s) => s.backgroundTheme)
  const loadTheme = useTheme((s) => s.loadTheme)
  const [view, setView] = useState<View>('generate')

  useEffect(() => {
    loadConfig()
    loadGallery(1)
    loadTheme()
  }, [loadConfig, loadGallery, loadTheme])

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = backgroundTheme
  }, [backgroundTheme])

  const tab = (v: View, label: string) => (
    <button
      onClick={() => setView(v)}
      className={`text-xs px-3 py-1.5 rounded-lg border ${
        view === v
          ? 'border-accent-soft text-neutral-100 bg-accent/15'
          : 'border-line text-neutral-400 hover:text-neutral-200'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="h-full relative">
      {backgroundTheme !== 'none' && (
        <div
          className="fixed inset-0 -z-10 bg-cover bg-center"
          style={{ backgroundImage: `url(${import.meta.env.BASE_URL}backgrounds/${backgroundTheme}.png)` }}
        />
      )}
      <div className="h-full flex flex-col p-3 sm:p-4 gap-3">
        <header className="flex items-center justify-between px-6 py-3 rounded-xl border border-white/10 bg-black/30 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-neutral-100">妖荼</h1>
            {version && (
              <span className="text-[11px] text-neutral-500" title="当前版本">
                v{version}
              </span>
            )}
            <div className="flex items-center gap-1.5">
              {tab('generate', '纯生图')}
              {tab('workbench', '漫剧工作台')}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemePicker />
            <a
              href="/"
              className="text-xs text-neutral-500 hover:text-neutral-300"
              title="旧版界面（提示词库 / 样图分析等尚未迁移的功能）"
            >
              旧版
            </a>
            <button
              onClick={openSettings}
              className="text-xs px-3 py-1.5 rounded-lg border border-line text-neutral-300 hover:text-neutral-100"
            >
              设置
            </button>
            <StatusPill />
          </div>
        </header>
        <main className="flex-1 min-h-0 rounded-2xl border border-line bg-ink/45 backdrop-blur-md shadow-2xl overflow-hidden flex flex-col">
          {view === 'generate' ? <Generator /> : <Workbench />}
        </main>
      </div>
      <SettingsModal />
    </div>
  )
}
