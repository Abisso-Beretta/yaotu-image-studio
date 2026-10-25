// 妖荼手机版生图引擎（纯逻辑核心）。
//
// 设计约束：本文件只能 import type（引类型，编译后被完全擦除），绝不 import 任何本地文件的
// 运行时值/函数——因为 test/mobileEngine.test.mjs 用的单文件 TS 转译加载器一次只转译这一个文件，
// 任何残留的运行时 import 都会被当成真实模块去解析而加载失败。所以所有辅助函数（batchId 生成、
// 负向词拼接、payload 构建、参考图落盘/回读、图库扫描分页、设置 upsert 等）全部写在本文件内，
// Capacitor 的落地实现则通过 EngineDeps 注入（真机注入 adapters.ts 的实现，测试注入内存 mock）。
//
// 行为对齐 server.js（见任务说明 C 节）。存储路径一律是 Directory.Data 下的相对路径。
import type {
  AnalyzeResult,
  AppConfig,
  AppSettings,
  AuxiliaryInput,
  AuxiliaryModelsResult,
  GenerateParams,
  GenerateResult,
  GeneratedImage,
  ImageRequest,
  ImagesPage,
  ManjuContext,
  OptimizeResult,
  ProfileInput,
  ReferenceImageInput,
  SavedItem,
  SavedReference,
  SettingsProfile,
  TestResult,
} from '@/types'
import type { FileAdapter, HttpAdapter, HttpResponse, PromptBuilders, SecretAdapter } from './adapters'

// 注入依赖：核心逻辑对文件系统 / 网络 / 安全存储 / 展示 url 转换都只依赖这四个能力，
// 外加 promptBuilders（桌面/手机共用的提示词构建纯逻辑，来自 shared/promptBuilders.cjs）。
export interface EngineDeps {
  http: HttpAdapter
  file: FileAdapter
  secret: SecretAdapter
  toDisplayUrl: (relPath: string) => string // 相对路径 → 前端 <img src> 可显示的 url；测试注入恒等函数
  promptBuilders: PromptBuilders // 优化提示词 / 样图分析要用的纯构建器；mobileApi 注入真货，测试注入同一份 .cjs
}

// ===== 常量：本地存储位置 =====
const OUTPUTS_ROOT = 'outputs'
const STYLE_REF_ROOT = 'outputs/_style-references'
const CONFIG_PATH = 'config.json'
const SETTINGS_PATH = 'settings.json'
const UI_PREFS_PATH = 'ui-prefs.json'
const SECRET_KEY = 'yaotu.apiKey'
// 辅助 API（优化/分析用的对话模型）独立密钥。仅当辅助配置「不复用生图配置」时才用它，
// 复用时辅助 API 直接借用生图的 SECRET_KEY。对齐 server.js 辅助配置的 useActiveProfile 语义。
const AUX_SECRET_KEY = 'yaotu.auxApiKey'
// 辅助模型默认值，对齐 server.js normalizeAuxiliaryModel / getAuxiliaryApiConfig。
const DEFAULT_AUX_MODEL = 'gpt-4o-mini'

const ALLOWED_QUALITIES = ['auto', 'low', 'medium', 'high']
const ALLOWED_FORMATS = ['png', 'jpeg', 'webp']
const ALLOWED_BACKGROUNDS = ['auto', 'opaque', 'transparent']

// ===== 纯辅助函数（无副作用，写在本文件内以满足单文件可测约束）=====

// 批次 ID：时间戳前缀 + 5 位随机段，格式照抄 server.js makeBatchId（4864 行）。
// 例：20260714T121030Z-a1b2c。前缀是可排序时间戳，图库按目录名倒序即时间倒序。
function makeBatchId(date: Date): string {
  const stamp = date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
  const random = Math.random().toString(36).slice(2, 7)
  return `${stamp}-${random}`
}

// 归一化正向提示词：trim + 8~32000 字符校验（对齐 server.js normalizePrompt 的长度语义）。
function normalizePrompt(value: unknown): string {
  const s = String(value ?? '').trim()
  if (s.length < 8) throw new Error('提示词太短（至少 8 个字符）。')
  if (s.length > 32000) throw new Error('提示词太长（超过 32000 字符）。')
  return s
}

function normalizeOptionalText(value: unknown, max: number): string {
  const s = String(value ?? '').trim()
  return s.length > max ? s.slice(0, max) : s
}

// 优化提示词入口的草稿校验：4~32000 字符（对齐 server.js normalizePromptDraft，
// 比生图入口 normalizePrompt 的最低 8 更宽松——优化允许更短的灵感草稿）。
function normalizePromptDraft(value: unknown): string {
  const s = String(value ?? '').trim()
  if (s.length < 4) throw new Error('提示词太短（至少 4 个字符）。')
  if (s.length > 32000) throw new Error('提示词太长（超过 32000 字符）。')
  return s
}

function stripTrailingSlash(value: unknown): string {
  return String(value ?? '').trim().replace(/\/+$/, '')
}

// 辅助模型名校验：默认 gpt-4o-mini；空 / 超 120 字 / 含换行 → 抛错（对齐 server.js normalizeAuxiliaryModel）。
function normalizeAuxiliaryModel(value: unknown): string {
  const model = String(value || DEFAULT_AUX_MODEL).trim()
  if (!model || model.length > 120 || /[\r\n]/.test(model)) {
    throw new Error('辅助模型名称不合法（需为 1~120 字符且不含换行）。')
  }
  return model
}

function clampInteger(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number.parseInt(String(value), 10)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

function normalizeChoice(value: unknown, fallback: string, allowed: string[]): string {
  const s = String(value ?? '').trim().toLowerCase()
  return allowed.includes(s) ? s : fallback
}

// size：手机版简化校验（不做 gpt-image-2 像素上限校验），仅保留「未传则默认 auto」的语义。
function normalizeSize(value: unknown): string {
  const s = String(value ?? '').trim()
  return s || 'auto'
}

// 漫剧上下文：手机版不接漫剧工作台，但纯生图历史里可能带这个字段（重 Roll 透传），原样保留对象。
function normalizeManjuContext(value: unknown): ManjuContext | undefined {
  if (!value || typeof value !== 'object') return undefined
  return value as ManjuContext
}

// 负向词拼接：完整对齐 server.js appendNegativePromptText（2267 行）。
// 空负向词原样返回；若负向词逐行都已被 prompt 包含则不重复拼接（防前端已揉进 prompt 时的双重拼接）；
// 否则追加 "\n\nAvoid: <负向词>"。
function appendNegativePromptText(prompt: string, negativePrompt: unknown): string {
  const negative = String(negativePrompt || '').trim()
  if (!negative) return prompt
  const lines = negative.split(/\n+/).map((line) => line.trim()).filter(Boolean)
  if (lines.length > 0 && lines.every((line) => prompt.includes(line))) return prompt
  return `${prompt}\n\nAvoid: ${negative}`
}

function parseDataUrl(value: unknown): { mimeType: string; base64: string } | null {
  const match = String(value).match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i)
  if (!match) return null
  return { mimeType: match[1].toLowerCase(), base64: match[2] }
}

function extname(path: string): string {
  const base = path.slice(path.lastIndexOf('/') + 1)
  const dot = base.lastIndexOf('.')
  return dot >= 0 ? base.slice(dot + 1) : ''
}

function basename(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1)
}

function extensionFromMime(mimeType: unknown, fallback: string): string {
  const mime = String(mimeType || '').toLowerCase()
  if (mime.includes('png')) return 'png'
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg'
  if (mime.includes('webp')) return 'webp'
  return fallback
}

function mimeFromExtension(extension: unknown): string {
  const ext = String(extension || '').toLowerCase().replace(/^\./, '')
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'webp') return 'image/webp'
  return 'image/png'
}

// base64 → 字节数（用于填 GeneratedImage.bytes）。atob 在 WebView 和 Node 22 里都是全局函数。
function base64ByteLength(base64: string): number {
  try {
    return atob(base64).length
  } catch {
    // 退化估算：每 4 个 base64 字符 ≈ 3 字节，去掉尾部 '=' 填充
    const clean = base64.replace(/=+$/, '')
    return Math.floor((clean.length * 3) / 4)
  }
}

// 拼 OpenAI 兼容端点 url：完整对齐 server.js buildOpenAiUrl（4911 行）。
function buildOpenAiUrl(baseUrl: string, apiPath: string): string {
  const normalized = String(baseUrl || '').trim().replace(/\/+$/, '')
  const suffix = apiPath.startsWith('/') ? apiPath : `/${apiPath}`
  if (/\/v1\/images\/generations$/i.test(normalized)) {
    if (suffix === '/images/generations') return normalized
    return normalized.replace(/\/images\/generations$/i, suffix)
  }
  if (/\/v1$/i.test(normalized)) return `${normalized}${suffix}`
  return `${normalized}/v1${suffix}`
}

// images / chat payload：对齐 server.js buildImageApiPayload（2279 行）。
function buildImageApiPayload(details: ImageRequest): Record<string, unknown> {
  return {
    model: details.model,
    prompt: appendNegativePromptText(String(details.prompt || ''), details.negativePrompt),
    n: details.n,
    size: details.size,
    quality: details.quality,
    output_format: details.output_format,
    background: details.background,
    output_compression: details.output_compression,
  }
}

// 内部参考图记录：落盘后带上 filePath / base64（内存缓存，构建 payload 用），对外经 sanitize 剥掉。
interface InternalReference {
  id: string
  name: string
  url: string
  filePath: string
  mimeType: string
  bytes: number
  source: string
  base64: string
}

function sanitizeReferenceImages(refs: InternalReference[]): ReferenceImageInput[] {
  // 只保留 {id,name,url,mimeType,bytes,source}，去掉临时的 filePath / base64（对齐 sanitizeReferenceImages 2419）。
  return refs.map((r) => ({
    id: r.id,
    name: r.name,
    url: r.url,
    mimeType: r.mimeType,
    bytes: r.bytes,
    source: r.source,
  })) as unknown as ReferenceImageInput[]
}

// responses payload：对齐 server.js buildResponsesImagePayload（2292 行）。参考图转 dataUrl 塞进 input_image。
function buildResponsesImagePayload(args: {
  model: string
  prompt: string
  size: string
  quality: string
  outputFormat: string
  negativePrompt: string
  references: InternalReference[]
}): Record<string, unknown> {
  const generationPrompt = appendNegativePromptText(
    [
      args.prompt,
      '',
      'Generate one image.',
      `Target size: ${args.size}.`,
      `Quality: ${args.quality}.`,
      `Preferred output format: ${args.outputFormat}.`,
    ]
      .filter(Boolean)
      .join('\n'),
    args.negativePrompt,
  )
  const content: unknown[] = [
    { type: 'input_text', text: generationPrompt },
    ...args.references.map((r) => ({
      type: 'input_image',
      image_url: `data:${r.mimeType || 'image/png'};base64,${r.base64}`,
    })),
  ]
  return {
    model: args.model,
    input: [{ role: 'user', content }],
    tools: [{ type: 'image_generation', size: args.size, quality: args.quality, output_format: args.outputFormat }],
  }
}

// 提取出的图片候选：与 server.js extractImagesFromAnyResponse 的返回形状一致。
// - base64：裸 base64 字符串（无 data: 前缀）
// - dataUrl：完整 data:image/...;base64,... 字符串
// - url：远程 http(s) 图片地址，需要后续 getBinary 下载
type ExtractedImage = { type: 'base64' | 'dataUrl' | 'url'; data: string }

// 判断一个字符串是否像图片 url：忠实移植 server.js looksLikeImageUrl（3049 行）。
// http(s) 开头，且要么带图片扩展名，要么路径里含 image/images/files/assets/generated 关键字
// （中转站常返回 https://.../generated/<id> 这类无扩展名地址，靠路径关键字兜住）。
function looksLikeImageUrl(value: string): boolean {
  return (
    /^https?:\/\/\S+/i.test(value) &&
    (/\.(png|jpe?g|webp)(\?|#|$)/i.test(value) || /\/(image|images|files|assets|generated)\//i.test(value))
  )
}

// 判断一个长字符串是否像图片 base64：忠实移植 server.js looksLikeImageBase64（3056 行）。
// 长度 > 200 且以 PNG/JPEG/WebP/GIF 的 base64 魔数开头，防止把普通长文本误当图片。
function looksLikeImageBase64(value: string): boolean {
  const text = String(value).trim()
  return text.length > 200 && /^(iVBORw0KGgo|\/9j\/|UklGR|R0lGOD)/.test(text)
}

// 从任意字符串里正则扫描出内嵌的 data:image dataUrl 和图片 url：忠实移植 server.js extractImageStrings（2941 行）。
// 兜底应对「图片藏在一段文本/markdown 里」的中转站返回形态。url 去掉尾部标点后再判定。
function extractImageStrings(text: string): ExtractedImage[] {
  const matches: ExtractedImage[] = []
  const dataUrlRegex = /data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+/gi
  const urlRegex = /https?:\/\/[^\s"'<>]+/gi

  for (const match of String(text).matchAll(dataUrlRegex)) {
    matches.push({ type: 'dataUrl', data: match[0] })
  }
  for (const match of String(text).matchAll(urlRegex)) {
    const url = match[0].replace(/[),.]+$/, '')
    if (looksLikeImageUrl(url)) {
      matches.push({ type: 'url', data: url })
    }
  }
  return matches
}

// 响应体图片提取：忠实移植 server.js extractImagesFromAnyResponse（2869 行）的通用递归 walker。
// 逐层下钻，认三类图片来源——data:image dataUrl / 远程图片 url / 裸 base64（含魔数识别与字符串扫描兜底），
// 以及 b64_json、base64/b64/image_base64/imageBase64、url、image、data、image_url.url、file.data、file.url
// 等已知字段。用 seen 去重（按 data 字符串）。找不到任何图片时返回空数组，由调用方统一报错。
// 说明：walker 全部内联在本文件（engine.ts 只能 import type，见文件头约束）。
function extractImages(value: unknown): ExtractedImage[] {
  const images: ExtractedImage[] = []
  const seen = new Set<string>()

  const addImage = (candidate: ExtractedImage | null | undefined): void => {
    if (!candidate?.data || seen.has(candidate.data)) return
    seen.add(candidate.data)
    images.push(candidate)
  }

  // node 用 any：忠实照抄 server.js 的动态字段访问（image_url?.url / file?.data 等），语义与 JS 版一致。
  const walk = (node: any): void => {
    if (!node) return

    if (typeof node === 'string') {
      if (node.startsWith('data:image/')) {
        addImage({ type: 'dataUrl', data: node })
      } else if (looksLikeImageUrl(node)) {
        addImage({ type: 'url', data: node })
      } else if (looksLikeImageBase64(node)) {
        addImage({ type: 'base64', data: node })
      } else {
        extractImageStrings(node).forEach(addImage)
      }
      return
    }

    if (Array.isArray(node)) {
      node.forEach(walk)
      return
    }

    if (typeof node !== 'object') return

    if (typeof node.b64_json === 'string') {
      addImage({ type: 'base64', data: node.b64_json })
    }
    for (const key of ['base64', 'b64', 'image_base64', 'imageBase64']) {
      if (typeof node[key] === 'string' && looksLikeImageBase64(node[key])) {
        addImage({ type: 'base64', data: node[key] })
      }
    }
    if (typeof node.url === 'string' && looksLikeImageUrl(node.url)) {
      addImage({ type: 'url', data: node.url })
    }
    if (typeof node.image === 'string') {
      walk(node.image)
    }
    if (typeof node.data === 'string' && looksLikeImageBase64(node.data)) {
      addImage({ type: 'base64', data: node.data })
    }
    if (node.image_url?.url) {
      walk(node.image_url.url)
    }
    if (node.file?.data) {
      addImage({ type: 'base64', data: node.file.data })
    }
    if (node.file?.url) {
      walk(node.file.url)
    }

    for (const child of Object.values(node)) walk(child)
  }

  walk(value)
  return images
}

// 「没有可用图片」时的排障辅助：列出响应体顶层键名，方便下次定位中转站返回形态。
// 对齐 server.js 2850 的语义（那里是静态英文文案），中文措辞保留现有风格，额外附键名列表（截断防超长）。
function describeResponseKeys(body: unknown): string {
  if (!body || typeof body !== 'object') return typeof body === 'string' ? '(字符串响应)' : '(空响应)'
  const keys = Array.isArray(body) ? body.map((_, i) => String(i)) : Object.keys(body as Record<string, unknown>)
  if (keys.length === 0) return '(无顶层字段)'
  const joined = keys.join(', ')
  return joined.length > 300 ? `${joined.slice(0, 300)}…` : joined
}

// makePublicParams / makePublicRequest：对齐 server.js（2440 / 2461 行）。
function makePublicRequest(details: ImageRequest): ImageRequest {
  const manjuContext = normalizeManjuContext(details.manjuContext)
  const request: ImageRequest = {
    endpointMode: details.endpointMode || 'images',
    model: details.model || 'gpt-image-2',
    prompt: details.prompt || '',
    negativePrompt: details.negativePrompt || '',
    n: details.n || 1,
    size: details.size || 'auto',
    quality: details.quality || 'auto',
    output_format: details.output_format || 'png',
    output_compression: details.output_compression,
    background: details.background || 'auto',
    referenceImages: Array.isArray(details.referenceImages) ? details.referenceImages : [],
  }
  if (manjuContext) request.manjuContext = manjuContext
  return request
}

function makePublicParams(details: ImageRequest): Record<string, unknown> {
  const request = makePublicRequest(details)
  const params: Record<string, unknown> = {
    endpointMode: request.endpointMode,
    model: request.model,
    size: request.size,
    quality: request.quality,
    format: request.output_format,
    background: request.background,
    count: request.n,
    references: (request.referenceImages || []).length,
  }
  if (request.manjuContext) params.manjuContext = request.manjuContext
  return params
}

function normalizePageSize(value: unknown): number {
  const size = Number.parseInt(String(value), 10)
  return [6, 12, 24, 48].includes(size) ? size : 12
}

// ===== 设置项（提示词库/风格库/最近）归一化，对齐 server.js normalizeSavedItem 等 =====
function normalizeSavedItemId(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function makeSavedItemId(): string {
  return `saved-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizeStyleStrength(value: unknown): 'low' | 'medium' | 'high' {
  const strength = String(value || 'medium').trim().toLowerCase()
  return strength === 'low' || strength === 'high' ? strength : 'medium'
}

function normalizeSavedReferenceImages(value: unknown): SavedReference[] {
  const references = Array.isArray(value) ? value : []
  return references
    .slice(0, 8)
    .map((reference: any) => ({
      name: String(reference?.name || 'Style reference').slice(0, 120),
      dataUrl:
        typeof reference?.dataUrl === 'string' && reference.dataUrl.startsWith('data:image/')
          ? reference.dataUrl
          : '',
      url: typeof reference?.url === 'string' ? reference.url : '',
      source: String(reference?.source || 'style-reference').slice(0, 80),
    }))
    .filter((reference) => reference.dataUrl || reference.url)
}

// 校验并归一化单个保存项。空 text 抛错（保存路径的校验语义，对齐 server.js normalizeSavedItem 4417）。
function normalizeSavedItem(input: any, fallbackName = '保存项'): SavedItem {
  if (!input || typeof input !== 'object') throw new Error('Saved item is invalid.')
  const text = String(input.text || input.prompt || input.guidance || '').trim()
  if (!text) throw new Error('Saved item text is required.')
  if (text.length > 32000) throw new Error('Saved item text is too long.')

  const now = new Date().toISOString()
  const name = String(input.name || fallbackName).trim().slice(0, 120) || fallbackName
  return {
    id: normalizeSavedItemId(input.id) || makeSavedItemId(),
    name,
    text,
    styleText: String(input.styleText || '').trim().slice(0, 32000),
    negativeText: String(input.negativeText || '').trim().slice(0, 8000),
    strength: normalizeStyleStrength(input.strength),
    referenceImages: normalizeSavedReferenceImages(input.referenceImages),
    mode: String(input.mode || '').trim().slice(0, 40),
    source: String(input.source || '').trim().slice(0, 80),
    createdAt: String(input.createdAt || now),
    updatedAt: String(input.updatedAt || now),
  }
}

// 批量归一化（读取路径）：容错——某条损坏（如缺 text）就跳过，绝不让整份设置读取抛错，
// 否则手机版 App 一启动调 getSettings 就挂。这是相对 server.js「逐条 throw」的有意放宽。
function normalizeSavedItems(items: unknown): SavedItem[] {
  if (!Array.isArray(items)) return []
  const result: SavedItem[] = []
  for (const item of items) {
    try {
      result.push(normalizeSavedItem(item))
    } catch {
      // 跳过损坏条目
    }
  }
  return result.slice(0, 200)
}

function upsertSavedItem(items: unknown, item: SavedItem): SavedItem[] {
  const list = normalizeSavedItems(items)
  const existingIndex = list.findIndex((entry) => entry.id === item.id)
  if (existingIndex >= 0) {
    list[existingIndex] = {
      ...list[existingIndex],
      ...item,
      createdAt: list[existingIndex].createdAt || item.createdAt,
      updatedAt: new Date().toISOString(),
    }
    return list
  }
  return [item, ...list].slice(0, 200)
}

function upsertRecentItem(items: unknown, item: SavedItem): SavedItem[] {
  const list = normalizeSavedItems(items)
  const existingIndex = list.findIndex((entry) => entry.id === item.id || entry.text === item.text)
  const nextItem: SavedItem = { ...item, updatedAt: new Date().toISOString() }
  if (existingIndex >= 0) {
    nextItem.id = list[existingIndex].id
    nextItem.createdAt = list[existingIndex].createdAt || item.createdAt
    list.splice(existingIndex, 1)
  }
  return [nextItem, ...list].slice(0, 80)
}

// 本地存储的原始设置形状。API key 仍只进安全存储；这里只保存各配置的非敏感字段和激活项。
interface StoredSettings {
  savedPrompts: SavedItem[]
  savedStyles: SavedItem[]
  recentPrompts: SavedItem[]
  activeProfileId: string
  profiles: StoredProfile[]
  activeAuxiliaryProfileId: string
  auxiliaryProfiles: StoredAuxProfile[]
  auxiliary: StoredAuxProfile
}

interface StoredProfile {
  id: string
  name: string
  baseUrl: string
  model: string
  endpointMode: string
}

// 辅助 API 配置（优化/分析用的对话模型）。对齐 server.js AppSettings.auxiliary 的字段子集：
// useActiveProfile=true 时借用生图配置的 baseUrl+key，此时 baseUrl 字段仅作占位。key 不落这里，走 AUX_SECRET_KEY。
interface StoredAux {
  name: string
  useActiveProfile: boolean
  baseUrl: string
  model: string
}

interface StoredAuxProfile extends StoredAux {
  id: string
}

function createDefaultAux(): StoredAux {
  return { name: '辅助 API', useActiveProfile: true, baseUrl: '', model: '' }
}

function normalizeStoredAux(value: unknown): StoredAux {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  return {
    name: String(raw.name || '辅助 API').trim().slice(0, 80) || '辅助 API',
    useActiveProfile: raw.useActiveProfile !== false, // 缺省视为「复用生图配置」，对齐 server.js
    baseUrl: stripTrailingSlash(raw.baseUrl),
    model: String(raw.model || '').trim().slice(0, 120),
  }
}

function normalizeProfileId(value: unknown, fallback: string): string {
  return normalizeSavedItemId(value) || fallback
}

function normalizeStoredProfile(value: unknown, fallbackId: string, fallbackConfig: StoredConfig): StoredProfile {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  return {
    id: normalizeProfileId(raw.id, fallbackId),
    name: String(raw.name || '手机配置').trim().slice(0, 80) || '手机配置',
    baseUrl: stripTrailingSlash(raw.baseUrl || fallbackConfig.baseUrl),
    model: String(raw.model || raw.imageModel || fallbackConfig.model || 'gpt-image-2').trim().slice(0, 120),
    endpointMode: String(raw.endpointMode || fallbackConfig.endpointMode || 'images').trim() || 'images',
  }
}

function normalizeStoredAuxProfile(value: unknown, fallbackId: string): StoredAuxProfile {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  return {
    id: normalizeProfileId(raw.id, fallbackId),
    ...normalizeStoredAux(raw),
  }
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

interface StoredConfig {
  baseUrl: string
  model: string
  endpointMode: string
}

export class MobileEngine {
  private deps: EngineDeps

  constructor(deps: EngineDeps) {
    this.deps = deps
  }

  // ---------- 配置 / 密钥 ----------

  private async readConfig(): Promise<StoredConfig> {
    const text = await this.deps.file.readText(CONFIG_PATH)
    let parsed: any = {}
    if (text) {
      try {
        parsed = JSON.parse(text)
      } catch {
        parsed = {}
      }
    }
    return {
      baseUrl: String(parsed.baseUrl || '').trim(),
      model: String(parsed.model || parsed.imageModel || '').trim(),
      endpointMode: String(parsed.endpointMode || 'images').trim() || 'images',
    }
  }

  private async writeConfig(config: StoredConfig): Promise<void> {
    await this.deps.file.writeText(CONFIG_PATH, JSON.stringify(config, null, 2))
  }

  private profileSecretKey(profileId: string): string {
    return `${SECRET_KEY}.${normalizeProfileId(profileId, 'mobile')}`
  }

  private auxiliarySecretKey(profileId: string): string {
    return `${AUX_SECRET_KEY}.${normalizeProfileId(profileId, 'aux-mobile')}`
  }

  private async getProfileApiKey(profileId: string): Promise<string> {
    const id = normalizeProfileId(profileId, 'mobile')
    const stored = String((await this.deps.secret.get(this.profileSecretKey(id))) || '').trim()
    if (stored) return stored
    // 旧版只有这一个固定密钥槽。仅让迁移出的 mobile 配置继承，避免新配置误用旧 key。
    if (id === 'mobile') return String((await this.deps.secret.get(SECRET_KEY)) || '').trim()
    return ''
  }

  private async getAuxiliaryApiKey(profileId: string): Promise<string> {
    const id = normalizeProfileId(profileId, 'aux-mobile')
    const stored = String((await this.deps.secret.get(this.auxiliarySecretKey(id))) || '').trim()
    if (stored) return stored
    if (id === 'aux-mobile') return String((await this.deps.secret.get(AUX_SECRET_KEY)) || '').trim()
    return ''
  }

  private async getActiveProfileContext(): Promise<{
    stored: StoredSettings
    profile: StoredProfile
    apiKey: string
  }> {
    const stored = await this.readStoredSettings()
    const profile = stored.profiles.find((item) => item.id === stored.activeProfileId) || stored.profiles[0]
    return { stored, profile, apiKey: await this.getProfileApiKey(profile.id) }
  }

  async getConfig(): Promise<AppConfig> {
    const { profile, apiKey } = await this.getActiveProfileContext()
    return {
      hasApiKey: Boolean(apiKey),
      defaultModel: profile.model || 'gpt-image-2',
      baseUrl: profile.baseUrl,
      endpointMode: profile.endpointMode || 'images',
      activeProfileName: profile.name,
      outputDir: 'app-data/outputs', // 展示用字符串，非真实系统路径
    }
  }

  // ---------- 生图主流程 ----------

  async generate(body: GenerateParams, signal?: AbortSignal): Promise<GenerateResult> {
    const { profile: config, apiKey } = await this.getActiveProfileContext()
    if (!apiKey) {
      throw new Error('未配置 API Key。请到设置里填入中转站的 API Key。')
    }
    const baseUrl = config.baseUrl
    const endpointMode = config.endpointMode || 'images'

    const prompt = normalizePrompt(body.prompt)
    const negativePrompt = normalizeOptionalText(body.negativePrompt, 8000)
    const model = String(body.model || config.model || 'gpt-image-2').trim()
    const size = normalizeSize(body.size)
    const quality = normalizeChoice(body.quality, 'auto', ALLOWED_QUALITIES)
    const outputFormat = normalizeChoice(body.outputFormat, 'png', ALLOWED_FORMATS)
    const background = normalizeChoice(body.background, 'auto', ALLOWED_BACKGROUNDS)
    const count = clampInteger(body.count, 1, 4, 1)
    const compression = clampInteger(body.outputCompression, 0, 100, 85)
    const manjuContext = normalizeManjuContext(body.manjuContext)

    const startedAt = new Date()
    const batchId = makeBatchId(startedAt)
    await this.deps.file.mkdir(`${OUTPUTS_ROOT}/${batchId}`)

    const references = await this.prepareReferenceImages(body.referenceImages, batchId)

    const requestDetails: ImageRequest = {
      endpointMode,
      model,
      prompt,
      negativePrompt,
      n: count,
      size,
      quality,
      output_format: outputFormat,
      background,
      referenceImages: sanitizeReferenceImages(references),
    }
    if (manjuContext) requestDetails.manjuContext = manjuContext
    // output_compression 仅当输出为 jpeg/webp 时才进请求体（对齐 server.js）
    if (outputFormat === 'jpeg' || outputFormat === 'webp') {
      requestDetails.output_compression = compression
    }

    const createdAt = startedAt.toISOString()
    let images: GeneratedImage[]
    let lastResponseBody: unknown = null
    if (endpointMode === 'responses') {
      ;({ images, lastResponseBody } = await this.runResponses({ apiKey, baseUrl, requestDetails, references, batchId, createdAt, count, signal }))
    } else if (endpointMode === 'chat') {
      ;({ images, lastResponseBody } = await this.runChat({ apiKey, baseUrl, requestDetails, references, batchId, createdAt, count, signal }))
    } else {
      ;({ images, lastResponseBody } = await this.runImages({ apiKey, baseUrl, requestDetails, references, batchId, createdAt, count, signal }))
    }

    if (images.length === 0) {
      // 对齐 server.js 2850「响应里没有可提取的图片数据」语义（中文措辞保留现有风格），
      // 附上响应体顶层键名列表方便下次排障（describeResponseKeys 已截断防超长）。
      throw new Error(`上游 API 未返回任何可用图片数据（响应顶层字段：${describeResponseKeys(lastResponseBody)}）。`)
    }

    // metadata 里存相对路径 url（稳定、可回读），images 数组与 request 一并落盘。
    const metadata = { batchId, createdAt, request: requestDetails, images }
    await this.deps.file.writeText(`${OUTPUTS_ROOT}/${batchId}/metadata.json`, JSON.stringify(metadata, null, 2))

    // 返回给前端的 images 把 url 换成可显示 url（真机上 = capacitor 文件协议；测试里 = 恒等）。
    return {
      batchId,
      createdAt,
      images: images.map((img) => ({ ...img, url: this.deps.toDisplayUrl(img.url) })),
    }
  }

  // images 模式：count>1 时循环单张（每次 n=1），对齐 server.js generateImagesViaImagesApi。
  // 返回值带 lastResponseBody：供「没有图片」时列出响应体顶层键名排障（对齐 server.js 2850 语义 + 增强）。
  private async runImages(ctx: {
    apiKey: string
    baseUrl: string
    requestDetails: ImageRequest
    references: InternalReference[]
    batchId: string
    createdAt: string
    count: number
    signal?: AbortSignal
  }): Promise<{ images: GeneratedImage[]; lastResponseBody: unknown }> {
    const { apiKey, baseUrl, requestDetails, references, batchId, createdAt, count, signal } = ctx
    const images: GeneratedImage[] = []
    const attempts = count > 1 ? count : 1
    const upstreamCount = count > 1 ? 1 : count
    let lastResponseBody: unknown = null

    for (let i = 0; i < attempts && images.length < count; i += 1) {
      const upstream: ImageRequest = { ...requestDetails, n: upstreamCount }
      const payload = buildImageApiPayload(upstream)
      let resp: HttpResponse
      if (references.length > 0) {
        const fields: Record<string, string> = {}
        for (const [key, value] of Object.entries(payload)) {
          if (value !== undefined && value !== null && value !== '') fields[key] = String(value)
        }
        const files = references.map((r) => ({
          fieldName: 'image[]',
          fileName: basename(r.filePath),
          mimeType: r.mimeType || 'image/png',
          base64: r.base64,
        }))
        resp = await this.deps.http.postMultipart(buildOpenAiUrl(baseUrl, '/images/edits'), fields, files, this.authHeaders(apiKey), signal)
      } else {
        resp = await this.deps.http.postJson(buildOpenAiUrl(baseUrl, '/images/generations'), payload, this.authHeaders(apiKey), signal)
      }
      const responseBody = this.checkResponse(resp)
      lastResponseBody = responseBody
      const saved = await this.saveExtractedImages(extractImages(responseBody), {
        batchId,
        createdAt,
        requestDetails,
        startIndex: images.length,
        limit: count - images.length,
        outputFormat: String(requestDetails.output_format || 'png'),
      })
      images.push(...saved)
    }
    return { images, lastResponseBody }
  }

  private async runResponses(ctx: {
    apiKey: string
    baseUrl: string
    requestDetails: ImageRequest
    references: InternalReference[]
    batchId: string
    createdAt: string
    count: number
    signal?: AbortSignal
  }): Promise<{ images: GeneratedImage[]; lastResponseBody: unknown }> {
    const { apiKey, baseUrl, requestDetails, references, batchId, createdAt, count, signal } = ctx
    const images: GeneratedImage[] = []
    let lastResponseBody: unknown = null
    for (let i = 0; i < count && images.length < count; i += 1) {
      const payload = buildResponsesImagePayload({
        model: String(requestDetails.model || 'gpt-image-2'),
        prompt: String(requestDetails.prompt || ''),
        size: String(requestDetails.size || 'auto'),
        quality: String(requestDetails.quality || 'auto'),
        outputFormat: String(requestDetails.output_format || 'png'),
        negativePrompt: String(requestDetails.negativePrompt || ''),
        references,
      })
      const resp = await this.deps.http.postJson(buildOpenAiUrl(baseUrl, '/responses'), payload, this.authHeaders(apiKey), signal)
      const responseBody = this.checkResponse(resp)
      lastResponseBody = responseBody
      const saved = await this.saveExtractedImages(extractImages(responseBody), {
        batchId,
        createdAt,
        requestDetails,
        startIndex: images.length,
        limit: count - images.length,
        outputFormat: String(requestDetails.output_format || 'png'),
      })
      images.push(...saved)
    }
    return { images, lastResponseBody }
  }

  private async runChat(ctx: {
    apiKey: string
    baseUrl: string
    requestDetails: ImageRequest
    references: InternalReference[]
    batchId: string
    createdAt: string
    count: number
    signal?: AbortSignal
  }): Promise<{ images: GeneratedImage[]; lastResponseBody: unknown }> {
    const { apiKey, baseUrl, requestDetails, references, batchId, createdAt, count, signal } = ctx
    const images: GeneratedImage[] = []
    let lastResponseBody: unknown = null
    for (let i = 0; i < count && images.length < count; i += 1) {
      const chatPrompt = appendNegativePromptText(
        [
          String(requestDetails.prompt || ''),
          '',
          'Generate one image.',
          `Target size: ${requestDetails.size}.`,
          `Quality: ${requestDetails.quality}.`,
          `Preferred output format: ${requestDetails.output_format}.`,
          'Return image data or image URLs only when possible.',
        ].join('\n'),
        requestDetails.negativePrompt,
      )
      const content: unknown[] = [
        { type: 'text', text: chatPrompt },
        ...references.map((r) => ({ type: 'image_url', image_url: { url: `data:${r.mimeType || 'image/png'};base64,${r.base64}` } })),
      ]
      const payload = { model: requestDetails.model, messages: [{ role: 'user', content }], n: 1 }
      const resp = await this.deps.http.postJson(buildOpenAiUrl(baseUrl, '/chat/completions'), payload, this.authHeaders(apiKey), signal)
      const responseBody = this.checkResponse(resp)
      lastResponseBody = responseBody
      const saved = await this.saveExtractedImages(extractImages(responseBody), {
        batchId,
        createdAt,
        requestDetails,
        startIndex: images.length,
        limit: count - images.length,
        outputFormat: String(requestDetails.output_format || 'png'),
      })
      images.push(...saved)
    }
    return { images, lastResponseBody }
  }

  private authHeaders(apiKey: string): Record<string, string> {
    return { Authorization: `Bearer ${apiKey}` }
  }

  // 校验上游响应：非 2xx 抛出可读错误；否则返回解析后的 JSON。
  private checkResponse(resp: HttpResponse): unknown {
    if (resp.status < 200 || resp.status >= 300) {
      const raw = String(resp.json?.error?.message || resp.json?.message || resp.text || `上游 API 返回 ${resp.status}`).trim()
      throw new Error(raw.length > 1000 ? `${raw.slice(0, 1000)}...` : raw || `上游 API 返回 ${resp.status}`)
    }
    return resp.json ?? {}
  }

  // 落盘提取出的图片：命名用 image-NN.<ext>（任务明确要求，注意区别于 server.js 的 background-NN）。
  // 三类来源对齐 server.js saveExtractedImages（2960 行）：
  //  - dataUrl：parseDataUrl 解出 base64 + mime；解析失败跳过该张。
  //  - url：经 http.getBinary 下载 → base64 + mime；下载失败（downloaded 为 null）跳过该张——
  //    对齐 server.js 2978-2982 的 `if (!downloaded) continue` 语义（单张失败是跳过而非抛错，
  //    依据 downloadImage 3018：!response.ok 或网络异常都返回 null）。
  //  - base64：直接用。
  // 任一分支拿到空 base64 都跳过（对齐 server.js 2989 的 `buffer.length === 0` 空数据跳过）。
  private async saveExtractedImages(
    extracted: ExtractedImage[],
    ctx: {
      batchId: string
      createdAt: string
      requestDetails: ImageRequest
      startIndex: number
      limit: number
      outputFormat: string
    },
  ): Promise<GeneratedImage[]> {
    const images: GeneratedImage[] = []
    const defaultExt = ctx.outputFormat === 'jpeg' ? 'jpg' : ctx.outputFormat

    for (const item of extracted) {
      if (images.length >= ctx.limit) break
      let base64 = ''
      let ext = defaultExt
      if (item.type === 'dataUrl') {
        const parsed = parseDataUrl(item.data)
        if (!parsed) continue
        base64 = parsed.base64
        ext = extensionFromMime(parsed.mimeType, defaultExt)
      } else if (item.type === 'url') {
        // 远程图片：下载成 base64。status 非 2xx 或拿不到 body → 跳过该张（不抛错、不中断整批）。
        const downloaded = await this.deps.http.getBinary(item.data)
        if (!downloaded || downloaded.status < 200 || downloaded.status >= 300 || !downloaded.base64) continue
        base64 = downloaded.base64
        ext = extensionFromMime(downloaded.mimeType, defaultExt)
      } else {
        base64 = item.data
      }
      if (!base64) continue

      const fileName = `image-${String(ctx.startIndex + images.length + 1).padStart(2, '0')}.${ext}`
      const relPath = `${OUTPUTS_ROOT}/${ctx.batchId}/${fileName}`
      await this.deps.file.writeBase64(relPath, base64)

      images.push({
        id: `${ctx.batchId}/${fileName}`,
        url: relPath, // 相对路径；返回前端前在 generate() 里统一转展示 url
        batchId: ctx.batchId,
        createdAt: ctx.createdAt,
        prompt: ctx.requestDetails.prompt,
        bytes: base64ByteLength(base64),
        params: makePublicParams(ctx.requestDetails),
        request: makePublicRequest(ctx.requestDetails),
      })
    }
    return images
  }

  // 参考图落盘：对齐 prepareReferenceImages（2341）。最多 16 张；dataUrl 直接解，相对 url 从本地读回；
  // 读不到 / 两者都没有 → 静默跳过（不抛错、不中断整批）。
  private async prepareReferenceImages(
    inputRefs: ReferenceImageInput[] | undefined,
    batchId: string,
  ): Promise<InternalReference[]> {
    const raw = Array.isArray(inputRefs) ? inputRefs.slice(0, 16) : []
    if (raw.length === 0) return []
    await this.deps.file.mkdir(`${OUTPUTS_ROOT}/${batchId}/references`)

    const refs: InternalReference[] = []
    for (let index = 0; index < raw.length; index += 1) {
      const reference = raw[index]
      const resolved = await this.resolveReferenceImage(reference)
      if (!resolved) continue // 静默跳过

      const ext = extensionFromMime(resolved.mimeType, extname(reference?.name || '') || 'png')
      const fileName = `reference-${String(refs.length + 1).padStart(2, '0')}.${ext}`
      const relPath = `${OUTPUTS_ROOT}/${batchId}/references/${fileName}`
      await this.deps.file.writeBase64(relPath, resolved.base64)

      refs.push({
        id: `${batchId}/references/${fileName}`,
        name: String(reference?.name || `Reference ${index + 1}`).slice(0, 120),
        url: relPath,
        filePath: relPath,
        mimeType: resolved.mimeType || mimeFromExtension(ext),
        bytes: base64ByteLength(resolved.base64),
        source: reference?.source || 'reference',
        base64: resolved.base64,
      })
    }
    return refs
  }

  // 解析一张参考图 → {base64, mimeType}。dataUrl 直接解；否则把 url 当本地相对路径读回（重 Roll 场景）。
  // 参数只取 dataUrl / url 两个字段，故用结构化类型同时容纳生图参考图（ReferenceImageInput，name 必填）
  // 与样图分析入参（name 可选）两类调用方。
  private async resolveReferenceImage(
    reference: { dataUrl?: string; url?: string } | undefined,
  ): Promise<{ base64: string; mimeType: string } | null> {
    if (!reference || typeof reference !== 'object') return null

    if (typeof reference.dataUrl === 'string') {
      const parsed = parseDataUrl(reference.dataUrl)
      if (parsed) return { base64: parsed.base64, mimeType: parsed.mimeType }
    }

    if (typeof reference.url === 'string' && reference.url) {
      // 兼容桌面风格的 '/outputs/...' 和手机风格的 'outputs/...'：统一剥掉前导斜杠再当本地相对路径。
      const relPath = reference.url.replace(/^\/+/, '')
      const base64 = await this.deps.file.readBase64(relPath)
      if (base64) return { base64, mimeType: mimeFromExtension(extname(relPath)) }
    }

    return null // 读不到 → 跳过
  }

  // ---------- 图库 ----------

  async listImages(page = 1, pageSize = 24): Promise<ImagesPage> {
    const all = await this.collectGalleryImages()
    const size = normalizePageSize(pageSize)
    const total = all.length
    const totalPages = Math.max(1, Math.ceil(total / size))
    const requestedPage = clampInteger(page, 1, totalPages, 1)
    const current = Math.min(requestedPage, totalPages)
    const start = (current - 1) * size
    const slice = all.slice(start, start + size).map((img) => ({ ...img, url: this.deps.toDisplayUrl(img.url) }))
    return { images: slice, total, page: current, pageSize: size, totalPages }
  }

  // 扫 outputs/ 下各批次目录，按批次目录名（时间戳前缀）倒序 = 时间倒序。跳过下划线开头的内部目录
  // （如 _style-references）。手机版数据量小，每次全扫，不做 server.js 那套 mtime 缓存。
  private async collectGalleryImages(): Promise<GeneratedImage[]> {
    const names = (await this.deps.file.readdir(OUTPUTS_ROOT))
      .filter((n) => !n.startsWith('_'))
      .sort()
      .reverse()
    const images: GeneratedImage[] = []
    for (const batch of names) {
      images.push(...(await this.scanBatchDirectory(batch)))
    }
    return images
  }

  private async scanBatchDirectory(batch: string): Promise<GeneratedImage[]> {
    const metaText = await this.deps.file.readText(`${OUTPUTS_ROOT}/${batch}/metadata.json`)
    let createdAt = ''
    let requestDetails: ImageRequest = {}
    let prompt = ''
    const bytesById = new Map<string, number>()
    if (metaText) {
      try {
        const meta = JSON.parse(metaText)
        createdAt = String(meta.createdAt || '')
        requestDetails = meta.request || {}
        prompt = String(requestDetails.prompt || '')
        for (const img of Array.isArray(meta.images) ? meta.images : []) {
          if (img && typeof img.id === 'string' && typeof img.bytes === 'number') bytesById.set(img.id, img.bytes)
        }
      } catch {
        createdAt = ''
      }
    }

    // 同批次所有图共享一份 params/request，避免重复构造。
    const params = makePublicParams(requestDetails)
    const request = makePublicRequest(requestDetails)
    const entries = (await this.deps.file.readdir(`${OUTPUTS_ROOT}/${batch}`)).slice().sort()
    const images: GeneratedImage[] = []
    for (const file of entries) {
      if (!/\.(png|jpe?g|webp)$/i.test(file)) continue // 排除 metadata.json 和 references 子目录
      const id = `${batch}/${file}`
      images.push({
        id,
        url: `${OUTPUTS_ROOT}/${batch}/${file}`,
        batchId: batch,
        createdAt,
        prompt,
        params,
        request,
        bytes: bytesById.get(id) ?? 0,
      })
    }
    return images
  }

  async deleteImages(ids: string[]): Promise<{ deleted: string[]; failed?: { id: string; error: string }[] }> {
    const requested = Array.isArray(ids) ? ids : []
    const deleted: string[] = []
    const failed: { id: string; error: string }[] = []
    for (const id of requested) {
      try {
        const ok = await this.deleteImageById(id)
        if (ok) deleted.push(id)
        else failed.push({ id, error: 'Image not found.' })
      } catch (error) {
        failed.push({ id, error: (error as Error).message || String(error) })
      }
    }
    return { deleted, failed }
  }

  private async deleteImageById(id: string): Promise<boolean> {
    const safeId = String(id || '').replace(/\\/g, '/')
    if (!/^[^/]+\/[^/]+\.(png|jpe?g|webp)$/i.test(safeId)) {
      throw new Error('Invalid image id.')
    }
    const [batchId] = safeId.split('/')
    const ok = await this.deps.file.delete(`${OUTPUTS_ROOT}/${safeId}`)
    if (!ok) return false
    await this.removeImageFromMetadata(batchId, safeId)
    return true
  }

  private async removeImageFromMetadata(batchId: string, imageId: string): Promise<void> {
    const metaPath = `${OUTPUTS_ROOT}/${batchId}/metadata.json`
    const text = await this.deps.file.readText(metaPath)
    if (!text) return
    try {
      const meta = JSON.parse(text)
      if (Array.isArray(meta.images)) {
        meta.images = meta.images.filter((image: any) => image?.id !== imageId)
        await this.deps.file.writeText(metaPath, JSON.stringify(meta, null, 2))
      }
    } catch {
      // 元数据损坏也不影响删除成功
    }
  }

  // ---------- 设置 / 收藏三件套 ----------

  private async readStoredSettings(): Promise<StoredSettings> {
    const text = await this.deps.file.readText(SETTINGS_PATH)
    const legacyConfig = await this.readConfig()
    let parsed: any = {}
    if (text) {
      try {
        parsed = JSON.parse(text)
      } catch {
        parsed = {}
      }
    }
    const fallbackProfile = normalizeStoredProfile(
      { id: 'mobile', name: '手机配置', ...legacyConfig },
      'mobile',
      legacyConfig,
    )
    const profiles = uniqueById<StoredProfile>(
      (Array.isArray(parsed.profiles) ? parsed.profiles : [fallbackProfile])
        .map((profile: unknown, index: number) =>
          normalizeStoredProfile(profile, index === 0 ? 'mobile' : `profile-${index + 1}`, legacyConfig),
        ),
    ).slice(0, 50)
    if (profiles.length === 0) profiles.push(fallbackProfile)
    const activeProfileId = profiles.some((profile) => profile.id === parsed.activeProfileId)
      ? String(parsed.activeProfileId)
      : profiles[0].id

    const legacyAux = normalizeStoredAuxProfile(
      { id: 'aux-mobile', ...(parsed.auxiliary || createDefaultAux()) },
      'aux-mobile',
    )
    const auxiliaryProfiles = uniqueById<StoredAuxProfile>(
      (Array.isArray(parsed.auxiliaryProfiles) ? parsed.auxiliaryProfiles : [legacyAux])
        .map((profile: unknown, index: number) =>
          normalizeStoredAuxProfile(profile, index === 0 ? 'aux-mobile' : `aux-${index + 1}`),
        ),
    ).slice(0, 50)
    if (auxiliaryProfiles.length === 0) auxiliaryProfiles.push(legacyAux)
    const activeAuxiliaryProfileId = auxiliaryProfiles.some(
      (profile) => profile.id === parsed.activeAuxiliaryProfileId,
    )
      ? String(parsed.activeAuxiliaryProfileId)
      : auxiliaryProfiles[0].id
    const auxiliary =
      auxiliaryProfiles.find((profile) => profile.id === activeAuxiliaryProfileId) || auxiliaryProfiles[0]

    return {
      savedPrompts: normalizeSavedItems(parsed.savedPrompts),
      savedStyles: normalizeSavedItems(parsed.savedStyles),
      recentPrompts: normalizeSavedItems(parsed.recentPrompts),
      activeProfileId,
      profiles,
      activeAuxiliaryProfileId,
      auxiliaryProfiles,
      auxiliary,
    }
  }

  private async writeStoredSettings(settings: StoredSettings): Promise<void> {
    await this.deps.file.writeText(SETTINGS_PATH, JSON.stringify(settings, null, 2))
  }

  async getSettings(): Promise<AppSettings> {
    const stored = await this.readStoredSettings()
    const activeProfile =
      stored.profiles.find((profile) => profile.id === stored.activeProfileId) || stored.profiles[0]
    const profiles: SettingsProfile[] = await Promise.all(
      stored.profiles.map(async (profile) => {
        const hasApiKey = Boolean(await this.getProfileApiKey(profile.id))
        return {
          id: profile.id,
          name: profile.name,
          baseUrl: profile.baseUrl,
          imageModel: profile.model || 'gpt-image-2',
          endpointMode: profile.endpointMode || 'images',
          hasApiKey,
          apiKeyMask: hasApiKey ? '已配置' : '',
        }
      }),
    )
    const activeGenHasKey = Boolean(await this.getProfileApiKey(activeProfile.id))
    const auxiliaryProfiles = await Promise.all(
      stored.auxiliaryProfiles.map(async (profile) => {
        const hasApiKey = profile.useActiveProfile
          ? activeGenHasKey
          : Boolean(await this.getAuxiliaryApiKey(profile.id))
        return {
          id: profile.id,
          name: profile.name || '辅助 API',
          useActiveProfile: profile.useActiveProfile,
          baseUrl: profile.useActiveProfile ? activeProfile.baseUrl : profile.baseUrl || activeProfile.baseUrl,
          model: profile.model || DEFAULT_AUX_MODEL,
          hasApiKey,
          apiKeyMask: hasApiKey ? '已配置' : '',
        }
      }),
    )
    const auxiliary =
      auxiliaryProfiles.find((profile) => profile.id === stored.activeAuxiliaryProfileId) ||
      auxiliaryProfiles[0]
    return {
      activeProfileId: stored.activeProfileId,
      profiles,
      activeAuxiliaryProfileId: stored.activeAuxiliaryProfileId,
      auxiliaryProfiles,
      auxiliary,
      savedPrompts: stored.savedPrompts,
      savedStyles: stored.savedStyles,
      recentPrompts: stored.recentPrompts,
    }
  }

  async saveProfile(input: ProfileInput): Promise<AppSettings> {
    const stored = await this.readStoredSettings()
    const profileId = normalizeProfileId(input.profileId, `profile-${Date.now()}`)
    const existingIndex = stored.profiles.findIndex((profile) => profile.id === profileId)
    const existing = existingIndex >= 0 ? stored.profiles[existingIndex] : undefined
    const nextProfile: StoredProfile = {
      id: profileId,
      name: String(input.name || existing?.name || 'API 配置').trim().slice(0, 80) || 'API 配置',
      baseUrl: stripTrailingSlash(input.baseUrl || existing?.baseUrl || ''),
      model: String(input.imageModel || existing?.model || 'gpt-image-2').trim().slice(0, 120),
      endpointMode: String(input.endpointMode || existing?.endpointMode || 'images').trim() || 'images',
    }
    if (existingIndex >= 0) stored.profiles[existingIndex] = nextProfile
    else stored.profiles.push(nextProfile)
    if (input.setActive !== false) stored.activeProfileId = nextProfile.id

    // 只有显式传了非空 apiKey 才更新密钥（对齐桌面「留空表示不改」的习惯）。
    if (typeof input.apiKey === 'string' && input.apiKey.trim()) {
      await this.deps.secret.set(this.profileSecretKey(nextProfile.id), input.apiKey.trim())
    }
    stored.auxiliary =
      stored.auxiliaryProfiles.find((profile) => profile.id === stored.activeAuxiliaryProfileId) ||
      stored.auxiliaryProfiles[0]
    await this.writeStoredSettings(stored)
    if (stored.activeProfileId === nextProfile.id) {
      await this.writeConfig({
        baseUrl: nextProfile.baseUrl,
        model: nextProfile.model,
        endpointMode: nextProfile.endpointMode,
      })
    }
    return this.getSettings()
  }

  async deleteProfile(profileId: string): Promise<AppSettings> {
    const stored = await this.readStoredSettings()
    const id = normalizeProfileId(profileId, '')
    const existingIndex = stored.profiles.findIndex((profile) => profile.id === id)
    if (existingIndex < 0) throw new Error('API 配置不存在。')
    if (stored.profiles.length <= 1) throw new Error('至少需要保留一个 API 配置。')
    stored.profiles.splice(existingIndex, 1)
    if (stored.activeProfileId === id) stored.activeProfileId = stored.profiles[0].id
    const active = stored.profiles.find((profile) => profile.id === stored.activeProfileId) || stored.profiles[0]
    await this.writeStoredSettings(stored)
    await this.writeConfig({ baseUrl: active.baseUrl, model: active.model, endpointMode: active.endpointMode })
    await this.deps.secret.remove(this.profileSecretKey(id))
    if (id === 'mobile') await this.deps.secret.remove(SECRET_KEY)
    return this.getSettings()
  }

  async saveSavedPrompt(input: { name?: string; text: string; negativeText?: string }): Promise<AppSettings> {
    const stored = await this.readStoredSettings()
    const item = normalizeSavedItem(input, '提示词')
    stored.savedPrompts = upsertSavedItem(stored.savedPrompts, item)
    await this.writeStoredSettings(stored)
    return this.getSettings()
  }

  async deleteSavedPrompt(id: string): Promise<AppSettings> {
    const stored = await this.readStoredSettings()
    stored.savedPrompts = stored.savedPrompts.filter((item) => item.id !== normalizeSavedItemId(id))
    await this.writeStoredSettings(stored)
    return this.getSettings()
  }

  async saveRecentPrompt(input: { text: string; negativeText?: string; source?: string }): Promise<AppSettings> {
    const stored = await this.readStoredSettings()
    const item = normalizeSavedItem({ ...input, source: input?.source || 'recent-prompt' }, '最近提示词')
    stored.recentPrompts = upsertRecentItem(stored.recentPrompts, item)
    await this.writeStoredSettings(stored)
    return this.getSettings()
  }

  async deleteRecentPrompt(id: string): Promise<AppSettings> {
    const stored = await this.readStoredSettings()
    stored.recentPrompts = stored.recentPrompts.filter((item) => item.id !== normalizeSavedItemId(id))
    await this.writeStoredSettings(stored)
    return this.getSettings()
  }

  async saveSavedStyle(input: {
    name?: string
    text: string
    styleText?: string
    negativeText?: string
    strength?: string
    referenceImages?: SavedReference[]
  }): Promise<AppSettings> {
    const stored = await this.readStoredSettings()
    const item = normalizeSavedItem(input, '风格')
    item.referenceImages = await this.persistStyleReferenceImages(item.referenceImages, item.id)
    stored.savedStyles = upsertSavedItem(stored.savedStyles, item)
    await this.writeStoredSettings(stored)
    return this.getSettings()
  }

  async deleteSavedStyle(id: string): Promise<AppSettings> {
    const stored = await this.readStoredSettings()
    stored.savedStyles = stored.savedStyles.filter((item) => item.id !== normalizeSavedItemId(id))
    await this.writeStoredSettings(stored)
    return this.getSettings()
  }

  // 风格样图落盘：dataUrl 的写到 outputs/_style-references/<styleId>/style-NN.<ext>，metadata 只留相对
  // url 指针（对齐 persistStyleReferenceImages 4470）。已经是 url 指针的原样保留。
  private async persistStyleReferenceImages(
    references: SavedReference[] | undefined,
    styleId: string,
  ): Promise<SavedReference[]> {
    const list = Array.isArray(references) ? references.slice(0, 8) : []
    const safeId = normalizeSavedItemId(styleId) || makeSavedItemId()
    const result: SavedReference[] = []
    for (let index = 0; index < list.length; index += 1) {
      const reference = list[index]
      const parsed =
        typeof reference?.dataUrl === 'string' && reference.dataUrl.startsWith('data:image/')
          ? parseDataUrl(reference.dataUrl)
          : null

      if (!parsed) {
        // 已在盘上（或远程 url）：保留指针，丢掉 dataUrl
        if (typeof reference?.url === 'string' && reference.url) {
          result.push({
            name: String(reference.name || `Style reference ${index + 1}`).slice(0, 120),
            url: reference.url,
            source: String(reference.source || 'style-reference').slice(0, 80),
          })
        }
        continue
      }

      const ext = extensionFromMime(parsed.mimeType, 'png')
      const fileName = `style-${String(index + 1).padStart(2, '0')}.${ext}`
      const relPath = `${STYLE_REF_ROOT}/${safeId}/${fileName}`
      await this.deps.file.mkdir(`${STYLE_REF_ROOT}/${safeId}`)
      await this.deps.file.writeBase64(relPath, parsed.base64)
      result.push({
        name: String(reference.name || `Style reference ${index + 1}`).slice(0, 120),
        url: relPath,
        source: String(reference.source || 'style-reference').slice(0, 80),
      })
    }
    return result
  }

  // ---------- UI 偏好 ----------

  async getUiPrefs(): Promise<{ backgroundTheme?: string }> {
    const text = await this.deps.file.readText(UI_PREFS_PATH)
    if (!text) return {}
    try {
      const parsed = JSON.parse(text)
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
      return {}
    }
  }

  async setUiPrefs(patch: { backgroundTheme?: string }): Promise<{ backgroundTheme?: string }> {
    const prefs = await this.getUiPrefs()
    // 主题名合法性由前端 store/theme.ts 校验，这里简单存取。
    if (patch && typeof patch === 'object' && Object.prototype.hasOwnProperty.call(patch, 'backgroundTheme')) {
      prefs.backgroundTheme = patch.backgroundTheme
    }
    await this.deps.file.writeText(UI_PREFS_PATH, JSON.stringify(prefs, null, 2))
    return prefs
  }

  // ---------- 连接测试 / 模型列表（真实 HTTP，用注入的 HttpAdapter）----------

  async testConnection(input: { profileId?: string; apiKey?: string; baseUrl?: string }): Promise<TestResult> {
    const stored = await this.readStoredSettings()
    const selected =
      stored.profiles.find((profile) => profile.id === input.profileId) ||
      stored.profiles.find((profile) => profile.id === stored.activeProfileId) ||
      stored.profiles[0]
    const apiKey = String(input.apiKey || (await this.getProfileApiKey(selected.id)) || '').trim()
    const baseUrl = String(input.baseUrl || selected.baseUrl || '').trim()
    const endpoint = buildOpenAiUrl(baseUrl, '/models')
    if (!apiKey) return { ok: false, endpoint, error: 'API key is missing.' }
    try {
      const resp = await this.deps.http.get(endpoint, this.authHeaders(apiKey))
      if (resp.status < 200 || resp.status >= 300) {
        return { ok: false, endpoint, status: resp.status, error: `HTTP ${resp.status}` }
      }
      const models = this.extractModelIds(resp.json)
      return { ok: true, endpoint, status: resp.status, modelCount: models.length }
    } catch (error) {
      return { ok: false, endpoint, error: (error as Error).message || String(error) }
    }
  }

  async listImageModels(input: { profileId?: string; apiKey?: string; baseUrl?: string }): Promise<AuxiliaryModelsResult> {
    const stored = await this.readStoredSettings()
    const selected =
      stored.profiles.find((profile) => profile.id === input.profileId) ||
      stored.profiles.find((profile) => profile.id === stored.activeProfileId) ||
      stored.profiles[0]
    const apiKey = String(input.apiKey || (await this.getProfileApiKey(selected.id)) || '').trim()
    const baseUrl = String(input.baseUrl || selected.baseUrl || '').trim()
    const endpoint = buildOpenAiUrl(baseUrl, '/models')
    if (!apiKey) return { ok: false, endpoint, models: [], error: 'API key is missing.' }
    try {
      const resp = await this.deps.http.get(endpoint, this.authHeaders(apiKey))
      if (resp.status < 200 || resp.status >= 300) {
        return { ok: false, endpoint, status: resp.status, models: [], error: `HTTP ${resp.status}` }
      }
      const models = this.extractModelIds(resp.json)
      return { ok: true, endpoint, status: resp.status, models, modelCount: models.length }
    } catch (error) {
      return { ok: false, endpoint, models: [], error: (error as Error).message || String(error) }
    }
  }

  private extractModelIds(json: any): string[] {
    const data = Array.isArray(json?.data) ? json.data : []
    return data
      .map((m: any) => (typeof m?.id === 'string' ? m.id : ''))
      .filter((id: string) => Boolean(id))
      .sort()
  }

  // ---------- 辅助 API：优化提示词 / 样图分析 / 连接测试 / 模型列表 ----------

  // 解析辅助 API 配置（无 input 变体，对齐 server.js getAuxiliaryApiConfig）。
  // useActiveProfile=true → 借用当前生图配置；否则用当前辅助配置自己的地址与独立密钥。
  private async readAuxConfig(): Promise<{ name: string; apiKey: string; baseUrl: string; model: string }> {
    const { stored, profile: config, apiKey: genKey } = await this.getActiveProfileContext()
    const aux =
      stored.auxiliaryProfiles.find((profile) => profile.id === stored.activeAuxiliaryProfileId) ||
      stored.auxiliaryProfiles[0]
    if (aux.useActiveProfile) {
      return {
        name: '辅助 API（复用生图配置）',
        apiKey: genKey,
        baseUrl: config.baseUrl,
        model: aux.model || DEFAULT_AUX_MODEL,
      }
    }
    const auxKey = await this.getAuxiliaryApiKey(aux.id)
    return {
      name: '辅助 API',
      apiKey: auxKey,
      baseUrl: stripTrailingSlash(aux.baseUrl || config.baseUrl),
      model: aux.model || DEFAULT_AUX_MODEL,
    }
  }

  // 解析辅助 API 配置（带 input 覆盖，对齐 server.js getAuxiliaryApiConfigFromInput）。
  // 用于连接测试 / 模型列表：input 可临时覆盖 useActiveProfile / apiKey / baseUrl / model。
  private async readAuxConfigFromInput(input: {
    profileId?: string
    useActiveProfile?: boolean
    apiKey?: string
    baseUrl?: string
    model?: string
  }): Promise<{ name: string; apiKey: string; baseUrl: string; model: string }> {
    const { stored, profile: config, apiKey: genKey } = await this.getActiveProfileContext()
    const existing =
      stored.auxiliaryProfiles.find((profile) => profile.id === input.profileId) ||
      stored.auxiliaryProfiles.find((profile) => profile.id === stored.activeAuxiliaryProfileId) ||
      stored.auxiliaryProfiles[0]
    const useActiveProfile = Object.prototype.hasOwnProperty.call(input, 'useActiveProfile')
      ? input.useActiveProfile !== false
      : existing.useActiveProfile
    const model = normalizeAuxiliaryModel(input.model || existing.model)

    if (useActiveProfile) {
      return { name: '辅助 API（复用生图配置）', apiKey: genKey, baseUrl: config.baseUrl, model }
    }
    const auxKey = await this.getAuxiliaryApiKey(existing.id)
    return {
      name: '辅助 API',
      apiKey: String(input.apiKey || auxKey || '').trim(),
      baseUrl: stripTrailingSlash(input.baseUrl || existing.baseUrl || config.baseUrl),
      model,
    }
  }

  // 调用辅助对话模型（对齐 server.js requestAuxiliaryChat）。POST {model, messages, temperature:0.2, max_tokens?}
  // 到 {baseUrl}/v1/chat/completions，Bearer 鉴权。非 2xx 由 checkResponse 抛出可读错误。
  private async requestAuxiliaryChat(
    config: { apiKey: string; baseUrl: string; model: string },
    messages: unknown[],
    options: { maxTokens?: number } = {},
  ): Promise<unknown> {
    const payload: Record<string, unknown> = {
      model: config.model,
      messages,
      temperature: 0.2,
    }
    if (options.maxTokens) payload.max_tokens = options.maxTokens
    const resp = await this.deps.http.postJson(
      buildOpenAiUrl(config.baseUrl, '/chat/completions'),
      payload,
      this.authHeaders(config.apiKey),
    )
    return this.checkResponse(resp)
  }

  // 优化提示词：对齐 server.js optimizePrompt（系统+用户双消息，用户消息由共享构建器拼）。
  async optimizePrompt(body: {
    prompt: string
    negativePrompt?: string
    mode: string
    targetSize?: string
    purpose?: string
    styleSelected?: boolean
    styleName?: string
  }): Promise<OptimizeResult> {
    const pb = this.deps.promptBuilders
    const prompt = normalizePromptDraft(body.prompt)
    const negativePrompt = normalizeOptionalText(body.negativePrompt, 8000)
    const mode = pb.normalizePromptOptimizeMode(body.mode)
    const targetSize = pb.normalizeAnalysisTargetSize(body.targetSize)
    const purpose = normalizeOptionalText(body.purpose, 120)
    const styleSelected = body.styleSelected === true
    const styleName = styleSelected ? normalizeOptionalText(body.styleName, 200) : ''

    const config = await this.readAuxConfig()
    if (!config.apiKey) throw new Error('未配置辅助 API Key，无法优化提示词。请到设置里配置辅助 API。')

    const messages = [
      {
        role: 'system',
        content:
          'You are a prompt optimization assistant for an image generation workbench. Return the optimized prompt only in the requested format. Do not generate images.',
      },
      {
        role: 'user',
        content: pb.buildPromptOptimizationPrompt({
          prompt,
          negativePrompt,
          mode,
          targetSize,
          purpose,
          styleSelected,
          styleName,
        }),
      },
    ]
    const responseBody = await this.requestAuxiliaryChat(config, messages, {
      maxTokens: mode === 'quality' ? 2200 : 1800,
    })
    const text = pb.extractTextFromModelResponse(responseBody).trim()
    if (!text) throw new Error('辅助 API 未返回优化后的提示词。')

    // 返回形状对齐 serverApi.ts 的 OptimizeResult（无 model 字段；桌面版返回的 model 前端未用到，故此处省略）。
    return {
      mode,
      text,
      optimizedPrompt: pb.extractOptimizedPromptText(text) || text,
      negativePrompt: pb.extractOptimizedNegativePromptText(text),
    }
  }

  // 样图分析：对齐 server.js analyzeImages（多模态消息，图片以 dataUrl 塞进 image_url）。
  async analyzeImage(body: {
    images: { name?: string; dataUrl?: string; url?: string }[]
    mode: string
    targetSize?: string
  }): Promise<AnalyzeResult> {
    const pb = this.deps.promptBuilders
    const mode = pb.normalizeAnalysisMode(body.mode)
    const rawImages = Array.isArray(body.images) ? body.images : []
    // prompt 模式只取 1 张，其余模式最多 8 张（对齐 server.js prepareAnalysisImages 的 limit）。
    const images = await this.prepareAnalysisImages(rawImages, mode === 'prompt' ? 1 : 8)
    if (images.length === 0) throw new Error('没有可读取的图片。')

    const config = await this.readAuxConfig()
    if (!config.apiKey) throw new Error('未配置辅助 API Key，无法分析图片。请到设置里配置辅助 API。')

    const instruction = pb.buildAnalysisPrompt(mode, body.targetSize)
    const messages = [
      {
        role: 'system',
        content:
          'You are an image prompt assistant for a local image generation workbench. Return practical prompts, not explanations.',
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: instruction },
          ...images.map((image) => ({ type: 'image_url', image_url: { url: image.dataUrl } })),
        ],
      },
    ]
    const responseBody = await this.requestAuxiliaryChat(config, messages, {
      maxTokens: pb.maxTokensForAnalysisMode(mode),
    })
    const text = pb.extractTextFromModelResponse(responseBody).trim()
    if (!text) throw new Error('辅助 API 未返回分析文本。')

    return {
      mode,
      model: config.model,
      text,
      images: images.map((image) => ({ name: image.name, mimeType: image.mimeType, bytes: image.bytes })),
    }
  }

  // 收集分析用图片 → dataUrl（对齐 server.js prepareAnalysisImages）。
  // dataUrl 直接用；相对路径 url 从本地读回再拼 dataUrl；读不到就跳过（不抛错）。
  private async prepareAnalysisImages(
    rawImages: { name?: string; dataUrl?: string; url?: string }[],
    limit: number,
  ): Promise<{ name: string; mimeType: string; bytes: number; dataUrl: string }[]> {
    const sliced = rawImages.slice(0, limit)
    const images: { name: string; mimeType: string; bytes: number; dataUrl: string }[] = []
    for (let index = 0; index < sliced.length; index += 1) {
      const image = sliced[index]
      const resolved = await this.resolveReferenceImage(image)
      if (!resolved?.base64) continue // 静默跳过读不到的
      const mimeType = resolved.mimeType || 'image/png'
      images.push({
        name: String(image?.name || `Image ${index + 1}`).slice(0, 120),
        mimeType,
        bytes: base64ByteLength(resolved.base64),
        dataUrl: `data:${mimeType};base64,${resolved.base64}`,
      })
    }
    return images
  }

  // 辅助 API 连接测试：对齐 server.js testAuxiliaryConnection（发一条 "Reply with exactly: ok"）。
  async testAuxiliary(input: {
    profileId?: string
    useActiveProfile?: boolean
    apiKey?: string
    baseUrl?: string
    model?: string
  }): Promise<TestResult> {
    const config = await this.readAuxConfigFromInput(input)
    const endpoint = buildOpenAiUrl(config.baseUrl, '/chat/completions')
    if (!config.apiKey) return { ok: false, endpoint, error: '未配置辅助 API Key。' }
    try {
      const responseBody = await this.requestAuxiliaryChat(config, [{ role: 'user', content: 'Reply with exactly: ok' }], {
        maxTokens: 24,
      })
      return {
        ok: true,
        endpoint,
        model: config.model,
        text: this.deps.promptBuilders.extractTextFromModelResponse(responseBody).slice(0, 80),
      }
    } catch (error) {
      return {
        ok: false,
        endpoint,
        model: config.model,
        error: (error as Error).message || String(error),
        hint: '若为中转站，请确认该模型支持 vision / chat 兼容请求。',
      }
    }
  }

  // 辅助 API 模型列表：对齐 server.js listAuxiliaryModels（GET /models → extractModelIds）。
  async listAuxiliaryModels(input: {
    profileId?: string
    useActiveProfile?: boolean
    apiKey?: string
    baseUrl?: string
    model?: string
  }): Promise<AuxiliaryModelsResult> {
    const config = await this.readAuxConfigFromInput(input)
    const endpoint = buildOpenAiUrl(config.baseUrl, '/models')
    if (!config.apiKey) return { ok: false, endpoint, models: [], error: '未配置辅助 API Key。' }
    try {
      const resp = await this.deps.http.get(endpoint, this.authHeaders(config.apiKey))
      if (resp.status < 200 || resp.status >= 300) {
        return {
          ok: false,
          endpoint,
          status: resp.status,
          models: [],
          error: String(resp.json?.error?.message || resp.json?.message || resp.text || `HTTP ${resp.status}`).slice(0, 400),
        }
      }
      const models = this.extractModelIds(resp.json)
      return { ok: true, endpoint, status: resp.status, models, modelCount: models.length }
    } catch (error) {
      return {
        ok: false,
        endpoint,
        models: [],
        error: (error as Error).message || String(error),
        hint: '若该中转站不暴露 /v1/models，请继续手动输入模型 id。',
      }
    }
  }

  // 保存辅助 API 配置。每个 profile 的独立 key 使用各自的安全存储槽。
  async saveAuxiliary(body: AuxiliaryInput): Promise<AppSettings> {
    const stored = await this.readStoredSettings()
    const profileId = normalizeProfileId(body.profileId, `aux-${Date.now()}`)
    const existingIndex = stored.auxiliaryProfiles.findIndex((profile) => profile.id === profileId)
    const existing = existingIndex >= 0 ? stored.auxiliaryProfiles[existingIndex] : undefined
    const nextProfile: StoredAuxProfile = {
      id: profileId,
      name: String(body.name || existing?.name || '辅助 API').trim().slice(0, 80) || '辅助 API',
      useActiveProfile: Object.prototype.hasOwnProperty.call(body, 'useActiveProfile')
        ? body.useActiveProfile !== false
        : existing?.useActiveProfile !== false,
      baseUrl: stripTrailingSlash(body.baseUrl || existing?.baseUrl),
      model: String(body.model || existing?.model || DEFAULT_AUX_MODEL).trim().slice(0, 120),
    }
    if (existingIndex >= 0) stored.auxiliaryProfiles[existingIndex] = nextProfile
    else stored.auxiliaryProfiles.push(nextProfile)
    if (body.setActive !== false) stored.activeAuxiliaryProfileId = nextProfile.id
    stored.auxiliary =
      stored.auxiliaryProfiles.find((profile) => profile.id === stored.activeAuxiliaryProfileId) ||
      stored.auxiliaryProfiles[0]

    // 密钥：显式 clear 则删；传了非空 apiKey 才写（对齐「留空表示不改」）。
    if (body.clearApiKey) {
      await this.deps.secret.remove(this.auxiliarySecretKey(nextProfile.id))
      if (nextProfile.id === 'aux-mobile') await this.deps.secret.remove(AUX_SECRET_KEY)
    } else if (typeof body.apiKey === 'string' && body.apiKey.trim()) {
      await this.deps.secret.set(this.auxiliarySecretKey(nextProfile.id), body.apiKey.trim())
    }
    await this.writeStoredSettings(stored)
    return this.getSettings()
  }

  async deleteAuxiliary(profileId: string): Promise<AppSettings> {
    const stored = await this.readStoredSettings()
    const id = normalizeProfileId(profileId, '')
    const existingIndex = stored.auxiliaryProfiles.findIndex((profile) => profile.id === id)
    if (existingIndex < 0) throw new Error('辅助 API 配置不存在。')
    if (stored.auxiliaryProfiles.length <= 1) throw new Error('至少需要保留一个辅助 API 配置。')
    stored.auxiliaryProfiles.splice(existingIndex, 1)
    if (stored.activeAuxiliaryProfileId === id) {
      stored.activeAuxiliaryProfileId = stored.auxiliaryProfiles[0].id
    }
    stored.auxiliary =
      stored.auxiliaryProfiles.find((profile) => profile.id === stored.activeAuxiliaryProfileId) ||
      stored.auxiliaryProfiles[0]
    await this.writeStoredSettings(stored)
    await this.deps.secret.remove(this.auxiliarySecretKey(id))
    if (id === 'aux-mobile') await this.deps.secret.remove(AUX_SECRET_KEY)
    return this.getSettings()
  }
}
