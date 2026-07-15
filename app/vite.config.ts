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
      // '@' → app 源码；'@shared/promptBuilders' → 仓库根 shared/ 下的 CJS 提示词构建器（桌面/手机共用）。
      // 该别名与 tsconfig.json 的 paths 同名：tsc 用别名找 .d.ts 拿类型，vite 用别名找 .cjs 拿运行时实现。
      // 这是把纯逻辑抽到 app/ 外部（vite 默认只扫 app/src）换来的取舍——用显式别名而非相对 import，
      // 免得 mobileApi.ts 写一长串 '../../../shared/...' 且绕过 vite 的模块图。
      alias: {
        '@': resolve(__dirname, 'src'),
        '@shared/promptBuilders': resolve(__dirname, '../shared/promptBuilders.cjs'),
      },
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
