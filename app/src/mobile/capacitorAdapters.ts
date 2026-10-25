// adapters.ts 三个接口的 Capacitor 真机实现，供 mobileApi.ts 组装进 engine 工厂。
// engine.ts 本身永远不 import 这个文件——它只认 adapters.ts 里的类型，实现细节全在这。
import { Capacitor, CapacitorHttp } from '@capacitor/core'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin'
import type { FileAdapter, HttpAdapter, HttpResponse, SecretAdapter } from './adapters'
import { buildNativeMultipartBody } from './nativeMultipart'

const DIR = Directory.Data

// ============ Capacitor HttpAdapter ============
// 用 CapacitorHttp（原生层发请求）而不是 WebView fetch，绕开手机 WebView 的 CORS 限制。

// 把 CapacitorHttp 的响应统一成 {status, json, text} 三件套：上游中转站有时返回字符串、
// 有时返回已解析对象，这里都兜住，让 engine 只面对一种形状。
function normalizeHttpResponse(resp: { status: number; data: unknown }): HttpResponse {
  const raw = resp.data
  let text = ''
  let json: any = null
  if (typeof raw === 'string') {
    text = raw
    try {
      json = raw ? JSON.parse(raw) : null
    } catch {
      json = null // 非 JSON（HTML 错误页等），保留在 text 里
    }
  } else if (raw && typeof raw === 'object') {
    json = raw
    try {
      text = JSON.stringify(raw)
    } catch {
      text = ''
    }
  }
  return { status: resp.status, json, text }
}

export const capacitorHttpAdapter: HttpAdapter = {
  async postJson(url, body, headers = {}) {
    const resp = await CapacitorHttp.post({
      url,
      headers: { 'Content-Type': 'application/json', ...headers },
      data: body,
    })
    return normalizeHttpResponse(resp)
  },

  // Capacitor 6 的 Android 原生层识别 dataType=formData，并将 base64File 项解码后直接写入
  // multipart 输出流。不能在 JS 中把二进制拼成字符串：跨原生桥时字符串会按 UTF-8 编码，
  // 0x80 以上的图片字节会改变，导致只有带参考图的 /images/edits 请求报错。
  async postMultipart(url, fields, files, headers = {}) {
    const multipart = buildNativeMultipartBody(fields, files)

    const resp = await CapacitorHttp.post({
      url,
      headers: {
        ...headers,
        'Content-Type': `multipart/form-data; boundary=${multipart.boundary}`,
      },
      data: multipart.entries,
      dataType: 'formData',
    })
    return normalizeHttpResponse(resp)
  },

  async get(url, headers = {}) {
    const resp = await CapacitorHttp.get({ url, headers })
    return normalizeHttpResponse(resp)
  },

  // 下载远程图片二进制 → base64。对齐 server.js downloadImage（3018 行）。
  //
  // 依据（@capacitor/core 6.x，node_modules/@capacitor/core/dist/index.cjs.js request() 623-661 行 +
  // types/core-plugins.d.ts HttpResponseType 103 行）：当 responseType 为 'blob'（或 'arraybuffer'）时，
  // 原生/web 层统一走 `blob = await response.blob(); data = await readBlobAsBase64(blob)`——即把响应体
  // 读成 base64 字符串放进 resp.data（readBlobAsBase64 已剥掉 "data:...;base64," 前缀，返回纯 base64）。
  // 注意：源码 630-634 行有个「若响应 content-type 含 application/json 则强制按 json 解析」的分支，
  // 但图片响应的 content-type 是 image/*，不会命中，故这里能稳定拿到 base64。
  // mimeType 从响应头 content-type 取（Capacitor 把响应头小写化后放进 resp.headers）。
  async getBinary(url) {
    try {
      const resp = await CapacitorHttp.get({ url, responseType: 'blob' })
      const status = typeof resp.status === 'number' ? resp.status : 0
      const base64 = typeof resp.data === 'string' && resp.data ? resp.data : null
      const headers = (resp.headers || {}) as Record<string, string>
      // 响应头大小写不保证，两种都探一下
      const mimeType = headers['content-type'] || headers['Content-Type'] || null
      return { status, base64, mimeType }
    } catch {
      // 网络错误：对齐 server.js downloadImage 的 catch → 返回 null（调用方跳过该张）
      return { status: 0, base64: null, mimeType: null }
    }
  },
}

// ============ Capacitor FileAdapter ============
// 容错写法对齐牛马蓝本 capacitor.ts：mkdir 已存在吞掉异常；读失败返回 null 不抛。

export const capacitorFileAdapter: FileAdapter = {
  async readText(path) {
    try {
      const res = await Filesystem.readFile({ path, directory: DIR, encoding: Encoding.UTF8 })
      return typeof res.data === 'string' ? res.data : null
    } catch {
      return null // 文件不存在 → null，不抛（对齐服务端读不到即跳过的语义）
    }
  },

  async writeText(path, content) {
    await Filesystem.writeFile({
      path,
      data: content,
      directory: DIR,
      encoding: Encoding.UTF8,
      recursive: true, // 自动建父目录
    })
  },

  async writeBase64(path, base64) {
    // 不带 encoding 时 Capacitor 把 data 当 base64 写成二进制文件
    await Filesystem.writeFile({
      path,
      data: base64,
      directory: DIR,
      recursive: true,
    })
  },

  async readBase64(path) {
    try {
      const res = await Filesystem.readFile({ path, directory: DIR }) // 不带 encoding → 返回 base64
      return typeof res.data === 'string' ? res.data : null
    } catch {
      return null
    }
  },

  async readdir(path) {
    try {
      const res = await Filesystem.readdir({ path, directory: DIR })
      return res.files.map((f) => f.name)
    } catch {
      return [] // 目录不存在 → 空数组
    }
  },

  async delete(path) {
    try {
      await Filesystem.deleteFile({ path, directory: DIR })
      return true
    } catch {
      return false
    }
  },

  async mkdir(path) {
    try {
      await Filesystem.mkdir({ path, directory: DIR, recursive: true })
    } catch {
      // 已存在：Capacitor 会抛错，这里静默忽略（幂等语义，对齐 Node fs.mkdir recursive）
    }
  },
}

// ============ Capacitor SecretAdapter ============
// API key 存手机安全存储（Android Keystore 加持），不落普通文件。

export const capacitorSecretAdapter: SecretAdapter = {
  async get(key) {
    try {
      const res = await SecureStoragePlugin.get({ key })
      return res.value
    } catch {
      // 插件在 key 不存在时会 reject（"Item with given key does not exist"），catch 成 null
      return null
    }
  },
  async set(key, value) {
    await SecureStoragePlugin.set({ key, value })
  },
  async remove(key) {
    try {
      await SecureStoragePlugin.remove({ key })
    } catch {
      // key 不存在时 remove 也可能 reject，静默忽略
    }
  },
}

// 相对路径 → 前端 <img src> 可显示的 url。
// ⚠️ 未在真机上验证。EngineDeps.toDisplayUrl 是同步签名，但 Filesystem.getUri 是异步的，
// 所以启动时异步解析一次 Directory.Data 的绝对 file:// 根路径并缓存，之后同步拼接子路径，
// 再用 Capacitor.convertFileSrc 转成 WebView 允许加载的协议（Android 上是
// https://localhost/_capacitor_file_/...）。首帧若根路径尚未就绪会退化成 convertFileSrc(相对路径)，
// 根路径到手后重渲染即可恢复。
let dataBaseUri = ''
void Filesystem.getUri({ path: '', directory: DIR })
  .then((r) => {
    dataBaseUri = String(r.uri || '').replace(/\/+$/, '')
  })
  .catch(() => {
    // 拿不到根路径就保持空串，走下面的降级分支
  })

export function capacitorToDisplayUrl(relPath: string): string {
  const full = dataBaseUri ? `${dataBaseUri}/${relPath}` : relPath
  return Capacitor.convertFileSrc(full)
}
