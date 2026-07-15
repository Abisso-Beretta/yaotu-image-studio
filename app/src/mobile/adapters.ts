// 手机引擎的三个注入适配器接口——纯类型定义，零运行时 import（尤其不碰任何 Capacitor 包）。
//
// 为什么要单独拆出这一份：engine.ts 是纯逻辑核心，只 `import type` 这个文件，
// 这样单文件 TS 转译测试加载器（test/mobileEngine.test.mjs）才能把 engine.ts 单独转译执行，
// 测试里注入内存版 mock 适配器覆盖生图逻辑，不用真机、不发真请求。
// 真正的 Capacitor 实现放在同目录的 capacitorAdapters.ts，engine.ts 永远不 import 它。
//
// 路径模型：FileAdapter 里所有 path 都是 Directory.Data 下的相对路径（如 'outputs/<batchId>/image-01.png'），
// 业务层只做字符串拼接，不感知桌面/移动差异。

export interface HttpResponse {
  status: number
  json: any
  text: string
}

export interface HttpAdapter {
  postJson(
    url: string,
    body: unknown,
    headers?: Record<string, string>,
    signal?: AbortSignal,
  ): Promise<HttpResponse>
  postMultipart(
    url: string,
    fields: Record<string, string>,
    files: { fieldName: string; fileName: string; mimeType: string; base64: string }[],
    headers?: Record<string, string>,
    signal?: AbortSignal,
  ): Promise<HttpResponse>
  get(url: string, headers?: Record<string, string>): Promise<HttpResponse>
  // 下载远程二进制（图片）：GET url，把响应体以 base64 返回。对齐 server.js downloadImage（3018 行）的
  // 「拿 content-type 头 + 响应字节」语义。status 非 2xx 或读不到 body 时 base64 返回 null，由调用方跳过该张。
  // mimeType 取自响应 content-type 头（拿不到则 null）。
  getBinary(url: string): Promise<{ status: number; base64: string | null; mimeType: string | null }>
}

export interface FileAdapter {
  readText(path: string): Promise<string | null>
  writeText(path: string, content: string): Promise<void>
  writeBase64(path: string, base64: string): Promise<void>
  readBase64(path: string): Promise<string | null>
  readdir(path: string): Promise<string[]> // 返回条目名，不存在返回 []
  delete(path: string): Promise<boolean>
  mkdir(path: string): Promise<void> // 已存在要静默成功，不抛错
}

export interface SecretAdapter {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  remove(key: string): Promise<void>
}

// 提示词构建器（桌面/手机共用的纯逻辑）注入面。类型来自 shared/promptBuilders.d.ts，
// 经此 type-only 再导出，engine.ts 就只需从 './adapters' 引这一处类型（保持零运行时 import）。
// 真机由 mobileApi.ts 注入 shared/promptBuilders.cjs 的真货，测试直接 require 同一个 .cjs。
export type { PromptBuilders } from '@shared/promptBuilders'
