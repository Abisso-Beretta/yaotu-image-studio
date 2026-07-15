import { useGenerator } from '@/store/generator'

// API 状态小圆点：已配置绿 / 未配置（或后端异常）红 / 检查中灰。
// 复用 store 的 config、configError，与桌面 StatusPill 判定口径一致，只是收敛成一个圆点。
function StatusDot() {
  const config = useGenerator((s) => s.config)
  const configError = useGenerator((s) => s.configError)
  let tone = 'bg-neutral-500'
  let title = '检查配置中…'
  if (configError) {
    tone = 'bg-red-500'
    title = '后端未连接'
  } else if (config) {
    if (config.hasApiKey) {
      tone = 'bg-emerald-500'
      title = `API 已配置 · ${config.activeProfileName}`
    } else {
      tone = 'bg-red-500'
      title = '未配置 API Key'
    }
  }
  return <span title={title} className={`inline-block w-2.5 h-2.5 rounded-full ${tone}`} />
}

export default function MobileHeader({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <header
      // 处理刘海：sticky 顶栏用 padding-top 吃掉 safe-area-inset-top，wordmark 不被状态栏压住。
      className="flex items-center justify-between px-4 pb-3 border-b border-white/10 bg-black/40 backdrop-blur-sm"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
    >
      <h1 className="text-xl font-bold text-neutral-100 tracking-wide">妖荼</h1>
      <div className="flex items-center gap-3">
        <StatusDot />
        <button
          onClick={onOpenSettings}
          aria-label="设置"
          // 触控目标 ≥44px：按钮本体 44×44。
          className="w-11 h-11 -mr-2 flex items-center justify-center text-neutral-300 active:text-neutral-100"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
    </header>
  )
}
