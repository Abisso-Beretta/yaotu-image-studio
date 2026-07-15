// 手机端「辅助 API 是否已配置」判定：优化提示词 / 样图分析都依赖辅助对话模型，
// 未配置时入口显示引导文案而不是直接报错（任务门禁要求）。
// 判定口径：存在被激活的辅助配置，且填了对话模型，且有可用 Key
// （useActiveProfile 时复用生图配置的 Key，hasApiKey 已在引擎侧据此计算）。
import type { AppSettings } from '@/types'

export function isAuxConfigured(settings: AppSettings | null): boolean {
  if (!settings) return false
  const profiles = settings.auxiliaryProfiles || []
  const active =
    profiles.find((p) => p.id === settings.activeAuxiliaryProfileId) || profiles[0]
  if (!active) return false
  return Boolean(active.model && active.model.trim() && active.hasApiKey)
}
