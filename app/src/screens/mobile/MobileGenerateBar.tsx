import { useGenerator } from '@/store/generator'

// 底部固定生成栏：全宽大按钮，生成中变进度态（可点取消）。
// 生成/取消逻辑一律走 store（generate / cancelGenerate / generating），不复制业务逻辑。
export default function MobileGenerateBar() {
  const generating = useGenerator((s) => s.generating)
  const generate = useGenerator((s) => s.generate)
  const cancelGenerate = useGenerator((s) => s.cancelGenerate)
  const prompt = useGenerator((s) => s.form.prompt)
  const config = useGenerator((s) => s.config)

  const canGenerate = !generating && prompt.trim().length > 0
  const needApiKey = config && !config.hasApiKey

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 px-4 pt-3 border-t border-white/10 bg-black/60 backdrop-blur-md"
      // 处理底部小白条 / 手势区：safe-area-inset-bottom。
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
    >
      {needApiKey && (
        <p className="text-xs text-amber-300 mb-2 text-center">还没配置 API Key，点右上角齿轮去设置。</p>
      )}
      {generating ? (
        <button
          onClick={cancelGenerate}
          // 生成中：整条按钮即进度态，点击=取消（服务端可能仍在计费）。高度 ≥52px。
          className="w-full min-h-[52px] rounded-xl font-bold text-red-100 bg-red-950/70 border border-red-800/70 flex items-center justify-center gap-2 active:bg-red-900/70"
        >
          <span className="inline-block w-4 h-4 rounded-full border-2 border-red-200/60 border-t-transparent animate-spin" />
          生成中…点此取消
        </button>
      ) : (
        <button
          disabled={!canGenerate}
          onClick={() => void generate()}
          className="w-full min-h-[52px] rounded-xl font-bold text-white bg-accent active:bg-accent-soft disabled:opacity-40"
        >
          生成
        </button>
      )}
    </div>
  )
}
