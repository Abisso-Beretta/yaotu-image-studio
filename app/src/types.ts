// 与后端 server.js 的 JSON 接口对应的类型。

export interface AppConfig {
  hasApiKey: boolean
  defaultModel: string
  baseUrl: string
  endpointMode: string
  activeProfileName: string
  outputDir: string
  version?: string
}

export interface UpdateStatus {
  enabled: boolean
  status: string
  version?: string
  reason?: string
  ok?: boolean
  message?: string
  availableVersion?: string
  latestVersion?: string
  releaseDate?: string
  error?: string
  checking?: boolean
  checkedAt?: string
}

export interface ReferenceImageInput {
  name: string
  dataUrl?: string
  url?: string
  source?: string
}

// 漫剧上下文：形状对应服务端 normalizeManjuContext 的返回值（server.js）。
export interface ManjuContext {
  type: string
  title: string
  category: string
  characterId?: string
  characterName?: string
  characterRole?: string
  shotNo?: string
  scene?: string
  sceneTitle?: string
  queueId?: string
  characters: string[]
}

export interface GenerateParams {
  prompt: string
  negativePrompt?: string
  model?: string
  size: string
  quality: string
  count: number
  outputFormat: string
  background: string
  outputCompression?: number
  referenceImages?: ReferenceImageInput[]
  manjuContext?: ManjuContext
}

export interface ImageRequest {
  endpointMode?: string
  model?: string
  prompt?: string
  negativePrompt?: string
  n?: number
  size?: string
  quality?: string
  output_format?: string
  output_compression?: number
  background?: string
  referenceImages?: ReferenceImageInput[]
  manjuContext?: ManjuContext
}

export interface GeneratedImage {
  id: string
  url: string
  batchId?: string
  createdAt?: string
  prompt?: string
  bytes?: number
  params?: Record<string, unknown>
  request?: ImageRequest
}

export interface GenerateResult {
  batchId: string
  createdAt: string
  images: GeneratedImage[]
}

export interface ImagesPage {
  images: GeneratedImage[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface SettingsProfile {
  id: string
  name: string
  baseUrl: string
  imageModel: string
  endpointMode: string
  hasApiKey: boolean
  apiKeyMask: string
}

export interface SavedReference {
  name: string
  url?: string
  dataUrl?: string
  source?: string
}

export interface SavedItem {
  id: string
  name: string
  text: string
  styleText?: string
  negativeText?: string
  strength?: 'low' | 'medium' | 'high'
  referenceImages?: SavedReference[]
  mode?: string
  source?: string
  createdAt?: string
  updatedAt?: string
}

export interface AnalyzeResult {
  mode: string
  model: string
  text: string
  images: { name: string; mimeType: string; bytes: number }[]
}

export interface AuxiliaryProfile {
  id: string
  name: string
  useActiveProfile: boolean
  baseUrl: string
  model: string
  hasApiKey: boolean
  apiKeyMask: string
}

export interface AuxiliaryInput {
  profileId?: string
  name: string
  useActiveProfile: boolean
  baseUrl?: string
  model: string
  apiKey?: string
  clearApiKey?: boolean
  setActive?: boolean
}

export interface AuxiliaryModelsResult {
  ok: boolean
  endpoint?: string
  status?: number
  models: string[]
  modelCount?: number
  error?: string
  hint?: string
}

export interface AppSettings {
  activeProfileId: string
  profiles: SettingsProfile[]
  activeAuxiliaryProfileId?: string
  auxiliaryProfiles?: AuxiliaryProfile[]
  auxiliary?: AuxiliaryProfile
  savedPrompts?: SavedItem[]
  savedStyles?: SavedItem[]
  recentPrompts?: SavedItem[]
}

export interface ProfileInput {
  profileId?: string
  name: string
  apiKey?: string
  baseUrl: string
  imageModel: string
  endpointMode: string
  setActive?: boolean
}

export interface TestResult {
  ok: boolean
  endpoint?: string
  status?: number
  modelCount?: number
  // 辅助 API 测试连接额外返回：用到的对话模型与其回声文本。
  model?: string
  text?: string
  error?: string
  hint?: string
}

export interface OptimizeResult {
  optimizedPrompt?: string
  text?: string
  negativePrompt?: string
  mode?: string
}

// 漫剧项目（生图任务包，磁盘持久化）
export interface ProjectSummary {
  key: string
  name: string
  episode: string
  medium: string
  characterCount: number
  charactersWithRef: number
  shotCount: number
  chosenCount: number
}

export interface ProjectRefImage {
  id: string
  file: string
  role: string
  locked?: boolean
  // 所属形象 id，缺省 = 'default'；比较统一用 (r.formId || 'default')
  formId?: string
  // 自由标签，如 "背面"
  label?: string
}

// 角色的一个「形象」（如 夏装/兽形/性转）。'default' 保留给主形象。
export interface ProjectCharacterForm {
  id: string
  name: string
  imageLockPhrase?: string
  note?: string
}

// 基准图候选：旧条目是全局图库 URL 字符串，新条目是持久化对象（file 在响应层已解析成 URL）
export interface ProjectBaseCandidate {
  id: string
  file: string
  formId?: string
  createdAt?: string
}

export interface ProjectCharacter {
  id: string
  name: string
  role?: string
  appearance?: { imageLockPhrase?: string }
  referenceImages?: ProjectRefImage[]
  baseCandidates?: (string | ProjectBaseCandidate)[]
  // 形象列表；缺省 = 只有 default 形象
  forms?: ProjectCharacterForm[]
}

export interface ProjectShot {
  shotId: string
  scene?: string
  shotType?: string
  cameraMove?: string
  composition?: string
  prompt: string
  promptEn?: string
  negative?: string
  characterIds: string[]
  // charId → formId，缺省 default
  characterForms?: Record<string, string>
}

export interface ProjectCandidate {
  imageId: string
  file: string
  createdAt?: string
}

export interface ProjectRender {
  shotId: string
  status: string
  candidates: ProjectCandidate[]
  chosenImageId?: string
}

export interface ImageProject {
  project: { id: string; name: string; medium: string }
  episode?: string
  style: { lockPhrase: string; globalNegative: string }
  defaults: { size: string; model?: string; attachCharacterRefs?: boolean }
  characters: ProjectCharacter[]
  shots: ProjectShot[]
  renders?: ProjectRender[]
}

export interface ExportResult {
  key: string
  exportDir: string
  count: number
  missing: string[]
  files: { shotId: string; file: string }[]
}
