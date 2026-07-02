import { create } from 'zustand'

export type BackgroundTheme = 'none' | 'white' | 'pink' | 'purple' | 'green' | 'black'

const STORAGE_KEY = 'yaotu.backgroundTheme'
const THEMES: BackgroundTheme[] = ['none', 'white', 'pink', 'purple', 'green', 'black']

function loadInitialTheme(): BackgroundTheme {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored && (THEMES as string[]).includes(stored)) {
      return stored as BackgroundTheme
    }
  } catch {
    // localStorage 不可用（隐私模式等）就用默认值
  }
  return 'black'
}

interface ThemeState {
  backgroundTheme: BackgroundTheme
  setBackgroundTheme: (theme: BackgroundTheme) => void
}

export const useTheme = create<ThemeState>((set) => ({
  backgroundTheme: loadInitialTheme(),
  setBackgroundTheme: (theme) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // 忽略写入失败
    }
    set({ backgroundTheme: theme })
  },
}))
