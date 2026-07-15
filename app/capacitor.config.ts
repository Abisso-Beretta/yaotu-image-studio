import type { CapacitorConfig } from '@capacitor/cli'

// Capacitor 配置：给「妖荼手机版」打安卓壳用。
// appId 故意区别于桌面 electron-builder 的 local.yaotu.workbench——手机版是独立的
// 安装目标，用独立包名避免与桌面版在同一设备/签名体系里冲突。
// webDir 指向 mobile 模式下的 Vite 产物（见 vite.config.ts：mode==='mobile' 时 outDir=dist-mobile），
// 因为离线壳用 file:// 协议加载，必须是相对路径 base 打出来的那份产物。
const config: CapacitorConfig = {
  appId: 'local.yaotu.mobile',
  appName: '妖荼',
  webDir: 'dist-mobile',
}

export default config
