import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// 后端 = 仓库根目录的 server.js。开发时把 /api 和 /outputs 代理到它。
// 默认 8787，可用 VITE_API_TARGET 覆盖（验证/多实例时用）。
const apiTarget = process.env.VITE_API_TARGET || 'http://127.0.0.1:8787'

// mode === 'mobile'：给 Capacitor 安卓壳构建离线包。壳用 file:// 协议加载，
// '/studio/' 这种绝对路径 base 在离线包里资源会 404，必须用相对路径 './'，
// 产物单独放 dist-mobile，不覆盖桌面版 dist。其余模式（含默认桌面构建）维持现状。
export default defineConfig(({ mode }) => {
  const isMobile = mode === 'mobile'
  return {
    plugins: [react()],
    base: isMobile ? './' : '/studio/', // 桌面：由 server.js 在 /studio 下托管；手机：相对路径离线加载
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
      outDir: isMobile ? 'dist-mobile' : 'dist',
      emptyOutDir: true,
    },
  }
})
