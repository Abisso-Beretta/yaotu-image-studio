import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// 后端 = 仓库根目录的 server.js。开发时把 /api 和 /outputs 代理到它。
// 默认 8787，可用 VITE_API_TARGET 覆盖（验证/多实例时用）。
const apiTarget = process.env.VITE_API_TARGET || 'http://127.0.0.1:8787'

export default defineConfig({
  plugins: [react()],
  base: '/studio/', // 生产时由 server.js 在 /studio 下托管这个构建产物（与旧页面并存）
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': apiTarget,
      '/outputs': apiTarget,
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
