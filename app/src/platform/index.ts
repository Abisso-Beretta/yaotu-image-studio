import { Capacitor } from '@capacitor/core'

// 运行时探测：Capacitor.isNativePlatform() 为 true = 代码跑在打包好的原生壳里（Android）；
// 为 false = 普通浏览器 / 桌面 Electron 里加载的网页。后者一律沿用现有 HTTP 实现，
// 行为与改造前完全一致，所以桌面/浏览器不受影响，只有真机壳才切到本地生图引擎。
export const isNative = Capacitor.isNativePlatform()

// 平台能力开关：手机版砍掉了依赖桌面后端/辅助 API 的重功能，UI 据此隐藏对应入口，
// 避免用户点进去撞到「暂未支持」的兜底错误。桌面/浏览器全部开启，保持原样。
export interface PlatformCapabilities {
  workbench: boolean       // 漫剧工作台（依赖 server.js 的项目持久化，手机版不做）
  auxApi: boolean          // 优化提示词 / 样图分析 / 辅助模型（M3 起手机版经共享构建器 + HttpAdapter 支持）
  desktopFeatures: boolean // 桌面特有功能（更新检测等）
}

export const capabilities: PlatformCapabilities = isNative
  ? { workbench: false, auxApi: true, desktopFeatures: false }
  : { workbench: true, auxApi: true, desktopFeatures: true }
