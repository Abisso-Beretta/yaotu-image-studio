import { create } from 'zustand'
import { api } from '@/lib/api'

export type BackgroundTheme = 'none' | 'white' | 'pink' | 'purple' | 'green' | 'black'

const THEMES: BackgroundTheme[] = ['none', 'white', 'pink', 'purple', 'green', 'black']

interface ThemeState {
  backgroundTheme: BackgroundTheme
  loadTheme: () => Promise<void>
  setBackgroundTheme: (theme: BackgroundTheme) => void
}

// 主题背景偏好落盘在后端（见 server.js /api/ui-prefs），不用 localStorage：
// 桌面版每次启动的端口是随机分配的，localStorage 按源（含端口）隔离，端口一变旧值就读不到了。
export const useTheme = create<ThemeState>((set) => ({
  backgroundTheme: 'black',
  loadTheme: async () => {
    try {
      const prefs = await api.getUiPrefs()
      if (prefs.backgroundTheme && (THEMES as string[]).includes(prefs.backgroundTheme)) {
        set({ backgroundTheme: prefs.backgroundTheme as BackgroundTheme })
      }
    } catch {
      // 读不到就用默认值，不阻塞界面
    }
  },
  setBackgroundTheme: (theme) => {
    set({ backgroundTheme: theme })
    api.setUiPrefs({ backgroundTheme: theme }).catch(() => {
      // 保存失败不影响当前这次切换的观感，下次启动可能会回退默认值
    })
  },
}))
