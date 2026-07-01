import { useEffect, useState } from 'react'
import { useGenerator } from '@/store/generator'
import Generator from '@/screens/Generator'
import Workbench from '@/screens/Workbench'
import SettingsModal from '@/components/SettingsModal'

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
  const [view, setView] = useState<View>('generate')

  useEffect(() => {
    loadConfig()
    loadGallery(1)
  }, [loadConfig, loadGallery])

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
    <div className="h-full flex flex-col">
      <header className="flex items-center justify-between px-6 py-3 border-b border-line">
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
      <main className="flex-1 min-h-0">{view === 'generate' ? <Generator /> : <Workbench />}</main>
      <SettingsModal />
    </div>
  )
}
