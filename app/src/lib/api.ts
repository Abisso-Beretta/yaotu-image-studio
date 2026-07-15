// 平台选择器：桌面/浏览器用走 HTTP 到 server.js 的 serverApi，安卓原生壳用本地生图引擎 mobileApi。
// 两者实现同一套 ApiContract 签名，所以所有既有 import '@/lib/api' 的调用点一字不用改。
import { isNative } from '@/platform'
import { api as serverApi, fileToDataUrl, isAbortError, type ApiContract } from './serverApi'
import { mobileApi } from '@/mobile/mobileApi'

export { fileToDataUrl, isAbortError }
export type { ApiContract }

export const api: ApiContract = isNative ? mobileApi : serverApi
