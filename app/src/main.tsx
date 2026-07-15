import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import MobileApp from './screens/mobile/MobileApp'
import { isNative } from './platform'
import './index.css'

// 入口分流：只有打包进原生壳（Capacitor）才走手机专属组件树 MobileApp；
// 桌面 Electron / 浏览器一律渲染原有 <App/>，路径与改造前完全一致，零影响。
// 放在 main.tsx 而不是 App.tsx 顶部，是为了让桌面 App.tsx 保持一字不改，
// 也避免在组件内 early-return 触碰 Hooks 调用顺序。
const Root = isNative ? MobileApp : App

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
